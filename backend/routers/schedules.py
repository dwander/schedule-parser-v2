from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import List, Dict
import logging
import re

from database import get_database, Schedule, ScheduleService, Tag

router = APIRouter()
logger = logging.getLogger(__name__)


# Helper Functions
def auto_create_tags_from_schedule(db_session, user_id: str, brand: str, album: str):
    """스케줄 저장/업데이트 시 자동으로 태그 생성"""
    created_tags = []

    # 브랜드 태그 생성
    if brand and brand.strip():
        brand_value = re.sub(r'\s+', ' ', brand.strip())

        existing = db_session.query(Tag).filter(
            Tag.user_id == user_id,
            Tag.tag_type == 'brand',
            Tag.tag_value == brand_value
        ).first()

        if not existing:
            new_tag = Tag(user_id=user_id, tag_type='brand', tag_value=brand_value)
            db_session.add(new_tag)
            created_tags.append(('brand', brand_value))

    # 앨범 태그 생성
    if album and album.strip():
        album_value = re.sub(r'\s+', ' ', album.strip())

        existing = db_session.query(Tag).filter(
            Tag.user_id == user_id,
            Tag.tag_type == 'album',
            Tag.tag_value == album_value
        ).first()

        if not existing:
            new_tag = Tag(user_id=user_id, tag_type='album', tag_value=album_value)
            db_session.add(new_tag)
            created_tags.append(('album', album_value))

    return created_tags


# --- API Endpoints ---

