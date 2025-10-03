# v2 아키텍처 설계

> React + TypeScript + TanStack 기반 체계적인 구조

## 디렉토리 구조

```
schedule-parser-v2/
├── docs/                      # 문서
│   ├── LEGACY_FEATURES.md     # v1 기능 분석
│   ├── ARCHITECTURE.md        # 아키텍처 (현재 문서)
│   └── DEVELOPMENT.md         # 개발 가이드
│
├── src/
│   ├── app/                   # 앱 설정
│   │   ├── App.tsx            # 루트 컴포넌트
│   │   ├── router.tsx         # 라우팅 (필요시)
│   │   └── providers.tsx      # Provider 래퍼
│   │
│   ├── features/              # 기능별 모듈 (Feature-Sliced Design)
│   │   ├── schedule/          # 스케줄 관리
│   │   │   ├── components/
│   │   │   │   ├── ScheduleTable.tsx
│   │   │   │   ├── ScheduleGrid.tsx
│   │   │   │   ├── ScheduleCard.tsx
│   │   │   │   └── EditScheduleDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSchedules.ts      # TanStack Query
│   │   │   │   ├── useScheduleTable.ts  # TanStack Table
│   │   │   │   └── useScheduleVirtual.ts # TanStack Virtual
│   │   │   ├── api/
│   │   │   │   └── scheduleApi.ts
│   │   │   ├── types/
│   │   │   │   └── schedule.ts
│   │   │   └── utils/
│   │   │       └── scheduleHelpers.ts
│   │   │
│   │   ├── parser/            # 파서
│   │   │   ├── components/
│   │   │   │   ├── ParserInput.tsx
│   │   │   │   └── ParsedPreview.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useParser.ts
│   │   │   └── api/
│   │   │       └── parserApi.ts
│   │   │
│   │   ├── auth/              # 인증
│   │   │   ├── components/
│   │   │   │   ├── LoginButton.tsx
│   │   │   │   └── UserMenu.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── api/
│   │   │   │   └── authApi.ts
│   │   │   └── store/
│   │   │       └── authStore.ts         # Zustand
│   │   │
│   │   ├── calendar/          # 구글 캘린더
│   │   │   ├── hooks/
│   │   │   │   └── useCalendarSync.ts
│   │   │   └── api/
│   │   │       └── calendarApi.ts
│   │   │
│   │   └── settings/          # 설정
│   │       ├── components/
│   │       │   └── SettingsDialog.tsx
│   │       └── store/
│   │           └── settingsStore.ts     # Zustand
│   │
│   ├── components/            # 공통 컴포넌트
│   │   ├── ui/                # shadcn/ui 컴포넌트
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Container.tsx
│   │
│   ├── lib/                   # 유틸리티
│   │   ├── api/
│   │   │   ├── client.ts      # Axios/Fetch 설정
│   │   │   └── queryClient.ts # TanStack Query 설정
│   │   ├── utils/
│   │   │   ├── cn.ts          # clsx + tailwind-merge
│   │   │   ├── date.ts
│   │   │   └── format.ts
│   │   └── constants/
│   │       └── brands.ts
│   │
│   ├── types/                 # 전역 타입
│   │   ├── api.ts
│   │   └── common.ts
│   │
│   └── styles/                # 전역 스타일
│       └── globals.css        # Tailwind + 커스텀
│
├── public/                    # 정적 파일
│   └── icon-192.png
│
├── .env                       # 환경 변수
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 핵심 설계 원칙

### 1. Feature-Sliced Design
각 기능은 독립적인 모듈로 구성:
- `components/` - UI 컴포넌트
- `hooks/` - 비즈니스 로직
- `api/` - API 통신
- `types/` - 타입 정의
- `utils/` - 헬퍼 함수
- `store/` - 클라이언트 상태 (Zustand)

### 2. 관심사 분리
- **Server State**: TanStack Query (스케줄, 인증 등)
- **Client State**: Zustand (UI 상태, 설정 등)
- **Form State**: React Hook Form (필요시)

### 3. 타입 안정성
- 모든 API 응답에 TypeScript 타입
- Props에 명시적 타입
- Zod로 런타임 검증 (선택)

---

## 상태 관리 전략

### TanStack Query (서버 상태)
```typescript
// features/schedule/hooks/useSchedules.ts
export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: fetchSchedules,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

