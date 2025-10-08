from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict
from datetime import datetime
import os
import json

from database import get_database, ScheduleService

router = APIRouter()


# Import helper functions from main (these will be moved to utils later)
# For now, importing from main
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))


# Data Models
class SaveSchedulesRequest(BaseModel):
    schedules: any  # Union[List[Dict], str] - schedules or compressed data
    user_id: str
    access_token: str = None
    refresh_token: str = None
    device_uuid: str = None
    schedules_data: Dict = None


class LoadSchedulesRequest(BaseModel):
    user_id: str
    access_token: str
    refresh_token: str = None


class PersistentSaveRequest(BaseModel):
    user_id: str
    schedules_data: Dict


class PersistentLoadRequest(BaseModel):
    user_id: str


# Constants (should be imported from main, but defining here for now)
SCHEDULES_DATA_DIR = 'data'


# --- API Endpoints ---

@router.post("/api/save-schedules")
def save_schedules_to_server(request: SaveSchedulesRequest):
    """Save schedules to persistent storage with user-specific storage."""
    # Import helper function from main
    from main import save_to_persistent_storage

    # 로그 수집을 위한 리스트
    debug_logs = []

    def log_and_collect(message):
        print(message)
        debug_logs.append(message)

    try:
        # Persistent storage에 저장할 데이터
        schedules_data = request.schedules_data

        # 데이터 크기 확인
        if isinstance(schedules_data, dict) and 'schedules' in schedules_data:
            schedules_count = len(schedules_data['schedules'])
        else:
            schedules_count = 0

        log_and_collect(f"📥 Persistent Save request: user_id={request.user_id}, schedules_count={schedules_count}")
        log_and_collect(f"🔍 Request validation successful. Processing persistent storage...")

        log_and_collect(f"📊 저장할 스케줄 개수: {schedules_count}")
        user_id = request.user_id

        # Save to persistent storage
        success = save_to_persistent_storage(user_id, schedules_data)

        if success:
            return {
                "success": True,
                "message": f"Persistent storage save successful for user {user_id}",
                "saved_schedules": schedules_count,
                "storage_type": "persistent_volume"
            }
        else:
            return {
                "success": False,
                "error": "Failed to save to persistent storage"
            }
    except Exception as e:
        return {"error": f"Failed to save schedules: {str(e)}", "success": False}


@router.post("/api/check-sync-metadata")
def check_sync_metadata(request: LoadSchedulesRequest):
    """클라우드 메타데이터만 확인하여 동기화 필요 여부 판단"""
    from main import get_drive_service, find_or_create_app_folder, load_metadata_from_drive

    try:
        user_id = request.user_id
        access_token = request.access_token
        refresh_token = request.refresh_token

        if not user_id:
            return {"success": False, "message": "No user ID provided"}

        if not access_token:
            return {"success": False, "message": "No access token provided"}

        try:
            service = get_drive_service(access_token, refresh_token)
            folder_id = find_or_create_app_folder(service)
            filename = f"schedules_{user_id}.json"

            # 메타데이터만 로드
            metadata = load_metadata_from_drive(service, folder_id, filename)

            if metadata:
                return {
                    "success": True,
                    "has_cloud_data": True,
                    "metadata": metadata,
                    "message": "클라우드 메타데이터 조회 성공"
                }
            else:
                return {
                    "success": True,
                    "has_cloud_data": False,
                    "metadata": None,
                    "message": "클라우드에 데이터 없음"
                }

        except Exception as e:
            return {
                "success": False,
                "message": f"메타데이터 조회 실패: {str(e)}"
            }

    except Exception as e:
        return {
            "success": False,
            "message": f"요청 처리 실패: {str(e)}"
        }


