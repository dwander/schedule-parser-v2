import { apiClient } from '@/lib/api/client'

/**
 * User detail type (from backend with snake_case fields)
 */
export interface UserDetail {
  id: string
  auth_provider: string
  is_anonymous: boolean
  email: string | null
  name: string | null
  is_admin: boolean
  has_seen_sample_data: boolean
  created_at: string | null
  last_login: string | null
}

/**
 * Fetch all users (admin only)
 */
export async function fetchUsers(): Promise<UserDetail[]> {
  const response = await apiClient.get('/api/users')
  return response.data
}
