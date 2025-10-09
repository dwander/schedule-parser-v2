import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, fetchVoiceTrainingData, updateVoiceTrainingData } from '../api/userApi'
import { QUERY_CONFIG } from '@/lib/constants/query'
import type { VoiceTrainingData } from '@/features/schedule/types/voiceRecognition'

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

/**
 * Fetch voice training data for a user
 */
export function useVoiceTrainingData(userId: string | undefined) {
  return useQuery({
    queryKey: ['voice-training', userId],
    queryFn: () => fetchVoiceTrainingData(userId!),
    enabled: !!userId,
    staleTime: 0, // 항상 최신 데이터 사용
    refetchOnMount: true, // 마운트 시 재조회
  })
}

/**
 * Update voice training data for a user
 */
export function useUpdateVoiceTrainingData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: VoiceTrainingData }) =>
      updateVoiceTrainingData(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['voice-training', variables.userId] })
    },
  })
}
