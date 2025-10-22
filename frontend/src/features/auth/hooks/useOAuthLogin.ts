import { useConfigStore } from '@/stores/useConfigStore'
import { toast } from 'sonner'
import {
  buildOAuthUrl,
  generateState,
  getProviderName,
  type OAuthProvider,
} from '../utils/oauthProviders'

/**
 * OAuth 로그인 훅
 *
 * 모든 OAuth 제공자(Google, Naver, Kakao)에 대한
 * 통합 로그인 로직을 제공합니다.
 *
 * @example
 * ```tsx
 * const { loginWith } = useOAuthLogin()
 *
 * <Button onClick={() => loginWith('google')}>
 *   Google로 로그인
 * </Button>
 * ```
 */
export function useOAuthLogin() {
  const { config } = useConfigStore()

  /**
   * 지정된 OAuth 제공자로 로그인 시작
   *
   * @param provider - OAuth 제공자 ('google' | 'naver' | 'kakao')
   */
  const loginWith = (provider: OAuthProvider) => {
    // Config 로드 확인
    if (!config) {
      toast.error('설정을 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    // 제공자별 Client ID 확인
    const providerName = getProviderName(provider)
    const clientIdKey =
      provider === 'google' ? 'google_client_id' :
      provider === 'naver' ? 'naver_client_id' :
      'kakao_rest_api_key'

    if (!config[clientIdKey]) {
      toast.error(`${providerName} 클라이언트 ID가 설정되지 않았습니다`)
      return
    }

    try {
      // Redirect URI 생성
      const redirectUri = `${window.location.origin}/auth/${provider}/callback`

      // State 생성 (네이버만 사용)
      let state: string | undefined
      if (provider === 'naver') {
        state = generateState()
        sessionStorage.setItem('naver_state', state)
      }

      // OAuth URL 생성
      const authUrl = buildOAuthUrl(provider, config, redirectUri, state)

      // OAuth 인증 페이지로 리다이렉트
      window.location.href = authUrl
    } catch (error) {
      console.error(`${providerName} 로그인 시작 실패:`, error)
      toast.error(`${providerName} 로그인을 시작할 수 없습니다`)
    }
  }

  return {
    loginWith,
  }
}
