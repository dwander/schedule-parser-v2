/**
 * 유효성 검증 관련 상수
 */

/**
 * 전화번호 길이 상수
 */
export const PHONE_NUMBER_LENGTH = {
  MOBILE: 11,      // 휴대폰 번호 (010-XXXX-XXXX)
  LANDLINE: 10,    // 지역번호 (0X-XXX-XXXX or 0XX-XXX-XXXX)
} as const
