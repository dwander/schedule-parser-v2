import { apiClient } from '@/lib/api/client'
import { Schedule, NewSchedule, UpdateSchedule } from '../types/schedule'

export async function fetchSchedules(): Promise<Schedule[]> {
  const { data } = await apiClient.get('/schedules')
  return data
}

export async function fetchSchedule(id: string): Promise<Schedule> {
  const { data } = await apiClient.get(`/schedules/${id}`)
  return data
}

export async function addSchedule(schedule: NewSchedule): Promise<Schedule> {
  const { data } = await apiClient.post('/schedules', schedule)
  return data
}

export async function updateSchedule(schedule: UpdateSchedule): Promise<Schedule> {
  const { data } = await apiClient.put(`/schedules/${schedule.id}`, schedule)
  return data
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiClient.delete(`/schedules/${id}`)
}

export async function deleteSchedules(ids: string[]): Promise<void> {
  await apiClient.post('/schedules/batch-delete', { ids })
}
