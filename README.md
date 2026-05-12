# Schedule Parser v2

웨딩 촬영 스케줄 관리 시스템 (React + TypeScript + FastAPI)

## 📁 프로젝트 구조 (Monorepo)

```
schedule-parser-v2/
├── frontend/          # React + TypeScript 프론트엔드
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/           # FastAPI 백엔드
│   ├── main.py
│   ├── parser.py
│   ├── database.py
│   └── requirements.txt
├── package.json       # 루트 워크스페이스 설정
└── README.md
```

## 🚀 시작하기

### Frontend

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (루트에서)
npm run dev

# 또는 frontend 디렉토리에서 직접
cd frontend
npm run dev
```

Frontend는 `http://localhost:5173`에서 실행됩니다.

### Backend

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행
uvicorn main:app --reload
```

Backend API는 `http://localhost:8000`에서 실행됩니다.

## 🛠 기술 스택

### Frontend
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **TanStack Query** - 서버 상태 관리
- **TanStack Table** - 테이블 컴포넌트
- **TanStack Virtual** - 가상화
- **Tailwind CSS** - 스타일링
- **Zustand** - 클라이언트 상태 관리

### Backend
- **FastAPI** - 웹 프레임워크
- **SQLite** - 데이터베이스
- **OpenAI GPT-4** - LLM 기반 스케줄 파싱 (hybrid/llm 엔진)

## 📝 주요 기능

- ✅ 스케줄 텍스트 자동 파싱 (정규표현식 + GPT-4 hybrid)
- ✅ 가상화된 테이블 뷰 (대용량 데이터 지원)
- 🚧 스케줄 편집 및 관리
- 🚧 구글 캘린더 동기화
- 🚧 데이터 백업/복원
- 🚧 다크/라이트 테마

## 📚 개발 문서

자세한 개발 가이드는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

마이그레이션 작업 진행 상황은 [docs/MIGRATION_TASKS.md](./docs/MIGRATION_TASKS.md)를 참고하세요.

## 🚢 배포

Railway를 통해 배포 예정 (v2 서브도메인)

---

**Version**: 2.0.0
**License**: Private
