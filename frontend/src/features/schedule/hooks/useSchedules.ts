import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchSchedules,
  addSchedule,
  addSchedules,
  updateSchedule,
  deleteSchedule,
  deleteSchedules,
} from '../api/scheduleApi'

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: fetchSchedules,
  })
}

export function useAddSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useBatchAddSchedules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addSchedules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export function useDeleteSchedules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSchedules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}
