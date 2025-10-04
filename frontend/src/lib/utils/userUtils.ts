/**
 * Generate a random UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Get or create a unique user ID
 * For authenticated users: use Google/SNS ID
 * For anonymous users: generate and store UUID in localStorage
 */
export function getUserId(): string {
  // TODO: 인증 시스템 구현 후 authState 확인
  // if (authState.isAuthenticated && authState.user?.id) {
  //   return `google_${authState.user.id}`
  // }

  // For anonymous users, get or create UUID
  let anonymousId = localStorage.getItem('anonymous_user_id')
  if (!anonymousId) {
    anonymousId = generateUUID()
    localStorage.setItem('anonymous_user_id', anonymousId)
  }

  return `anonymous_${anonymousId}`
}

/**
 * Clear anonymous user data (called when user logs in)
 */
export function clearAnonymousData() {
  localStorage.removeItem('anonymous_user_id')
}
