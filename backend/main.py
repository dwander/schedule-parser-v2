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
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import io
import logging
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import parsing functions from our parser module
from parser import parse_schedules, parse_schedules_classic_only, parse_schedules_ai_only

# Import database modules
from database import get_database, ScheduleService, create_tables, test_connection, run_migrations, SessionLocal, Schedule, Tag, User

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
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

# Add production frontend URL if specified
FRONTEND_URL = os.getenv('FRONTEND_URL')
if FRONTEND_URL:
    origins.append(FRONTEND_URL)

# Railway 환경에서는 모든 Railway 도메인 허용 (프로덕션, 테스트 등)
if os.getenv('RAILWAY_STATIC_URL') or os.getenv('RAILWAY_GIT_BRANCH'):
    origins.extend([
        "https://kakaotalk-schedule-parser.up.railway.app",
        "https://bs-snaper-test.up.railway.app",
        "https://bs-snaper.up.railway.app",
		"https://bssnaper.enfree.com",
		"https://bonsiksched.enfree.com",
		"https://schedule-parser-backend-test.up.railway.app"
    ])

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

# --- OAuth Configuration ---
# Google
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
DEV_ADMIN_ID = os.getenv('VITE_DEV_ADMIN_ID')  # 개발자 관리자 ID

if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    raise ValueError("GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET 환경변수가 설정되지 않았습니다.")

# Naver
NAVER_CLIENT_ID = os.getenv('NAVER_CLIENT_ID')
NAVER_CLIENT_SECRET = os.getenv('NAVER_CLIENT_SECRET')

# Kakao
KAKAO_REST_API_KEY = os.getenv('KAKAO_REST_API_KEY')
KAKAO_CLIENT_SECRET = os.getenv('KAKAO_CLIENT_SECRET')

# Railway 환경 자동 감지 및 redirect URI 설정
if os.getenv('RAILWAY_STATIC_URL') or os.getenv('RAILWAY_GIT_BRANCH'):
    # Railway 배포 환경 - GIS 리다이렉트 모드
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://your-app.railway.app')
    GOOGLE_REDIRECT_URI = f'{FRONTEND_URL}/auth/callback.html'
    NAVER_REDIRECT_URI = f'{FRONTEND_URL}/auth/naver/callback'
    KAKAO_REDIRECT_URI = f'{FRONTEND_URL}/auth/kakao/callback'
else:
    # 로컬 개발 환경 - GIS 리다이렉트 모드
    GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/callback.html'
    NAVER_REDIRECT_URI = 'http://localhost:5173/auth/naver/callback'
    KAKAO_REDIRECT_URI = 'http://localhost:5173/auth/kakao/callback'


# --- Storage Configuration ---
# 로그인된 사용자의 백엔드 로컬 저장 여부 (기본값: 비활성화, 구글드라이브만 사용)
ENABLE_LOCAL_BACKUP = os.getenv('ENABLE_LOCAL_BACKUP', 'false').lower() == 'true'

# --- Data Models ---
class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str = None  # 프론트엔드에서 사용한 redirect_uri를 받음

class NaverAuthRequest(BaseModel):
    code: str
    state: str

class KakaoAuthRequest(BaseModel):
    code: str

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
STORAGE_DIR = os.getenv('RAILWAY_VOLUME_MOUNT_PATH', 'storage')
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
    folder_name = "Wedding Snapler Schedule Manager Data"

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

