# 개발 가이드

> 입으로 코딩하는 환경을 위한 명확한 규칙

## 코딩 규칙

### 1. 명명 규칙

#### 파일명
- 컴포넌트: PascalCase (`ScheduleTable.tsx`)
- Hooks: camelCase + use 접두사 (`useSchedules.ts`)
- Utils: camelCase (`dateHelpers.ts`)
- Types: camelCase (`schedule.ts`)

#### 변수/함수
```typescript
// ✅ Good
const scheduleList = []
function fetchSchedules() {}
const isLoading = false

// ❌ Bad
const schedule_list = []
function get_schedules() {}
const loading = false  // 불명확
```

#### 타입/인터페이스
```typescript
// ✅ Good
interface Schedule {}
type ScheduleStatus = 'pending' | 'confirmed'

// ❌ Bad
interface ISchedule {}  // I 접두사 불필요
type schedule_status = string  // 너무 느슨함
```

---

### 2. 컴포넌트 작성 규칙

#### 기본 구조
```typescript
// features/schedule/components/ScheduleCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Schedule } from '../types/schedule'
import { formatDate } from '@/lib/utils/date'

interface ScheduleCardProps {
  schedule: Schedule
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function ScheduleCard({ schedule, onEdit, onDelete }: ScheduleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatDate(schedule.date)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{schedule.groom} ♡ {schedule.bride}</p>
        <p>{schedule.location}</p>
      </CardContent>
    </Card>
  )
}
```

#### Props 타입은 항상 명시
```typescript
// ✅ Good
interface Props {
  title: string
  count: number
}

function Component({ title, count }: Props) {}

// ❌ Bad
function Component({ title, count }) {}  // 타입 없음
```

#### Hooks는 최상위에
```typescript
// ✅ Good
function Component() {
  const { data } = useSchedules()
  const [open, setOpen] = useState(false)

  return <div>...</div>
}

// ❌ Bad
function Component() {
  if (someCondition) {
    const { data } = useSchedules()  // 조건부 Hook 금지
  }
}
```

---

### 3. 스타일링 규칙

#### Tailwind만 사용
```typescript
// ✅ Good
<div className="flex items-center gap-4 p-4">
  <Button variant="default" size="lg">Save</Button>
</div>

// ❌ Bad
<div style={{ display: 'flex', padding: '16px' }}>  // 인라인 스타일 금지
  <Button className="custom-button">Save</Button>  // 커스텀 클래스 금지
</div>
```

#### 조건부 클래스는 cn() 사용
```typescript
import { cn } from '@/lib/utils/cn'

<div className={cn(
  "base-class",
  isActive && "bg-primary",
  isDisabled && "opacity-50"
)}>
```

#### 색상은 shadcn/ui 변수만
```typescript
// ✅ Good
<div className="bg-primary text-primary-foreground">

// ❌ Bad
<div className="bg-blue-500 text-white">  // 하드코딩 금지
```

---

### 4. 상태 관리 규칙

#### 서버 상태: TanStack Query
```typescript
// features/schedule/hooks/useSchedules.ts
import { useQuery } from '@tanstack/react-query'
import { fetchSchedules } from '../api/scheduleApi'

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],  // 배열로 명시
    queryFn: fetchSchedules,
  })
}
```

#### 클라이언트 상태: Zustand
```typescript
// features/settings/store/settingsStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  fontSize: number
  viewMode: 'table' | 'grid'
  setFontSize: (size: number) => void
  setViewMode: (mode: 'table' | 'grid') => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 16,
      viewMode: 'table',
      setFontSize: (fontSize) => set({ fontSize }),
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    { name: 'settings' }  // localStorage 키
  )
)
```

#### 로컬 상태: useState
```typescript
// 단순한 UI 상태만
const [isOpen, setIsOpen] = useState(false)
const [searchQuery, setSearchQuery] = useState('')
```

---

### 5. API 호출 규칙

#### API 함수는 features/{feature}/api/ 에
```typescript
// features/schedule/api/scheduleApi.ts
import { apiClient } from '@/lib/api/client'
import { Schedule, NewSchedule } from '../types/schedule'

export async function fetchSchedules(): Promise<Schedule[]> {
  const { data } = await apiClient.get('/schedules')
  return data
}

export async function addSchedule(schedule: NewSchedule): Promise<Schedule> {
  const { data } = await apiClient.post('/schedules', schedule)
  return data
}
```

#### TanStack Query로 래핑
```typescript
// features/schedule/hooks/useSchedules.ts
export function useAddSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
    onError: (error) => {
      console.error('Failed to add schedule:', error)
    },
  })
}
```

---

### 6. 타입 정의 규칙

#### API 응답 타입
```typescript
// features/schedule/types/schedule.ts
export interface Schedule {
  id: string
  date: string  // ISO 8601
  time: string
  location: string
  groom: string
  bride: string
  cuts: number
  price: number
  fee: number
  manager: string
  brand: 'K7' | 'B7' | 'A+' | 'Graphy' | '2ndFlow'
  memo?: string
  isDuplicate: boolean
  createdAt: string
  updatedAt: string
}

export type NewSchedule = Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateSchedule = Partial<NewSchedule>
```

#### Props 타입
```typescript
interface ScheduleTableProps {
  schedules: Schedule[]
  onEdit?: (schedule: Schedule) => void  // optional
  onDelete: (id: string) => void         // required
}
```

---

### 7. 에러 처리

