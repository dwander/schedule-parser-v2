from fastapi import APIRouter, Body, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from datetime import datetime, timedelta, timezone

from config import settings
from database import get_database, User
from schemas.auth import GoogleAuthRequest, GoogleTokenRequest, NaverAuthRequest, KakaoAuthRequest
from lib.crypto import encrypt_token, decrypt_token

router = APIRouter()

# OAuth Configuration (from settings)
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
DEV_ADMIN_ID = settings.DEV_ADMIN_ID

NAVER_CLIENT_ID = settings.NAVER_CLIENT_ID
NAVER_CLIENT_SECRET = settings.NAVER_CLIENT_SECRET

KAKAO_REST_API_KEY = settings.KAKAO_REST_API_KEY
KAKAO_CLIENT_SECRET = settings.KAKAO_CLIENT_SECRET

GOOGLE_REDIRECT_URI = settings.GOOGLE_REDIRECT_URI
NAVER_REDIRECT_URI = settings.NAVER_REDIRECT_URI
KAKAO_REDIRECT_URI = settings.KAKAO_REDIRECT_URI

FRONTEND_URL = settings.FRONTEND_URL


# --- API Endpoints ---

@router.get("/api/config")
async def get_config():
    """
    공개 설정 반환 (OAuth Client ID 등)
    Frontend에서 앱 시작 시 이 값들을 가져와서 사용
    """
    return {
        "google_client_id": GOOGLE_CLIENT_ID,
        "naver_client_id": NAVER_CLIENT_ID,
        "kakao_rest_api_key": KAKAO_REST_API_KEY,
        "frontend_url": FRONTEND_URL if FRONTEND_URL else "http://localhost:5173"
    }


