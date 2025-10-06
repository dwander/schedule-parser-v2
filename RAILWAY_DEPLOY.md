# Railway 배포 가이드

본식스냅러 v2를 Railway에 배포하는 단계별 가이드입니다.

## 📋 사전 준비

- Railway 계정 ([railway.app](https://railway.app))
- GitHub 저장소에 프로젝트 푸시
- OAuth 클라이언트 ID/Secret (Google, Naver, Kakao)

## 🚀 배포 단계

### 1. Railway 프로젝트 생성

1. Railway 대시보드에서 **New Project** 클릭
2. **Deploy from GitHub repo** 선택
3. 저장소 선택: `schedule-parser-v2`

### 2. PostgreSQL 데이터베이스 추가

1. 프로젝트 내에서 **New** → **Database** → **Add PostgreSQL** 클릭
2. Railway가 자동으로 `DATABASE_URL` 환경변수 생성

### 3. Backend 서비스 배포

#### 3-1. 서비스 생성
1. **New** → **GitHub Repo** 선택
2. Root Directory: `backend`
3. 서비스 이름: `backend` 또는 `api`

#### 3-2. 환경변수 설정

Variables 탭에서 다음 환경변수 추가:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Naver OAuth
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret

# Kakao OAuth
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# Frontend URL (나중에 설정)
FRONTEND_URL=https://your-frontend-url.up.railway.app
```

**주의**: `DATABASE_URL`은 PostgreSQL 서비스 연결 시 자동으로 추가됩니다.

#### 3-3. Settings 설정
- **Root Directory**: `/backend`
- **Start Command**: 자동 감지됨 (`railway.json` 사용)

### 4. Frontend 서비스 배포

#### 4-1. 서비스 생성
1. **New** → **GitHub Repo** 선택
2. Root Directory: `frontend`
3. 서비스 이름: `frontend` 또는 `web`

#### 4-2. 환경변수 설정

Variables 탭에서 다음 환경변수 추가:

```bash
# Backend API URL (backend 서비스의 도메인 사용)
VITE_API_URL=https://your-backend-url.up.railway.app

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Naver OAuth Client ID
VITE_NAVER_CLIENT_ID=your-naver-client-id

# Kakao OAuth REST API Key
VITE_KAKAO_REST_API_KEY=your-kakao-rest-api-key
```

#### 4-3. Settings 설정
- **Root Directory**: `/frontend`
- **Build Command**: 자동 감지됨 (`nixpacks.toml` 사용)

### 5. 서비스 연결 및 도메인 설정

#### Backend
1. Settings → **Networking** → **Generate Domain**
2. 생성된 도메인 복사 (예: `backend-production-xxxx.up.railway.app`)
3. Frontend의 `VITE_API_URL`에 이 도메인 설정

#### Frontend
1. Settings → **Networking** → **Generate Domain**
2. 생성된 도메인 복사 (예: `frontend-production-yyyy.up.railway.app`)
3. Backend의 `FRONTEND_URL`에 이 도메인 설정

### 6. OAuth 리다이렉트 URI 설정

각 OAuth 제공자의 콘솔에서 리다이렉트 URI를 추가하세요:

#### Google
- Authorized redirect URIs:
  - `https://your-frontend-url.up.railway.app/auth/google/callback`

#### Naver
- Callback URL:
  - `https://your-frontend-url.up.railway.app/auth/naver/callback`

#### Kakao
- Redirect URI:
  - `https://your-frontend-url.up.railway.app/auth/kakao/callback`

## 🔄 재배포

코드 변경 후 GitHub에 푸시하면 Railway가 자동으로 재배포합니다.

## 🐛 문제 해결

### 데이터베이스 연결 실패
- PostgreSQL 서비스가 Backend 서비스와 연결되었는지 확인
- `DATABASE_URL` 환경변수가 자동으로 설정되었는지 확인

### CORS 오류
- Backend의 `FRONTEND_URL` 환경변수가 올바른 프론트엔드 도메인인지 확인
- 프로토콜(`https://`)이 포함되어 있는지 확인

### 빌드 실패
- 로그 확인: Deployments 탭에서 빌드 로그 확인
- 환경변수 누락 확인

## 📝 커스텀 도메인 설정 (선택사항)

1. Settings → **Networking** → **Custom Domain**
2. 도메인 입력 (예: `api.yourdomain.com`, `app.yourdomain.com`)
3. DNS 레코드 설정 (Railway가 안내)

## 💡 팁

- **환경 분리**: `main` 브랜치는 프로덕션, `develop` 브랜치는 스테이징으로 설정 가능
- **로그 확인**: 각 서비스의 Deployments → View Logs에서 실시간 로그 확인
- **비용 관리**: Railway의 무료 플랜은 $5 크레딧 제공, 사용량 모니터링 권장
