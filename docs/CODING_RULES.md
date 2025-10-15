# 코딩 규칙 (Coding Rules)

## 스타일링 규칙

### 1. 단위 사용 규칙

#### ✅ 글씨 크기 및 아이콘 크기
- **반드시 `rem` 단위 사용**
- Tailwind 유틸리티 클래스 사용 (내부적으로 rem 사용)
  - `text-sm`, `text-base`, `text-lg`, `text-xl` 등
  - `h-4`, `h-8`, `h-10` 등 (0.25rem 단위)
- 커스텀 크기는 `rem` 단위로 지정
  - ✅ `className="h-[1.2rem] w-[1.2rem]"`
  - ❌ `className="h-[20px] w-[20px]"`

**이유**: 사용자 브라우저 글꼴 크기 설정을 존중하고, 반응형 타이포그래피 지원

#### ❌ px 사용 금지 항목
- 글씨 크기 (`font-size`)
- 아이콘 크기 (`width`, `height`)
- 타이포그래피 관련 여백 (`line-height`, `letter-spacing`)

#### ✅ px 사용 가능 항목
- 테두리 두께 (`border-width`)
- 그림자 (`box-shadow`)
- 레이아웃 픽셀 퍼펙트가 필요한 경우 (단, 신중히 사용)

### 2. 색상 사용 규칙

#### ✅ 반드시 CSS 테마 변수 사용
```tsx
// ✅ 올바른 예시
<div className="bg-background text-foreground">
<div className="bg-card text-card-foreground">
<div className="border-border">
<div className="bg-primary text-primary-foreground">
<div className="bg-destructive text-destructive-foreground">

// ❌ 잘못된 예시
<div className="bg-white text-black">
<div className="bg-gray-900">
<div style={{ color: '#000000' }}>
```

#### 사용 가능한 테마 색상 변수
- `background` / `foreground` - 기본 배경 및 텍스트
- `card` / `card-foreground` - 카드 컴포넌트
- `popover` / `popover-foreground` - 팝오버, 드롭다운
- `primary` / `primary-foreground` - 주요 액션
- `secondary` / `secondary-foreground` - 보조 액션
- `muted` / `muted-foreground` - 비활성화, 보조 정보
- `accent` / `accent-foreground` - 강조
- `destructive` / `destructive-foreground` - 위험한 액션
- `border` - 테두리
- `input` - 입력 필드 테두리
- `ring` - 포커스 링

**이유**: 다크/라이트 테마 자동 지원, 일관된 색상 시스템 유지

### 3. Tailwind CSS 사용 규칙

#### ✅ Tailwind 유틸리티 클래스 우선 사용
```tsx
// ✅ 올바른 예시
<div className="flex items-center gap-4 p-4 rounded-lg bg-card">

// ❌ 잘못된 예시
<div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
```

#### ❌ 인라인 스타일 사용 금지 (예외 제외)
**예외 사항**:
- 동적 계산이 필요한 경우 (예: 가상화 테이블의 동적 height)
- JavaScript 기반 애니메이션
- 써드파티 라이브러리 요구사항

### 4. 포커스 스타일 규칙

#### ❌ 시각적 포커스 스타일 사용 금지
모든 인터랙티브 요소에서 시각적 포커스 링을 제거합니다:

```tsx
// ✅ Input 필드 - 포커스 링 제거
<input className="focus:ring-0 focus:outline-none" />

// ✅ Select/Button - 포커스 링 제거
<SelectTrigger className="focus:ring-0 focus:outline-none">
<button className="focus:ring-0 focus:ring-offset-0 focus:outline-none">

// ❌ 잘못된 예시 - 포커스 링이 표시됨
<input className="" />  // 기본 focus ring이 표시됨
<button className="focus:ring-2">  // ring이 표시됨
```

**포커스 스타일 제거 옵션**:
- `focus:ring-0` - ring 완전 제거 (필수)
- `focus:ring-offset-0` - ring offset 제거
- `focus:outline-none` - 기본 outline 제거 (필수)

**이유**: 시각적 포커스 링이 UI를 어지럽게 만들고 디자인 일관성을 해침. 모든 요소에서 제거하여 깔끔한 UI 유지.

### 5. 반응형 디자인

#### Tailwind Breakpoints 사용
```tsx
// ✅ 모바일 우선 접근
<div className="text-sm md:text-base lg:text-lg">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

**Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### 6. 컴포넌트 스타일링 체크리스트

컴포넌트를 만들 때 반드시 확인:
- [ ] 글씨 크기에 `rem` 사용했는가?
- [ ] 아이콘 크기에 `rem` 사용했는가?
- [ ] 색상에 CSS 테마 변수 사용했는가?
- [ ] 하드코딩된 색상(`#000`, `white` 등)이 없는가?
- [ ] Tailwind 클래스를 우선 사용했는가?
- [ ] 불필요한 인라인 스타일이 없는가?
- [ ] 포커스 스타일이 부드럽게 설정되었는가? (다크모드 고려)

