import { useQuery } from '@tanstack/react-query'
import { fetchUsers } from '../api/userApi'

/**
 * Fetch all users (admin only)
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5, // 5분
  })
}
