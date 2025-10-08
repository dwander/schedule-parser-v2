import { useQuery } from '@tanstack/react-query'
import { fetchUsers } from '../api/userApi'
import { QUERY_CONFIG } from '@/lib/constants/query'

interface UseUsersOptions {
  enabled?: boolean
}

/**
 * Fetch all users (admin only)
 */
export function useUsers(options?: UseUsersOptions) {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: QUERY_CONFIG.USER_STALE_TIME_MS,
    enabled: options?.enabled ?? true,
  })
}
