import { useState, useEffect } from 'react'
import { detectPlatform, isAppInstalled } from '@/lib/utils/platform'

/**
 * beforeinstallprompt 이벤트 타입
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

/**
 * PWA 설치 훅
 *
 * Android/Desktop Chrome에서 beforeinstallprompt 이벤트를 감지하고
 * 사용자가 앱을 설치할 수 있도록 프롬프트를 제공합니다.
 *
 * iOS/macOS Safari에서는 이벤트를 지원하지 않으므로
 * 수동 설치 안내를 표시해야 합니다.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const platform = detectPlatform()

  useEffect(() => {
    // 이미 설치된 경우
    if (isAppInstalled()) {
      setIsInstalled(true)
      return
    }

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: Event) => {
      // 기본 미니 인포바 방지
      e.preventDefault()

      // 나중에 사용하기 위해 이벤트 저장
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setCanInstall(true)
    }

    // 설치 완료 이벤트 리스너
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setCanInstall(false)
      setIsInstalled(true)
    }

    // 이벤트 리스너 등록
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // 클린업
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  /**
   * 설치 프롬프트를 표시합니다
   * Android/Desktop Chrome에서만 동작합니다
   */
  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'not-available'> => {
    if (!deferredPrompt) {
      return 'not-available'
    }

    // 프롬프트 표시
    await deferredPrompt.prompt()

    // 사용자의 선택 대기
    const { outcome } = await deferredPrompt.userChoice

    // 프롬프트 사용 후 null로 설정
    setDeferredPrompt(null)
    setCanInstall(false)

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    return outcome
  }

  return {
    canInstall, // beforeinstallprompt를 지원하고 설치 가능한 상태
    isInstalled, // 이미 설치된 상태
    promptInstall, // 설치 프롬프트 표시 함수
    platform, // 플랫폼 정보
  }
}
