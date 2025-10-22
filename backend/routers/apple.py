from fastapi import APIRouter, HTTPException
import caldav
from datetime import datetime
import pytz

from schemas.apple import AppleCalendarRequest

router = APIRouter()


# --- API Endpoints ---

@router.post("/api/calendar/apple")
async def add_apple_calendar(request: AppleCalendarRequest):
    """Add schedule to Apple Calendar via CalDAV protocol."""
    try:
        # CalDAV 클라이언트 생성 (iCloud)
        client = caldav.DAVClient(
            url="https://caldav.icloud.com",
            username=request.apple_id,
            password=request.app_password
        )

        print(f"🍎 Apple Calendar 연결 시도: {request.apple_id}")

        # Principal 및 캘린더 목록 가져오기
        principal = client.principal()
        calendars = principal.calendars()

        if not calendars:
            raise HTTPException(
                status_code=404,
                detail="No calendars found. Please create a calendar in iCloud first."
            )

        # 첫 번째 캘린더 사용 (기본 캘린더)
        calendar = calendars[0]
        print(f"🍎 캘린더 발견: {calendar.name}")

        # 시간대 설정 (한국 시간)
        kst = pytz.timezone('Asia/Seoul')

        # ISO 8601 형식 날짜를 datetime 객체로 변환
        # 예: "2025-10-14T14:00:00" → datetime object
        start_dt = datetime.fromisoformat(request.start_datetime.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(request.end_datetime.replace('Z', '+00:00'))

        # 시간대 정보가 없으면 KST로 설정
        if start_dt.tzinfo is None:
            start_dt = kst.localize(start_dt)
        if end_dt.tzinfo is None:
            end_dt = kst.localize(end_dt)

        # iCalendar 형식 생성
        # caldav 라이브러리는 save_event() 메서드를 지원하지만,
        # 직접 VEVENT를 생성하는 것이 더 안정적입니다
        ical_text = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Schedule Parser v2//Apple Calendar//KR
CALSCALE:GREGORIAN
BEGIN:VTIMEZONE
TZID:Asia/Seoul
BEGIN:STANDARD
DTSTART:19700101T000000
TZNAME:KST
TZOFFSETFROM:+0900
TZOFFSETTO:+0900
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:{datetime.now().timestamp()}@scheduleparserv2
DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}
DTSTART;TZID=Asia/Seoul:{start_dt.strftime('%Y%m%dT%H%M%S')}
DTEND;TZID=Asia/Seoul:{end_dt.strftime('%Y%m%dT%H%M%S')}
SUMMARY:{request.subject}
LOCATION:{request.location}
DESCRIPTION:{request.description or ''}
STATUS:CONFIRMED
SEQUENCE:0
X-APPLE-DEFAULT-ALARM:FALSE
END:VEVENT
END:VCALENDAR"""

        print(f"🍎 iCalendar 데이터 (처음 200자): {ical_text[:200]}")

        # 캘린더에 이벤트 추가
        event = calendar.save_event(ical_text)

        print(f"🍎 Apple Calendar 이벤트 생성 성공!")

        return {
            "success": True,
            "message": "Event added to Apple Calendar successfully",
            "calendar_name": calendar.name,
            "event_url": str(event.url) if hasattr(event, 'url') else None
        }

    except caldav.lib.error.AuthorizationError as e:
        print(f"❌ Apple Calendar 인증 실패: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Invalid Apple ID or app-specific password. Please check your credentials."
        )
    except caldav.lib.error.NotFoundError as e:
        print(f"❌ Apple Calendar 캘린더 없음: {str(e)}")
        raise HTTPException(
            status_code=404,
            detail="Calendar not found. Please create a calendar in iCloud first."
        )
    except Exception as e:
        print(f"❌ Apple Calendar 추가 실패: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add to Apple Calendar: {str(e)}"
        )
