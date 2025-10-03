# 기존 프로젝트 기능 분석

> 본식스냅러 v1 (Vue 3 + Vuetify) → v2 (React + TypeScript) 마이그레이션을 위한 기능 명세

## 핵심 기능

### 1. 카카오톡 메시지 파서 ⭐ (가장 중요)
**위치**: `backend/parser/`
**기능**: 카카오톡 메시지를 분석하여 스케줄 데이터로 변환

**입력 예시**:
```
5/12(일) 1시 본식
신랑신부: 김철수♡박영희
장소: 더컨벤션 2층 그랜드볼룸
컷수: 400컷
촬영비: 500,000원
```

**출력 데이터 구조**:
```typescript
interface Schedule {
  id: string
  date: string // ISO 8601
  time: string
  location: string
  groom: string
  bride: string
  cuts: number
  price: number
  fee: number
  manager: string
  brand: string // K7, B7, A+, Graphy, 2ndFlow
  memo: string
  isDuplicate: boolean
  createdAt: string
  updatedAt: string
}
```

**파서 로직**:
- 날짜/시간 추출 (다양한 포맷 지원)
- 신랑/신부 이름 추출 (`♡`, `&`, `💒` 구분자)
- 장소 파싱 (주소, 건물명, 층수, 홀 이름)
- 숫자 추출 (컷수, 금액)
- 브랜드 자동 감지

**마이그레이션 전략**: FastAPI 백엔드 그대로 재사용

---

### 2. 스케줄 관리 (CRUD)

#### 2.1 테이블 뷰
**현재 구현**: Vuetify v-data-table + 페이지네이션
**문제점**:
- 페이지네이션으로 전체 데이터 한눈에 못 봄
- 가상화 없어서 1000개 이상 시 느려짐

**필요 기능**:
- ✅ 정렬 (날짜, 장소, 금액 등)
- ✅ 필터 (날짜 범위, 브랜드, 장소)
- ✅ 검색 (신랑신부, 장소, 담당자)
- ✅ 행 선택 (체크박스)
- ✅ 일괄 삭제
- ✅ 중복 표시 (노란 배경)

**v2 목표**: TanStack Table + Virtual로 페이지네이션 없이 부드러운 스크롤

#### 2.2 그리드 뷰
**현재 구현**: 수동 그리드 레이아웃
**문제점**: 가상화 없음

**필요 기능**:
- ✅ 카드 형태로 표시
- ✅ 브랜드별 색상 구분
- ✅ 날짜/시간 표시
- ✅ 신랑신부 이름
- ✅ 컷수/금액 표시

**v2 목표**: TanStack Virtual로 1만 개 데이터도 부드럽게

#### 2.3 편집 모달
**기능**:
- 날짜/시간 수정
- 장소 수정
- 금액 수정
- 메모 추가
- 중복 체크박스

---

### 3. 구글 캘린더 연동
**위치**: `frontend/src/utils/googleCalendar.ts`

**기능**:
- OAuth 2.0 인증
- 스케줄 → 캘린더 이벤트 생성
- 양방향 동기화 (추가/수정/삭제)

**API 엔드포인트**:
- `POST /auth/google` - OAuth 코드 교환
- `POST /auth/refresh` - 토큰 갱신

**마이그레이션**: 백엔드 API 그대로, 프론트엔드는 TanStack Query로 재구현

---

### 4. 인증 시스템
**현재**: Google OAuth (GIS 라이브러리)

**플로우**:
1. 로그인 랜딩 페이지
2. Google 로그인 버튼
3. Authorization Code 받기
4. 백엔드에서 토큰 교환
5. 사용자 정보 저장

**저장 데이터**:
- user.id (Google ID)
- user.name
- user.email
- user.picture
- access_token
- refresh_token

**마이그레이션**: OAuth 플로우 그대로, UI만 React로

---

### 5. 데이터 백업/복원
**기능**:
- JSON 파일로 내보내기
- JSON 파일 가져오기 (중복 체크)

**백업 파일 구조**:
```json
{
  "version": "2025.0.1.83",
  "exportDate": "2025-01-15T10:30:00Z",
  "schedules": [...]
}
```

---