@app.post("/auth/google")
async def google_auth(auth_request: GoogleAuthRequest, db: Session = Depends(get_database)):
    """Exchange Google authorization code for user info."""
    try:
        # 프론트엔드에서 전달받은 redirect_uri 사용, 없으면 기본값 사용
        redirect_uri = auth_request.redirect_uri or GOOGLE_REDIRECT_URI

        print(f"🔑 받은 인증 코드: {auth_request.code[:20]}...")
        print(f"🔗 사용할 redirect_uri: {redirect_uri}")

        # Step 1: Exchange authorization code for access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'code': auth_request.code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri
        }

        token_response = requests.post(token_url, data=token_data)

        print(f"📡 토큰 응답 상태: {token_response.status_code}")
        if not token_response.ok:
            print(f"❌ 토큰 에러: {token_response.text}")

        if not token_response.ok:
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_response.text}")

        token_json = token_response.json()
        access_token = token_json.get('access_token')
        refresh_token = token_json.get('refresh_token')

        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")

        # Step 2: Get user info using access token
        user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
        user_response = requests.get(user_info_url)

        if not user_response.ok:
            raise HTTPException(status_code=400, detail=f"User info fetch failed: {user_response.text}")

        user_data = user_response.json()

        # Save or update user in database
        user_id = f"google_{user_data.get('id')}"
        google_id = user_data.get('id')

        existing_user = db.query(User).filter(User.id == user_id).first()

        if existing_user:
            # Update existing user (is_admin 값은 유지)
            existing_user.email = user_data.get("email")
            existing_user.name = user_data.get("name")
            existing_user.last_login = func.now()
            admin_badge = "🔑 [관리자]" if existing_user.is_admin else ""
            print(f"✅ 기존 사용자 로그인: {existing_user.name} ({existing_user.email}) {admin_badge}")
        else:
            # Create new user (신규 사용자만 DEV_ADMIN_ID 체크)
            is_admin = (google_id == DEV_ADMIN_ID) if DEV_ADMIN_ID else False
            new_user = User(
                id=user_id,
                auth_provider="google",
                is_anonymous=False,
                email=user_data.get("email"),
                name=user_data.get("name"),
                is_admin=is_admin
            )
            db.add(new_user)
            admin_badge = "🔑 [관리자]" if is_admin else ""
            print(f"🆕 신규 사용자 생성: {new_user.name} ({new_user.email}) {admin_badge}")

        db.commit()

        # Return user information
        return {
            "id": user_data.get("id"),
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "picture": user_data.get("picture"),
            "is_admin": is_admin,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@app.post("/auth/naver")
async def naver_auth(auth_request: NaverAuthRequest, db: Session = Depends(get_database)):
    """Exchange Naver authorization code for user info."""
    try:
        if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
            raise HTTPException(status_code=500, detail="Naver OAuth is not configured")

        print(f"🔑 네이버 인증 코드: {auth_request.code[:20]}...")
        print(f"🔑 네이버 state: {auth_request.state}")

        # Step 1: Exchange authorization code for access token
        token_url = "https://nid.naver.com/oauth2.0/token"
        token_params = {
            'grant_type': 'authorization_code',
            'client_id': NAVER_CLIENT_ID,
            'client_secret': NAVER_CLIENT_SECRET,
            'code': auth_request.code,
            'state': auth_request.state
        }

        token_response = requests.get(token_url, params=token_params)

        print(f"📡 토큰 응답 상태: {token_response.status_code}")
        if not token_response.ok:
            print(f"❌ 토큰 에러: {token_response.text}")
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_response.text}")

        token_json = token_response.json()
        access_token = token_json.get('access_token')
        refresh_token = token_json.get('refresh_token')

        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")

        # Step 2: Get user info using access token
        user_info_url = "https://openapi.naver.com/v1/nid/me"
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        user_response = requests.get(user_info_url, headers=headers)

        if not user_response.ok:
            raise HTTPException(status_code=400, detail=f"User info fetch failed: {user_response.text}")

        user_data = user_response.json()

        # 네이버 API 응답 구조: { "resultcode": "00", "message": "success", "response": { ... } }
        if user_data.get('resultcode') != '00':
            raise HTTPException(status_code=400, detail=f"Naver API error: {user_data.get('message')}")

        naver_user = user_data.get('response', {})
        naver_id = naver_user.get('id')

        # Save or update user in database
        user_id = f"naver_{naver_id}"

        existing_user = db.query(User).filter(User.id == user_id).first()

        if existing_user:
            # Update existing user
            existing_user.email = naver_user.get("email")
            existing_user.name = naver_user.get("name") or naver_user.get("nickname")
            existing_user.last_login = func.now()
            print(f"✅ 기존 사용자 로그인: {existing_user.name} ({existing_user.email})")
        else:
            # Create new user
            new_user = User(
                id=user_id,
                auth_provider="naver",
                is_anonymous=False,
                email=naver_user.get("email"),
                name=naver_user.get("name") or naver_user.get("nickname"),
                is_admin=False
            )
            db.add(new_user)
            print(f"🆕 신규 사용자 생성: {new_user.name} ({new_user.email})")

        db.commit()

        # Get the final user object to return current is_admin value
        final_user = db.query(User).filter(User.id == user_id).first()

        # Return user information
        return {
            "id": naver_id,
            "name": naver_user.get("name") or naver_user.get("nickname"),
            "email": naver_user.get("email"),
            "picture": naver_user.get("profile_image"),
            "is_admin": final_user.is_admin if final_user else False,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Naver authentication failed: {str(e)}")

@app.post("/auth/kakao")
async def kakao_auth(auth_request: KakaoAuthRequest, db: Session = Depends(get_database)):
    """Exchange Kakao authorization code for user info."""
    try:
        if not KAKAO_REST_API_KEY:
            raise HTTPException(status_code=500, detail="Kakao OAuth is not configured")

        print(f"🔑 카카오 인증 코드: {auth_request.code[:20]}...")

        # Step 1: Exchange authorization code for access token
        token_url = "https://kauth.kakao.com/oauth/token"
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': KAKAO_REST_API_KEY,
            'redirect_uri': KAKAO_REDIRECT_URI,
            'code': auth_request.code
        }

        # Add client_secret if available
        if KAKAO_CLIENT_SECRET:
            token_data['client_secret'] = KAKAO_CLIENT_SECRET

        token_response = requests.post(token_url, data=token_data)

        print(f"📡 토큰 응답 상태: {token_response.status_code}")
        if not token_response.ok:
            print(f"❌ 토큰 에러: {token_response.text}")
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_response.text}")

        token_json = token_response.json()
        access_token = token_json.get('access_token')
        refresh_token = token_json.get('refresh_token')

        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")

        # Step 2: Get user info using access token
        user_info_url = "https://kapi.kakao.com/v2/user/me"
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        user_response = requests.get(user_info_url, headers=headers)

        if not user_response.ok:
            raise HTTPException(status_code=400, detail=f"User info fetch failed: {user_response.text}")

        user_data = user_response.json()
        kakao_account = user_data.get('kakao_account', {})
        profile = kakao_account.get('profile', {})

        kakao_id = str(user_data.get('id'))  # 숫자로 오므로 문자열 변환

        # Save or update user in database
        user_id = f"kakao_{kakao_id}"

        existing_user = db.query(User).filter(User.id == user_id).first()

        if existing_user:
            # Update existing user
            existing_user.email = kakao_account.get("email")
            existing_user.name = profile.get("nickname")
            existing_user.last_login = func.now()
            print(f"✅ 기존 사용자 로그인: {existing_user.name} ({existing_user.email})")
        else:
            # Create new user
            new_user = User(
                id=user_id,
                auth_provider="kakao",
                is_anonymous=False,
                email=kakao_account.get("email"),
                name=profile.get("nickname"),
                is_admin=False
            )
            db.add(new_user)
            print(f"🆕 신규 사용자 생성: {new_user.name} ({new_user.email})")

        db.commit()

        # Get the final user object to return current is_admin value
        final_user = db.query(User).filter(User.id == user_id).first()

        # Return user information
        return {
            "id": kakao_id,
            "name": profile.get("nickname"),
            "email": kakao_account.get("email"),
            "picture": profile.get("profile_image_url"),
            "is_admin": final_user.is_admin if final_user else False,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kakao authentication failed: {str(e)}")

@app.post("/auth/refresh")
async def refresh_token(request: dict = Body(...)):
    """Refresh Google OAuth token"""
    try:
        refresh_token = request.get('refresh_token')
        if not refresh_token:
            raise HTTPException(status_code=400, detail="Refresh token is required")

        # Exchange refresh token for new access token
        token_response = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'client_id': GOOGLE_CLIENT_ID,
                'client_secret': GOOGLE_CLIENT_SECRET,
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token'
            }
        )

        if not token_response.ok:
            raise HTTPException(status_code=400, detail=f"Token refresh failed: {token_response.text}")

        token_json = token_response.json()
        new_access_token = token_json.get('access_token')
        new_refresh_token = token_json.get('refresh_token', refresh_token)  # 새 refresh token이 없으면 기존 것 사용

        if not new_access_token:
            raise HTTPException(status_code=400, detail="No access token received")

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "success": True
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")

