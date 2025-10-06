import { apiClient } from './client'

export interface AppConfig {
  google_client_id: string
  naver_client_id: string
  kakao_rest_api_key: string
  frontend_url: string
}

/**
 * Backend에서 공개 설정 정보 가져오기
 * OAuth Client ID 등 런타임 설정 값
 */
export async function fetchConfig(): Promise<AppConfig> {
  const response = await apiClient.get<AppConfig>('/api/config')
  return response.data
}
