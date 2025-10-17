"""Naver calendar related Pydantic models"""
from pydantic import BaseModel
from typing import Optional


class NaverCalendarRequest(BaseModel):
    user_id: str
    access_token: str
    subject: str
    location: str
    start_datetime: str  # ISO 8601 format
    end_datetime: str    # ISO 8601 format
    description: Optional[str] = None