## 예시

### ✅ 올바른 컴포넌트
```tsx
export function ExampleComponent() {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <h2 className="text-xl font-bold text-card-foreground">
        제목
      </h2>
      <p className="text-sm text-muted-foreground mt-2">
        설명 텍스트
      </p>
      <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
        클릭
      </button>
    </div>
  )
}
```

### ❌ 잘못된 컴포넌트
```tsx
export function BadComponent() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #e5e5e5' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#000' }}>
        제목
      </h2>
      <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
        설명 텍스트
      </p>
      <button style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#000', color: '#fff' }}>
        클릭
      </button>
    </div>
  )
}
```

## 개발 환경

### 백엔드 환경
- ✅ **Python venv 환경**에서 실행
- 백엔드 실행 전 반드시 venv 활성화:
  ```bash
  cd backend
  source venv/bin/activate  # Linux/Mac
  # 또는
  venv\Scripts\activate  # Windows
  uvicorn main:app --reload
  ```

### 프론트엔드 개발 서버 재시작 규칙

개발 서버를 재시작할 때는 기존 포트를 먼저 정리하고 시작:

```bash
# ✅ 올바른 재시작 방법
fuser -k 5173/tcp 5174/tcp; npm run dev

# ❌ 잘못된 방법 (포트 충돌 발생)
npm run dev  # 기존 프로세스가 남아있어 5174로 실행됨
```

**이유**:
- 항상 5173 포트에서 실행되도록 보장
- 여러 개의 좀비 프로세스 방지
- 일관된 개발 환경 유지

## 컴포넌트 사용 규칙

### 다이얼로그/모달 컴포넌트

#### ✅ ContentModal 사용 (권장)
모든 다이얼로그는 `ContentModal` 컴포넌트를 사용합니다:

```tsx
import { ContentModal } from '@/components/common/ContentModal'

export function MyDialog({ open, onOpenChange }: MyDialogProps) {
  return (
    <ContentModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="제목"
      subtitle="서브타이틀 (선택)"
      showFooter={true}
      footerContent={
        <div className="flex gap-2">
          <Button onClick={handleSave}>저장</Button>
        </div>
      }
    >
      {/* 내용 */}
      <div>콘텐츠</div>
    </ContentModal>
  )
}
```

**ContentModal의 장점**:
- 일관된 UI/UX (뒤로가기 버튼, 헤더, 푸터 레이아웃)
- 브라우저 히스토리 관리 자동화 (뒤로가기로 모달 닫기)
- `fullscreen-mobile` 지원 (모바일에서 전체화면, 데스크톱에서 다이얼로그)
- 선언적 API로 더 깔끔한 코드

**전체화면 다이얼로그 규칙**:
- ✅ 전체화면 다이얼로그(`fullscreen-mobile` 등)는 헤더 왼쪽에 **뒤로가기 버튼** 배치
- ❌ 닫기(X) 버튼 사용 금지
- ✅ ContentModal의 기본 동작을 따름 (자동으로 뒤로가기 버튼 표시)

**사용 가능한 props**:
- `size`: `'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'fullscreen-mobile'`
- `title`: 제목 (문자열)
- `subtitle`: 서브타이틀 (문자열 또는 ReactNode)
- `headerContent`: 커스텀 헤더 (ReactNode)
- `headerAction`: 헤더 오른쪽 액션 (예: 토글 버튼)
- `showFooter`: 푸터 표시 여부 (boolean)
- `footerContent`: 푸터 내용 (ReactNode)

#### ❌ Dialog 컴포넌트 직접 사용 금지
```tsx
// ❌ 잘못된 예시 - Dialog를 직접 사용하지 마세요
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

export function BadDialog() {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>...</DialogHeader>
        ...
      </DialogContent>
    </Dialog>
  )
}
```

**이유**:
- ContentModal이 표준화된 UX를 제공
- 브라우저 히스토리 관리가 자동으로 처리됨
- 중복 코드 감소
- 모바일 최적화가 내장됨

#### 예외 상황
`ConfirmDialog`나 `AlertDialog` 같은 특수 목적 다이얼로그는 제외됩니다.

## Git 커밋 규칙

### 커밋 단위 규칙

