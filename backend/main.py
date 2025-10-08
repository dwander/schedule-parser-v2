from fastapi import FastAPI, Body, UploadFile, File, HTTPException, Query, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, HTMLResponse
from typing import List, Dict, Optional, Union
import json
import os
import gzip
import base64
from datetime import datetime, timedelta
import requests
from pydantic import BaseModel, ValidationError
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import io
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

# --- Data Models ---
class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None  # 프론트엔드에서 사용한 redirect_uri를 받음

class GoogleTokenRequest(BaseModel):
    credential: str  # ID Token (JWT)

class NaverAuthRequest(BaseModel):
    code: str
    state: str

class KakaoAuthRequest(BaseModel):
    code: str

class NaverCalendarRequest(BaseModel):
    access_token: str
    subject: str
    location: str
    start_datetime: str  # ISO 8601 format
    end_datetime: str    # ISO 8601 format
    description: Optional[str] = None

class SaveSchedulesRequest(BaseModel):
    schedules: Union[List[Dict], str]  # 압축된 문자열도 허용
    user_id: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    device_uuid: Optional[str] = None

class LoadSchedulesRequest(BaseModel):
    user_id: str
    access_token: str
    refresh_token: Optional[str] = None

# Railway Persistent Storage Models
class PersistentSaveRequest(BaseModel):
    user_id: str
    schedules_data: Dict

class PersistentLoadRequest(BaseModel):
    user_id: str

class ParseTextRequest(BaseModel):
    text: str
    engine: str = "hybrid"  # classic, hybrid, ai_only

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

# --- Railway Persistent Storage Helper Functions ---
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

# --- Google Drive Helper Functions ---
def get_drive_service(access_token, refresh_token=None):
    """Create Google Drive service using access token and refresh token"""
    try:
        # Create credentials with all necessary fields
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET
        )

        # Check if token needs refresh
        print(f"🔍 Token valid: {credentials.valid}, Has refresh token: {bool(refresh_token)}")

        # Try to refresh the token if it's expired
        if refresh_token and not credentials.valid:
            try:
                print(f"🔄 Refreshing expired access token...")
                credentials.refresh(GoogleAuthRequest())
                print(f"✅ Access token refreshed successfully")
                # Token refreshed successfully
            except Exception as refresh_error:
                # Failed to refresh token
                # Continue with original token, might still work
                pass
        elif not refresh_token:
            print(f"⚠️ No refresh token available for token refresh")
        else:
            print(f"🟢 Token is still valid, no refresh needed")

        # Build and return the service
        service = build('drive', 'v3', credentials=credentials)
        print(f"✅ Google Drive service created successfully")
        return service
    except Exception as e:
        print(f"❌ Failed to create Drive service: {e}")
        raise e

