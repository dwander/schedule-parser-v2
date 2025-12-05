import { useMemo, useState, useEffect } from 'react'
import type { Schedule } from '../types/schedule'

/**
 * 현재 진행 중인 스케줄을 감지하는 훅
 *
 * 스케줄 시간 -1시간 부터 +1시간 이내인 스케줄을 찾습니다.
 * 예: 스케줄이 14:00이면 13:00 ~ 15:00 사이에 활성화됩니다.
 *
 * @param schedules - 필터링된 스케줄 목록 (현재 리스트에 보여지는 스케줄들)
 * @returns 현재 진행 중인 스케줄 (없으면 null)
 */
export function useActiveSchedule(schedules: Schedule[]): Schedule | null {
  const [now, setNow] = useState(() => new Date())

  // 1분마다 현재 시간 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 60000) // 60초

    return () => clearInterval(interval)
  }, [])

  const activeSchedule = useMemo(() => {
    if (!schedules || schedules.length === 0) return null

    const currentTime = now.getTime()

    // 현재 진행 중인 스케줄 찾기
    const active = schedules.find((schedule) => {
      if (!schedule.date || !schedule.time) return false

      try {
        // schedule.date: "YYYY.MM.DD", schedule.time: "HH:MM"
        const [year, month, day] = schedule.date.split('.').map(Number)
        const [hour, minute] = schedule.time.split(':').map(Number)

        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
          return false
        }

        const scheduleTime = new Date(year, month - 1, day, hour, minute).getTime()

        // 스케줄 시간 기준 -1시간 ~ +1시간 범위
        const oneHourMs = 60 * 60 * 1000
        const rangeStart = scheduleTime - oneHourMs
        const rangeEnd = scheduleTime + oneHourMs

        return currentTime >= rangeStart && currentTime <= rangeEnd
      } catch {
        return false
      }
    })

    return active || null
  }, [schedules, now])

  return activeSchedule
}