#### ✅ 기능 구현 단위로 커밋
```bash
# ✅ 올바른 예시 - 기능 구현이 완료되고 버그 수정까지 끝난 후 한 번에 커밋
git add .
git commit -m "feat: 회원 관리 기능 추가"

# ❌ 잘못된 예시 - 사소하게 쪼갠 커밋
git commit -m "feat: 회원 테이블 추가"
git commit -m "fix: 테이블 스타일 수정"
git commit -m "fix: 타입 에러 수정"
git commit -m "fix: 빠진 import 추가"
```

**규칙**:
- ✅ **기능 구현 단위**로 커밋 (기능이 완전히 동작하는 상태)
- ✅ 버그 수정까지 완료한 후 커밋
- ❌ 사소하게 잘게 쪼갠 커밋 금지
- ❌ "오타 수정", "import 추가" 같은 단편적 커밋 금지

**이유**:
- 의미 있는 커밋 히스토리 유지
- 코드 리뷰 용이
- 롤백 시 안전성 확보

### 커밋 전 필수 검사

#### ✅ 타입 검사 실행
커밋 직전에 반드시 타입 검사를 실행하여 타입 에러가 없는지 확인:

```bash
# ✅ 올바른 커밋 프로세스
cd frontend
npm run typecheck  # 또는 tsc -b

# 타입 에러가 없으면 커밋
git add .
git commit -m "feat: 새로운 기능 추가"
```

**Husky pre-commit hook**:
- 자동으로 typecheck + eslint 실행
- 체크 실패 시 커밋 자동 차단
- 통상 5-10초 소요

### 커밋 메시지 규칙

#### ✅ Conventional Commits 형식
```bash
# Type prefix 사용
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
style: 스타일 변경 (코드 로직 변경 없음)
docs: 문서 수정
test: 테스트 추가/수정
chore: 빌드/설정 변경
```

#### ❌ Claude Code 꼬리말 금지
```bash
# ❌ 절대 금지!
git commit -m "feat: 기능 추가

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# ✅ 올바른 예시
git commit -m "feat: 기능 추가"
```

**규칙**:
- ❌ **NEVER add Claude Code footer/signature!**
- ❌ **NEVER add Co-Authored-By: Claude**
- ❌ **DO NOT add ANY AI-generated markers or attribution**
- ✅ Clean, concise commit messages ONLY
- ✅ Korean language for commit messages

## 코드 스타일

### 네이밍 규칙

- **파일**: 컴포넌트 (`PascalCase.tsx`), 훅 (`camelCase.ts`), 유틸리티 (`camelCase.ts`)
- **변수/함수**: `camelCase`
- **타입/인터페이스**: `PascalCase`
- **상수**: `UPPER_SNAKE_CASE` (진짜 상수인 경우만)

### TypeScript 규칙

- ✅ 컴포넌트 props는 항상 타입 지정
- ✅ 객체 형태는 `interface` 선호
- ✅ union/alias는 `type` 사용
- ❌ `any` 금지 (정말 필요하면 `unknown` 사용)

### React 규칙

- ✅ 함수형 컴포넌트만 사용
- ✅ 훅은 최상위 레벨에만 (조건부 금지)
- ✅ Props는 함수 시그니처에서 구조 분해
- ✅ 맵핑된 리스트에는 반드시 key prop

### Import 순서

```typescript
// 1. React
import { useState } from 'react'

// 2. 외부 라이브러리
import { useQuery } from '@tanstack/react-query'

// 3. 내부 컴포넌트 (@/components)
import { Button } from '@/components/ui/button'

// 4. 훅
import { useSchedules } from '../hooks/useSchedules'

// 5. 유틸리티
import { cn } from '@/lib/utils'

// 6. 타입
import type { Schedule } from '../types/schedule'

// 7. 상수
import { API_URL } from '@/lib/constants'
```

### 컴포넌트 구조

```typescript
// 1. Import 순서 (위 규칙 따름)
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useSchedules } from '../hooks/useSchedules'
import type { Schedule } from '../types/schedule'

// 2. Props 인터페이스
interface Props {
  schedule: Schedule
  onEdit?: (id: number) => void
}

// 3. 컴포넌트
export function ScheduleCard({ schedule, onEdit }: Props) {
  // 훅 먼저
  const { data } = useSchedules()
  const [open, setOpen] = useState(false)

  // 핸들러 함수
  const handleClick = () => {
    // ...
  }

  // 렌더
  return <div>...</div>
}
```

## 참고 자료

- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [shadcn/ui 테마 시스템](https://ui.shadcn.com/docs/theming)
- [Conventional Commits](https://www.conventionalcommits.org/)
- 프로젝트 `index.css` - CSS 변수 정의
- 프로젝트 `tailwind.config.js` - Tailwind 설정
- 프로젝트 `CLAUDE.md` - 프로젝트 전체 가이드
