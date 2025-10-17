import { useConfigStore } from '@/stores/useConfigStore'
import { useAuthStore } from '@/stores/useAuthStore'
import axios from 'axios'
import { getApiUrl } from '@/lib/constants/api'
import { toast } from 'sonner'

/**
 * 네이버 캘린더 연동을 위한 OAuth 인증 시작
 * 다중 디바이스 충돌 방지: 기존 토큰이 유효하면 재사용
 */
export async function startNaverCalendarLink() {
  const config = useConfigStore.getState().config
  const clientId = config?.naver_client_id

  if (!clientId) {
    throw new Error('네이버 클라이언트 ID가 설정되지 않았습니다')
  }

  // 1. 기존 토큰 체크 (다중 디바이스 충돌 방지)
  const currentUser = useAuthStore.getState().user
  if (currentUser?.id) {
    try {
      const apiUrl = getApiUrl()
      const checkResult = await axios.post(`${apiUrl}/auth/naver/check`, {
        user_id: currentUser.id
      })

      if (checkResult.data.has_valid_token) {
        // 기존 토큰 재사용! (OAuth 건너뛰기)
        useAuthStore.getState().updateNaverToken(
          checkResult.data.access_token,
          checkResult.data.user_info.naver_refresh_token || ''
        )

        toast.success('네이버 캘린더 연동 완료')
        return
      }
    } catch (error) {
      // 에러 발생 시 정상 OAuth 플로우 진행
      console.log('토큰 체크 실패, OAuth 플로우 진행:', error)
    }
  }

  // 2. 토큰 없거나 만료 → 정상 OAuth 플로우
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
