"""
환경변수 설정 및 검증
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings:
    """애플리케이션 설정 클래스"""

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str

    # --- Naver OAuth ---
    NAVER_CLIENT_ID: Optional[str] = None
    NAVER_CLIENT_SECRET: Optional[str] = None

    # --- Kakao OAuth ---
    KAKAO_REST_API_KEY: Optional[str] = None
    KAKAO_CLIENT_SECRET: Optional[str] = None

    # --- Admin ---
    DEV_ADMIN_ID: Optional[str] = None

    # --- Frontend URL ---
    FRONTEND_URL: Optional[str] = None

    # --- Railway Environment ---
    RAILWAY_STATIC_URL: Optional[str] = None
    RAILWAY_GIT_BRANCH: Optional[str] = None
    RAILWAY_VOLUME_MOUNT_PATH: str = "storage"

    # --- Feature Flags ---
    ENABLE_LOCAL_BACKUP: bool = False

    # --- Redirect URIs (동적 계산) ---
    GOOGLE_REDIRECT_URI: str
    NAVER_REDIRECT_URI: str
    KAKAO_REDIRECT_URI: str

    def __init__(self):
        """환경변수 로드 및 검증"""
        self._load_required()
        self._load_optional()
        self._compute_redirect_uris()
        self._validate()

    def _load_required(self):
        """필수 환경변수 로드"""
        self.GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
        self.GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

    def _load_optional(self):
        """선택적 환경변수 로드"""
        # OAuth
        self.NAVER_CLIENT_ID = os.getenv('NAVER_CLIENT_ID')
        self.NAVER_CLIENT_SECRET = os.getenv('NAVER_CLIENT_SECRET')
        self.KAKAO_REST_API_KEY = os.getenv('KAKAO_REST_API_KEY')
        self.KAKAO_CLIENT_SECRET = os.getenv('KAKAO_CLIENT_SECRET')

        # Admin
        self.DEV_ADMIN_ID = os.getenv('DEV_ADMIN_ID')

        # Frontend
        self.FRONTEND_URL = os.getenv('FRONTEND_URL')

        # Railway
        self.RAILWAY_STATIC_URL = os.getenv('RAILWAY_STATIC_URL')
        self.RAILWAY_GIT_BRANCH = os.getenv('RAILWAY_GIT_BRANCH')
        self.RAILWAY_VOLUME_MOUNT_PATH = os.getenv('RAILWAY_VOLUME_MOUNT_PATH', 'storage')

        # Feature flags
        self.ENABLE_LOCAL_BACKUP = os.getenv('ENABLE_LOCAL_BACKUP', 'false').lower() == 'true'

    def _compute_redirect_uris(self):
        """Redirect URI 계산"""
        # Railway 배포 환경인지 확인
        is_railway = self.RAILWAY_STATIC_URL or self.RAILWAY_GIT_BRANCH

        if is_railway:
            # Railway 배포 환경
            base_url = self.FRONTEND_URL or 'https://your-app.railway.app'
            self.GOOGLE_REDIRECT_URI = f'{base_url}/auth/callback.html'
            self.NAVER_REDIRECT_URI = f'{base_url}/auth/naver/callback'
            self.KAKAO_REDIRECT_URI = f'{base_url}/auth/kakao/callback'
        else:
            # 로컬 개발 환경
            self.GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/callback.html'
            self.NAVER_REDIRECT_URI = 'http://localhost:5173/auth/naver/callback'
            self.KAKAO_REDIRECT_URI = 'http://localhost:5173/auth/kakao/callback'

    def _validate(self):
        """필수 환경변수 검증"""
        missing = []

        # Google OAuth (필수)
        if not self.GOOGLE_CLIENT_ID:
            missing.append('GOOGLE_CLIENT_ID')
        if not self.GOOGLE_CLIENT_SECRET:
            missing.append('GOOGLE_CLIENT_SECRET')

        if missing:
            raise ValueError(
                f"필수 환경변수가 설정되지 않았습니다: {', '.join(missing)}\n"
                f".env 파일을 확인하거나 환경변수를 설정해주세요."
            )

    @property
    def is_railway(self) -> bool:
        """Railway 환경 여부"""
        return bool(self.RAILWAY_STATIC_URL or self.RAILWAY_GIT_BRANCH)

    @property
    def is_development(self) -> bool:
        """개발 환경 여부"""
        return not self.is_railway

    @property
    def storage_dir(self) -> str:
        """저장소 디렉토리"""
        return self.RAILWAY_VOLUME_MOUNT_PATH


# 싱글톤 인스턴스
settings = Settings()
