import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTags, createTag, deleteTag, syncTagsFromSchedules } from '../api/tagApi'
import type { CreateTagRequest } from '../api/tagApi'

export function useTags(tagType?: 'brand' | 'album') {
  return useQuery({
    queryKey: ['tags', tagType],
    queryFn: () => fetchTags(tagType),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export function useSyncTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncTagsFromSchedules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}
