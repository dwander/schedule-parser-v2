from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import logging

from database import get_database, User, Schedule

router = APIRouter()
logger = logging.getLogger(__name__)


# --- API Endpoints ---

@router.get("/api/users")
async def list_users(db: Session = Depends(get_database)):
    """모든 사용자 목록 조회 (관리자용)"""
    try:
        # 모든 사용자 조회
        users = db.query(User).order_by(User.last_login.desc()).all()

        # 각 사용자의 스케줄 개수 조회
        user_list = []
        for user in users:
            schedule_count = db.query(Schedule).filter(Schedule.user_id == user.id).count()
            user_data = user.to_dict()
            user_data['schedule_count'] = schedule_count
            user_list.append(user_data)

        return {"success": True, "users": user_list, "total": len(user_list)}

    except Exception as e:
        logger.error(f"❌ List users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/users/init")
async def init_user(request: Request, db: Session = Depends(get_database)):
    """사용자 초기화 또는 로그인 시 호출"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        auth_provider = data.get("auth_provider", "anonymous")
        is_anonymous = data.get("is_anonymous", False)
        email = data.get("email")
        name = data.get("name")

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        # 사용자 조회 또는 생성
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            # 신규 사용자 생성
            user = User(
                id=user_id,
                auth_provider=auth_provider,
                is_anonymous=is_anonymous,
                email=email,
                name=name,
                has_seen_sample_data=False
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"✅ New user created: {user_id} ({name or 'anonymous'})")
        else:
            # 기존 사용자 - last_login 및 프로필 업데이트
            user.last_login = func.now()
            # 프로필 정보가 있으면 업데이트 (구글 로그인 시 최신 정보 반영)
            if email:
                user.email = email
            if name:
                user.name = name
            db.commit()
            logger.info(f"✅ User logged in: {user_id} ({name or 'anonymous'})")

        return {"success": True, "user": user.to_dict()}

    except Exception as e:
        logger.error(f"❌ User init error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_database)):
    """사용자 정보 조회"""
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {"success": True, "user": user.to_dict()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/users/{user_id}/sample-data")
async def mark_sample_data_seen(user_id: str, db: Session = Depends(get_database)):
    """샘플 데이터를 본 것으로 표시"""
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.has_seen_sample_data = True
        db.commit()

        return {"success": True, "user": user.to_dict()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Mark sample data seen error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/users/{user_id}/voice-training")
async def get_voice_training_data(user_id: str, db: Session = Depends(get_database)):
    """음성 인식 훈련 데이터 조회"""
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {"success": True, "voice_training_data": user.voice_training_data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get voice training data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/users/{user_id}/voice-training")
async def update_voice_training_data(user_id: str, request: Request, db: Session = Depends(get_database)):
    """음성 인식 훈련 데이터 업데이트"""
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        data = await request.json()
        voice_training_data = data.get("voice_training_data")

        if voice_training_data is None:
            raise HTTPException(status_code=400, detail="voice_training_data is required")

        user.voice_training_data = voice_training_data
        db.commit()

        logger.info(f"✅ Updated voice training data for user: {user_id}")
        return {"success": True, "voice_training_data": user.voice_training_data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Update voice training data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/users/{user_id}/settings")
async def get_ui_settings(user_id: str, db: Session = Depends(get_database)):
    """UI 설정 조회"""
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {"success": True, "ui_settings": user.ui_settings}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get UI settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/users/{user_id}/settings")
async def update_ui_settings(user_id: str, request: Request, db: Session = Depends(get_database)):
    """UI 설정 업데이트 (부분 업데이트 지원)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        data = await request.json()
        ui_settings = data.get("ui_settings")

        if ui_settings is None:
            raise HTTPException(status_code=400, detail="ui_settings is required")

        # 부분 업데이트 지원 (기존 설정과 병합)
        if user.ui_settings and isinstance(user.ui_settings, dict) and isinstance(ui_settings, dict):
            # 기존 설정에 새 설정을 병합 (깊은 병합은 안 함, 1단계만)
            merged_settings = {**user.ui_settings, **ui_settings}
            user.ui_settings = merged_settings
        else:
            # 기존 설정이 없거나 dict가 아니면 새 설정으로 교체
            user.ui_settings = ui_settings

        db.commit()

        logger.info(f"✅ Updated UI settings for user: {user_id}")
        return {"success": True, "ui_settings": user.ui_settings}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Update UI settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/users/{user_id}/data-settings")
async def get_data_settings(user_id: str, db: Session = Depends(get_database)):
    """데이터 설정 조회 (브랜드/장소 단축어, 폴더 포맷 등)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "success": True,
            "user_id": user.id,
            "settings": user.data_settings or {},
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.last_login.isoformat() if user.last_login else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get data settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/users/{user_id}/data-settings")
async def update_data_settings(user_id: str, request: Request, db: Session = Depends(get_database)):
    """데이터 설정 업데이트 (부분 업데이트 지원)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        data = await request.json()
        settings = data.get("settings")

        if settings is None:
            raise HTTPException(status_code=400, detail="settings is required")

        # 부분 업데이트 지원 (기존 설정과 병합)
        if user.data_settings and isinstance(user.data_settings, dict) and isinstance(settings, dict):
            # 기존 설정에 새 설정을 병합
            merged_settings = {**user.data_settings, **settings}
            user.data_settings = merged_settings
        else:
            # 기존 설정이 없거나 dict가 아니면 새 설정으로 교체
            user.data_settings = settings

        db.commit()

        logger.info(f"✅ Updated data settings for user: {user_id}")
        return {
            "success": True,
            "user_id": user.id,
            "settings": user.data_settings,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.last_login.isoformat() if user.last_login else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Update data settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