# --- User Management API ---
@app.get("/api/users")
async def get_users(db: Session = Depends(get_database)):
    """Get all users (for admin panel)"""
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        return [user.to_dict() for user in users]
    except Exception as e:
        logger.error(f"❌ Failed to get users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

@app.get("/api/parse-file")
def parse_from_file():
    """Reads the predefined data file, parses it, and returns the schedules."""
    try:
        with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
            raw_content = f.read()
        return {"data": parse_schedules(raw_content), "success": True}
    except FileNotFoundError:
        return {"error": f"Data file not found at {DATA_FILE_PATH}", "success": False}
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}", "success": False}

@app.post("/api/parse-text")
def parse_from_text(request: ParseTextRequest):
    """Receives raw text and engine selection, parses it, and returns the schedules."""
    try:
        text = request.text
        engine = request.engine

        # Select parser based on engine parameter
        print(f"🔧 Using engine: {engine}")
        if engine == "classic":
            print("📜 Running classic-only parser...")
            data = parse_schedules_classic_only(text)
            print(f"📜 Classic parser result: {len(data)} schedules")
        elif engine == "ai_only":
            print("🤖 Running AI-only parser...")
            data = parse_schedules_ai_only(text)
            print(f"🤖 AI parser result: {len(data)} schedules")
        elif engine == "hybrid":
            print("🔀 Running hybrid parser...")
            data = parse_schedules(text)
            print(f"🔀 Hybrid parser result: {len(data)} schedules")
        else:
            return {"error": f"Unknown parser engine: {engine}", "success": False}

        return {"data": data, "success": True, "engine_used": engine}
    except Exception as e:
        return {"error": f"An error occurred during parsing: {str(e)}", "success": False}

