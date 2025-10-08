from fastapi import APIRouter, HTTPException, Query, Body, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
import os

from database import get_database, SessionLocal, ScheduleService, Schedule

router = APIRouter()
logger = logging.getLogger(__name__)

# Constants (should be imported from main)
SCHEDULES_DATA_DIR = 'data'
from constants import BACKUP_RETENTION_DAYS


# Helper Functions
def get_file_size_mb(file_path):
    """Get file size in MB"""
    try:
        return os.path.getsize(file_path) / (1024 * 1024)
    except:
        return 0


def cleanup_old_backups():
    """Clean up backup files older than retention period"""
    try:
        users_dir = os.path.join(SCHEDULES_DATA_DIR, "users")
        if not os.path.exists(users_dir):
            return

        cutoff_time = datetime.now() - timedelta(days=BACKUP_RETENTION_DAYS)
        cleaned_count = 0

        for user_folder in os.listdir(users_dir):
            user_path = os.path.join(users_dir, user_folder)
            if not os.path.isdir(user_path):
                continue

            for filename in os.listdir(user_path):
                file_path = os.path.join(user_path, filename)

                # Skip latest files and settings
                if filename in ["schedules_latest.json", "app_settings.json"]:
                    continue

                # Check if file is backup file (schedules_*.json.gz)
                if filename.startswith('schedules_') and filename.endswith('.json.gz'):
                    if os.path.isfile(file_path):
                        file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                        if file_time < cutoff_time:
                            file_size = get_file_size_mb(file_path)
                            os.remove(file_path)
                            cleaned_count += 1
                            print(f"Cleaned up: {filename} ({file_size:.2f}MB)")

        return cleaned_count
    except Exception as e:
        print(f"Cleanup error: {e}")
        return 0


# --- API Endpoints ---

@router.get("/api/backup-database")
async def backup_database(user_id: str = Query(...)):
    """사용자별 데이터를 JSON 형태로 안전하게 백업"""
    db = None
    try:
        logger.info(f"🔄 Starting backup for user: {user_id}")

        # 데이터베이스 연결
        db = SessionLocal()
        logger.info("✅ Database connection established")

        service = ScheduleService(db)
        logger.info("✅ ScheduleService initialized")

        # Google 사용자 ID에 접두사 추가
        original_user_id = user_id
        if not user_id.startswith('google_') and user_id != 'anonymous':
            user_id = f'google_{user_id}'

        logger.info(f"🔄 Processed user ID: {original_user_id} -> {user_id}")

        # 해당 사용자의 모든 스케줄 가져오기
        logger.info(f"🔄 Fetching schedules for user: {user_id}")
        schedules = service.get_all_schedules(user_id)
        logger.info(f"✅ Found {len(schedules) if schedules else 0} schedules")

        if not schedules:
            logger.warning(f"⚠️  No schedules found for user: {user_id}")
            return {
                "success": False,
                "message": "백업할 데이터가 없습니다."
            }

        # JSON 형태로 변환 (ID 제외, 사용자별 데이터만)
        logger.info("🔄 Converting schedules to dict format")

        # schedules를 안전하게 dict로 변환
        schedule_dicts = []
        for i, schedule in enumerate(schedules):
            try:
                schedule_dict = schedule.to_dict()
                schedule_dicts.append(schedule_dict)
                logger.debug(f"✅ Converted schedule {i+1}/{len(schedules)}")
            except Exception as e:
                logger.error(f"❌ Failed to convert schedule {i+1}: {str(e)}")
                # 변환 실패한 스케줄은 건너뛰고 계속 진행
                continue

        backup_data = {
            "version": "v2025.01",
            "backup_date": datetime.now().isoformat(),
            "user_id": user_id,
            "schedules": schedule_dicts
        }

        logger.info(f"✅ Backup data prepared with {len(schedule_dicts)} schedules")

        return {
            "success": True,
            "backup_data": backup_data,
            "count": len(schedule_dicts),
            "message": f"{len(schedule_dicts)}개의 스케줄이 백업되었습니다."
        }

    except Exception as e:
        error_msg = f"백업 중 오류가 발생했습니다: {str(e)}"
        logger.error(f"❌ Backup failed: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")

        return {
            "success": False,
            "message": error_msg
        }
    finally:
        if db:
            try:
                db.close()
                logger.info("✅ Database connection closed")
            except Exception as e:
                logger.error(f"❌ Error closing database: {str(e)}")


@router.post("/api/restore-database")
async def restore_database(request: dict = Body(...)):
    """사용자별 JSON 백업 데이터를 안전하게 복원"""
    try:
        db = SessionLocal()
        service = ScheduleService(db)

        user_id = request.get('user_id')
        backup_data = request.get('backup_data')

        # Google 사용자 ID에 접두사 추가
        if user_id and not user_id.startswith('google_') and user_id != 'anonymous':
            user_id = f'google_{user_id}'

        if not user_id or not backup_data:
            return {
                "success": False,
                "message": "사용자 ID와 백업 데이터가 필요합니다."
            }

        # 백업 데이터 검증
        if not isinstance(backup_data, dict) or 'schedules' not in backup_data:
            return {
                "success": False,
                "message": "유효하지 않은 백업 데이터 형식입니다."
            }

        schedules_data = backup_data['schedules']
        if not isinstance(schedules_data, list):
            return {
                "success": False,
                "message": "스케줄 데이터가 올바르지 않습니다."
            }

        # 해당 사용자의 기존 데이터 모두 삭제
        existing_count = service.get_schedule_count(user_id)
        if existing_count > 0:
            # 기존 데이터 삭제
            db.query(Schedule).filter(Schedule.user_id == user_id).delete()
            db.commit()

        # 새로운 데이터 벌크 추가 (성능 최적화)
        added_count = 0
        schedules_to_insert = []

        for schedule_data in schedules_data:
            try:
                # ID 필드 제거 (새로 생성되도록)
                if 'id' in schedule_data:
                    del schedule_data['id']

                # 스케줄 객체 생성 (아직 DB에 삽입하지 않음)
                schedule = Schedule.from_dict(schedule_data, user_id)
                schedules_to_insert.append(schedule)
                added_count += 1
            except Exception as e:
                print(f"스케줄 준비 실패: {e}")
                continue

        # 벌크 삽입 (한 번에 모든 데이터 삽입)
        if schedules_to_insert:
            db.add_all(schedules_to_insert)
            db.commit()

        return {
            "success": True,
            "message": f"복원 완료: {existing_count}개 삭제, {added_count}개 추가",
            "deleted_count": existing_count,
            "added_count": added_count
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"복원 중 오류가 발생했습니다: {str(e)}"
        }
    finally:
        db.close()


@router.post("/api/cleanup-backups")
def manual_cleanup():
    """Manually trigger backup cleanup"""
    try:
        cleaned_count = cleanup_old_backups()
        return {
            "success": True,
            "message": f"Cleaned up {cleaned_count} old backup files",
            "cleaned_count": cleaned_count
        }
    except Exception as e:
        return {"error": f"Cleanup failed: {str(e)}", "success": False}
