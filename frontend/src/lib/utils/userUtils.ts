import { AUTH_STORAGE_KEYS } from '@/lib/constants/storage'
import { logger } from './logger'

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
 * Format Google user ID to database format (google_${id})
 * @param googleId - Raw Google ID (e.g., "115583503997097606746")
 * @returns Formatted user ID (e.g., "google_115583503997097606746")
 */
export function formatGoogleUserId(googleId: string): string {
  return `google_${googleId}`
}

/**
 * Format anonymous user ID to database format (anonymous_${uuid})
 * @param uuid - Anonymous UUID
 * @returns Formatted user ID (e.g., "anonymous_a84d8829-3367-4b9a-9841-c0a00518cec8")
 */
export function formatAnonymousUserId(uuid: string): string {
  return `anonymous_${uuid}`
}

/**
 * Get or create a unique user ID
 * For authenticated users: use SNS ID (already has prefix from backend)
 * For anonymous users: generate and store UUID in localStorage
 */
export function getUserId(): string {
  // Check if user is authenticated
  const authStorage = localStorage.getItem(AUTH_STORAGE_KEYS.STORAGE)
  if (authStorage) {
    try {
      const authState = JSON.parse(authStorage)
      if (authState.state?.isLoggedIn && authState.state?.user?.id) {
        // 백엔드에서 이미 prefix를 붙여서 주므로 그대로 사용
        return authState.state.user.id
      }
    } catch (e) {
      logger.error('Failed to parse auth storage:', e)
    }
  }

  // For anonymous users, get or create UUID
  let anonymousId = localStorage.getItem(AUTH_STORAGE_KEYS.ANONYMOUS_USER_ID)
  if (!anonymousId) {
    anonymousId = generateUUID()
    localStorage.setItem(AUTH_STORAGE_KEYS.ANONYMOUS_USER_ID, anonymousId)
  }

  return formatAnonymousUserId(anonymousId)
}

/**
 * Get anonymous user ID if it exists (without creating a new one)
 */
export function getAnonymousUserId(): string | null {
  const anonymousId = localStorage.getItem(AUTH_STORAGE_KEYS.ANONYMOUS_USER_ID)
  return anonymousId ? formatAnonymousUserId(anonymousId) : null
}

/**
 * Clear anonymous user data (called after migration)
 */
export function clearAnonymousData() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.ANONYMOUS_USER_ID)
}
