from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import requests
import uuid
from datetime import datetime
import urllib.parse

from constants import NAVER_DEFAULT_CALENDAR_ID

router = APIRouter()


# Data Models
class NaverCalendarRequest(BaseModel):
    access_token: str
    subject: str
    location: str
    start_datetime: str  # ISO 8601 format
    end_datetime: str    # ISO 8601 format
    description: Optional[str] = None


# --- API Endpoints ---

@router.post("/api/calendar/naver")
async def add_naver_calendar(request: NaverCalendarRequest):
    """Add schedule to Naver Calendar via API (iCalendar format)."""
    try:
        calendar_url = "https://openapi.naver.com/calendar/createSchedule.json"

        headers = {
            'Authorization': f'Bearer {request.access_token}',
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