@router.get("/api/schedules")
def get_schedules(
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """Get all schedules for a user"""
    try:
        schedules = db.query(Schedule).filter(Schedule.user_id == user_id).all()

        # Convert to response format
        result = []
        for schedule in schedules:
            result.append({
                'id': str(schedule.id),
                'date': schedule.date,
                'time': schedule.time,
                'location': schedule.location,
                'couple': schedule.couple or "",
                'contact': schedule.contact or "",
                'brand': schedule.brand or "",
                'album': schedule.album or "",
                'photographer': schedule.photographer or "",
                'cuts': schedule.cuts or 0,
                'price': schedule.price or 0,
                'manager': schedule.manager or "",
                'memo': schedule.memo or "",
                'photoNote': schedule.photo_note,
                'photoSequence': schedule.photo_sequence,
                'isDuplicate': schedule.needs_review,
                'createdAt': schedule.created_at.isoformat() if schedule.created_at else None,
                'updatedAt': schedule.updated_at.isoformat() if schedule.updated_at else None,
            })

        return result

    except Exception as e:
        logger.error(f"Failed to get schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/schedules")
def create_schedule(
    schedule: Dict,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """Create a new schedule"""
    try:
        new_schedule = Schedule(
            user_id=user_id,
            date=schedule.get('date', ''),
            time=schedule.get('time', ''),
            location=schedule.get('location', ''),
            couple=schedule.get('couple', ''),
            brand=schedule.get('brand', ''),
            album=schedule.get('album', ''),
            cuts=schedule.get('cuts', 0),
            price=schedule.get('price', 0),
            manager=schedule.get('manager', ''),
            memo=schedule.get('memo', ''),
            needs_review=schedule.get('isDuplicate', False),
        )

        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)

        # Auto-create tags for brand and album
        auto_create_tags_from_schedule(db, user_id, new_schedule.brand, new_schedule.album)
        db.commit()

        return {
            'id': str(new_schedule.id),
            'date': new_schedule.date,
            'time': new_schedule.time,
            'location': new_schedule.location,
            'couple': new_schedule.couple,
            'cuts': new_schedule.cuts,
            'price': new_schedule.price,
            'manager': new_schedule.manager,
            'brand': new_schedule.brand,
            'memo': new_schedule.memo,
            'isDuplicate': new_schedule.needs_review,
            'createdAt': new_schedule.created_at.isoformat() if new_schedule.created_at else None,
            'updatedAt': new_schedule.updated_at.isoformat() if new_schedule.updated_at else None,
        }

    except Exception as e:
        logger.error(f"Failed to create schedule: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/schedules/{schedule_id}")
def update_schedule(
    schedule_id: str,
    schedule: Dict,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """Update a schedule"""
    try:
        print(f"🔄 Update schedule {schedule_id}, keys: {schedule.keys()}")
        if 'photoNote' in schedule:
            print(f"📝 PhotoNote data: {schedule['photoNote']}")

        existing = db.query(Schedule).filter(
            Schedule.id == int(schedule_id),
            Schedule.user_id == user_id
        ).first()

        if not existing:
            raise HTTPException(status_code=404, detail="Schedule not found")

        # Update fields
        if 'date' in schedule:
            existing.date = schedule['date']
        if 'time' in schedule:
            existing.time = schedule['time']
        if 'location' in schedule:
            existing.location = schedule['location']
        if 'couple' in schedule:
            existing.couple = schedule['couple']
        if 'contact' in schedule:
            existing.contact = schedule['contact']
        if 'brand' in schedule:
            existing.brand = schedule['brand']
        if 'album' in schedule:
            existing.album = schedule['album']
        if 'photographer' in schedule:
            existing.photographer = schedule['photographer']
        if 'cuts' in schedule:
            existing.cuts = schedule['cuts']
        if 'price' in schedule:
            existing.price = schedule['price']
        if 'manager' in schedule:
            existing.manager = schedule['manager']
        if 'memo' in schedule:
            existing.memo = schedule['memo']
        if 'photoNote' in schedule:
            existing.photo_note = schedule['photoNote']
        if 'photoSequence' in schedule:
            existing.photo_sequence = schedule['photoSequence']
        if 'isDuplicate' in schedule:
            existing.needs_review = schedule['isDuplicate']

        # Auto-create tags if brand or album was updated
        if 'brand' in schedule or 'album' in schedule:
            auto_create_tags_from_schedule(db, user_id, existing.brand, existing.album)

        db.commit()
        db.refresh(existing)

        return {
            'id': str(existing.id),
            'date': existing.date,
            'time': existing.time,
            'location': existing.location,
            'couple': existing.couple,
            'contact': existing.contact,
            'brand': existing.brand,
            'album': existing.album,
            'photographer': existing.photographer,
            'cuts': existing.cuts,
            'price': existing.price,
            'manager': existing.manager,
            'memo': existing.memo,
            'photoNote': existing.photo_note,
            'photoSequence': existing.photo_sequence,
            'isDuplicate': existing.needs_review,
            'createdAt': existing.created_at.isoformat() if existing.created_at else None,
            'updatedAt': existing.updated_at.isoformat() if existing.updated_at else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update schedule: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/schedules/{schedule_id}/field/{field}")
async def update_schedule_field(
    schedule_id: int,
    field: str,
    value: dict = Body(...),  # {"value": "actual_value", "user_id": "user123"}
    db: Session = Depends(get_database)
):
    """Update a single field of a schedule"""
    try:
        user_id = value.get("user_id")
        field_value = value.get("value")

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        print(f"🔄 Update field request: schedule_id={schedule_id}, field={field}")

        service = ScheduleService(db)
        updated_schedule = service.update_schedule_field(user_id, schedule_id, field, field_value)

        if not updated_schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        # Auto-create tag when brand or album field is updated
        if field in ['brand', 'album']:
            brand = updated_schedule.brand if field == 'brand' else ''
            album = updated_schedule.album if field == 'album' else ''
            if brand or album:
                auto_create_tags_from_schedule(db, user_id, brand, album)
                db.commit()

        return {
            "success": True,
            "message": f"Successfully updated {field}",
            "schedule": updated_schedule.to_dict()
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Update field error: {e}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.delete("/api/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    user_id: str = Query(...),
    db: Session = Depends(get_database)
):
    """Delete a specific schedule"""
    try:
        print(f"🗑️ Delete schedule request: schedule_id={schedule_id}")

        service = ScheduleService(db)
        success = service.delete_schedule(user_id, schedule_id)

        if not success:
            raise HTTPException(status_code=404, detail="Schedule not found")

        return {
            "success": True,
            "message": f"Successfully deleted schedule {schedule_id}"
        }

    except Exception as e:
        print(f"❌ Delete schedule error: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.post("/api/schedules/migrate")
def migrate_schedules(
    from_user_id: str = Query(..., description="Anonymous user ID"),
    to_user_id: str = Query(..., description="Target authenticated user ID"),
    db: Session = Depends(get_database)
):
    """Migrate all schedules and tags from anonymous user to authenticated user"""
    try:
        print(f"🔄 Migrating data from {from_user_id} to {to_user_id}")

        # Check if source user has any schedules
        schedule_count = db.query(Schedule).filter(Schedule.user_id == from_user_id).count()
        if schedule_count == 0:
            return {
                "success": True,
                "message": "No schedules to migrate",
                "migrated_schedules": 0,
                "migrated_tags": 0
            }

        # Migrate schedules
        db.query(Schedule).filter(Schedule.user_id == from_user_id).update(
            {"user_id": to_user_id},
            synchronize_session=False
        )

        # Migrate tags
        tag_count = db.query(Tag).filter(Tag.user_id == from_user_id).count()
        db.query(Tag).filter(Tag.user_id == from_user_id).update(
            {"user_id": to_user_id},
            synchronize_session=False
        )

        db.commit()

        print(f"✅ Migration complete: {schedule_count} schedules, {tag_count} tags")

        return {
            "success": True,
            "message": f"Successfully migrated {schedule_count} schedules and {tag_count} tags",
            "migrated_schedules": schedule_count,
            "migrated_tags": tag_count
        }

    except Exception as e:
        logger.error(f"Failed to migrate schedules: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/schedules/batch")
def batch_create_schedules(
    schedules: List[Dict] = Body(..., embed=True),
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """Batch create schedules"""
    try:
        created_schedules = []

        for schedule in schedules:
            new_schedule = Schedule(
                user_id=user_id,
                date=schedule.get('date', ''),
                time=schedule.get('time', ''),
                location=schedule.get('location', ''),
                couple=schedule.get('couple', ''),
                brand=schedule.get('brand', ''),
                album=schedule.get('album', ''),
                photographer=schedule.get('photographer', ''),
                contact=schedule.get('contact', ''),
                cuts=schedule.get('cuts', 0),
                price=schedule.get('price', 0),
                manager=schedule.get('manager', ''),
                memo=schedule.get('memo', ''),
                needs_review=schedule.get('isDuplicate', False),
            )

            db.add(new_schedule)
            db.flush()  # Get ID without committing

            print(f"📝 Created schedule - couple: '{new_schedule.couple}'")

            # Auto-create tags for brand and album
            auto_create_tags_from_schedule(db, user_id, new_schedule.brand, new_schedule.album)

            # Add to result list
            created_schedules.append({
                'id': str(new_schedule.id),
                'date': new_schedule.date,
                'time': new_schedule.time,
                'location': new_schedule.location,
                'couple': new_schedule.couple,
                'cuts': new_schedule.cuts,
                'price': new_schedule.price,
                'photographer': new_schedule.photographer,
                'contact': new_schedule.contact,
                'album': new_schedule.album,
                'brand': new_schedule.brand,
                'manager': new_schedule.manager,
                'memo': new_schedule.memo,
                'isDuplicate': new_schedule.needs_review,
                'createdAt': new_schedule.created_at.isoformat() if new_schedule.created_at else None,
                'updatedAt': new_schedule.updated_at.isoformat() if new_schedule.updated_at else None,
            })

        db.commit()

        return created_schedules

    except Exception as e:
        logger.error(f"Failed to batch create schedules: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/schedules/batch-delete")
def batch_delete_schedules(
    ids: List[str] = Body(..., embed=True),
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """Batch move schedules to trash (soft delete)"""
    try:
        service = ScheduleService(db)

        for schedule_id in ids:
            # Use ScheduleService to move to trash
            service.delete_schedule(user_id, int(schedule_id))

        return {"success": True, "message": f"Moved {len(ids)} schedules to trash"}

    except Exception as e:
        logger.error(f"Failed to batch delete schedules: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