@app.post("/api/parse-uploaded-file")
async def parse_uploaded_file(file: UploadFile = File(...), engine: str = "classic"):
    """Receives an uploaded file, parses it, and returns the schedules."""
    try:
        # Check file type
        if not file.filename.endswith('.txt'):
            return {"error": "Only .txt files are supported", "success": False}

        # Read file content
        content = await file.read()
        raw_content = content.decode('utf-8')

        # Select parser based on engine parameter
        print(f"🔧 File upload using engine: {engine}")
        if engine == "classic":
            print("📜 Running classic-only parser on uploaded file...")
            data = parse_schedules_classic_only(raw_content)
            print(f"📜 Classic parser result: {len(data)} schedules")
        elif engine == "ai_only":
            print("🤖 Running AI-only parser on uploaded file...")
            data = parse_schedules_ai_only(raw_content)
            print(f"🤖 AI parser result: {len(data)} schedules")
        elif engine == "hybrid":
            print("🔀 Running hybrid parser on uploaded file...")
            data = parse_schedules(raw_content)
            print(f"🔀 Hybrid parser result: {len(data)} schedules")
        else:
            return {"error": f"Unknown parser engine: {engine}", "success": False}

        return {"data": data, "success": True, "engine_used": engine}
    except Exception as e:
        return {"error": f"An error occurred during file parsing: {str(e)}", "success": False}

@app.get("/api/get-raw-data")
def get_raw_data():
    """Returns the raw content of the data file for frontend processing."""
    try:
        with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
            raw_content = f.read()
        return {"data": raw_content, "success": True}
    except FileNotFoundError:
        return {"error": f"Data file not found at {DATA_FILE_PATH}", "success": False}
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}", "success": False}

@app.post("/api/save-schedules")
def save_schedules_to_server(request: SaveSchedulesRequest):
    """Save schedules to Google Drive and server with user-specific storage."""

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

@app.post("/api/check-sync-metadata")
def check_sync_metadata(request: LoadSchedulesRequest):
    """클라우드 메타데이터만 확인하여 동기화 필요 여부 판단"""
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

