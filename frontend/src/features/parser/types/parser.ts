/**
 * Parser 관련 타입 정의
 */

/**
 * 백엔드 파서에서 반환하는 원시 데이터 구조
 * (백엔드 Schedule.to_dict() 응답과 일치)
 */
export interface ParsedScheduleData {
  date: string
  location: string
  time: string
  couple: string
  contact: string
  brand: string
  album: string
  photographer: string
  memo: string
  manager: string
  price: number
  needs_review: boolean
  review_reason: string
}

/**
 * Google OAuth credential response
 */
export interface GoogleCredentialResponse {
  credential: string
  select_by?: string
  clientId?: string
}
