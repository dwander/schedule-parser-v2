"""Storage related Pydantic models"""
from pydantic import BaseModel
from typing import Dict, Union, List, Optional, Any


class SaveSchedulesRequest(BaseModel):
    schedules: Optional[Union[List[Dict], str]] = None  # schedules or compressed data
    user_id: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    device_uuid: Optional[str] = None
    schedules_data: Optional[Dict] = None


class LoadSchedulesRequest(BaseModel):
    user_id: str
    access_token: str
    refresh_token: Optional[str] = None


class PersistentSaveRequest(BaseModel):
    user_id: str
    schedules_data: Dict


class PersistentLoadRequest(BaseModel):
    user_id: str
