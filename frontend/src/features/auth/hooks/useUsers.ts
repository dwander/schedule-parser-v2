import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchUsers, type UserDetail } from '../api/userApi'

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
    staleTime: 1000 * 60 * 5, // 5분
    enabled: options?.enabled ?? true,
  })
}
