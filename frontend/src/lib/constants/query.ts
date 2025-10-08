/**
 * TanStack Query 관련 설정 상수
 */

/**
 * Query 캐시 설정
 */
export const QUERY_CONFIG = {
  // Cache Times
  STALE_TIME_MS: 5 * 60 * 1000,      // 5분 - 데이터가 "신선한" 상태로 유지되는 시간
  GC_TIME_MS: 10 * 60 * 1000,        // 10분 - 사용하지 않는 캐시가 메모리에서 제거되는 시간
  USER_STALE_TIME_MS: 5 * 60 * 1000, // 5분 - 유저 데이터 stale time

  // Retry
  QUERY_RETRY_COUNT: 1,      // Query 실패 시 재시도 횟수
  MUTATION_RETRY_COUNT: 0,   // Mutation 실패 시 재시도 횟수 (즉시 실패)
} as const