#### Try-catch는 최소화 (TanStack Query가 처리)
```typescript
// ✅ Good
function Component() {
  const { data, error, isLoading } = useSchedules()

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return <ScheduleTable data={data} />
}

// ❌ Bad
function Component() {
  const [data, setData] = useState([])

  useEffect(() => {
    try {
      const result = await fetchSchedules()  // async 함수 직접 호출
      setData(result)
    } catch (error) {
      console.error(error)
    }
  }, [])
}
```

---

### 8. Import 순서

```typescript
// 1. React
import { useState, useEffect } from 'react'

// 2. 외부 라이브러리
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

// 3. 내부 컴포넌트
import { Button } from '@/components/ui/button'
import { ScheduleCard } from './ScheduleCard'

// 4. Hooks
import { useSchedules } from '../hooks/useSchedules'

// 5. Utils
import { formatDate } from '@/lib/utils/date'

// 6. Types
import { Schedule } from '../types/schedule'

// 7. Constants
import { BRANDS } from '@/lib/constants/brands'
```

---

### 9. 주석 규칙

#### JSDoc만 사용 (복잡한 로직에만)
```typescript
/**
 * 스케줄 데이터를 파싱하여 구조화된 객체로 변환
 * @param text - 카카오톡 메시지 원문
 * @returns 파싱된 스케줄 객체
 */
export function parseSchedule(text: string): ParsedSchedule {
  // ...
}
```

#### 일반 주석은 최소화 (코드로 설명)
```typescript
// ✅ Good
const isScheduleValid = schedule.date && schedule.groom && schedule.bride

// ❌ Bad
// 날짜와 신랑신부 이름이 있는지 확인
const valid = schedule.date && schedule.groom && schedule.bride
```

---

### 10. 테스트 작성 (선택)

#### 파일명: `{name}.test.ts`
```typescript
// lib/utils/date.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate } from './date'

describe('formatDate', () => {
  it('should format ISO date to Korean format', () => {
    expect(formatDate('2025-01-15')).toBe('2025년 1월 15일')
  })
})
```

---

## 환경 변수

### `.env`
```bash
# API 기본 URL
VITE_API_URL=http://localhost:8000

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-client-id

# 앱 버전 (자동 생성)
VITE_APP_VERSION=2.0.0
```

### 사용법
```typescript
const API_URL = import.meta.env.VITE_API_URL
```

---

## Git 커밋 규칙

### 커밋 메시지 형식
```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 리팩토링
style: 스타일 변경 (포맷팅, 세미콜론 등)
docs: 문서 수정
test: 테스트 추가
chore: 빌드 설정, 패키지 업데이트 등
```

### 예시
```bash
git commit -m "feat: TanStack Table 가상화 구현

- useScheduleTable hook 추가
- useScheduleVirtual hook 추가
- 1000개 이상 데이터 부드러운 스크롤 지원"
```

---

## 디버깅

### React DevTools
- 컴포넌트 트리 확인
- Props/State 실시간 확인

### TanStack Query DevTools
```typescript
// App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools />
    </>
  )
}
```

### Console 로그
```typescript
// 개발 환경에서만
if (import.meta.env.DEV) {
  console.log('Schedule data:', data)
}
```

---

## 성능 최적화

### 1. memo로 리렌더링 방지
```typescript
import { memo } from 'react'

export const ScheduleCard = memo(function ScheduleCard({ schedule }: Props) {
  return <div>...</div>
})
```

### 2. useMemo로 계산 캐싱
```typescript
const sortedSchedules = useMemo(
  () => schedules.sort((a, b) => a.date.localeCompare(b.date)),
  [schedules]
)
```

### 3. useCallback로 함수 캐싱
```typescript
const handleEdit = useCallback((id: string) => {
  // ...
}, [])
```

---

## 입으로 코딩 시 팁

### 1. 명확한 요청
```
❌ "테이블 만들어줘"
✅ "TanStack Table과 Virtual을 사용해서 가상화된 스케줄 테이블 컴포넌트를
   features/schedule/components/ScheduleTable.tsx에 만들어줘"
```

### 2. 타입 먼저 정의
```
"먼저 Schedule 타입을 features/schedule/types/schedule.ts에 정의해줘"
```

### 3. 파일 경로 명시
```
"features/schedule/hooks/useSchedules.ts에 TanStack Query hook 만들어줘"
```

### 4. 예시 제공
```
"이런 식으로 작동해야 해: const { data } = useSchedules()"
```

---

## 자주 발생하는 실수

### 1. 타입 누락
```typescript
// ❌
const data = await fetchSchedules()

// ✅
const data: Schedule[] = await fetchSchedules()
```

### 2. Optional chaining 없이 접근
```typescript
// ❌
<div>{schedule.groom}</div>

// ✅
<div>{schedule?.groom ?? 'N/A'}</div>
```

### 3. Key prop 누락
```typescript
// ❌
{schedules.map(s => <Card>{s.groom}</Card>)}

// ✅
{schedules.map(s => <Card key={s.id}>{s.groom}</Card>)}
```

---

## 유용한 명령어

```bash
# 개발 서버
npm run dev

# 타입 체크
npm run type-check

# 린트
npm run lint

# 빌드
npm run build

# 프리뷰
npm run preview
```

---

## 다음 단계

1. shadcn/ui 설치
2. TanStack 패키지 설치
3. 디렉토리 구조 생성
4. 첫 컴포넌트 만들기

각 단계마다 명확하게 요청하세요!
