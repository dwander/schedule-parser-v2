from fastapi import APIRouter, Body, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from config import settings
from database import get_database, User

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


# Data Models
class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str = None


class GoogleTokenRequest(BaseModel):
    credential: str  # ID Token (JWT)


class NaverAuthRequest(BaseModel):
    code: str
    state: str


class KakaoAuthRequest(BaseModel):
    code: str


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
            "id": user_id,  # naver_{naver_id} 형식
            "name": naver_user.get("name") or naver_user.get("nickname"),
            "email": naver_user.get("email"),
            "picture": naver_user.get("profile_image"),
            "is_admin": final_user.is_admin if final_user else False,
            "has_seen_sample_data": final_user.has_seen_sample_data if final_user else False,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except Exception as e:
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
            "id": user_id,  # kakao_{kakao_id} 형식
            "name": profile.get("nickname"),
            "email": kakao_account.get("email"),
            "picture": profile.get("profile_image_url"),
            "is_admin": final_user.is_admin if final_user else False,
            "has_seen_sample_data": final_user.has_seen_sample_data if final_user else False,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kakao authentication failed: {str(e)}")


@router.post("/auth/refresh")
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
