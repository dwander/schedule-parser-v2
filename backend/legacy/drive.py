"""
LEGACY: Google Drive Helper Functions
These functions are deprecated and should not be used in new code.
Use database-based storage instead.
"""

import os
import io
import json
import requests
from datetime import datetime
from typing import Optional, Callable

from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload, MediaInMemoryUpload

from config import settings
from constants import DRIVE_FOLDER_NAME
from utils import (
    compress_json_data,
    decompress_json_data,
    create_metadata,
)


# Google OAuth credentials
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET


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

        # Note: device_uuid from request object not available in legacy context
        # This function signature needs updating if device_uuid is required
        metadata = create_metadata(schedules, timestamp, version, user_id, original_size, compressed_size, None)

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
