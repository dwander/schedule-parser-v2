import axios from 'axios'
import { getApiUrl } from '@/lib/constants/api'
import { logger } from '@/lib/utils/logger'
import type { OAuthProvider } from './oauthProviders'

/**
 * OAuth 콜백 모드
 * - login: 일반 로그인 (사용자 정보 저장)
 * - calendar: 캘린더 연동 (토큰만 저장)
 */
export type OAuthCallbackMode = 'login' | 'calendar'

/**
 * OAuth 콜백 응답 데이터
 */
export interface OAuthCallbackResponse {
  id: string
  email: string
  name: string
  picture?: string
  is_admin: boolean
  has_seen_sample_data: boolean
  access_token?: string  // 네이버 로그인/캘린더 연동 시 포함
  refresh_token?: string // 네이버 로그인/캘린더 연동 시 포함
}

/**
 * OAuth 콜백 컨텍스트
 */
export interface OAuthCallbackContext {
  provider: OAuthProvider
  mode: OAuthCallbackMode
  code: string
  state?: string
}

/**
 * OAuth 콜백 에러
 */
export class OAuthCallbackError extends Error {
  provider: OAuthProvider
  originalError?: unknown

  constructor(
    message: string,
    provider: OAuthProvider,
    originalError?: unknown
  ) {
    super(message)
    this.name = 'OAuthCallbackError'
    this.provider = provider
    this.originalError = originalError
  }
}

/**
 * 네이버 State 검증
 *
 * @param state - URL에서 받은 state
 * @param mode - 콜백 모드 ('login' | 'calendar')
 * @throws {OAuthCallbackError} State가 일치하지 않으면 에러 발생
 */
export function validateNaverState(state: string, mode: OAuthCallbackMode): void {
  const storageKey = mode === 'calendar' ? 'naver_calendar_state' : 'naver_state'
  const savedState = sessionStorage.getItem(storageKey)

  if (state !== savedState) {
    sessionStorage.removeItem(storageKey)
    throw new OAuthCallbackError(
      '인증 오류: state가 일치하지 않습니다',
      'naver'
    )
  }

  // 검증 성공 시 저장된 state 제거
  sessionStorage.removeItem(storageKey)
}

/**
 * OAuth 콜백 처리
 *
 * 모든 OAuth 제공자(Google, Naver, Kakao)의 콜백을 통합 처리합니다.
 *
 * @param context - 콜백 컨텍스트 (provider, mode, code, state)
 * @returns OAuth 콜백 응답 데이터
 * @throws {OAuthCallbackError} 콜백 처리 실패 시 에러 발생
 *
 * @example
 * ```ts
 * const data = await handleOAuthCallback({
 *   provider: 'google',
 *   mode: 'login',
 *   code: 'authorization_code'
 * })
 * ```
 */
export async function handleOAuthCallback(
  context: OAuthCallbackContext
): Promise<OAuthCallbackResponse> {
  const { provider, mode, code, state } = context
  const apiUrl = getApiUrl()

  try {
    // 네이버만 State 검증 필요
    if (provider === 'naver' && state) {
      validateNaverState(state, mode)
    }

    // 제공자별 API 엔드포인트 구성
    const endpoint = `/auth/${provider}`

    // 제공자별 요청 페이로드 구성
    const payload: Record<string, string> = { code }

    if (provider === 'google') {
      // Google은 redirect_uri 필요
      payload.redirect_uri = `${window.location.origin}/auth/google/callback`
    } else if (provider === 'naver' && state) {
      // Naver는 state 필요
      payload.state = state
    }

    // API 호출
    const response = await axios.post<OAuthCallbackResponse>(
      `${apiUrl}${endpoint}`,
      payload
    )

    return response.data
  } catch (error) {
    logger.error(`${provider} OAuth 콜백 처리 실패:`, error)

    throw new OAuthCallbackError(
      `${provider} 인증에 실패했습니다`,
      provider,
      error
    )
  }
}

/**
 * OAuth 콜백 URL에서 파라미터 추출
 *
 * @param searchParams - URL search params
 * @returns 추출된 파라미터 ({ code, state })
 */
export function extractCallbackParams(searchParams: URLSearchParams): {
  code: string | null
  state: string | null
} {
  return {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
  }
}

/**
 * OAuth 콜백 경로와 모드 매핑
 */
export const OAUTH_CALLBACK_ROUTES: Record<
  string,
  { provider: OAuthProvider; mode: OAuthCallbackMode }
> = {
  '/auth/google/callback': { provider: 'google', mode: 'login' },
  '/auth/naver/callback': { provider: 'naver', mode: 'login' },
  '/auth/kakao/callback': { provider: 'kakao', mode: 'login' },
  '/auth/naver/calendar/callback': { provider: 'naver', mode: 'calendar' },
}

/**
 * 현재 경로가 OAuth 콜백 경로인지 확인
 *
 * @param pathname - 현재 경로
 * @returns OAuth 콜백 설정 (경로가 일치하지 않으면 null)
 */
export function getCallbackRoute(pathname: string) {
  return OAUTH_CALLBACK_ROUTES[pathname] || null
}
