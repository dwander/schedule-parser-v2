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

#### ✅ 부드러운 포커스 스타일 사용
다크모드에서 눈에 부담을 주지 않도록 포커스 스타일을 부드럽게 설정:

```tsx
// ✅ Input 필드 - 얇고 투명한 ring
<input className="focus:ring-1 focus:ring-ring/30 focus:border-ring/50 focus:outline-none" />

// ✅ Select/Button - ring 제거 또는 부드럽게
<SelectTrigger className="focus:ring-1 focus:ring-ring/30 focus:outline-none">
<button className="focus:ring-0 focus:ring-offset-0 focus:outline-none">

// ❌ 잘못된 예시 - 기본 스타일 (너무 강함)
<input className="" />  // 기본 focus ring이 다크모드에서 거슬림
```

**포커스 스타일 옵션**:
- `focus:ring-0` - ring 완전 제거
- `focus:ring-1` - 얇은 ring (1px)
- `focus:ring-ring/30` - 투명도 30%로 부드럽게
- `focus:ring-offset-0` - ring offset 제거
- `focus:border-ring/50` - 테두리도 부드럽게 (50% 투명도)
- `focus:outline-none` - 기본 outline 제거 (필수)

**이유**: 다크모드에서 기본 포커스 링이 대비가 강해 눈에 부담을 줌. 투명도를 활용한 부드러운 스타일 권장.

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

## 개발 서버 관리

### 개발 서버 재시작 규칙

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

## 참고 자료

- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [shadcn/ui 테마 시스템](https://ui.shadcn.com/docs/theming)
- 프로젝트 `index.css` - CSS 변수 정의
- 프로젝트 `tailwind.config.js` - Tailwind 설정
