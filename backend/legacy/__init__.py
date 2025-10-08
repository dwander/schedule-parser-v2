"""
LEGACY 모듈
이 모듈의 모든 함수는 deprecated 상태입니다.
새로운 코드에서는 사용하지 마세요. 데이터베이스 기반 저장소를 사용하세요.
"""

# Storage functions (Railway Persistent Volume)
from .storage import (
    get_user_data_dir,
    save_to_persistent_storage,
    load_from_persistent_storage,
    get_persistent_storage_status,
    STORAGE_DIR,
    USERS_DATA_DIR,
)

# Google Drive functions
from .drive import (
    get_drive_service,
    save_to_drive_direct,
    find_or_create_folder_direct,
    find_or_create_app_folder,
    save_to_drive,
    save_to_drive_advanced,
    save_metadata_to_drive_service,
    load_from_drive,
    save_metadata_to_drive,
    load_metadata_from_drive,
)

__all__ = [
    # Storage
    'get_user_data_dir',
    'save_to_persistent_storage',
    'load_from_persistent_storage',
    'get_persistent_storage_status',
    'STORAGE_DIR',
    'USERS_DATA_DIR',
    # Google Drive
    'get_drive_service',
    'save_to_drive_direct',
    'find_or_create_folder_direct',
    'find_or_create_app_folder',
    'save_to_drive',
    'save_to_drive_advanced',
    'save_metadata_to_drive_service',
    'load_from_drive',
    'save_metadata_to_drive',
    'load_metadata_from_drive',
]
