from fastapi import FastAPI, Body, UploadFile, File, HTTPException, Query, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, HTMLResponse
from typing import List, Dict, Optional, Union
import json
import os
from datetime import datetime, timedelta
from pydantic import BaseModel, ValidationError
import logging
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import config
from config import settings

# Import parsing functions from our parser module
from parser import parse_schedules, parse_schedules_classic_only, parse_schedules_ai_only

# Import database modules
from database import get_database, ScheduleService, create_tables, test_connection, run_migrations, SessionLocal, Schedule, Tag, User, PricingRule, TrashSchedule

# Import constants
from constants import (
    SERVICE_NAME,
    DRIVE_FOLDER_NAME,
    NAVER_DEFAULT_CALENDAR_ID,
    DEV_ORIGINS,
    PRODUCTION_ORIGINS,
    BACKUP_RETENTION_DAYS,
)

# Import legacy functions (deprecated - Google Drive & Storage)
from legacy import (
    get_user_data_dir,
    save_to_persistent_storage,
    load_from_persistent_storage,
    get_persistent_storage_status,
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
    USERS_DATA_DIR,
)

# Import schemas
from schemas import (
    GoogleAuthRequest,
    GoogleTokenRequest,
    NaverAuthRequest,
    KakaoAuthRequest,
    NaverCalendarRequest,
    SaveSchedulesRequest,
    LoadSchedulesRequest,
    PersistentSaveRequest,
    PersistentLoadRequest,
    ParseTextRequest,
)

# --- App Initialization ---
app = FastAPI()

# --- Logger Initialization ---
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Database Initialization ---
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("🔄 Initializing database...")
    try:
        # Test connection
        if test_connection():
            print("✅ Database connection established")

            # Create tables if they don't exist
            create_tables()

            # Run database migrations
            run_migrations()

            print("✅ Database initialization complete")
        else:
            print("❌ Database connection failed")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")

# --- CORS Configuration ---
# This allows the frontend to communicate with the backend.
origins = DEV_ORIGINS.copy()

# Add production frontend URL if specified
if settings.FRONTEND_URL:
    origins.append(settings.FRONTEND_URL)

# Railway 환경에서는 모든 Railway 도메인 허용 (프로덕션, 테스트 등)
if settings.is_railway:
    origins.extend(PRODUCTION_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Validation Error Handler ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ Validation error on {request.method} {request.url.path}")
    print(f"🔍 Error details: {exc.errors()}")

    # Log the request body for debugging
    try:
        body = await request.body()
        print(f"📄 Request body: {body.decode('utf-8')}")
    except Exception as e:
        print(f"⚠️ Could not read request body: {e}")

    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed",
            "detail": exc.errors(),
            "success": False
        }
    )

# --- OAuth Configuration (from settings) ---
# Google
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
DEV_ADMIN_ID = settings.DEV_ADMIN_ID

# Naver
NAVER_CLIENT_ID = settings.NAVER_CLIENT_ID
NAVER_CLIENT_SECRET = settings.NAVER_CLIENT_SECRET

# Kakao
KAKAO_REST_API_KEY = settings.KAKAO_REST_API_KEY
KAKAO_CLIENT_SECRET = settings.KAKAO_CLIENT_SECRET

# Redirect URIs (계산됨)
GOOGLE_REDIRECT_URI = settings.GOOGLE_REDIRECT_URI
NAVER_REDIRECT_URI = settings.NAVER_REDIRECT_URI
KAKAO_REDIRECT_URI = settings.KAKAO_REDIRECT_URI

# --- Storage Configuration ---
ENABLE_LOCAL_BACKUP = settings.ENABLE_LOCAL_BACKUP

# --- Data File Path ---
# The path is relative to the root of the project where the server will be started.
DATA_FILE_PATH = '../.screenshot/KakaoTalk_20250814_1307_38_031_KPAG_매니저.txt'
SCHEDULES_DATA_DIR = 'data'
SCHEDULES_DATA_FILE = 'schedules_latest.json'

# Railway Persistent Volume 저장소 설정
STORAGE_DIR = settings.storage_dir
USERS_DATA_DIR = os.path.join(STORAGE_DIR, 'users')

# Ensure directories exist
os.makedirs(SCHEDULES_DATA_DIR, exist_ok=True)
os.makedirs(USERS_DATA_DIR, exist_ok=True)

print(f"📁 Data directories initialized:")
print(f"  - Legacy data: {SCHEDULES_DATA_DIR}")
print(f"  - Storage: {STORAGE_DIR}")
print(f"  - Users data: {USERS_DATA_DIR}")

# --- API Endpoints ---

# --- Include Routers ---
from routers import auth, users, schedules, trash, parser, storage, backup, tags, pricing, naver, apple, pages

# Authentication routes
app.include_router(auth.router, tags=["Authentication"])

# Naver calendar routes
app.include_router(naver.router, tags=["Naver"])

# Apple calendar routes
app.include_router(apple.router, tags=["Apple"])

# User management routes  
app.include_router(users.router, tags=["Users"])

# Parser routes
app.include_router(parser.router, tags=["Parser"])

# Schedule CRUD routes
app.include_router(schedules.router, tags=["Schedules"])

# Trash bin routes
app.include_router(trash.router, tags=["Trash"])

# Tag management routes
app.include_router(tags.router, tags=["Tags"])

# Pricing rules routes
app.include_router(pricing.router, tags=["Pricing"])

# Storage/load routes
app.include_router(storage.router, tags=["Storage"])

# Backup/restore routes
app.include_router(backup.router, tags=["Backup"])

# Static pages routes
app.include_router(pages.router, tags=["Pages"])
