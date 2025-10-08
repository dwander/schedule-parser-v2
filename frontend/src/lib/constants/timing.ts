/**
 * 타이밍 관련 상수 (debounce, timeout 등)
 */

/**
 * Debounce 딜레이 값 (ms)
 */
export const DEBOUNCE = {
  SEARCH: 300,           // 검색 입력 debounce
  PARSER_AUTO: 800,      // 파서 자동 실행 debounce
} as const

/**
 * UI 인터랙션 타이머 (ms)
 */
export const UI_TIMERS = {
  LONG_PRESS: 500,       // 롱프레스 감지 시간
  RELOAD_DELAY: 1000,    // 리로드 전 대기 시간
} as const
