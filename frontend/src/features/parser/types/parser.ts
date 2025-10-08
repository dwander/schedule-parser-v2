/**
 * Parser 관련 타입 정의
 */

/**
 * 백엔드 파서에서 반환하는 원시 데이터 구조
 */
export interface ParsedScheduleData {
  date: string
  time: string
  venue: string
  couple: string
  cutsCount: number
  price: number
  contractor: string
  brand: string
  comments?: string
  needs_review?: boolean
}

/**
 * Google OAuth credential response
 */
export interface GoogleCredentialResponse {
  credential: string
  select_by?: string
  clientId?: string
}
