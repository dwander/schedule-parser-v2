from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
import logging

from database import get_database, ScheduleService

router = APIRouter()
logger = logging.getLogger(__name__)


# --- API Endpoints ---

@router.get("/api/trash/schedules")
async def get_trash_schedules(
    user_id: str = Query(...),
    db: Session = Depends(get_database)
):
    """Get all deleted schedules (trash) for a user"""
    try:
        service = ScheduleService(db)
        trash_schedules = service.get_trash_schedules(user_id)
        return [schedule.to_dict() for schedule in trash_schedules]
    except Exception as e:
        logger.error(f"Failed to get trash schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/schedules/{schedule_id}/restore")
async def restore_schedule(
    schedule_id: int,
    user_id: str = Query(...),
    db: Session = Depends(get_database)
):
    """Restore a deleted schedule from trash"""
    try:
        service = ScheduleService(db)
        restored = service.restore_schedule(user_id, schedule_id)

        if not restored:
            raise HTTPException(status_code=404, detail="Schedule not found in trash")

        return {
            "success": True,
            "message": f"Successfully restored schedule {schedule_id}",
            "schedule": restored.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to restore schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/schedules/{schedule_id}/permanent")
async def permanent_delete_schedule(
    schedule_id: int,
    user_id: str = Query(...),
    db: Session = Depends(get_database)
):
    """Permanently delete a schedule from trash"""
    try:
        service = ScheduleService(db)
        success = service.permanent_delete_schedule(user_id, schedule_id)

        if not success:
            raise HTTPException(status_code=404, detail="Schedule not found in trash")

        return {
            "success": True,
            "message": f"Permanently deleted schedule {schedule_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to permanently delete schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/trash/schedules")
async def empty_trash(
    user_id: str = Query(...),
    db: Session = Depends(get_database)
):
    """Permanently delete all schedules in trash for a user"""
    try:
        service = ScheduleService(db)
        deleted_count = service.empty_trash(user_id)

        return {
            "success": True,
            "message": f"Emptied trash ({deleted_count} items)",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Failed to empty trash: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/trash/schedules/batch-restore")
async def batch_restore_schedules(
    ids: list[int],
    user_id: str = Query(...),
    db: Session = Depends(get_database)
):
    """Batch restore schedules from trash - optimized"""
    try:
        service = ScheduleService(db)
        restored_count = service.batch_restore_schedules(user_id, ids)

        if restored_count == 0:
            raise HTTPException(status_code=404, detail="No schedules found in trash")

        return {
            "success": True,
            "message": f"Successfully restored {restored_count} schedules",
            "restored_count": restored_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to batch restore schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/trash/schedules/restore-all")
async def restore_all_trash(
    user_id: str = Query(...),
    db: Session = Depends(get_database)
):
    """Restore all schedules from trash for a user"""
    try:
        service = ScheduleService(db)
        restored_count = service.restore_all_trash(user_id)

        if restored_count == 0:
            return {
                "success": True,
                "message": "No schedules in trash to restore",
                "restored_count": 0
            }

        return {
            "success": True,
            "message": f"Successfully restored all {restored_count} schedules",
            "restored_count": restored_count
        }
    except Exception as e:
        logger.error(f"Failed to restore all trash: {e}")
        raise HTTPException(status_code=500, detail=str(e))
