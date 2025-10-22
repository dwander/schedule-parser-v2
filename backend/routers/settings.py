"""
사용자 설정 API 라우터

브랜드/장소 단축어, 폴더명 포맷 등 범용 설정 관리
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
from database import get_database, UserSettings

router = APIRouter()


class UserSettingsResponse(BaseModel):
    """사용자 설정 응답"""
    user_id: str
    settings: Dict[str, Any]
    created_at: Optional[str]
    updated_at: Optional[str]


class UpdateUserSettingsRequest(BaseModel):
    """사용자 설정 업데이트 요청"""
    settings: Dict[str, Any]


@router.get("/api/users/{user_id}/settings", response_model=UserSettingsResponse)
async def get_user_settings(user_id: str, db: Session = Depends(get_database)):
    """
    사용자 설정 조회

    설정이 없으면 빈 객체 반환
    """
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

    if not user_settings:
        # 설정이 없으면 기본값 반환
        return UserSettingsResponse(
            user_id=user_id,
            settings={},
            created_at=None,
            updated_at=None
        )

    return UserSettingsResponse(**user_settings.to_dict())


@router.patch("/api/users/{user_id}/settings")
async def update_user_settings(
    user_id: str,
    request: UpdateUserSettingsRequest,
    db: Session = Depends(get_database)
):
    """
    사용자 설정 업데이트 (부분 업데이트 지원)

    기존 설정과 merge되므로 일부 필드만 전송해도 됨
    """
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

    if user_settings:
        # 기존 설정과 merge
        current_settings = user_settings.settings or {}
        updated_settings = {**current_settings, **request.settings}
        user_settings.settings = updated_settings
    else:
        # 새로 생성
        user_settings = UserSettings(
            user_id=user_id,
            settings=request.settings
        )
        db.add(user_settings)

    db.commit()
    db.refresh(user_settings)

    return UserSettingsResponse(**user_settings.to_dict())


@router.put("/api/users/{user_id}/settings")
async def replace_user_settings(
    user_id: str,
    request: UpdateUserSettingsRequest,
    db: Session = Depends(get_database)
):
    """
    사용자 설정 전체 교체

    기존 설정을 완전히 덮어씀
    """
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

    if user_settings:
        user_settings.settings = request.settings
    else:
        user_settings = UserSettings(
            user_id=user_id,
            settings=request.settings
        )
        db.add(user_settings)

    db.commit()
    db.refresh(user_settings)

    return UserSettingsResponse(**user_settings.to_dict())