@router.post("/api/load-schedules")
def load_schedules_from_server(request: LoadSchedulesRequest):
    """Load latest schedules from Google Drive with local fallback."""
    from main import get_drive_service, find_or_create_app_folder, load_from_drive

    try:
        user_id = request.user_id
        access_token = request.access_token
        refresh_token = request.refresh_token

        if not user_id:
            return {"data": [], "success": True, "message": "No user ID provided"}

        drive_data = None
        local_data = None

        # Try to load from Google Drive first
        if access_token:
            try:
                service = get_drive_service(access_token, refresh_token)
                folder_id = find_or_create_app_folder(service)
                filename = f"schedules_{user_id}.json"
                drive_data = load_from_drive(service, folder_id, filename)
                if drive_data:
                    print(f"✅ Google Drive load successful")
                else:
                    print(f"📁 No data found in Google Drive")

            except Exception as drive_error:
                print(f"❌ Google Drive load failed: {drive_error}")

        # Load from local storage as fallback
        user_data_dir = os.path.join(SCHEDULES_DATA_DIR, "users", user_id)
        latest_path = os.path.join(user_data_dir, "schedules_latest.json")

        if os.path.exists(latest_path):
            with open(latest_path, 'r', encoding='utf-8') as f:
                local_data = json.load(f)
            print(f"📱 Local data loaded")

        # Determine which data to use (prefer newer timestamp)
        final_data = None
        data_source = "none"

        if drive_data and local_data:
            drive_timestamp = drive_data.get("timestamp", "")
            local_timestamp = local_data.get("timestamp", "")
            if drive_timestamp >= local_timestamp:
                final_data = drive_data
                data_source = "drive"
            else:
                final_data = local_data
                data_source = "local"
        elif drive_data:
            final_data = drive_data
            data_source = "drive"
        elif local_data:
            final_data = local_data
            data_source = "local"

        if final_data:
            return {
                "data": final_data,
                "success": True,
                "source": data_source,
                "message": f"Schedules loaded from {data_source}"
            }
        else:
            return {
                "data": [],
                "success": True,
                "source": "none",
                "message": f"No saved schedules found for user {user_id}"
            }

    except Exception as e:
        return {"error": f"Failed to load schedules: {str(e)}", "success": False}


@router.get("/api/load-schedules")
def load_schedules_from_server_get(user_id: str = Query(None)):
    """Load latest schedules from local server only (backward compatibility)."""
    try:
        if not user_id:
            return {"data": [], "success": True, "message": "No user ID provided"}

        # Load user-specific schedules from local only
        user_data_dir = os.path.join(SCHEDULES_DATA_DIR, "users", user_id)
        latest_path = os.path.join(user_data_dir, "schedules_latest.json")

        if not os.path.exists(latest_path):
            return {"data": [], "success": True, "message": f"No saved schedules found for user {user_id}"}

        with open(latest_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return {
            "data": data.get("schedules", []),
            "success": True,
            "version": data.get("version"),
            "timestamp": data.get("timestamp"),
            "user_id": user_id,
            "source": "local"
        }
    except Exception as e:
        return {"error": f"Failed to load schedules: {str(e)}", "success": False}


@router.post("/api/persistent/save")
async def save_to_database(request: PersistentSaveRequest, db: Session = Depends(get_database)):
    """Save schedules to PostgreSQL database"""
    from routers.schedules import auto_create_tags_from_schedule

    try:
        user_id = request.user_id
        schedules_data = request.schedules_data

        # Extract schedules array from schedules_data
        schedules = []
        if isinstance(schedules_data, dict) and 'schedules' in schedules_data:
            schedules = schedules_data['schedules']
        elif isinstance(schedules_data, list):
            schedules = schedules_data

        schedules_count = len(schedules)
        print(f"📥 Database save request: schedules_count={schedules_count}")

        # Save to database using ScheduleService
        service = ScheduleService(db)
        saved_schedules = service.save_schedules(user_id, schedules)

        # Auto-create tags from saved schedules
        for schedule in schedules:
            brand = schedule.get('brand', '')
            album = schedule.get('album', '')
            if brand or album:
                auto_create_tags_from_schedule(db, user_id, brand, album)

        db.commit()

        return {
            "success": True,
            "message": f"Successfully saved {schedules_count} schedules to database",
            "schedules_count": schedules_count,
            "storage_type": "postgresql"
        }

    except Exception as e:
        print(f"❌ Database save error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Database save failed: {str(e)}")


@router.post("/api/persistent/load")
async def load_from_database(request: PersistentLoadRequest, db: Session = Depends(get_database)):
    """Load schedules from PostgreSQL database"""
    try:
        user_id = request.user_id

        print(f"📤 Database load request")

        # Load from database using ScheduleService
        service = ScheduleService(db)
        schedules = service.get_schedules(user_id)

        # Convert to dictionaries (compatible with frontend)
        schedules_data = [schedule.to_dict() for schedule in schedules]

        return {
            "success": True,
            "data": schedules_data,
            "last_modified": datetime.now().isoformat(),
            "source": "postgresql",
            "message": f"Successfully loaded {len(schedules_data)} schedules from database"
        }

    except Exception as e:
        print(f"❌ Database load error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Database load failed: {str(e)}")


@router.get("/api/persistent/status/{user_id}")
async def get_database_status_api(user_id: str, db: Session = Depends(get_database)):
    """Get database storage status for a user"""
    try:
        print(f"📊 Database status request")

        # Check database for user data
        service = ScheduleService(db)
        schedules_count = service.get_schedule_count(user_id)
        has_data = schedules_count > 0

        status = {
            "user_id": user_id,
            "has_data": has_data,
            "schedules_count": schedules_count,
            "storage_type": "postgresql"
        }

        return {
            "success": True,
            **status
        }

    except Exception as e:
        print(f"❌ Database status error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to get database status: {str(e)}")
