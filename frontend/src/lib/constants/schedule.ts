/**
 * 스케줄 관련 상수
 */

/**
 * 시간 관련 상수
 */
export const TIME_CONSTANTS = {
  /** 1시간 = 60분 */
  MINUTES_PER_HOUR: 60,
  /** 시간 충돌 체크 기준 (분 단위) */
  CONFLICT_THRESHOLD_MINUTES: 60,
} as const

/**
 * 촬영 관련 상수
 */
export const PHOTO_CONSTANTS = {
  /** 컷수 배율 (컷수 * 2 = 총 컷수) */
  CUTS_MULTIPLIER: 2,
} as const
