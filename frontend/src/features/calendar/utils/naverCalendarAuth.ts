import { useConfigStore } from '@/stores/useConfigStore'

/**
 * 네이버 캘린더 연동을 위한 OAuth 인증 시작
 */
export function startNaverCalendarLink() {
  const config = useConfigStore.getState().config
  const clientId = config?.naver_client_id

  if (!clientId) {
    throw new Error('네이버 클라이언트 ID가 설정되지 않았습니다')
  }

  const redirectUri = `${window.location.origin}/auth/naver/calendar/callback`
  const state = Math.random().toString(36).substring(7)

  // state를 세션 스토리지에 저장 (CSRF 방지)
  sessionStorage.setItem('naver_calendar_state', state)

  const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}`

  window.location.href = authUrl
}

/**
 * 네이버 캘린더 연동 해제
 */
export function unlinkNaverCalendar() {
  // 토큰 제거는 useAuthStore에서 처리
  return true
}
