/**
 * localStorage 키 상수
 */

/**
 * 인증 관련 localStorage 키
 */
export const AUTH_STORAGE_KEYS = {
  TOKEN: 'auth-token',
  USER: 'auth-user',
  STORAGE: 'auth-storage',
  ANONYMOUS_USER_ID: 'anonymous_user_id',
} as const

/**
 * 앱 상태 관련 localStorage 키
 */
export const APP_STORAGE_KEYS = {
  SKIP_LANDING: 'skipLanding',
  ADDING_EXAMPLES: 'addingExamples',
  HAS_SEEN_EXAMPLES: 'hasSeenExamples',
} as const