@app.post("/api/load-schedules")
def load_schedules_from_server(request: LoadSchedulesRequest):
    """Load latest schedules from Google Drive with local fallback."""
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

# Keep the old GET endpoint for backward compatibility
@app.get("/api/load-schedules")
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


# === DATABASE BACKUP/RESTORE APIs ===

@app.get("/api/backup-database")
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


@app.post("/api/restore-database")
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
            from database import Schedule
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
                from database import Schedule
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


def cleanup_old_backups():
    """Clean up backup files older than 7 days"""
    try:
        users_dir = os.path.join(SCHEDULES_DATA_DIR, "users")
        if not os.path.exists(users_dir):
            return

        cutoff_time = datetime.now() - timedelta(days=7)
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

@app.post("/api/cleanup-backups")
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

# --- Railway Persistent Storage API Endpoints ---
@app.post("/api/persistent/save")
async def save_to_database(request: PersistentSaveRequest, db: Session = Depends(get_database)):
    """Save schedules to PostgreSQL database"""
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
        raise HTTPException(status_code=500, detail=f"Database save failed: {str(e)}")

@app.post("/api/persistent/load")
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
        raise HTTPException(status_code=500, detail=f"Database load failed: {str(e)}")

@app.get("/api/persistent/status/{user_id}")
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
        raise HTTPException(status_code=500, detail=f"Failed to get database status: {str(e)}")

# --- New Database-Specific API Endpoints ---

@app.put("/api/schedules/{schedule_id}/field/{field}")
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

@app.delete("/api/schedules/{schedule_id}")
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

# ==================== User Management API ====================