@router.post("/auth/google")
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

        # Calculate token expiration time (Google tokens typically expire in 3600 seconds)
        try:
            expires_in = int(token_json.get('expires_in', 3600))
        except (ValueError, TypeError):
            print(f"⚠️  expires_in 변환 실패, 기본값 3600초 사용")
            expires_in = 3600
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

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

        # Encrypt tokens before storing
        encrypted_access_token = encrypt_token(access_token) if access_token else None
        encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None

        if existing_user:
            # Update existing user (is_admin 값은 유지)
            existing_user.email = user_data.get("email")
            existing_user.name = user_data.get("name")
            existing_user.last_login = func.now()
            # Store encrypted tokens
            existing_user.google_access_token = encrypted_access_token
            existing_user.google_refresh_token = encrypted_refresh_token
            existing_user.google_token_expires_at = token_expires_at
            admin_badge = "🔑 [관리자]" if existing_user.is_admin else ""
            print(f"✅ 기존 사용자 로그인: {existing_user.name} ({existing_user.email}) {admin_badge}")
            print(f"🔐 구글 토큰 암호화 저장 완료 (만료: {token_expires_at.isoformat()})")
        else:
            # Create new user (신규 사용자만 DEV_ADMIN_ID 체크)
            is_admin = (google_id == DEV_ADMIN_ID) if DEV_ADMIN_ID else False
            new_user = User(
                id=user_id,
                auth_provider="google",
                is_anonymous=False,
                email=user_data.get("email"),
                name=user_data.get("name"),
                is_admin=is_admin,
                google_access_token=encrypted_access_token,
                google_refresh_token=encrypted_refresh_token,
                google_token_expires_at=token_expires_at
            )
            db.add(new_user)
            admin_badge = "🔑 [관리자]" if is_admin else ""
            print(f"🆕 신규 사용자 생성: {new_user.name} ({new_user.email}) {admin_badge}")
            print(f"🔐 구글 토큰 암호화 저장 완료 (만료: {token_expires_at.isoformat()})")

        db.commit()

        # Get the final user object to return current is_admin value
        final_user = db.query(User).filter(User.id == user_id).first()

        # Return user information
        return {
            "id": user_id,  # google_{google_id} 형식
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "picture": user_data.get("picture"),
            "is_admin": final_user.is_admin if final_user else False,
            "has_seen_sample_data": final_user.has_seen_sample_data if final_user else False,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.post("/auth/google/token")
async def google_token_auth(auth_request: GoogleTokenRequest, db: Session = Depends(get_database)):
    """Verify Google ID Token and authenticate user (FedCM compatible)."""
    try:
        print(f"🔑 받은 ID Token: {auth_request.credential[:50]}...")

        # Verify ID Token
        try:
            idinfo = id_token.verify_oauth2_token(
                auth_request.credential,
                google_requests.Request(),
                GOOGLE_CLIENT_ID
            )
        except ValueError as e:
            print(f"❌ ID Token 검증 실패: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Invalid ID token: {str(e)}")

        # Extract user information from ID token
        google_id = idinfo.get('sub')
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')

        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Invalid ID token payload")

        print(f"✅ ID Token 검증 성공: {name} ({email})")

        # Save or update user in database
        user_id = f"google_{google_id}"
        existing_user = db.query(User).filter(User.id == user_id).first()

        if existing_user:
            # Update existing user (is_admin 값은 유지)
            existing_user.email = email
            existing_user.name = name
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
                email=email,
                name=name,
                is_admin=is_admin
            )
            db.add(new_user)
            admin_badge = "🔑 [관리자]" if is_admin else ""
            print(f"🆕 신규 사용자 생성: {new_user.name} ({new_user.email}) {admin_badge}")

        db.commit()

        # Get the final user object to return current is_admin value
        final_user = db.query(User).filter(User.id == user_id).first()

        # Return user information
        return {
            "id": user_id,
            "name": name,
            "email": email,
            "picture": picture,
            "is_admin": final_user.is_admin if final_user else False,
            "has_seen_sample_data": final_user.has_seen_sample_data if final_user else False
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 인증 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.post("/auth/naver")
async def naver_auth(auth_request: NaverAuthRequest, db: Session = Depends(get_database)):
    """Exchange Naver authorization code for user info."""
    try:
        if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
            raise HTTPException(status_code=500, detail="Naver OAuth is not configured")

        print(f"🔑 네이버 인증 코드: {auth_request.code[:20]}...")
        print(f"🔑 네이버 state: {auth_request.state}")

        # Parse state to extract user_id (for calendar linking)
        import base64
        import json
        try:
            state_data = json.loads(base64.b64decode(auth_request.state))
            target_user_id = state_data.get('user_id')
            print(f"🔗 캘린더 연동 모드: 타겟 사용자 ID = {target_user_id}")
        except (ValueError, json.JSONDecodeError, Exception):
            target_user_id = None
            print(f"👤 일반 로그인 모드 (네이버 계정으로 직접 로그인)")

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

        # expires_in을 안전하게 정수로 변환
        try:
            expires_in = int(token_json.get('expires_in', 3600))
        except (ValueError, TypeError):
            print(f"⚠️  expires_in 변환 실패, 기본값 3600초 사용")
            expires_in = 3600

        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")

        # Calculate token expiration time
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

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

        # naver_id가 없으면 에러 (API 응답 이상)
        if not naver_id and not target_user_id:
            raise HTTPException(status_code=400, detail="Naver user ID not found in response")

        # 캘린더 연동 모드: target_user_id가 있으면 그 사용자에게 토큰 추가
        if target_user_id:
            print(f"📎 캘린더 연동 모드: {target_user_id}에 네이버 토큰 추가")
            target_user = db.query(User).filter(User.id == target_user_id).first()
            if not target_user:
                raise HTTPException(status_code=404, detail=f"Target user {target_user_id} not found")

            # 타겟 사용자에게 네이버 토큰 저장 (암호화)
            encrypted_access_token = encrypt_token(access_token) if access_token else None
            encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None

            target_user.naver_access_token = encrypted_access_token
            target_user.naver_refresh_token = encrypted_refresh_token
            target_user.naver_token_expires_at = token_expires_at
            db.commit()

            print(f"✅ 네이버 캘린더 연동 완료: {target_user.name} ({target_user.email})")
            print(f"🔑 암호화된 토큰 저장 완료 (만료: {token_expires_at.isoformat()})")

            # 타겟 사용자 정보 반환 (프론트엔드와 일관된 필드명 사용)
            return {
                "id": target_user.id,
                "name": target_user.name,
                "email": target_user.email,
                "picture": target_user.picture if hasattr(target_user, 'picture') else None,
                "is_admin": target_user.is_admin,
                "has_seen_sample_data": target_user.has_seen_sample_data,
                "access_token": access_token,
                "refresh_token": refresh_token
            }

        # 일반 로그인 모드: 네이버 사용자 생성/업데이트
        user_id = f"naver_{naver_id}"
        existing_user = db.query(User).filter(User.id == user_id).first()

        if existing_user:
            # Update existing user with new tokens (암호화)
            encrypted_access_token = encrypt_token(access_token) if access_token else None
            encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None

            existing_user.email = naver_user.get("email")
            existing_user.name = naver_user.get("name") or naver_user.get("nickname") or "네이버 사용자"
            existing_user.last_login = func.now()
            existing_user.naver_access_token = encrypted_access_token
            existing_user.naver_refresh_token = encrypted_refresh_token
            existing_user.naver_token_expires_at = token_expires_at
            print(f"✅ 기존 사용자 로그인: {existing_user.name} ({existing_user.email})")
            print(f"🔑 암호화된 토큰 저장 완료 (만료: {token_expires_at.isoformat()})")
        else:
            # Create new user with tokens (암호화)
            encrypted_access_token = encrypt_token(access_token) if access_token else None
            encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None

            new_user = User(
                id=user_id,
                auth_provider="naver",
                is_anonymous=False,
                email=naver_user.get("email"),
                name=naver_user.get("name") or naver_user.get("nickname") or "네이버 사용자",
                is_admin=False,
                naver_access_token=encrypted_access_token,
                naver_refresh_token=encrypted_refresh_token,
                naver_token_expires_at=token_expires_at
            )
            db.add(new_user)
            print(f"🆕 신규 사용자 생성: {new_user.name} ({new_user.email})")
            print(f"🔑 암호화된 토큰 저장 완료 (만료: {token_expires_at.isoformat()})")

        db.commit()

        # Get the final user object to return current is_admin value
        final_user = db.query(User).filter(User.id == user_id).first()

        # Return user information
        return {
            "id": user_id,  # naver_{naver_id} 형식
            "name": naver_user.get("name") or naver_user.get("nickname"),
            "email": naver_user.get("email"),
            "picture": naver_user.get("profile_image"),
            "is_admin": final_user.is_admin if final_user else False,
            "has_seen_sample_data": final_user.has_seen_sample_data if final_user else False,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 네이버 인증 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Naver authentication failed: {str(e)}")


@router.post("/auth/kakao")
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

        # Calculate token expiration time (Kakao tokens typically expire in 21600 seconds = 6 hours)
        try:
            expires_in = int(token_json.get('expires_in', 21600))
        except (ValueError, TypeError):
            print(f"⚠️  expires_in 변환 실패, 기본값 21600초 사용")
            expires_in = 21600
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

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

        # 토큰 암호화
        encrypted_access_token = encrypt_token(access_token) if access_token else None
        encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None

        if existing_user:
            # Update existing user with new tokens (암호화)
            existing_user.email = kakao_account.get("email")
            existing_user.name = profile.get("nickname")
            existing_user.last_login = func.now()
            existing_user.kakao_access_token = encrypted_access_token
            existing_user.kakao_refresh_token = encrypted_refresh_token
            existing_user.kakao_token_expires_at = token_expires_at
            print(f"✅ 기존 사용자 로그인: {existing_user.name} ({existing_user.email})")
            print(f"🔑 암호화된 토큰 저장 완료 (만료: {token_expires_at.isoformat()})")
        else:
            # Create new user with tokens (암호화)
            new_user = User(
                id=user_id,
                auth_provider="kakao",
                is_anonymous=False,
                email=kakao_account.get("email"),
                name=profile.get("nickname"),
                is_admin=False,
                kakao_access_token=encrypted_access_token,
                kakao_refresh_token=encrypted_refresh_token,
                kakao_token_expires_at=token_expires_at
            )
            db.add(new_user)
            print(f"🆕 신규 사용자 생성: {new_user.name} ({new_user.email})")
            print(f"🔑 암호화된 토큰 저장 완료 (만료: {token_expires_at.isoformat()})")

        db.commit()

        # Get the final user object to return current is_admin value
        final_user = db.query(User).filter(User.id == user_id).first()

        # Return user information (토큰은 DB에 암호화 저장됨, 응답에서 제외)
        return {
            "id": user_id,  # kakao_{kakao_id} 형식
            "name": profile.get("nickname"),
            "email": kakao_account.get("email"),
            "picture": profile.get("profile_image_url"),
            "is_admin": final_user.is_admin if final_user else False,
            "has_seen_sample_data": final_user.has_seen_sample_data if final_user else False
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kakao authentication failed: {str(e)}")


@router.post("/auth/refresh")
async def refresh_token(request: dict = Body(...)):
    """Refresh Google OAuth token (legacy endpoint - use /auth/google/refresh for database-backed refresh)"""
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


@router.post("/auth/google/check")
async def check_google_token(request: dict = Body(...), db: Session = Depends(get_database)):
    """Check if user has valid Google token (for multi-device support)"""
    try:
        user_id = request.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.google_refresh_token:
            return {"has_valid_token": False}

        # Decrypt tokens
        access_token = decrypt_token(user.google_access_token) if user.google_access_token else None

        # Check if token is still valid (with 5-minute buffer)
        if user.google_token_expires_at and access_token:
            # SQLite에서 읽은 datetime을 UTC timezone으로 변환
            expires_at = user.google_token_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            time_until_expiry = expires_at - datetime.now(timezone.utc)
            if time_until_expiry.total_seconds() > 300:  # More than 5 minutes left
                print(f"✅ 구글 토큰 재사용 ({time_until_expiry.total_seconds():.0f}초 남음)")
                return {
                    "has_valid_token": True,
                    "access_token": access_token,
                    "user_info": user.to_dict()
                }

        return {"has_valid_token": False}

    except Exception as e:
        print(f"❌ 구글 토큰 체크 실패: {str(e)}")
        return {"has_valid_token": False}


@router.post("/auth/google/refresh")
async def refresh_google_token(request: dict = Body(...), db: Session = Depends(get_database)):
    """Refresh Google OAuth token using database stored refresh token"""
    try:
        user_id = request.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.google_refresh_token:
            raise HTTPException(status_code=404, detail="User not found or no refresh token available")

        # Decrypt refresh token
        refresh_token = decrypt_token(user.google_refresh_token)
        if not refresh_token:
            raise HTTPException(status_code=400, detail="Failed to decrypt refresh token")

        # Check if token is expired (with 5-minute buffer)
        if user.google_token_expires_at:
            # SQLite에서 읽은 datetime을 UTC timezone으로 변환
            expires_at = user.google_token_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            time_until_expiry = expires_at - datetime.now(timezone.utc)
            if time_until_expiry.total_seconds() > 300:  # More than 5 minutes left
                print(f"✅ 구글 토큰 아직 유효함 ({time_until_expiry.total_seconds():.0f}초 남음)")
                decrypted_access_token = decrypt_token(user.google_access_token)
                return {
                    "access_token": decrypted_access_token,
                    "refresh_token": refresh_token,
                    "expires_at": expires_at.isoformat(),
                    "success": True,
                    "refreshed": False
                }

        # Exchange refresh token for new access token
        print(f"🔄 구글 토큰 갱신 시작 (user_id: {user_id})")
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
            print(f"❌ 구글 토큰 갱신 실패: {token_response.text}")
            raise HTTPException(status_code=400, detail=f"Token refresh failed: {token_response.text}")

        token_json = token_response.json()
        new_access_token = token_json.get('access_token')
        new_refresh_token = token_json.get('refresh_token', refresh_token)  # 새 refresh token이 없으면 기존 것 사용

        # expires_in을 안전하게 정수로 변환
        try:
            expires_in = int(token_json.get('expires_in', 3600))
        except (ValueError, TypeError):
            print(f"⚠️  expires_in 변환 실패, 기본값 3600초 사용")
            expires_in = 3600

        if not new_access_token:
            raise HTTPException(status_code=400, detail="No access token received")

        # Calculate new expiration time
        new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Encrypt and update user tokens in database
        user.google_access_token = encrypt_token(new_access_token)
        user.google_refresh_token = encrypt_token(new_refresh_token)
        user.google_token_expires_at = new_expires_at
        db.commit()

        print(f"✅ 구글 토큰 갱신 완료 (만료: {new_expires_at.isoformat()})")

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "expires_at": new_expires_at.isoformat(),
            "success": True,
            "refreshed": True
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 구글 토큰 갱신 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")


@router.post("/auth/naver/check")
async def check_naver_token(request: dict = Body(...), db: Session = Depends(get_database)):
    """Check if user has valid Naver token (for multi-device conflict prevention)"""
    try:
        user_id = request.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.naver_refresh_token:
            return {"has_valid_token": False}

        # Decrypt token from database
        decrypted_access_token = decrypt_token(user.naver_access_token) if user.naver_access_token else None

        if not decrypted_access_token:
            return {"has_valid_token": False}

        # Check if token is still valid (with 5-minute buffer)
        if user.naver_token_expires_at:
            # SQLite에서 읽은 datetime을 UTC timezone으로 변환
            expires_at = user.naver_token_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            time_until_expiry = expires_at - datetime.now(timezone.utc)
            if time_until_expiry.total_seconds() > 300:  # More than 5 minutes left
                print(f"✅ 기존 토큰 재사용 ({time_until_expiry.total_seconds():.0f}초 남음)")
                return {
                    "has_valid_token": True,
                    "access_token": decrypted_access_token,
                    "user_info": user.to_dict()
                }

        return {"has_valid_token": False}

    except Exception as e:
        print(f"❌ 토큰 체크 실패: {str(e)}")
        return {"has_valid_token": False}


@router.post("/auth/naver/refresh")
async def refresh_naver_token(request: dict = Body(...), db: Session = Depends(get_database)):
    """Refresh Naver OAuth token using database stored refresh token"""
    try:
        user_id = request.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.naver_refresh_token:
            raise HTTPException(status_code=404, detail="User not found or no refresh token available")

        # Decrypt tokens from database
        decrypted_access_token = decrypt_token(user.naver_access_token) if user.naver_access_token else None
        decrypted_refresh_token = decrypt_token(user.naver_refresh_token) if user.naver_refresh_token else None

        if not decrypted_refresh_token:
            raise HTTPException(status_code=401, detail="Failed to decrypt Naver refresh token")

        # Check if token is expired (with 5-minute buffer)
        if user.naver_token_expires_at:
            # SQLite에서 읽은 datetime을 UTC timezone으로 변환
            expires_at = user.naver_token_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            time_until_expiry = expires_at - datetime.now(timezone.utc)
            if time_until_expiry.total_seconds() > 300:  # More than 5 minutes left
                print(f"✅ 토큰 아직 유효함 ({time_until_expiry.total_seconds():.0f}초 남음)")
                return {
                    "access_token": decrypted_access_token,
                    "refresh_token": decrypted_refresh_token,
                    "expires_at": expires_at.isoformat(),
                    "success": True,
                    "refreshed": False
                }

        # Exchange refresh token for new access token
        print(f"🔄 네이버 토큰 갱신 시작 (user_id: {user_id})")
        token_response = requests.post(
            'https://nid.naver.com/oauth2.0/token',
            params={
                'grant_type': 'refresh_token',
                'client_id': NAVER_CLIENT_ID,
                'client_secret': NAVER_CLIENT_SECRET,
                'refresh_token': decrypted_refresh_token
            }
        )

        if not token_response.ok:
            print(f"❌ 토큰 갱신 실패: {token_response.text}")
            raise HTTPException(status_code=400, detail=f"Token refresh failed: {token_response.text}")

        token_json = token_response.json()
        new_access_token = token_json.get('access_token')
        new_refresh_token = token_json.get('refresh_token', decrypted_refresh_token)  # 새 refresh token이 없으면 기존 것 사용

        # expires_in을 안전하게 정수로 변환
        try:
            expires_in = int(token_json.get('expires_in', 3600))
        except (ValueError, TypeError):
            print(f"⚠️  expires_in 변환 실패, 기본값 3600초 사용")
            expires_in = 3600

        if not new_access_token:
            raise HTTPException(status_code=400, detail="No access token received")

        # Calculate new expiration time
        new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Encrypt tokens before storing in database
        encrypted_access_token = encrypt_token(new_access_token) if new_access_token else None
        encrypted_refresh_token = encrypt_token(new_refresh_token) if new_refresh_token else None

        # Update user tokens in database
        user.naver_access_token = encrypted_access_token
        user.naver_refresh_token = encrypted_refresh_token
        user.naver_token_expires_at = new_expires_at
        db.commit()

        print(f"✅ 토큰 갱신 완료 (만료: {new_expires_at.isoformat()})")

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "expires_at": new_expires_at.isoformat(),
            "success": True,
            "refreshed": True
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 토큰 갱신 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")
