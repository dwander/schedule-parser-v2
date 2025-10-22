"""Authentication related Pydantic models"""
from pydantic import BaseModel
from typing import Optional


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None
    state: Optional[str] = None  # For calendar linking (contains user_id)


class GoogleTokenRequest(BaseModel):
    credential: str  # ID Token (JWT)


class NaverAuthRequest(BaseModel):
    code: str
    state: str


class KakaoAuthRequest(BaseModel):
    code: str
