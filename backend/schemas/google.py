"""Google calendar related Pydantic models"""
from pydantic import BaseModel
from typing import Optional


class GoogleCalendarRequest(BaseModel):
    user_id: str
    subject: str
    location: str
    start_datetime: str  # ISO 8601 format (e.g., "2025-10-11T14:00:00+09:00")
    end_datetime: str    # ISO 8601 format (e.g., "2025-10-11T15:00:00+09:00")
    description: Optional[str] = None
