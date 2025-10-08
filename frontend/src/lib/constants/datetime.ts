/**
 * 날짜/시간 관련 상수
 */

/**
 * 날짜/시간 계산 상수
 */
export const DATETIME = {
  // Time Offsets
  KST_OFFSET_MS: 9 * 60 * 60 * 1000,  // UTC+9 (한국 표준시)
  MS_PER_DAY: 1000 * 60 * 60 * 24,    // 1일 = 밀리초

  // Calendar Event Duration
  CALENDAR_EVENT_BEFORE_HOURS: 1,     // 캘린더 이벤트 시작 전 시간
  CALENDAR_EVENT_AFTER_HOURS: 1,      // 캘린더 이벤트 종료 후 시간
} as const
