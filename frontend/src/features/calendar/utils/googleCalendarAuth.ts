import { useConfigStore } from '@/stores/useConfigStore'
import { useAuthStore } from '@/stores/useAuthStore'
import axios from 'axios'
import { getApiUrl } from '@/lib/constants/api'
import { toast } from 'sonner'

/**
 * 구글 캘린더 연동을 위한 OAuth 인증 시작
 * 다중 디바이스 충돌 방지: 기존 토큰이 유효하면 재사용
 */
export async function startGoogleCalendarLink() {
  const config = useConfigStore.getState().config
  const clientId = config?.google_client_id

  if (!clientId) {
    throw new Error('구글 클라이언트 ID가 설정되지 않았습니다')
  }

  // 1. 기존 토큰 체크 (다중 디바이스 충돌 방지)
  const currentUser = useAuthStore.getState().user
  if (currentUser?.id) {
    try {
      const apiUrl = getApiUrl()
      const checkResult = await axios.post(`${apiUrl}/auth/google/check`, {
        user_id: currentUser.id
      })

      if (checkResult.data.has_valid_token) {
        // 기존 토큰 재사용! (OAuth 건너뛰기)
        useAuthStore.getState().updateGoogleToken(
          checkResult.data.access_token,
          checkResult.data.user_info.google_refresh_token || ''
        )

        toast.success('구글 캘린더 연동 완료')
        return
      }
    } catch (error) {
      // 에러 발생 시 정상 OAuth 플로우 진행
      console.log('토큰 체크 실패, OAuth 플로우 진행:', error)
    }
  }

  // 2. 토큰 없거나 만료 → 정상 OAuth 플로우
  const redirectUri = `${window.location.origin}/auth/google/calendar/callback`
  const randomState = Math.random().toString(36).substring(7)

  // state에 현재 사용자 ID 포함 (백엔드에서 어느 사용자에게 토큰 저장할지 알 수 있도록)
  const stateData = {
    random: randomState,
    user_id: currentUser?.id || ''
  }
  const state = btoa(JSON.stringify(stateData)) // Base64 인코딩

  // state를 세션 스토리지에 저장 (CSRF 방지)
  sessionStorage.setItem('google_calendar_state', state)

  // Google OAuth scope: calendar.events (이벤트 읽기/쓰기만)
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events')

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}&access_type=offline&prompt=consent`

  window.location.href = authUrl
}

/**
 * 구글 캘린더 연동 해제
 */
export function unlinkGoogleCalendar() {
  // 토큰 제거는 useAuthStore에서 처리
  return true
}
