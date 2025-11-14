import type { Schedule } from '@/features/schedule/types/schedule'
import type { ParsedScheduleData } from '../types/parser'

/**
 * 파싱된 스케줄과 중복되는 기존 스케줄 찾기
 * @param parsed - 파싱된 스케줄
 * @param existingSchedules - 기존 스케줄 목록
 * @returns 중복되는 스케줄 또는 null
 */
export function findDuplicateSchedule(
  parsed: ParsedScheduleData,
  existingSchedules: Schedule[]
): Schedule | null {
  return existingSchedules.find(existing =>
    existing.date === parsed.date &&
    existing.location === parsed.location &&
    existing.time === parsed.time
  ) || null
}

/**
 * 파싱된 스케줄에서 중복 제거 (기존 함수 호환성 유지)
 * @param parsedData - 파싱된 스케줄 목록
 * @param existingSchedules - 기존 스케줄 목록
 * @returns 중복이 제거된 스케줄 목록과 중복 개수
 */
export function filterDuplicateSchedules(
  parsedData: ParsedScheduleData[],
  existingSchedules: Schedule[]
): { unique: ParsedScheduleData[]; duplicateCount: number } {
  const unique = parsedData.filter(parsed =>
    !findDuplicateSchedule(parsed, existingSchedules)
  )

  const duplicateCount = parsedData.length - unique.length

  return { unique, duplicateCount }
}

/**
 * 스케줄이 중복인지 확인
 * @param parsed - 파싱된 스케줄
 * @param existingSchedules - 기존 스케줄 목록
 * @returns 중복 여부
 */
export function isDuplicateSchedule(
  parsed: ParsedScheduleData,
  existingSchedules: Schedule[]
): boolean {
  return existingSchedules.some(existing =>
    existing.date === parsed.date &&
    existing.location === parsed.location &&
    existing.time === parsed.time
  )
}
