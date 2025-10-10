/**
 * 날짜 파싱 유틸리티
 *
 * Safari는 "YYYY.MM.DD" 같은 형식을 파싱하지 못하므로
 * ISO 8601 형식("YYYY-MM-DD")으로 변환해야 합니다.
 */

/**
 * "YYYY.MM.DD" 형식을 Date 객체로 안전하게 변환
 *
 * @param dateString - "YYYY.MM.DD" 형식의 날짜 문자열
 * @returns Date 객체
 *
 * @example
 * ```typescript
 * const date = parseScheduleDateString("2025.09.20")
 * // Safari에서도 정상 작동
 * ```
 */
export function parseScheduleDateString(dateString: string): Date {
  if (!dateString || !dateString.trim()) {
    return new Date() // 빈 문자열은 현재 날짜
  }

  // "YYYY.MM.DD" → "YYYY-MM-DD" 변환
  const isoDateString = dateString.replace(/\./g, '-')

  return new Date(isoDateString)
}

/**
 * "YYYY.MM.DD" + "HH:MM"을 Date 객체로 변환
 *
 * @param dateString - "YYYY.MM.DD" 형식
 * @param timeString - "HH:MM" 형식
 * @returns Date 객체
 */
export function parseScheduleDateTime(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split('.').map(Number)
  const [hours, minutes] = timeString.split(':').map(Number)

  return new Date(year, month - 1, day, hours, minutes)
}

/**
 * Date 객체를 "YYYY.MM.DD" 형식으로 변환
 *
 * @param date - Date 객체
 * @returns "YYYY.MM.DD" 형식 문자열
 */
export function formatToScheduleDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}.${month}.${day}`
}