### 6. 테마 시스템
**현재**: 다크/라이트 모드
**문제점**: Vuetify + CSS 변수 혼재로 일관성 없음

**v2 목표**: shadcn/ui 테마 시스템 (Tailwind 기반)
- 간단한 토글
- 자동 시스템 감지
- 로컬스토리지 저장

---

### 7. 설정
**현재 설정**:
- 글꼴 크기 (16-24px)
- 테마 (다크/라이트)
- 뷰 모드 (테이블/그리드)
- 필드 가시성 (컬럼 show/hide)

---

### 8. 통계
**위치**: Footer
**표시 항목**:
- 총 스케줄 개수
- 전체 컷수
- 촬영비 합계
- Fee 합계

---

### 9. 사진 폴더 동기화
**기능**: 로컬 폴더 구조와 스케줄 매칭
**상태**: 부분 구현
**우선순위**: 낮음 (v2에서는 보류 가능)

---

## UI 컴포넌트 목록

### Layout
- AppHeader (상단바)
- SideMenu (사이드패널)
- ActionBar (액션 버튼들)

### Modals
- EditModal (스케줄 편집)
- DateFilterModal (날짜 필터)
- NewScheduleModal (새 스케줄 추가)
- FontSizeModal (글꼴 크기 설정)
- ConfirmModal (확인 대화상자)
- AlertModal (알림)

### Common
- ToastContainer (토스트 알림)
- EmptyState (빈 상태)
- CloseButton (닫기 버튼)

---

## 상태 관리 (Pinia)

### scheduleStore
- schedules (스케줄 배열)
- selectedSchedules (선택된 항목)
- loadSchedules()
- addSchedule()
- updateSchedule()
- deleteSchedules()
- markAsDuplicate()

### uiStore
- loading
- error
- modals (모달 상태)
- scheduleSearchQuery (검색어)

### authStore
- user
- isAuthenticated
- googleToken
- refreshToken
- loginWithAuthCode()
- logout()
- restoreAuth()

### appSettingsStore
- fontSize
- viewMode
- fieldVisibility
- loadSettings()
- saveSettings()

### themeStore
- isDark
- toggleTheme()

---

## 배포
**현재**: Railway (main, deploy 브랜치)
**프론트엔드**: Vite 빌드 → 정적 파일
**백엔드**: FastAPI (Uvicorn)

**v2 전략**:
- 동일한 Railway 프로젝트
- 서브도메인으로 테스트 (`v2.schedule-parser.up.railway.app`)
- 안정화 후 메인 도메인 교체

---

## 마이그레이션 우선순위

### Phase 1: 핵심 기능 (1주)
1. ✅ 파서 API 연동
2. ✅ 테이블 뷰 (TanStack Table + Virtual)
3. ✅ 그리드 뷰 (TanStack Virtual)
4. ✅ 기본 CRUD

### Phase 2: 인증 & 동기화 (3-4일)
5. ✅ Google OAuth
6. ✅ 구글 캘린더 연동
7. ✅ 데이터 백업/복원

### Phase 3: 편의 기능 (2-3일)
8. ✅ 검색/필터
9. ✅ 설정 (테마, 글꼴)
10. ✅ 통계

### Phase 4: 선택 기능
11. ⏸️ 사진 폴더 동기화 (보류)
12. ⏸️ PWA (필요시)

---

## 기술 스택 비교

### v1 (현재)
- Frontend: Vue 3 + Vuetify 3
- State: Pinia
- Build: Vite
- Backend: FastAPI
- DB: SQLite (IndexedDB 로컬 캐싱)

### v2 (목표)
- Frontend: React 18 + TypeScript
- UI: shadcn/ui (Tailwind CSS)
- Table: TanStack Table + Virtual
- State: TanStack Query (서버) + Zustand (클라이언트)
- Build: Vite
- Backend: FastAPI (재사용)
- DB: SQLite (동일)

---

## 데이터 마이그레이션

**백엔드 API 호환성 유지**:
- 동일한 엔드포인트 사용
- 동일한 DB 스키마
- 사용자는 URL만 바뀌면 끝

**마이그레이션 필요 없음** - 기존 사용자 데이터 그대로 사용
