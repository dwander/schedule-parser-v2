"""
LEGACY: Railway Persistent Storage Helper Functions
These functions are deprecated and should not be used in new code.
Use database-based storage instead.
"""

import os
import json
from datetime import datetime
from typing import Optional

from config import settings
from utils import (
    save_json_compressed,
    load_json_compressed,
)


# Railway Persistent Volume 저장소 설정
STORAGE_DIR = settings.storage_dir
USERS_DATA_DIR = os.path.join(STORAGE_DIR, 'users')


def get_user_data_dir(user_id: str) -> str:
    """Get the directory path for a specific user"""
    user_dir = os.path.join(USERS_DATA_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir


def save_to_persistent_storage(user_id: str, schedules_data: dict) -> bool:
    """Save schedules to Railway Persistent Volume"""
    try:
        user_dir = get_user_data_dir(user_id)
        schedules_file = os.path.join(user_dir, 'schedules.json')
        metadata_file = os.path.join(user_dir, 'metadata.json')

        # Save schedules data with compression
        save_json_compressed(schedules_data, schedules_file.replace('.json', ''))

        # Save metadata
        metadata = {
            'user_id': user_id,
            'last_updated': datetime.utcnow().isoformat(),
            'schedules_count': len(schedules_data.get('schedules', [])),
            'version': '2.0',  # New persistent storage version
            'storage_type': 'railway_persistent'
        }

        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        print(f"✅ Persistent storage save successful ({metadata['schedules_count']} schedules)")
        return True

    except Exception as e:
        print(f"❌ Persistent storage save failed: {e}")
        return False


def load_from_persistent_storage(user_id: str) -> Optional[dict]:
    """Load schedules from Railway Persistent Volume"""
    try:
        user_dir = get_user_data_dir(user_id)
        schedules_file = os.path.join(user_dir, 'schedules.json')
        metadata_file = os.path.join(user_dir, 'metadata.json')

        # Check for compressed file first, fallback to regular file
        compressed_file = schedules_file.replace('.json', '.gz')

        if os.path.exists(compressed_file):
            print(f"📦 Loading compressed data")
            schedules_data = load_json_compressed(schedules_file.replace('.json', ''))
        elif os.path.exists(schedules_file):
            print(f"📄 Loading uncompressed data")
            with open(schedules_file, 'r', encoding='utf-8') as f:
                schedules_data = json.load(f)
        else:
            print(f"📁 No persistent data found")
            return None

        # Load metadata if exists
        metadata = {}
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

        result = {
            'schedules': schedules_data.get('schedules', []),
            'metadata': metadata,
            'user_id': user_id,
            'source': 'railway_persistent'
        }

        print(f"✅ Persistent storage load successful ({len(result['schedules'])} schedules)")
        return result

    except Exception as e:
        print(f"❌ Persistent storage load failed: {e}")
        return None


def get_persistent_storage_status(user_id: str) -> dict:
    """Get persistent storage status for a user"""
    try:
        user_dir = get_user_data_dir(user_id)
        schedules_file = os.path.join(user_dir, 'schedules.json')
        compressed_file = schedules_file.replace('.json', '.gz')
        metadata_file = os.path.join(user_dir, 'metadata.json')

        # Check for either compressed or uncompressed file
        has_schedules = os.path.exists(compressed_file) or os.path.exists(schedules_file)

        status = {
            'user_id': user_id,
            'has_data': has_schedules,
            'has_metadata': os.path.exists(metadata_file),
            'last_updated': None,
            'schedules_count': 0,
            'storage_type': 'railway_persistent'
        }

        if status['has_metadata']:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                status.update(metadata)

        return status

    except Exception as e:
        print(f"❌ Failed to get persistent storage status: {e}")
        return {'user_id': user_id, 'error': str(e)}
