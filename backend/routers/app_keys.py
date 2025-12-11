"""
앱 API 키 라우터

데스크탑 앱 전용 API 키 생성, 관리, 폴더명 조회 기능 제공
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import secrets
import bcrypt
import logging
import re
from datetime import datetime, timedelta, timezone

from database import get_database, User, Schedule, AppApiKey

router = APIRouter()
logger = logging.getLogger(__name__)

# Constants
API_KEY_PREFIX = "dk_"  # desktop key
RATE_LIMIT_PER_MINUTE = 20
RATE_LIMIT_WINDOW_SECONDS = 60

# 기본 폴더명 포맷
DEFAULT_FOLDER_FORMAT = {
    "normal": "[BRAND] [DATE] [TIME] [LOCATION]([COUPLE]) - [PHOTOGRAPHER]([CUTS])",
    "noCuts": "[BRAND] [DATE] [TIME] [LOCATION]([COUPLE])"
}

# 컷수 승수 (프론트엔드와 동일)
CUTS_MULTIPLIER = 3


# --- Pydantic Models ---

class CreateApiKeyRequest(BaseModel):
    name: str  # 키 식별용 이름


class ApiKeyResponse(BaseModel):
    id: int
    key_prefix: str
    name: str
    is_active: bool
    last_used_at: Optional[str]
    created_at: str
    expires_at: Optional[str]


class CreateApiKeyResponse(BaseModel):
    success: bool
    key: str  # 평문 API 키 (생성 시 1회만 표시)
    api_key: ApiKeyResponse


class FolderNameResponse(BaseModel):
    success: bool
    folder_name: str
    schedule: dict
    matched_by: str  # "exact" | "nearest" | "multiple"


class MultipleFolderNameResponse(BaseModel):
    success: bool
    matched_by: str  # "multiple"
    schedules: List[dict]


# --- Helper Functions ---

def generate_api_key() -> tuple[str, str]:
    """
    API 키 생성
    Returns: (평문 키, bcrypt 해시)
    """
    # 32자 랜덤 문자열
    random_part = secrets.token_urlsafe(24)  # 32자 base64url
    plain_key = f"{API_KEY_PREFIX}{random_part}"

    # bcrypt 해시 생성
    key_hash = bcrypt.hashpw(plain_key.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    return plain_key, key_hash


def verify_api_key(plain_key: str, key_hash: str) -> bool:
    """API 키 검증"""
    try:
        return bcrypt.checkpw(plain_key.encode('utf-8'), key_hash.encode('utf-8'))
    except Exception:
        return False


def check_rate_limit(api_key: AppApiKey, db: Session) -> bool:
    """
    Rate limiting 체크 (분당 20회)
    Returns: True if allowed, False if rate limited
    """
    now = datetime.now(timezone.utc)

    # 윈도우 시작 시간이 없거나 1분 이상 지났으면 리셋
    if (api_key.request_window_start is None or
        (now - api_key.request_window_start).total_seconds() >= RATE_LIMIT_WINDOW_SECONDS):
        api_key.request_window_start = now
        api_key.request_count = 1
        db.commit()
        return True

    # 현재 윈도우 내 요청 수 체크
    if api_key.request_count >= RATE_LIMIT_PER_MINUTE:
        # Rate limit 초과 - 키 만료 처리
        api_key.expires_at = now
        api_key.is_active = False
        db.commit()
        logger.warning(f"⚠️ API key {api_key.key_prefix}... exceeded rate limit and was expired")
        return False

    # 요청 카운트 증가
    api_key.request_count += 1
    api_key.last_used_at = now
    db.commit()
    return True


def get_api_key_from_header(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_database)
) -> AppApiKey:
    """
    X-API-Key 헤더에서 API 키 추출 및 검증
    """
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Please provide X-API-Key header."
        )

    if not x_api_key.startswith(API_KEY_PREFIX):
        raise HTTPException(
            status_code=401,
            detail="Invalid API key format."
        )

    # 접두사로 먼저 필터링 (성능 최적화)
    key_prefix = x_api_key[:10]  # dk_ + 7자

    # 활성 키만 조회
    api_keys = db.query(AppApiKey).filter(
        AppApiKey.key_prefix == key_prefix,
        AppApiKey.is_active == True
    ).all()

    # bcrypt로 실제 키 검증
    for api_key in api_keys:
        if verify_api_key(x_api_key, api_key.key_hash):
            # 만료 체크
            if api_key.expires_at and api_key.expires_at <= datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=401,
                    detail="API key has expired."
                )

            # Rate limit 체크
            if not check_rate_limit(api_key, db):
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded (20 requests per minute). API key has been expired."
                )

            return api_key

    raise HTTPException(
        status_code=401,
        detail="Invalid API key."
    )


def generate_folder_name(
    schedule: Schedule,
    folder_format: dict,
    brand_shortcuts: dict,
    location_shortcuts: dict
) -> str:
    """
    폴더명 생성 (프론트엔드 로직과 동일)
    """
    # 컷수 유무에 따라 포맷 선택
    has_cuts = schedule.cuts and schedule.cuts > 0
    selected_format = folder_format.get('normal' if has_cuts else 'noCuts',
                                         DEFAULT_FOLDER_FORMAT['normal' if has_cuts else 'noCuts'])

    # 브랜드 매핑
    brand_prefix = brand_shortcuts.get(schedule.brand, schedule.brand) if schedule.brand else ""

    # 시간 형식 변환: "14:00" → "14시", "14:30" → "14시30분"
    time_str = ""
    if schedule.time:
        parts = schedule.time.split(':')
        if len(parts) == 2:
            hours, minutes = parts
            time_str = f"{hours}시" if minutes == "00" else f"{hours}시{minutes}분"

    # 장소 매핑
    location_text = location_shortcuts.get(schedule.location, schedule.location) if schedule.location else ""

    # 컷수 계산
    total_cuts = (schedule.cuts * CUTS_MULTIPLIER) if schedule.cuts else 0

    # 키워드 치환
    result = selected_format
    result = result.replace('[BRAND]', brand_prefix)
    result = result.replace('[DATE]', schedule.date or '')
    result = result.replace('[TIME]', time_str)
    result = result.replace('[LOCATION]', location_text)
    result = result.replace('[COUPLE]', schedule.couple or '')
    result = result.replace('[PHOTOGRAPHER]', schedule.photographer or '')
    result = result.replace('[CUTS]', str(total_cuts))

    # 빈 괄호 정리
    result = re.sub(r'\(\s*\)', '', result)

    # 연속된 공백을 하나로
    result = re.sub(r'\s+', ' ', result)

    # 앞뒤 공백 제거
    result = result.strip()

    # 불필요한 구분자 제거
    result = re.sub(r'\s*-\s*$', '', result)
    result = re.sub(r'^\s*-\s*', '', result)

    return result


# --- API Endpoints ---

@router.post("/api/app-keys", tags=["App API Keys"])
async def create_api_key(
    request: CreateApiKeyRequest,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """
    새 API 키 생성

    - 로그인된 사용자만 사용 가능
    - 생성된 키는 1회만 표시되므로 안전하게 저장 필요
    """

    # API 키 생성
    plain_key, key_hash = generate_api_key()
    key_prefix = plain_key[:10]  # dk_ + 7자

    # DB에 저장
    api_key = AppApiKey(
        user_id=user_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=request.name,
        is_active=True,
        request_count=0
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    logger.info(f"✅ Created API key for user {user_id}: {key_prefix}...")

    return {
        "success": True,
        "key": plain_key,  # 평문 키 - 1회만 표시!
        "api_key": api_key.to_dict()
    }


@router.get("/api/app-keys", tags=["App API Keys"])
async def list_api_keys(
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """
    사용자의 API 키 목록 조회

    - 키 해시는 노출하지 않고 접두사만 표시
    """
    api_keys = db.query(AppApiKey).filter(
        AppApiKey.user_id == user_id
    ).order_by(AppApiKey.created_at.desc()).all()

    return {
        "success": True,
        "api_keys": [key.to_dict() for key in api_keys],
        "total": len(api_keys)
    }


@router.delete("/api/app-keys/{key_id}", tags=["App API Keys"])
async def delete_api_key(
    key_id: int,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """API 키 삭제"""
    api_key = db.query(AppApiKey).filter(
        AppApiKey.id == key_id,
        AppApiKey.user_id == user_id
    ).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    db.delete(api_key)
    db.commit()

    logger.info(f"🗑️ Deleted API key {key_id} for user {user_id}")

    return {"success": True, "message": "API key deleted"}


@router.patch("/api/app-keys/{key_id}/deactivate", tags=["App API Keys"])
async def deactivate_api_key(
    key_id: int,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """API 키 비활성화"""
    api_key = db.query(AppApiKey).filter(
        AppApiKey.id == key_id,
        AppApiKey.user_id == user_id
    ).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    db.commit()

    logger.info(f"⏸️ Deactivated API key {key_id} for user {user_id}")

    return {"success": True, "api_key": api_key.to_dict()}


@router.patch("/api/app-keys/{key_id}/activate", tags=["App API Keys"])
async def activate_api_key(
    key_id: int,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """API 키 활성화 (만료되지 않은 경우만)"""
    api_key = db.query(AppApiKey).filter(
        AppApiKey.id == key_id,
        AppApiKey.user_id == user_id
    ).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # 만료된 키는 다시 활성화할 수 없음
    if api_key.expires_at and api_key.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Cannot activate expired key. Please create a new key."
        )

    api_key.is_active = True
    # Rate limit 카운터 리셋
    api_key.request_count = 0
    api_key.request_window_start = None
    db.commit()

    logger.info(f"▶️ Activated API key {key_id} for user {user_id}")

    return {"success": True, "api_key": api_key.to_dict()}


@router.post("/api/app-keys/{key_id}/regenerate", tags=["App API Keys"])
async def regenerate_api_key(
    key_id: int,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """
    API 키 재생성

    - 기존 키를 무효화하고 새 키 발급
    - 새 키는 1회만 표시
    """
    api_key = db.query(AppApiKey).filter(
        AppApiKey.id == key_id,
        AppApiKey.user_id == user_id
    ).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # 새 키 생성
    plain_key, key_hash = generate_api_key()
    key_prefix = plain_key[:10]

    # 업데이트
    api_key.key_hash = key_hash
    api_key.key_prefix = key_prefix
    api_key.is_active = True
    api_key.expires_at = None
    api_key.request_count = 0
    api_key.request_window_start = None
    db.commit()
    db.refresh(api_key)

    logger.info(f"🔄 Regenerated API key {key_id} for user {user_id}")

    return {
        "success": True,
        "key": plain_key,  # 평문 키 - 1회만 표시!
        "api_key": api_key.to_dict()
    }


# --- Desktop API Endpoints ---

@router.get("/api/desktop/folder-name", tags=["Desktop API"])
async def get_folder_name(
    datetime: str = Query(..., description="DateTime in 'YYYY.MM.DD HH:MM' format"),
    api_key: AppApiKey = Depends(get_api_key_from_header),
    db: Session = Depends(get_database)
):
    """
    데스크탑 앱용 폴더명 조회 API

    - X-API-Key 헤더 필수
    - datetime 파라미터: "2025.12.15 14:00" 형식
    - 해당 시간의 스케줄을 찾아 폴더명 반환
    """
    # datetime 파싱
    try:
        parts = datetime.strip().split(' ')
        if len(parts) != 2:
            raise ValueError("Invalid format")
        date_str, time_str = parts

        # 날짜 형식 검증 (YYYY.MM.DD)
        if not re.match(r'^\d{4}\.\d{2}\.\d{2}$', date_str):
            raise ValueError("Invalid date format")

        # 시간 형식 검증 (HH:MM)
        if not re.match(r'^\d{2}:\d{2}$', time_str):
            raise ValueError("Invalid time format")

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid datetime format. Use 'YYYY.MM.DD HH:MM' (e.g., '2025.12.15 14:00')"
        )

    # 사용자 설정 조회 (User가 없으면 기본값 사용)
    user = db.query(User).filter(User.id == api_key.user_id).first()
    data_settings = user.data_settings if user and user.data_settings else {}
    folder_format = data_settings.get('folderNameFormat', DEFAULT_FOLDER_FORMAT)
    brand_shortcuts = data_settings.get('brandShortcuts', {})
    location_shortcuts = data_settings.get('locationShortcuts', {})

    # 요청 시간을 분 단위로 변환
    target_minutes = int(time_str.split(':')[0]) * 60 + int(time_str.split(':')[1])

    # 해당 날짜의 모든 스케줄 조회
    same_day_schedules = db.query(Schedule).filter(
        Schedule.user_id == api_key.user_id,
        Schedule.date == date_str
    ).all()

    if not same_day_schedules:
        raise HTTPException(
            status_code=404,
            detail=f"No schedule found for {datetime}"
        )

    # ±1시간(60분) 범위 내 스케줄 필터링
    TIME_RANGE_MINUTES = 60
    matched_schedules = []

    for s in same_day_schedules:
        s_parts = s.time.split(':')
        s_minutes = int(s_parts[0]) * 60 + int(s_parts[1])
        diff = abs(s_minutes - target_minutes)

        if diff <= TIME_RANGE_MINUTES:
            matched_schedules.append((s, diff))

    if not matched_schedules:
        raise HTTPException(
            status_code=404,
            detail=f"No schedule found within ±1 hour of {datetime}"
        )

    # 시간 차이가 가장 작은 순으로 정렬
    matched_schedules.sort(key=lambda x: x[1])

    if len(matched_schedules) == 1:
        schedule, diff = matched_schedules[0]
        folder_name = generate_folder_name(
            schedule, folder_format, brand_shortcuts, location_shortcuts
        )
        return {
            "success": True,
            "folder_name": folder_name,
            "schedule": {
                "id": str(schedule.id),
                "date": schedule.date,
                "time": schedule.time,
                "location": schedule.location,
                "couple": schedule.couple
            },
            "matched_by": "range"
        }

    # 여러 개 매칭 (±1시간 내 여러 스케줄)
    results = []
    for schedule, diff in matched_schedules:
        folder_name = generate_folder_name(
            schedule, folder_format, brand_shortcuts, location_shortcuts
        )
        results.append({
            "folder_name": folder_name,
            "schedule": {
                "id": str(schedule.id),
                "date": schedule.date,
                "time": schedule.time,
                "location": schedule.location,
                "couple": schedule.couple
            }
        })

    return {
        "success": True,
        "matched_by": "multiple",
        "schedules": results
    }
