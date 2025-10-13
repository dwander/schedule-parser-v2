import type { ParsedScheduleData } from '../types/parser'

// 필수 필드 검증 상수
export const DATE_PATTERN = /^\d{4}\.\d{2}\.\d{2}$/
export const TIME_PATTERN = /^\d{2}:\d{2}$/
export const INVALID_COUPLE_TEXT = '없음'

/**
 * 필수 필드 4개 검증 함수 (백엔드 로직과 동일)
 * @param schedule - 검증할 스케줄 데이터
 * @returns 필수 필드가 모두 유효한지 여부
 */
export function hasRequiredFields(schedule: ParsedScheduleData): boolean {
  // 날짜 검증: YYYY.MM.DD 형식
  if (!schedule.date || !DATE_PATTERN.test(schedule.date)) {
    return false
  }

  // 시간 검증: HH:MM 형식
  if (!schedule.time || !TIME_PATTERN.test(schedule.time)) {
    return false
  }

  // 장소 검증: 빈 문자열이 아니어야 함
  if (!schedule.location) {
    return false
  }

  // 신랑신부 검증: 빈 문자열이 아니고 "없음"이 포함되지 않아야 함
  if (!schedule.couple || schedule.couple.includes(INVALID_COUPLE_TEXT)) {
    return false
  }

  return true
}