export function useAddSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}
```

### Zustand (클라이언트 상태)
```typescript
// features/auth/store/authStore.ts
interface AuthState {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ user: null, token: null }),
}))
```

---

## 컴포넌트 패턴

### 1. Container/Presenter 패턴
```typescript
// Container (비즈니스 로직)
function ScheduleTableContainer() {
  const { data, isLoading } = useSchedules()
  const table = useScheduleTable(data)
  const virtual = useScheduleVirtual(table.getRowModel().rows)

  return <ScheduleTableView table={table} virtual={virtual} />
}

// Presenter (순수 UI)
function ScheduleTableView({ table, virtual }) {
  return <div>...</div>
}
```

### 2. Compound Components (복잡한 UI)
```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button>Edit</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Schedule</DialogTitle>
    </DialogHeader>
    <EditScheduleForm />
  </DialogContent>
</Dialog>
```

---

## 가상화 전략

### 테이블 가상화
```typescript
// features/schedule/hooks/useScheduleTable.ts
export function useScheduleTable(data: Schedule[]) {
  return useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })
}

// features/schedule/hooks/useScheduleVirtual.ts
export function useScheduleVirtual(rows: Row[]) {
  const parentRef = useRef<HTMLDivElement>(null)

  return useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // 행 높이
    overscan: 10,
  })
}
```

### 그리드 가상화
```typescript
// features/schedule/hooks/useScheduleGrid.ts
export function useScheduleGrid(data: Schedule[]) {
  const parentRef = useRef<HTMLDivElement>(null)

  return useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // 카드 높이
    overscan: 5,
  })
}
```

---

## API 통신

### Axios 인스턴스
```typescript
// lib/api/client.ts
import axios from 'axios'
import { useAuthStore } from '@/features/auth/store/authStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### API 함수
```typescript
// features/schedule/api/scheduleApi.ts
export async function fetchSchedules(): Promise<Schedule[]> {
  const { data } = await apiClient.get('/schedules')
  return data
}

export async function addSchedule(schedule: NewSchedule): Promise<Schedule> {
  const { data } = await apiClient.post('/schedules', schedule)
  return data
}
```

---

## 스타일링

### Tailwind CSS + shadcn/ui
```typescript
// 일관된 스타일링
<Button variant="default" size="lg">
  Add Schedule
</Button>

<Card>
  <CardHeader>
    <CardTitle>Schedule Details</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### 커스텀 유틸리티
```typescript
// lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 테마 시스템

### CSS 변수 (shadcn/ui 방식)
```css
/* styles/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### 테마 토글
```typescript
// features/settings/hooks/useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return { theme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') }
}
```

---

## 에러 처리

### TanStack Query 에러 바운더리
```typescript
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary onReset={reset} fallback={<ErrorFallback />}>
      <ScheduleTable />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

---

## 테스트 전략 (선택)

### 단위 테스트
- Vitest + React Testing Library
- 유틸리티 함수, hooks 테스트

### E2E 테스트
- Playwright
- 핵심 플로우만 (파서 → 저장 → 캘린더 동기화)

---

## 배포 전략

### 개발
```bash
npm run dev  # localhost:5173
```

### 빌드
```bash
npm run build  # dist/ 생성
```

### 프리뷰
```bash
npm run preview  # 빌드 결과 미리보기
```

### Railway 배포
- **테스트**: `v2` 브랜치 → `v2.schedule-parser.up.railway.app`
- **프로덕션**: `deploy` 브랜치 → `schedule-parser.up.railway.app`

---

## 마이그레이션 체크리스트

- [ ] shadcn/ui 설치
- [ ] TanStack Query, Table, Virtual 설치
- [ ] Zustand 설치
- [ ] Tailwind CSS 설정
- [ ] 디렉토리 구조 생성
- [ ] API 클라이언트 설정
- [ ] 타입 정의 (Schedule, User 등)
- [ ] 테이블 컴포넌트 구현
- [ ] 그리드 컴포넌트 구현
- [ ] 파서 API 연동
- [ ] 인증 시스템 구현
- [ ] 캘린더 동기화 구현
- [ ] 테마 시스템 구현
- [ ] 백엔드 API 호환성 테스트
- [ ] 배포 및 QA
