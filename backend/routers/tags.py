from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import logging
import re

from database import get_database, Tag, Schedule

router = APIRouter()
logger = logging.getLogger(__name__)


# --- API Endpoints ---

@router.get("/api/tags/{user_id}")
async def get_tags(user_id: str, tag_type: Optional[str] = None, db: Session = Depends(get_database)):
    """사용자의 태그 목록 조회"""
    try:
        query = db.query(Tag).filter(Tag.user_id == user_id)

        if tag_type:
            query = query.filter(Tag.tag_type == tag_type)

        tags = query.order_by(Tag.tag_value).all()

        return {
            "success": True,
            "tags": [tag.to_dict() for tag in tags]
        }

    except Exception as e:
        logger.error(f"❌ Get tags error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/tags/{user_id}")
async def create_tag(user_id: str, tag_data: dict, db: Session = Depends(get_database)):
    """새 태그 생성"""
    try:
        tag_type = tag_data.get('tag_type')
        tag_value = tag_data.get('tag_value', '').strip()

        if not tag_type or not tag_value:
            raise HTTPException(status_code=400, detail="tag_type and tag_value are required")

        if tag_type not in ['brand', 'album']:
            raise HTTPException(status_code=400, detail="tag_type must be 'brand' or 'album'")

        # 공백 정규화
        tag_value = re.sub(r'\s+', ' ', tag_value)

        # 중복 체크
        existing = db.query(Tag).filter(
            Tag.user_id == user_id,
            Tag.tag_type == tag_type,
            Tag.tag_value == tag_value
        ).first()

        if existing:
            return {"success": True, "tag": existing.to_dict(), "created": False}

        # 새 태그 생성
        new_tag = Tag(
            user_id=user_id,
            tag_type=tag_type,
            tag_value=tag_value
        )

        db.add(new_tag)
        db.commit()
        db.refresh(new_tag)

        return {"success": True, "tag": new_tag.to_dict(), "created": True}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Create tag error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/tags/{user_id}/{tag_id}")
async def delete_tag(user_id: str, tag_id: int, db: Session = Depends(get_database)):
    """태그 삭제 및 관련 스케줄 업데이트"""
    try:
        # 태그 조회
        tag = db.query(Tag).filter(
            Tag.id == tag_id,
            Tag.user_id == user_id
        ).first()

        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        # 관련 스케줄 업데이트 (해당 태그를 사용하는 스케줄의 필드를 빈 문자열로)
        field_name = tag.tag_type  # 'brand' or 'album'
        affected_schedules = db.query(Schedule).filter(
            Schedule.user_id == user_id,
            getattr(Schedule, field_name) == tag.tag_value
        ).all()

        for schedule in affected_schedules:
            setattr(schedule, field_name, '')

        # 태그 삭제
        db.delete(tag)
        db.commit()

        return {
            "success": True,
            "deleted_tag": tag.to_dict(),
            "affected_schedules": len(affected_schedules)
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Delete tag error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/tags/{user_id}/sync")
async def sync_tags_from_schedules(user_id: str, db: Session = Depends(get_database)):
    """기존 스케줄 데이터에서 태그 추출 및 동기화 (배치 최적화)"""
    try:
        # 1. 기존 태그를 한 번에 모두 가져오기 (메모리에 캐싱)
        existing_tags = db.query(Tag).filter(Tag.user_id == user_id).all()
        existing_tag_set = {(tag.tag_type, tag.tag_value) for tag in existing_tags}

        # 2. 모든 스케줄에서 고유한 태그 추출
        schedules = db.query(Schedule).filter(Schedule.user_id == user_id).all()
        unique_tags = set()

        for schedule in schedules:
            # 브랜드 태그
            if schedule.brand and schedule.brand.strip():
                brand_value = re.sub(r'\s+', ' ', schedule.brand.strip())
                unique_tags.add(('brand', brand_value))

            # 앨범 태그
            if schedule.album and schedule.album.strip():
                album_value = re.sub(r'\s+', ' ', schedule.album.strip())
                unique_tags.add(('album', album_value))

        # 3. DB에 없는 새 태그만 추가 (메모리 비교)
        new_tags = unique_tags - existing_tag_set
        created_tags = []

        for tag_type, tag_value in new_tags:
            new_tag = Tag(user_id=user_id, tag_type=tag_type, tag_value=tag_value)
            db.add(new_tag)
            created_tags.append(tag_value)

        db.commit()

        return {
            "success": True,
            "created_count": len(created_tags),
            "created_tags": created_tags
        }

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Sync tags error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
