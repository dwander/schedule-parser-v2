/**
 * 플랫폼 감지 유틸리티
 * PWA 설치를 위한 플랫폼별 동작을 결정합니다
 */

export interface PlatformInfo {
  isIOS: boolean
  isMacOS: boolean
  isAndroid: boolean
  isSafari: boolean
  isChrome: boolean
  isStandalone: boolean
  canInstall: boolean // beforeinstallprompt를 지원하는지
}

/**
 * 현재 플랫폼 정보를 감지합니다
 */
export function detectPlatform(): PlatformInfo {
  const ua = navigator.userAgent
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  // iOS 감지 (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream

  // macOS 감지
  const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)

  // Android 감지
  const isAndroid = /Android/.test(ua)

  // Safari 감지 (Chrome이 아닌 경우)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua)

  // Chrome 감지 (Edge도 Chrome 기반이므로 포함)
  const isChrome = /Chrome/.test(ua) || /CriOS/.test(ua)

  // beforeinstallprompt 지원 여부
  // iOS Safari는 지원하지 않음
  const canInstall = !isStandalone && (isAndroid || (!isIOS && !isMacOS))

  return {
    isIOS,
    isMacOS,
    isAndroid,
    isSafari,
    isChrome,
    isStandalone,
    canInstall,
  }
}

/**
 * 현재 앱이 이미 설치되어 있는지 확인합니다
 */
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}
