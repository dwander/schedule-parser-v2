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
  // Check if user is authenticated
  const authStorage = localStorage.getItem('auth-storage')
  console.log('🔍 getUserId() - authStorage:', authStorage)

  if (authStorage) {
    try {
      const authState = JSON.parse(authStorage)
      console.log('🔍 getUserId() - authState:', authState)

      if (authState.state?.isLoggedIn && authState.state?.user?.id) {
        const userId = `google_${authState.state.user.id}`
        console.log('✅ getUserId() - Logged in, returning:', userId)
        return userId
      }
    } catch (e) {
      console.error('Failed to parse auth storage:', e)
    }
  }

  // For anonymous users, get or create UUID
  let anonymousId = localStorage.getItem('anonymous_user_id')
  if (!anonymousId) {
    anonymousId = generateUUID()
    localStorage.setItem('anonymous_user_id', anonymousId)
    console.log('🆕 getUserId() - Created new anonymous ID:', anonymousId)
  } else {
    console.log('📋 getUserId() - Using existing anonymous ID:', anonymousId)
  }

  const userId = `anonymous_${anonymousId}`
  console.log('👤 getUserId() - Anonymous, returning:', userId)
  return userId
}

/**
 * Get anonymous user ID if it exists (without creating a new one)
 */
export function getAnonymousUserId(): string | null {
  const anonymousId = localStorage.getItem('anonymous_user_id')
  return anonymousId ? `anonymous_${anonymousId}` : null
}

/**
 * Clear anonymous user data (called after migration)
 */
export function clearAnonymousData() {
  localStorage.removeItem('anonymous_user_id')
}
