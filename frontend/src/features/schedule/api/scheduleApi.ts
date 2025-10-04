import { apiClient } from '@/lib/api/client'
import type { Schedule, NewSchedule, UpdateSchedule } from '../types/schedule'
import { mockSchedules } from '@/lib/api/mockData'
import { getUserId } from '@/lib/utils/userUtils'

export async function fetchSchedules(): Promise<Schedule[]> {
  const { data } = await apiClient.get('/api/schedules', {
    params: { user_id: getUserId() }
  })
  // couple 필드가 없으면 groom ♥ bride로 생성
  return data.map((schedule: any) => ({
    ...schedule,
    couple: schedule.couple || `${schedule.groom} ♥ ${schedule.bride}`
  }))
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