@app.post("/api/users/init")
async def init_user(request: Request):
    """사용자 초기화 또는 로그인 시 호출"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        auth_provider = data.get("auth_provider", "anonymous")
        is_anonymous = data.get("is_anonymous", False)
        email = data.get("email")
        name = data.get("name")

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        db_session = next(get_database())

        # 사용자 조회 또는 생성
        from database import User
        user = db_session.query(User).filter(User.id == user_id).first()

        if not user:
            # 신규 사용자 생성
            user = User(
                id=user_id,
                auth_provider=auth_provider,
                is_anonymous=is_anonymous,
                email=email,
                name=name,
                has_seen_sample_data=False
            )
            db_session.add(user)
            db_session.commit()
            db_session.refresh(user)
            logger.info(f"✅ New user created: {user_id} ({name or 'anonymous'})")
        else:
            # 기존 사용자 - last_login 및 프로필 업데이트
            user.last_login = func.now()
            # 프로필 정보가 있으면 업데이트 (구글 로그인 시 최신 정보 반영)
            if email:
                user.email = email
            if name:
                user.name = name
            db_session.commit()
            logger.info(f"✅ User logged in: {user_id} ({name or 'anonymous'})")

        return {"success": True, "user": user.to_dict()}

    except Exception as e:
        logger.error(f"❌ User init error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """사용자 정보 조회"""
    try:
        db_session = next(get_database())
        from database import User
        user = db_session.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {"success": True, "user": user.to_dict()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/users/{user_id}/sample-data")
async def mark_sample_data_seen(user_id: str):
    """샘플 데이터를 본 것으로 표시"""
    try:
        db_session = next(get_database())
        from database import User
        user = db_session.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.has_seen_sample_data = True
        db_session.commit()

        return {"success": True, "user": user.to_dict()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Mark sample data seen error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users")
async def list_users():
    """모든 사용자 목록 조회 (관리자용)"""
    try:
        db_session = next(get_database())
        from database import User, Schedule

        # 모든 사용자 조회
        users = db_session.query(User).order_by(User.last_login.desc()).all()

        # 각 사용자의 스케줄 개수 조회
        user_list = []
        for user in users:
            schedule_count = db_session.query(Schedule).filter(Schedule.user_id == user.id).count()
            user_data = user.to_dict()
            user_data['schedule_count'] = schedule_count
            user_list.append(user_data)

        return {"success": True, "users": user_list, "total": len(user_list)}

    except Exception as e:
        logger.error(f"❌ List users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "Hello from the Schedule Parser backend!"}

@app.get("/privacy-policy", response_class=HTMLResponse)
def privacy_policy():
    """개인정보처리방침 페이지"""
    return """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>개인정보처리방침 - 본식스냅러</title>
        <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; margin: 0; padding: 2rem; background: #f8f9fa; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 0.5rem; }
            h2 { color: #495057; margin-top: 2rem; }
            .date { color: #6c757d; margin-bottom: 2rem; }
            ul { padding-left: 1.5rem; }
            li { margin-bottom: 0.5rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>개인정보처리방침</h1>
            <p class="date">최종 수정일: 2024년 9월 23일</p>

            <h2>1. 개인정보 수집 및 이용 목적</h2>
            <p>본식스냅러(이하 "서비스")는 다음의 목적을 위해 개인정보를 수집 및 이용합니다:</p>
            <ul>
                <li>스케줄 관리 서비스 제공</li>
                <li>사용자 인증 및 계정 관리</li>
                <li>데이터 동기화 및 백업</li>
                <li>서비스 개선 및 사용자 지원</li>
            </ul>

            <h2>2. 수집하는 개인정보 항목</h2>
            <p>서비스는 다음의 개인정보를 수집합니다:</p>
            <ul>
                <li><strong>Google 계정 정보:</strong> 이름, 이메일 주소, 프로필 사진</li>
                <li><strong>서비스 이용 기록:</strong> 스케줄 데이터, 설정 정보</li>
                <li><strong>기술적 정보:</strong> IP 주소, 브라우저 정보, 접속 로그</li>
            </ul>

            <h2>3. 개인정보 보유 및 이용 기간</h2>
            <p>수집된 개인정보는 다음 기간 동안 보유됩니다:</p>
            <ul>
                <li>회원 탈퇴 시까지 (서비스 이용 기간)</li>
                <li>관련 법령에 따른 보존 의무 기간</li>
                <li>사용자가 직접 삭제 요청 시 즉시 삭제</li>
            </ul>

            <h2>4. 개인정보 제3자 제공</h2>
            <p>서비스는 사용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다:</p>
            <ul>
                <li>사용자가 사전에 동의한 경우</li>
                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>

            <h2>5. 개인정보 처리 위탁</h2>
            <p>서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
            <ul>
                <li><strong>Google LLC:</strong> 사용자 인증 및 클라우드 저장</li>
                <li><strong>Railway:</strong> 서버 호스팅 및 데이터 저장</li>
            </ul>

            <h2>6. 사용자의 권리</h2>
            <p>사용자는 다음과 같은 권리를 가집니다:</p>
            <ul>
                <li>개인정보 처리 현황에 대한 열람 요구</li>
                <li>개인정보 수정·삭제 요구</li>
                <li>개인정보 처리 정지 요구</li>
                <li>손해 발생 시 손해배상 요구</li>
            </ul>

            <h2>7. 개인정보 보호책임자</h2>
            <p>개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 개인정보 보호책임자를 지정하고 있습니다.</p>

            <h2>8. 개인정보처리방침 변경</h2>
            <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
        </div>
    </body>
    </html>
    """

@app.get("/terms-of-service", response_class=HTMLResponse)
def terms_of_service():
    """서비스 이용약관 페이지"""
    return """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>서비스 이용약관 - 본식스냅러</title>
        <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; margin: 0; padding: 2rem; background: #f8f9fa; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 0.5rem; }
            h2 { color: #495057; margin-top: 2rem; }
            .date { color: #6c757d; margin-bottom: 2rem; }
            ul, ol { padding-left: 1.5rem; }
            li { margin-bottom: 0.5rem; }
            ol > li > ul { margin-top: 0.5rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>서비스 이용약관</h1>
            <p class="date">최종 수정일: 2024년 9월 23일</p>

            <h2>제1조 (목적)</h2>
            <p>이 약관은 본식스냅러(이하 "서비스")의 이용조건 및 절차, 서비스와 회원의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

            <h2>제2조 (정의)</h2>
            <ul>
                <li><strong>"서비스"</strong>라 함은 본식스냅러가 제공하는 웨딩 스케줄 관리 서비스를 의미합니다.</li>
                <li><strong>"회원"</strong>이라 함은 서비스에 접속하여 이 약관에 따라 서비스를 받는 고객을 말합니다.</li>
                <li><strong>"계정"</strong>이라 함은 회원의 식별과 서비스 이용을 위하여 회원이 선정한 구글 계정을 의미합니다.</li>
            </ul>

            <h2>제3조 (약관의 효력 및 변경)</h2>
            <ol>
                <li>이 약관은 서비스를 이용하는 모든 회원에게 그 효력이 발생합니다.</li>
                <li>서비스는 필요한 경우 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지됩니다.</li>
                <li>변경된 약관에 동의하지 않는 경우, 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ol>

            <h2>제4조 (서비스의 제공 및 변경)</h2>
            <ol>
                <li>서비스는 다음과 같은 업무를 제공합니다:
                    <ul>
                        <li>웨딩 스케줄 생성, 수정, 삭제, 조회</li>
                        <li>스케줄 데이터 클라우드 동기화</li>
                        <li>스케줄 통계 및 분석</li>
                        <li>기타 서비스가 정하는 업무</li>
                    </ul>
                </li>
                <li>서비스는 운영상, 기술상의 필요에 따라 제공하고 있는 서비스를 변경할 수 있습니다.</li>
            </ol>

            <h2>제5조 (서비스 이용)</h2>
            <ol>
                <li>서비스 이용은 연중무휴, 1일 24시간을 원칙으로 합니다.</li>
                <li>서비스는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
                <li>무료 서비스는 서비스의 정책에 따라 제한될 수 있습니다.</li>
            </ol>

            <h2>제6조 (회원의 의무)</h2>
            <ol>
                <li>회원은 다음 행위를 하여서는 안 됩니다:
                    <ul>
                        <li>신청 또는 변경 시 허위내용의 등록</li>
                        <li>타인의 정보 도용</li>
                        <li>서비스에 게시된 정보의 변경</li>
                        <li>서비스가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                        <li>서비스 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                        <li>서비스 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                        <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                    </ul>
                </li>
            </ol>

            <h2>제7조 (개인정보보호)</h2>
            <p>서비스는 관련법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련법령 및 서비스의 개인정보처리방침이 적용됩니다.</p>

            <h2>제8조 (면책조항)</h2>
            <ol>
                <li>서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                <li>서비스는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
                <li>서비스는 회원이 서비스에 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</li>
            </ol>

            <h2>제9조 (준거법 및 관할법원)</h2>
            <p>이 약관에 명시되지 않은 사항은 대한민국의 관련 법령에 의합니다. 서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우 관련 법령에 따른 법원을 관할 법원으로 합니다.</p>

            <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 0.875rem;">
                부칙: 이 약관은 2024년 9월 23일부터 적용됩니다.
            </div>
        </div>
    </body>
    </html>
    """
# ============================================================================
# V2 RESTful API Endpoints
# ============================================================================

@app.get("/api/schedules")
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
                'isDuplicate': schedule.needs_review,
                'createdAt': schedule.created_at.isoformat() if schedule.created_at else None,
                'updatedAt': schedule.updated_at.isoformat() if schedule.updated_at else None,
            })

        return result
        
    except Exception as e:
        logger.error(f"Failed to get schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedules")
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
            cuts=schedule.get('cuts', 0),
            price=schedule.get('price', 0),
            manager=schedule.get('manager', ''),
            memo=schedule.get('memo', ''),
            needs_review=schedule.get('isDuplicate', False),
        )

        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)

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

@app.put("/api/schedules/{schedule_id}")
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

@app.delete("/api/schedules/{schedule_id}")
def delete_schedule(
    schedule_id: str,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """Delete a schedule"""
    try:
        existing = db.query(Schedule).filter(
            Schedule.id == int(schedule_id),
            Schedule.user_id == user_id
        ).first()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        db.delete(existing)
        db.commit()
        
        return {"success": True, "message": "Schedule deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete schedule: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedules/migrate")
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

@app.post("/api/schedules/batch")
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

@app.post("/api/schedules/batch-delete")
def batch_delete_schedules(
    ids: List[str] = Body(..., embed=True),
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_database)
):
    """Batch delete schedules"""
    try:

        for schedule_id in ids:
            existing = db.query(Schedule).filter(
                Schedule.id == int(schedule_id),
                Schedule.user_id == user_id
            ).first()

            if existing:
                db.delete(existing)

        db.commit()

        return {"success": True, "message": f"Deleted {len(ids)} schedules"}

    except Exception as e:
        logger.error(f"Failed to batch delete schedules: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Tag Helper Functions ====================

def auto_create_tags_from_schedule(db_session, user_id: str, brand: str, album: str):
    """스케줄 저장/업데이트 시 자동으로 태그 생성"""
    from database import Tag
    import re

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

# ==================== Tag API ====================

@app.get("/api/tags/{user_id}")
async def get_tags(user_id: str, tag_type: Optional[str] = None):
    """사용자의 태그 목록 조회"""
    try:
        db_session = next(get_database())
        from database import Tag

        query = db_session.query(Tag).filter(Tag.user_id == user_id)

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

@app.post("/api/tags/{user_id}")
async def create_tag(user_id: str, tag_data: dict):
    """새 태그 생성"""
    try:
        db_session = next(get_database())
        from database import Tag

        tag_type = tag_data.get('tag_type')
        tag_value = tag_data.get('tag_value', '').strip()

        if not tag_type or not tag_value:
            raise HTTPException(status_code=400, detail="tag_type and tag_value are required")

        if tag_type not in ['brand', 'album']:
            raise HTTPException(status_code=400, detail="tag_type must be 'brand' or 'album'")

        # 공백 정규화
        import re
        tag_value = re.sub(r'\s+', ' ', tag_value)

        # 중복 체크
        existing = db_session.query(Tag).filter(
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

        db_session.add(new_tag)
        db_session.commit()
        db_session.refresh(new_tag)

        return {"success": True, "tag": new_tag.to_dict(), "created": True}

    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"❌ Create tag error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/tags/{user_id}/{tag_id}")
async def delete_tag(user_id: str, tag_id: int):
    """태그 삭제 및 관련 스케줄 업데이트"""
    try:
        db_session = next(get_database())
        from database import Tag, Schedule

        # 태그 조회
        tag = db_session.query(Tag).filter(
            Tag.id == tag_id,
            Tag.user_id == user_id
        ).first()

        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        # 관련 스케줄 업데이트 (해당 태그를 사용하는 스케줄의 필드를 빈 문자열로)
        field_name = tag.tag_type  # 'brand' or 'album'
        affected_schedules = db_session.query(Schedule).filter(
            Schedule.user_id == user_id,
            getattr(Schedule, field_name) == tag.tag_value
        ).all()

        for schedule in affected_schedules:
            setattr(schedule, field_name, '')

        # 태그 삭제
        db_session.delete(tag)
        db_session.commit()

        return {
            "success": True,
            "deleted_tag": tag.to_dict(),
            "affected_schedules": len(affected_schedules)
        }

    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"❌ Delete tag error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tags/{user_id}/sync")
async def sync_tags_from_schedules(user_id: str):
    """기존 스케줄 데이터에서 태그 추출 및 동기화 (배치 최적화)"""
    try:
        db_session = next(get_database())
        from database import Tag, Schedule
        import re

        # 1. 기존 태그를 한 번에 모두 가져오기 (메모리에 캐싱)
        existing_tags = db_session.query(Tag).filter(Tag.user_id == user_id).all()
        existing_tag_set = {(tag.tag_type, tag.tag_value) for tag in existing_tags}

        # 2. 모든 스케줄에서 고유한 태그 추출
        schedules = db_session.query(Schedule).filter(Schedule.user_id == user_id).all()
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
            db_session.add(new_tag)
            created_tags.append(tag_value)

        db_session.commit()

        return {
            "success": True,
            "created_count": len(created_tags),
            "created_tags": created_tags
        }

    except Exception as e:
        db_session.rollback()
        logger.error(f"❌ Sync tags error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
