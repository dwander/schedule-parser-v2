import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Button } from '@/components/ui/button'
import { Download, Share, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

/**
 * PWA 설치 섹션 컴포넌트
 *
 * 플랫폼에 따라 다른 UI를 표시합니다:
 * - iOS/macOS Safari: 수동 설치 안내
 * - Android/Desktop Chrome: 설치 버튼
 * - 이미 설치됨: 완료 메시지 + 플랫폼별 안내 계속 표시
 */
export function PWAInstallSection() {
  const { canInstall, isInstalled, promptInstall, platform } = usePWAInstall()

  const handleInstall = async () => {
    const outcome = await promptInstall()

    if (outcome === 'accepted') {
      toast.success('앱이 설치되었습니다!')
    } else if (outcome === 'dismissed') {
      toast.info('설치가 취소되었습니다')
    } else {
      toast.error('설치를 진행할 수 없습니다')
    }
  }

  // 설치 안내 컨텐츠 렌더링 함수
  const renderInstallContent = () => {
    // Android/Desktop Chrome - beforeinstallprompt 이벤트가 있는 경우
    if (canInstall) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
            <Download className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-foreground">클릭 한 번으로 설치</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                아래 버튼을 클릭하면 본식스냅러를 앱으로 설치할 수 있습니다.
              </p>
              <Button onClick={handleInstall} size="sm" className="mt-2" disabled={isInstalled}>
                <Download className="mr-2 h-4 w-4" />
                지금 설치하기
              </Button>
            </div>
          </div>
        </div>
      )
    }

    // iOS/macOS Safari - 수동 설치 안내
    if (platform.isIOS || (platform.isMacOS && platform.isSafari)) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
            <Share className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-foreground">Safari에서 홈 화면에 추가</p>

              {/* iOS 설치 단계 */}
              {platform.isIOS && (
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>하단 <span className="font-medium text-foreground">공유 버튼(⬆️)</span> 탭</li>
                  <li><span className="font-medium text-foreground">"홈 화면에 추가"</span> 선택</li>
                  <li>오른쪽 상단 <span className="font-medium text-foreground">"추가"</span> 탭</li>
                </ol>
              )}

              {/* macOS 설치 단계 */}
              {platform.isMacOS && platform.isSafari && (
                <p className="text-xs text-muted-foreground">
                  메뉴바: <span className="font-medium text-foreground">파일 {'>'} 홈 화면에 추가</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    // 기타 브라우저 - beforeinstallprompt 없음 (주소창 설치 버튼 안내)
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <Download className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-foreground">브라우저 주소창에서 설치</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Chrome/Edge 브라우저 주소창 오른쪽의{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border">
                <Download className="h-3 w-3" />
                <span className="font-medium text-foreground">설치</span>
              </span>{' '}
              버튼을 클릭하세요.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              버튼이 보이지 않나요? 브라우저 메뉴(⋮)에서{' '}
              <span className="font-medium text-foreground">"앱 설치"</span>를 찾아보세요.
            </p>
          </div>
        </div>

        {/* 앱 장점 */}
        <div className="space-y-2 pl-4">
          <p className="text-xs font-medium text-muted-foreground">앱 설치 시 장점:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>홈 화면/작업 표시줄에서 바로 실행</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>브라우저 UI 없이 전체 화면 사용</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>더 빠른 로딩 및 오프라인 지원</span>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  // 이미 설치된 경우
  if (isInstalled) {
    return (
      <div className="space-y-4">
        {/* 설치 완료 메시지 */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-foreground">앱이 설치되어 있습니다</p>
            <p className="text-xs text-muted-foreground">
              본식스냅러를 독립 앱으로 사용하고 계십니다
            </p>
          </div>
        </div>

        {/* 재설치 안내 (간단하게) */}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 transition-colors">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">재설치가 필요하신가요?</span>
              <svg
                className="ml-auto h-3 w-3 text-muted-foreground transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>

          <div className="mt-2 p-3 rounded-lg bg-muted/20 border border-border/50 text-xs text-muted-foreground space-y-2">
            <p>
              주소창 오른쪽 <span className="font-medium text-foreground">설치됨 아이콘(✓)</span>을 클릭 →
              <span className="font-medium text-foreground"> "제거"</span> 선택 →
              페이지 새로고침 → 다시 설치
            </p>
          </div>
        </details>
      </div>
    )
  }

  // 설치되지 않은 경우
  return renderInstallContent()
}
