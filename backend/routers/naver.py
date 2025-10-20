from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import requests
import uuid
from datetime import datetime, timedelta, timezone
import urllib.parse

from constants import NAVER_DEFAULT_CALENDAR_ID
from schemas.naver import NaverCalendarRequest
from database import get_database, User
from config import settings
from lib.crypto import encrypt_token, decrypt_token

router = APIRouter()


async def refresh_naver_token_if_needed(user_id: str, db: Session) -> str:
    """Check and refresh Naver token if expired. Returns valid access token."""
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.naver_refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Naver calendar not linked. Please link your Naver account in settings."
        )

    # Decrypt tokens from database
    decrypted_access_token = decrypt_token(user.naver_access_token) if user.naver_access_token else None
    decrypted_refresh_token = decrypt_token(user.naver_refresh_token) if user.naver_refresh_token else None

    if not decrypted_refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Failed to decrypt Naver refresh token. Please re-link your Naver account."
        )

    # Check if token is expired (with 5-minute buffer)
    if user.naver_token_expires_at:
        # SQLite에서 읽은 datetime을 UTC timezone으로 변환
        expires_at = user.naver_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        time_until_expiry = expires_at - datetime.now(timezone.utc)
        if time_until_expiry.total_seconds() > 300:  # More than 5 minutes left
            print(f"✅ 토큰 유효함 ({time_until_expiry.total_seconds():.0f}초 남음)")
            return decrypted_access_token

    # Token expired or about to expire, refresh it
    print(f"🔄 토큰 갱신 필요 (user_id: {user_id})")
    token_response = requests.post(
        'https://nid.naver.com/oauth2.0/token',
        params={
            'grant_type': 'refresh_token',
            'client_id': settings.NAVER_CLIENT_ID,
            'client_secret': settings.NAVER_CLIENT_SECRET,
            'refresh_token': decrypted_refresh_token
        }
    )

    if not token_response.ok:
        print(f"❌ 토큰 갱신 실패: {token_response.text}")
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {token_response.text}")

    token_json = token_response.json()
    new_access_token = token_json.get('access_token')
    new_refresh_token = token_json.get('refresh_token', decrypted_refresh_token)  # 새 refresh token이 없으면 기존 것 사용

    # expires_in을 안전하게 정수로 변환
    try:
        expires_in = int(token_json.get('expires_in', 3600))
    except (ValueError, TypeError):
        print(f"⚠️  expires_in 변환 실패, 기본값 3600초 사용")
        expires_in = 3600

    if not new_access_token:
        raise HTTPException(status_code=401, detail="No access token received")

    # Encrypt tokens before storing in database
    encrypted_access_token = encrypt_token(new_access_token) if new_access_token else None
    encrypted_refresh_token = encrypt_token(new_refresh_token) if new_refresh_token else None

    # Update tokens in database
    user.naver_access_token = encrypted_access_token
    user.naver_refresh_token = encrypted_refresh_token
    user.naver_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    db.commit()

    print(f"✅ 토큰 갱신 완료 (만료: {user.naver_token_expires_at.isoformat()})")
    return new_access_token


# --- API Endpoints ---

@router.post("/api/calendar/naver")
async def add_naver_calendar(request: NaverCalendarRequest, db: Session = Depends(get_database)):
    """Add schedule to Naver Calendar via API (iCalendar format) with automatic token refresh."""
    try:
        # Auto-refresh token if needed
        valid_access_token = await refresh_naver_token_if_needed(request.user_id, db)
        calendar_url = "https://openapi.naver.com/calendar/createSchedule.json"

        headers = {
            'Authorization': f'Bearer {valid_access_token}',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }

        # 날짜 형식 변환: 2025-10-11T04:30:00 → 20251011T043000
        def format_ical_datetime(dt_str: str) -> str:
            # ISO 형식에서 구분자 제거
            return dt_str.replace('-', '').replace(':', '')

        start_dt = format_ical_datetime(request.start_datetime)
        end_dt = format_ical_datetime(request.end_datetime)
        uid = str(uuid.uuid4())
        now = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')

        # iCalendar 형식 문자열 생성 (인코딩 전 원본값 사용)
        ical_string = "BEGIN:VCALENDAR\n"
        ical_string += "VERSION:2.0\n"
        ical_string += "PRODID:Naver Calendar\n"
        ical_string += "CALSCALE:GREGORIAN\n"
        ical_string += "BEGIN:VTIMEZONE\n"
        ical_string += "TZID:Asia/Seoul\n"
        ical_string += "BEGIN:STANDARD\n"
        ical_string += "DTSTART:19700101T000000\n"
        ical_string += "TZNAME:GMT+09:00\n"
        ical_string += "TZOFFSETFROM:+0900\n"
        ical_string += "TZOFFSETTO:+0900\n"
        ical_string += "END:STANDARD\n"
        ical_string += "END:VTIMEZONE\n"
        ical_string += "BEGIN:VEVENT\n"
        ical_string += "SEQUENCE:0\n"
        ical_string += "CLASS:PUBLIC\n"
        ical_string += "TRANSP:OPAQUE\n"
        ical_string += f"UID:{uid}\n"
        ical_string += f"DTSTART;TZID=Asia/Seoul:{start_dt}\n"
        ical_string += f"DTEND;TZID=Asia/Seoul:{end_dt}\n"
        ical_string += f"SUMMARY:{request.subject}\n"
        if request.description:
            ical_string += f"DESCRIPTION:{request.description}\n"
        if request.location:
            ical_string += f"LOCATION:{request.location}\n"
        ical_string += f"CREATED:{now}\n"
        ical_string += f"LAST-MODIFIED:{now}\n"
        ical_string += f"DTSTAMP:{now}\n"
        ical_string += "END:VEVENT\n"
        ical_string += "END:VCALENDAR"

        # 전체 iCalendar 문자열을 URL 인코딩
        encoded_ical_string = urllib.parse.quote(ical_string)

        # form-data 형식으로 전송
        data = f"calendarId={NAVER_DEFAULT_CALENDAR_ID}&scheduleIcalString={encoded_ical_string}"

        print(f"📅 네이버 캘린더 iCal String (처음 200자): {ical_string[:200]}")
        print(f"📅 인코딩된 iCal String (처음 200자): {encoded_ical_string[:200]}")

        response = requests.post(calendar_url, headers=headers, data=data.encode('utf-8'))

        print(f"📅 네이버 캘린더 API 응답: {response.status_code}")
        print(f"📅 응답 내용: {response.text}")

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Naver Calendar API error: {response.text}"
            )

        result = response.json()
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 네이버 캘린더 추가 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add to Naver Calendar: {str(e)}")
