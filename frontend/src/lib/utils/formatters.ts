/**
 * 전화번호 포맷팅 유틸리티
 */

/**
 * 문자열에서 숫자만 추출
 */
export function extractNumbers(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * 전화번호를 하이픈 포맷으로 변환
 * @param value 전화번호 문자열
 * @returns 포맷된 전화번호 (예: 010-1234-5678)
 */
export function formatPhoneNumber(value: string): string {
  const numbers = extractNumbers(value)

  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  } else if (numbers.length === 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
  }

  return value // 형식이 맞지 않으면 원본 반환
}

/**
 * 전화번호 또는 이메일 포맷팅
 * 이메일이면 그대로 반환, 전화번호면 하이픈 포맷 적용
 */
export function formatContact(value: string): string {
  if (value.includes('@')) {
    return value // 이메일은 그대로
  }
  return formatPhoneNumber(value)
}

/**
 * 숫자 천단위 콤마 포맷팅
 * @param value 숫자 또는 숫자 문자열
 * @returns 포맷된 문자열 (예: 1,234,567)
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value) : value

  if (isNaN(num) || num <= 0) {
    return ''
  }

  return num.toLocaleString()
}

/**
 * 문자열에서 숫자를 파싱하여 정수로 변환
 * @param value 숫자가 포함된 문자열
 * @returns 파싱된 정수, 실패 시 0
 */
export function parseNumber(value: string): number {
  const num = parseInt(extractNumbers(value))
  return isNaN(num) ? 0 : num
}

/**
 * 숫자 유효성 검사
 * @param value 검사할 문자열
 * @returns 0 이상의 정수인지 여부
 */
export function isValidNumber(value: string): boolean {
  const num = parseNumber(value)
  return !isNaN(num) && num >= 0
}
