/**
 * API 관련 설정 상수
 */

/**
 * API 기본 URL
 */
const DEFAULT_API_URL = 'http://localhost:8000'

/**
 * 환경 변수 또는 기본값으로 API URL을 반환
 */
export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || DEFAULT_API_URL
}
