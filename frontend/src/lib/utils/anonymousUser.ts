/**
 * 익명 사용자 ID 생성 및 관리
 */

const STORAGE_KEY = 'anonymous_user_id'

/**
 * 익명 사용자 ID 가져오기 (없으면 생성)
 * 형식: anonymous_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (UUID v4)
 */
export function getAnonymousUserId(): string {
  // localStorage에서 기존 ID 확인
  const existingId = localStorage.getItem(STORAGE_KEY)

  if (existingId) {
    return existingId
  }

  // 새로운 익명 ID 생성 (crypto.randomUUID 사용)
  const uuid = crypto.randomUUID()
  const newId = `anonymous_${uuid}`
  localStorage.setItem(STORAGE_KEY, newId)

  return newId
}

/**
 * 익명 사용자 ID 초기화 (테스트용)
 */
export function resetAnonymousUserId(): void {
  localStorage.removeItem(STORAGE_KEY)
}