def save_to_drive_direct(access_token, folder_id, filename, data, log_func=print):
    """Direct HTTP API call to Google Drive with compression and metadata"""
    import requests
    from datetime import datetime

    log_func(f"🔍 Direct Drive API call with token: {access_token[:20]}...")

    try:
        # 1. 데이터 압축
        log_func(f"📦 데이터 압축 중...")
        compressed_data, original_size, compressed_size = compress_json_data(data)

        # 2. 메타데이터 생성
        timestamp = datetime.now()
        version = timestamp.strftime("%Y%m%d_%H")
        schedules = data.get("schedules", [])
        user_id = data.get("user_id", "unknown")

        metadata = create_metadata(schedules, timestamp, version, user_id, original_size, compressed_size, request.device_uuid)

        # 3. 메타데이터 파일 먼저 저장
        log_func(f"📝 메타데이터 파일 저장 중...")
        meta_id = save_metadata_to_drive(access_token, folder_id, filename, metadata, log_func)

        if not meta_id:
            log_func(f"❌ 메타데이터 저장 실패")
            return None

        # 4. 압축된 데이터 파일 저장
        log_func(f"🗜️ 압축 데이터 파일 저장 중...")
        compressed_filename = filename.replace('.json', '.gz.b64')
        file_metadata = {
            'name': compressed_filename,
            'parents': [folder_id] if folder_id else []
        }

        headers = {'Authorization': f'Bearer {access_token}'}

        files = {
            'metadata': (None, json.dumps(file_metadata), 'application/json'),
            'media': (compressed_filename, compressed_data, 'text/plain')
        }

        response = requests.post(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            headers=headers,
            files=files
        )

        log_func(f"🔍 Drive API response status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            file_id = result.get('id')
            log_func(f"✅ 압축 데이터 저장 완료: {file_id}")
            log_func(f"✅ 메타데이터 + 데이터 저장 성공")
            return file_id
        else:
            log_func(f"❌ Drive API error: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        log_func(f"❌ Direct Drive upload failed: {type(e).__name__}: {e}")
        return None

def find_or_create_folder_direct(access_token, folder_name, log_func=print):
    """Direct API call to find or create folder"""
    import requests

    try:
        headers = {
            'Authorization': f'Bearer {access_token}'
        }

        # Search for existing folder
        search_url = 'https://www.googleapis.com/drive/v3/files'
        params = {
            'q': f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            'fields': 'files(id, name)'
        }

        response = requests.get(search_url, headers=headers, params=params)

        if response.status_code == 200:
            files = response.json().get('files', [])
            if files:
                folder_id = files[0]['id']
                log_func(f"✅ Found existing folder: {folder_id}")
                return folder_id

        # Create new folder
        folder_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }

        response = requests.post(
            'https://www.googleapis.com/drive/v3/files',
            headers={**headers, 'Content-Type': 'application/json'},
            data=json.dumps(folder_metadata)
        )

        if response.status_code == 200:
            folder = response.json()
            folder_id = folder.get('id')
            log_func(f"✅ Created new folder: {folder_id}")
            return folder_id
        else:
            log_func(f"❌ Folder creation failed: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        log_func(f"❌ Folder operation failed: {type(e).__name__}: {e}")
        return None

def find_or_create_app_folder(service):
    """Find or create the app folder in Google Drive"""
    folder_name = DRIVE_FOLDER_NAME

    try:
        print(f"🔍 Searching for folder: {folder_name}")
        # Search for existing folder
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, fields="files(id, name)").execute()
        folders = results.get('files', [])

        if folders:
            print(f"✅ Found existing folder: {folders[0]['id']}")
            return folders[0]['id']

        # Create new folder if not found
        print(f"📁 Creating new folder: {folder_name}")
        folder_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        folder = service.files().create(body=folder_metadata, fields='id').execute()
        folder_id = folder.get('id')
        print(f"✅ Created folder with ID: {folder_id}")
        return folder_id
    except Exception as e:
        print(f"❌ Folder creation/search failed: {e}")
        raise e

def save_to_drive(service, folder_id, filename, data):
    """Save JSON data to Google Drive"""
    try:
        # Convert data to JSON string
        json_data = json.dumps(data, ensure_ascii=False, indent=2)

        # Create file metadata
        file_metadata = {
            'name': filename,
            'parents': [folder_id]
        }

        # Check if file already exists
        query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
        results = service.files().list(q=query, fields="files(id)").execute()
        existing_files = results.get('files', [])

        # Create a temporary file to upload
        temp_file_path = f"/tmp/{filename}"
        with open(temp_file_path, 'w', encoding='utf-8') as f:
            f.write(json_data)

        media = MediaFileUpload(temp_file_path, mimetype='application/json')

        if existing_files:
            # Update existing file
            file_id = existing_files[0]['id']
            file = service.files().update(
                fileId=file_id,
                media_body=media
            ).execute()
        else:
            # Create new file
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()

        # Clean up temp file
        os.remove(temp_file_path)

        return file.get('id')
    except Exception as e:
        print(f"Error saving to Drive: {e}")
        raise e

def save_to_drive_advanced(service, folder_id, filename, data, device_uuid=None, log_func=print):
    """Save JSON data to Google Drive with compression and metadata using Google client library"""
    from datetime import datetime
    from googleapiclient.http import MediaInMemoryUpload
    import io

    try:
        # 1. 데이터 압축
        log_func(f"📦 데이터 압축 중...")
        compressed_data, original_size, compressed_size = compress_json_data(data)

        # 2. 메타데이터 생성
        timestamp = datetime.now()
        version = timestamp.strftime("%Y%m%d_%H")
        schedules = data.get("schedules", [])
        user_id = data.get("user_id", "unknown")

        metadata = create_metadata(schedules, timestamp, version, user_id, original_size, compressed_size, device_uuid)

        # 3. 메타데이터 파일 먼저 저장
        log_func(f"📝 메타데이터 파일 저장 중...")
        meta_filename = filename.replace('.json', '_metadata.json')
        meta_id = save_metadata_to_drive_service(service, folder_id, meta_filename, metadata, log_func)

        if not meta_id:
            log_func(f"❌ 메타데이터 저장 실패")
            return None

        # 4. 압축된 데이터 파일 저장
        log_func(f"🗜️ 압축 데이터 파일 저장 중...")
        compressed_filename = filename.replace('.json', '.gz.b64')

        # Create file metadata
        file_metadata = {
            'name': compressed_filename,
            'parents': [folder_id]
        }

        # Check if file already exists
        query = f"name='{compressed_filename}' and '{folder_id}' in parents and trashed=false"
        results = service.files().list(q=query, fields="files(id)").execute()
        existing_files = results.get('files', [])

        # Create media upload from compressed data
        media = MediaInMemoryUpload(compressed_data.encode('utf-8'), mimetype='text/plain')

        if existing_files:
            # Update existing file
            file_id = existing_files[0]['id']
            file = service.files().update(
                fileId=file_id,
                media_body=media
            ).execute()
            log_func(f"✅ 기존 파일 업데이트: {file_id}")
        else:
            # Create new file
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            file_id = file.get('id')
            log_func(f"✅ 새 파일 생성: {file_id}")

        log_func(f"✅ 메타데이터 + 압축 데이터 저장 성공")
        return file.get('id')

    except Exception as e:
        log_func(f"❌ 고급 Drive 업로드 실패: {type(e).__name__}: {e}")
        return None

def save_metadata_to_drive_service(service, folder_id, filename, metadata, log_func=print):
    """Save metadata file to Google Drive using service object"""
    from googleapiclient.http import MediaInMemoryUpload
    import json

    try:
        # Create file metadata
        file_metadata = {
            'name': filename,
            'parents': [folder_id]
        }

        # Check if file already exists
        query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
        results = service.files().list(q=query, fields="files(id)").execute()
        existing_files = results.get('files', [])

        # Convert metadata to JSON
        metadata_json = json.dumps(metadata, ensure_ascii=False, indent=2)
        media = MediaInMemoryUpload(metadata_json.encode('utf-8'), mimetype='application/json')

        if existing_files:
            # Update existing file
            file_id = existing_files[0]['id']
            file = service.files().update(
                fileId=file_id,
                media_body=media
            ).execute()
            log_func(f"✅ 메타데이터 파일 업데이트: {file_id}")
        else:
            # Create new file
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            file_id = file.get('id')
            log_func(f"✅ 메타데이터 파일 생성: {file_id}")

        return file.get('id')

    except Exception as e:
        log_func(f"❌ 메타데이터 저장 실패: {e}")
        return None

def load_from_drive(service, folder_id, filename):
    """Load JSON data from Google Drive with compression support"""
    try:
        # 먼저 압축된 파일 검색 (.gz.b64)
        compressed_filename = filename.replace('.json', '.gz.b64')
        query = f"name='{compressed_filename}' and '{folder_id}' in parents and trashed=false"
        results = service.files().list(q=query, fields="files(id, name)").execute()
        files = results.get('files', [])

        # 압축된 파일이 없으면 원본 파일 검색
        if not files:
            print(f"📁 압축 파일 없음, 원본 파일 검색: {filename}")
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = service.files().list(q=query, fields="files(id, name)").execute()
            files = results.get('files', [])

            if not files:
                return None

            # 원본 파일 로드 (기존 방식)
            file_id = files[0]['id']
            request = service.files().get_media(fileId=file_id)
            file_io = io.BytesIO()
            downloader = MediaIoBaseDownload(file_io, request)

            done = False
            while done is False:
                status, done = downloader.next_chunk()

            file_io.seek(0)
            content = file_io.read().decode('utf-8')
            return json.loads(content)

        # 압축된 파일 로드 및 해제
        print(f"📦 압축된 파일 발견, 해제 중: {compressed_filename}")
        file_id = files[0]['id']

        # Download compressed file content
        request = service.files().get_media(fileId=file_id)
        file_io = io.BytesIO()
        downloader = MediaIoBaseDownload(file_io, request)

        done = False
        while done is False:
            status, done = downloader.next_chunk()

        # 압축 해제
        file_io.seek(0)
        compressed_b64 = file_io.read().decode('utf-8')
        return decompress_json_data(compressed_b64)

    except Exception as e:
        print(f"Error loading from Drive: {e}")
        return None

# --- Helper Functions ---
def calculate_checksum(schedules):
    """스케줄 데이터의 체크섬 계산"""
    try:
        # 스케줄을 정규화하고 정렬
        sorted_schedules = []
        for s in schedules:
            normalized = f"{s.get('date', '')}-{s.get('time', '')}-{s.get('couple', '')}"
            sorted_schedules.append(normalized)

        sorted_schedules.sort()
        combined = '|'.join(sorted_schedules)

        # 간단한 해시 함수 (프론트엔드와 동일)
        hash_value = 0
        for char in combined:
            hash_value = ((hash_value << 5) - hash_value) + ord(char)
            hash_value = hash_value & 0xFFFFFFFF  # 32비트 정수로 제한

        return str(hash_value)
    except Exception as e:
        print(f"❌ 체크섬 계산 실패: {e}")
        return "0"

def compress_json_data(data):
    """
    JSON 데이터를 gzip 압축 후 Base64 인코딩
    Google Drive 저장용 압축 함수
    """
    try:
        # JSON 문자열로 변환
        json_str = json.dumps(data, ensure_ascii=False, indent=2)

        # UTF-8로 인코딩 후 gzip 압축
        json_bytes = json_str.encode('utf-8')
        compressed_bytes = gzip.compress(json_bytes)

        # Base64 인코딩
        compressed_b64 = base64.b64encode(compressed_bytes).decode('ascii')

        # 압축 통계 계산
        original_size = len(json_bytes)
        compressed_size = len(compressed_bytes)
        compression_ratio = (compressed_size / original_size * 100) if original_size > 0 else 100

        print(f"📦 데이터 압축 완료: {original_size}B → {compressed_size}B ({compression_ratio:.1f}%)")

        return compressed_b64, original_size, compressed_size
    except Exception as e:
        print(f"❌ 압축 실패: {e}")
        raise e

def decompress_json_data(compressed_b64):
    """
    Base64 압축 데이터를 해제하여 JSON으로 복원
    Google Drive 로드용 해제 함수
    """
    try:
        # Base64 디코딩
        compressed_bytes = base64.b64decode(compressed_b64)

        # gzip 해제
        decompressed_bytes = gzip.decompress(compressed_bytes)

        # JSON 파싱
        json_str = decompressed_bytes.decode('utf-8')
        return json.loads(json_str)
    except Exception as e:
        print(f"❌ 압축 해제 실패: {e}")
        raise e

def create_metadata(schedules, timestamp, version, user_id, original_size, compressed_size, device_uuid=None):
    """메타데이터 생성"""
    metadata = {
        "timestamp": timestamp.isoformat(),
        "version": version,
        "user_id": user_id,
        "checksum": calculate_checksum(schedules),
        "count": len(schedules),
        "original_size": original_size,
        "compressed_size": compressed_size
    }

    # 디바이스 UUID가 있으면 메타데이터에 추가
    if device_uuid:
        metadata["device_uuid"] = device_uuid

    return metadata

def save_metadata_to_drive(access_token, folder_id, filename, metadata, log_func=print):
    """메타데이터 파일을 Google Drive에 저장"""
    try:
        # 메타데이터 파일명 생성
        meta_filename = filename.replace('.json', '.meta.json')

        # 파일 메타데이터
        file_metadata = {
            'name': meta_filename,
            'parents': [folder_id] if folder_id else []
        }

        # 업로드 준비
        headers = {'Authorization': f'Bearer {access_token}'}

        files = {
            'metadata': (None, json.dumps(file_metadata), 'application/json'),
            'media': (meta_filename, json.dumps(metadata, ensure_ascii=False, indent=2), 'application/json')
        }

        response = requests.post(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            headers=headers,
            files=files
        )

        if response.status_code == 200:
            result = response.json()
            log_func(f"✅ 메타데이터 저장 완료: {result.get('id')}")
            return result.get('id')
        else:
            log_func(f"❌ 메타데이터 저장 실패: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        log_func(f"❌ 메타데이터 저장 오류: {e}")
        return None

def load_metadata_from_drive(service, folder_id, filename):
    """Google Drive에서 메타데이터만 로드"""
    try:
        # 메타데이터 파일 검색
        meta_filename = filename.replace('.json', '.meta.json')
        query = f"name='{meta_filename}' and '{folder_id}' in parents and trashed=false"
        results = service.files().list(q=query, fields="files(id, name)").execute()
        files = results.get('files', [])

        if not files:
            print(f"📄 메타데이터 파일 없음: {meta_filename}")
            return None

        # 메타데이터 파일 다운로드
        file_id = files[0]['id']
        request = service.files().get_media(fileId=file_id)
        file_io = io.BytesIO()
        downloader = MediaIoBaseDownload(file_io, request)

        done = False
        while done is False:
            status, done = downloader.next_chunk()

        file_io.seek(0)
        content = file_io.read().decode('utf-8')
        metadata = json.loads(content)

        print(f"📊 메타데이터 로드 완료: 체크섬={metadata.get('checksum', 'N/A')}, 개수={metadata.get('count', 0)}")
        return metadata

    except Exception as e:
        print(f"❌ 메타데이터 로드 실패: {e}")
        return None

def save_json_compressed(data, file_path):
    """Save JSON data with gzip compression"""
    with gzip.open(f"{file_path}.gz", 'wt', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_json_compressed(file_path):
    """Load JSON data from gzip compressed file"""
    with gzip.open(f"{file_path}.gz", 'rt', encoding='utf-8') as f:
        return json.load(f)

def save_json_regular(data, file_path):
    """Save JSON data without compression"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_file_size_mb(file_path):
    """Get file size in MB"""
    try:
        return os.path.getsize(file_path) / (1024 * 1024)
    except:
        return 0

# --- API Endpoints ---

# --- Include Routers ---
from routers import auth, users, schedules, trash, parser, storage, backup, tags, pricing, naver, pages

# Authentication routes
app.include_router(auth.router, tags=["Authentication"])

# Naver calendar routes
app.include_router(naver.router, tags=["Naver"])

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
