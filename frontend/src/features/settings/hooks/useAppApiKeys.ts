/**
 * 앱 API 키 관리 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAppApiKeys,
  createAppApiKey,
  deleteAppApiKey,
  deactivateAppApiKey,
  activateAppApiKey,
  regenerateAppApiKey,
} from '../api/appKeysApi'
import { useAuthStore } from '@/stores/useAuthStore'

/**
 * API 키 목록 조회
 */
export function useAppApiKeys() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['appApiKeys', user?.id],
    queryFn: () => listAppApiKeys(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30초
  })
}

/**
 * API 키 생성
 */
export function useCreateAppApiKey() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (name: string) => createAppApiKey(user!.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appApiKeys', user?.id] })
    },
  })
}

/**
 * API 키 삭제
 */
export function useDeleteAppApiKey() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (keyId: number) => deleteAppApiKey(user!.id, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appApiKeys', user?.id] })
    },
  })
}

/**
 * API 키 비활성화
 */
export function useDeactivateAppApiKey() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (keyId: number) => deactivateAppApiKey(user!.id, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appApiKeys', user?.id] })
    },
  })
}

/**
 * API 키 활성화
 */
export function useActivateAppApiKey() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (keyId: number) => activateAppApiKey(user!.id, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appApiKeys', user?.id] })
    },
  })
}

/**
 * API 키 재생성
 */
export function useRegenerateAppApiKey() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (keyId: number) => regenerateAppApiKey(user!.id, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appApiKeys', user?.id] })
    },
  })
}
