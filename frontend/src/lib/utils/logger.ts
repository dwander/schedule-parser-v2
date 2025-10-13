/**
 * 개발 전용 Logger 유틸리티
 * 프로덕션 환경에서는 console 출력을 자동으로 억제합니다.
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * 일반 로그 출력 (개발 환경에서만)
   */
  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * 경고 로그 출력 (개발 환경에서만)
   */
  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * 에러 로그 출력 (모든 환경에서 출력)
   * 프로덕션에서도 에러는 추적이 필요하므로 출력합니다.
   */
  error: (...args: unknown[]): void => {
    console.error(...args)
  },

  /**
   * 디버그 로그 출력 (개발 환경에서만)
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug(...args)
    }
  },

  /**
   * 정보 로그 출력 (개발 환경에서만)
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info(...args)
    }
  },
}
