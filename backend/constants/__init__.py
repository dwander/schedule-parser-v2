"""
백엔드 상수 모듈
"""

from .service import (
    SERVICE_NAME,
    SERVICE_NAME_EN,
    DRIVE_FOLDER_NAME,
    NAVER_DEFAULT_CALENDAR_ID,
)

from .cors import (
    DEV_ORIGINS,
    PRODUCTION_ORIGINS,
)

from .storage import (
    BACKUP_RETENTION_DAYS,
    BACKUP_FILE_PREFIX,
    STORAGE_BASE_PATH,
)

__all__ = [
    # Service
    "SERVICE_NAME",
    "SERVICE_NAME_EN",
    "DRIVE_FOLDER_NAME",
    "NAVER_DEFAULT_CALENDAR_ID",
    # CORS
    "DEV_ORIGINS",
    "PRODUCTION_ORIGINS",
    # Storage
    "BACKUP_RETENTION_DAYS",
    "BACKUP_FILE_PREFIX",
    "STORAGE_BASE_PATH",
]
