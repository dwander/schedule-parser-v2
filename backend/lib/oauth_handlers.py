"""
OAuth 핸들러 통합 모듈

모든 OAuth 제공자(Google, Naver, Kakao)의 공통 토큰 관리 로직을 제공합니다.
"""

from abc import ABC, abstractmethod
from typing import Tuple, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import requests

from database import User
from lib.crypto import encrypt_token, decrypt_token


class OAuthHandler(ABC):
    """OAuth 제공자 핸들러 기본 클래스"""

    def __init__(self, client_id: str, client_secret: Optional[str] = None):
        self.client_id = client_id
        self.client_secret = client_secret

    @abstractmethod
    def get_token_field_names(self) -> Tuple[str, str, str]:
        """
        토큰 필드명 반환

        Returns:
            (access_token_field, refresh_token_field, expires_at_field)
        """
        pass

    @abstractmethod
    def get_token_refresh_url(self) -> str:
        """토큰 갱신 API URL 반환"""
        pass

    @abstractmethod
    def get_default_expires_in(self) -> int:
        """기본 토큰 유효기간 (초) 반환"""
        pass

    def get_provider_name(self) -> str:
        """제공자 이름 반환 (로그용)"""
        return self.__class__.__name__.replace("OAuthHandler", "")

    def get_user_tokens(
        self, user: User
    ) -> Tuple[Optional[str], Optional[str], Optional[datetime]]:
        """
        사용자의 토큰 정보 가져오기 (복호화 포함)

        Returns:
            (decrypted_access_token, decrypted_refresh_token, expires_at)
        """
        access_field, refresh_field, expires_field = self.get_token_field_names()

        encrypted_access = getattr(user, access_field, None)
        encrypted_refresh = getattr(user, refresh_field, None)
        expires_at = getattr(user, expires_field, None)

        decrypted_access = decrypt_token(encrypted_access) if encrypted_access else None
        decrypted_refresh = decrypt_token(encrypted_refresh) if encrypted_refresh else None

        return decrypted_access, decrypted_refresh, expires_at

    def is_token_valid(self, expires_at: Optional[datetime], buffer_seconds: int = 300) -> bool:
        """
        토큰이 유효한지 확인 (버퍼 시간 포함)

        Args:
            expires_at: 만료 시간
            buffer_seconds: 버퍼 시간 (초), 기본 5분

        Returns:
            True if 토큰이 아직 유효함
        """
        if not expires_at:
            return False

        # Timezone 처리
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        time_until_expiry = expires_at - datetime.now(timezone.utc)
        return time_until_expiry.total_seconds() > buffer_seconds

    def build_refresh_params(self, refresh_token: str) -> Dict[str, str]:
        """
        토큰 갱신 요청 파라미터 생성

        Args:
            refresh_token: Refresh token

        Returns:
            요청 파라미터 딕셔너리
        """
        params = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "refresh_token": refresh_token,
        }

        if self.client_secret:
            params["client_secret"] = self.client_secret

        return params

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        토큰 갱신 API 호출

        Args:
            refresh_token: Refresh token

        Returns:
            {
                "access_token": str,
                "refresh_token": str (optional),
                "expires_in": int
            }

        Raises:
            requests.RequestException: API 호출 실패 시
        """
        url = self.get_token_refresh_url()
        params = self.build_refresh_params(refresh_token)

        response = requests.post(url, data=params)
        response.raise_for_status()

        return response.json()

    def update_user_tokens(
        self,
        user: User,
        access_token: str,
        refresh_token: str,
        expires_in: int,
        db: Session,
    ) -> datetime:
        """
        사용자 토큰 업데이트 (암호화 및 DB 저장)

        Args:
            user: 사용자 객체
            access_token: 새 access token
            refresh_token: 새 refresh token
            expires_in: 유효기간 (초)
            db: DB 세션

        Returns:
            새로운 만료 시간
        """
        access_field, refresh_field, expires_field = self.get_token_field_names()

        # 토큰 암호화
        encrypted_access = encrypt_token(access_token) if access_token else None
        encrypted_refresh = encrypt_token(refresh_token) if refresh_token else None

        # 만료 시간 계산
        new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # DB 업데이트
        setattr(user, access_field, encrypted_access)
        setattr(user, refresh_field, encrypted_refresh)
        setattr(user, expires_field, new_expires_at)

        db.commit()

        return new_expires_at

    def refresh_token_if_needed(
        self, user_id: str, db: Session
    ) -> Tuple[str, bool]:
        """
        필요시 토큰 갱신 (메인 메서드)

        Args:
            user_id: 사용자 ID
            db: DB 세션

        Returns:
            (access_token, was_refreshed)

        Raises:
            ValueError: 사용자 없음 또는 토큰 없음
            requests.RequestException: 토큰 갱신 실패
        """
        provider_name = self.get_provider_name()

        # 사용자 조회
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User not found: {user_id}")

        # 토큰 가져오기
        access_token, refresh_token, expires_at = self.get_user_tokens(user)

        if not refresh_token:
            raise ValueError(f"No {provider_name} refresh token available")

        # 토큰 유효성 확인
        if self.is_token_valid(expires_at):
            time_left = (expires_at - datetime.now(timezone.utc)).total_seconds()
            print(f"✅ {provider_name} 토큰 아직 유효함 ({time_left:.0f}초 남음)")
            return access_token, False

        # 토큰 갱신
        print(f"🔄 {provider_name} 토큰 갱신 시작 (user_id: {user_id})")

        try:
            token_data = self.refresh_token(refresh_token)
        except requests.RequestException as e:
            print(f"❌ {provider_name} 토큰 갱신 실패: {str(e)}")
            raise

        new_access_token = token_data.get("access_token")
        new_refresh_token = token_data.get("refresh_token", refresh_token)

        # expires_in 안전 변환
        try:
            expires_in = int(token_data.get("expires_in", self.get_default_expires_in()))
        except (ValueError, TypeError):
            print(f"⚠️  expires_in 변환 실패, 기본값 사용")
            expires_in = self.get_default_expires_in()

        if not new_access_token:
            raise ValueError(f"No access token received from {provider_name}")

        # DB 업데이트
        new_expires_at = self.update_user_tokens(
            user, new_access_token, new_refresh_token, expires_in, db
        )

        print(f"✅ {provider_name} 토큰 갱신 완료 (만료: {new_expires_at.isoformat()})")

        return new_access_token, True


# --- 제공자별 핸들러 구현 ---


class GoogleOAuthHandler(OAuthHandler):
    """Google OAuth 핸들러"""

    def get_token_field_names(self) -> Tuple[str, str, str]:
        return ("google_access_token", "google_refresh_token", "google_token_expires_at")

    def get_token_refresh_url(self) -> str:
        return "https://oauth2.googleapis.com/token"

    def get_default_expires_in(self) -> int:
        return 3600  # 1시간


class NaverOAuthHandler(OAuthHandler):
    """Naver OAuth 핸들러"""

    def get_token_field_names(self) -> Tuple[str, str, str]:
        return ("naver_access_token", "naver_refresh_token", "naver_token_expires_at")

    def get_token_refresh_url(self) -> str:
        return "https://nid.naver.com/oauth2.0/token"

    def get_default_expires_in(self) -> int:
        return 3600  # 1시간

    def build_refresh_params(self, refresh_token: str) -> Dict[str, str]:
        """Naver는 params 형식 사용"""
        return {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
        }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Naver는 params로 전송"""
        url = self.get_token_refresh_url()
        params = self.build_refresh_params(refresh_token)

        response = requests.post(url, params=params)
        response.raise_for_status()

        return response.json()


class KakaoOAuthHandler(OAuthHandler):
    """Kakao OAuth 핸들러"""

    def get_token_field_names(self) -> Tuple[str, str, str]:
        return ("kakao_access_token", "kakao_refresh_token", "kakao_token_expires_at")

    def get_token_refresh_url(self) -> str:
        return "https://kauth.kakao.com/oauth/token"

    def get_default_expires_in(self) -> int:
        return 21600  # 6시간
