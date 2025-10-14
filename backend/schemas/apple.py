"""Apple Calendar related Pydantic models"""
from pydantic import BaseModel
from typing import Optional


class AppleCalendarRequest(BaseModel):
    apple_id: str  # iCloud email (e.g., user@icloud.com)
    app_password: str  # App-specific password
    subject: str
    location: str
    start_datetime: str  # ISO 8601 format
    end_datetime: str    # ISO 8601 format
    description: Optional[str] = None
