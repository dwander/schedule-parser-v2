import { apiClient } from '@/lib/api/client'
import type { Schedule, NewSchedule, UpdateSchedule } from '../types/schedule'
import { getUserId } from '@/lib/utils/userUtils'

export async function fetchSchedules(): Promise<Schedule[]> {
  const { data } = await apiClient.get('/api/schedules', {
    params: { user_id: getUserId() }
  })
  return data
}

export async function fetchSchedule(id: string): Promise<Schedule> {
  const { data } = await apiClient.get(`/api/schedules/${id}`)
  return data
}

export async function addSchedule(schedule: NewSchedule): Promise<Schedule> {
  const { data } = await apiClient.post('/api/schedules', schedule, {
    params: {
      user_id: getUserId()
    }
  })
  return data
}

export async function updateSchedule(schedule: UpdateSchedule): Promise<Schedule> {
  const { data } = await apiClient.put(`/api/schedules/${schedule.id}`, schedule, {
    params: { user_id: getUserId() }
  })
  return data
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiClient.delete(`/api/schedules/${id}`)
}

export async function deleteSchedules(ids: string[]): Promise<void> {
  await apiClient.post('/api/schedules/batch-delete',
    { ids },
    { params: { user_id: getUserId() } }
  )
}

export async function addSchedules(schedules: NewSchedule[]): Promise<Schedule[]> {
  const { data } = await apiClient.post('/api/schedules/batch',
    { schedules },
    { params: { user_id: getUserId() } }
  )
  return data
}

export async function migrateSchedules(fromUserId: string, toUserId: string): Promise<{
  success: boolean
  message: string
  migrated_schedules: number
  migrated_tags: number
}> {
  const { data } = await apiClient.post('/api/schedules/migrate', null, {
    params: {
      from_user_id: fromUserId,
      to_user_id: toUserId
    }
  })
  return data
}

// ==================== Trash API ====================

export async function fetchTrashSchedules(): Promise<Schedule[]> {
  const { data } = await apiClient.get('/api/trash/schedules', {
    params: { user_id: getUserId() }
  })
  return data
}

export async function restoreSchedule(id: string): Promise<Schedule> {
  const { data } = await apiClient.patch(`/api/schedules/${id}/restore`, null, {
    params: { user_id: getUserId() }
  })
  return data.schedule
}

export async function permanentDeleteSchedule(id: string): Promise<void> {
  await apiClient.delete(`/api/schedules/${id}/permanent`, {
    params: { user_id: getUserId() }
  })
}

export async function emptyTrash(): Promise<{ deleted_count: number }> {
  const { data } = await apiClient.delete('/api/trash/schedules', {
    params: { user_id: getUserId() }
  })
  return data
}

export async function restoreAllTrash(): Promise<{ restored_count: number }> {
  const { data } = await apiClient.post('/api/trash/schedules/restore-all', null, {
    params: { user_id: getUserId() }
  })
  return data
}
