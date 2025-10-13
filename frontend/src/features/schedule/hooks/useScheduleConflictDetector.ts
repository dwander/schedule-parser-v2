import { useMemo } from 'react'
import type { Schedule } from '../types/schedule'
import { TIME_CONSTANTS } from '@/lib/constants/schedule'

interface ConflictDetectionResult {
  duplicateSchedules: Set<number>
  conflictSchedules: Set<number>
}

/**
 * 스케줄 중복 및 시간 충돌 탐지 훅
 * @param schedules - 검사할 스케줄 목록
 * @returns 중복/충돌 스케줄 인덱스 Set
 */
export function useScheduleConflictDetector(schedules: Schedule[]): ConflictDetectionResult {
  return useMemo(() => {
    const duplicates = new Set<number>()
    const conflicts = new Set<number>()
    const dateTimeMap = new Map<string, number[]>()

    // 시간 문자열을 분 단위로 변환 (HH:MM -> 분)
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * TIME_CONSTANTS.MINUTES_PER_HOUR + minutes
    }

    // 날짜+시간 기준으로 그룹화
    schedules.forEach((schedule, index) => {
      if (schedule.date && schedule.time) {
        const key = `${schedule.date}-${schedule.time}`
        if (!dateTimeMap.has(key)) {
          dateTimeMap.set(key, [])
        }
        dateTimeMap.get(key)!.push(index)
      }
    })

    // 2개 이상인 그룹의 모든 인덱스를 완전 중복으로 표시
    dateTimeMap.forEach((indexes) => {
      if (indexes.length > 1) {
        indexes.forEach(idx => duplicates.add(idx))
      }
    })

    // 시간 충돌 체크 (같은 날짜 내에서 1시간 이내)
    const dateGroups = new Map<string, Array<{ index: number; minutes: number; time: string }>>()

    schedules.forEach((schedule, index) => {
      if (schedule.date && schedule.time) {
        if (!dateGroups.has(schedule.date)) {
          dateGroups.set(schedule.date, [])
        }
        dateGroups.get(schedule.date)!.push({
          index,
          minutes: timeToMinutes(schedule.time),
          time: schedule.time
        })
      }
    })

    // 각 날짜별로 시간 충돌 검사
    dateGroups.forEach((schedules) => {
      for (let i = 0; i < schedules.length; i++) {
        for (let j = i + 1; j < schedules.length; j++) {
          const timeDiff = Math.abs(schedules[i].minutes - schedules[j].minutes)
          // 1시간 이내이고, 완전 중복이 아닌 경우 시간 충돌
          if (timeDiff > 0 && timeDiff < TIME_CONSTANTS.CONFLICT_THRESHOLD_MINUTES) {
            conflicts.add(schedules[i].index)
            conflicts.add(schedules[j].index)
          }
        }
      }
    })

    return { duplicateSchedules: duplicates, conflictSchedules: conflicts }
  }, [schedules])
}
