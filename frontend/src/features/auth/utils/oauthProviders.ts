import type { AppConfig } from '@/lib/api/config'

/**
 * OAuth 제공자 타입
 */
export type OAuthProvider = 'google' | 'naver' | 'kakao'

/**
 * OAuth 제공자별 설정
 */
export interface OAuthProviderConfig {
  name: string
  clientIdKey: keyof AppConfig
  authorizationUrl: string
  callbackPath: string
  scopes: string[]
  needsState: boolean
  extraParams?: Record<string, string>
}

/**
 * OAuth 제공자별 설정 맵
 */
export const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthProviderConfig> = {
  google: {
    name: 'Google',
    clientIdKey: 'google_client_id',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    callbackPath: '/auth/google/callback',
    scopes: ['openid', 'email', 'profile'],
    needsState: false,
    extraParams: {
      access_type: 'offline',
      prompt: 'select_account',
    },
  },
  naver: {
    name: 'Naver',
    clientIdKey: 'naver_client_id',
    authorizationUrl: 'https://nid.naver.com/oauth2.0/authorize',
    callbackPath: '/auth/naver/callback',
    scopes: ['calendar'],
    needsState: true, // CSRF 방지
  },
  kakao: {
    name: 'Kakao',
    clientIdKey: 'kakao_rest_api_key',
    authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
    callbackPath: '/auth/kakao/callback',
    scopes: [],
    needsState: false,
  },
}

/**
 * OAuth 인증 URL 생성
 *
 * @param provider - OAuth 제공자 ('google' | 'naver' | 'kakao')
 * @param config - 앱 설정 (OAuth Client ID 포함)
 * @param redirectUri - 콜백 URI (인코딩되지 않은 원본)
 * @param state - State 파라미터 (CSRF 방지용, 네이버만 사용)
 * @returns OAuth 인증 URL
 */
export function buildOAuthUrl(
  provider: OAuthProvider,
  config: AppConfig,
  redirectUri: string,
  state?: string
): string {
  const providerConfig = OAUTH_PROVIDERS[provider]
  const clientId = config[providerConfig.clientIdKey]

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  })

  // Scope 추가 (있는 경우)
  if (providerConfig.scopes.length > 0) {
    params.append('scope', providerConfig.scopes.join(' '))
  }

  // State 추가 (필요한 경우)
  if (state && providerConfig.needsState) {
    params.append('state', state)
  }

  // 제공자별 추가 파라미터
  if (providerConfig.extraParams) {
    Object.entries(providerConfig.extraParams).forEach(([key, value]) => {
      params.append(key, value)
    })
  }

  return `${providerConfig.authorizationUrl}?${params.toString()}`
}

/**
 * 랜덤 State 생성 (CSRF 방지용)
 * 네이버 OAuth에서 사용
 *
 * @returns 랜덤 문자열
 */
export function generateState(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * OAuth 콜백 경로 가져오기
 *
 * @param provider - OAuth 제공자
 * @returns 콜백 경로 (예: '/auth/google/callback')
 */
export function getCallbackPath(provider: OAuthProvider): string {
  return OAUTH_PROVIDERS[provider].callbackPath
}

/**
 * OAuth 제공자 이름 가져오기
 *
 * @param provider - OAuth 제공자
 * @returns 표시용 이름 (예: 'Google', 'Naver', 'Kakao')
 */
export function getProviderName(provider: OAuthProvider): string {
  return OAUTH_PROVIDERS[provider].name
}
