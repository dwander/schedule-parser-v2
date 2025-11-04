import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTags, createTag, deleteTag, syncTagsFromSchedules } from '../api/tagApi'

export function useTags(tagType?: 'brand' | 'album' | 'tags') {
  return useQuery({
    queryKey: ['tags', tagType],
    queryFn: () => fetchTags(tagType),
    staleTime: 5 * 60 * 1000, // 5분 - 태그는 자주 변하지 않음
    gcTime: 10 * 60 * 1000, // 10분 - 메모리에 오래 유지
    refetchOnMount: false, // 캐시된 데이터가 stale하지 않으면 다시 fetch 안 함
    refetchOnWindowFocus: false, // 윈도우 포커스 시에도 refetch 안 함
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tags'],
        exact: false,
        refetchType: 'all'
      })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tags'],
        exact: false,
        refetchType: 'all'
      })
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export function useSyncTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncTagsFromSchedules,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tags'],
        exact: false,
        refetchType: 'all'
      })
    },
  })
}
