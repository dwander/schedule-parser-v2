import { addWeeks, addMonths, addYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import type { DateRangePreset } from '@/stores/useSettingsStore'

export interface DateRange {
  from: Date
  to: Date
}

/**
 * 프리셋 라벨 맵핑
 */
export const presetLabels: Record<string, string> = {
  'today': '오늘',
  'thisWeek': '이번주',
  'thisMonth': '이번달',
  'thisYear': '올해',
  'lastWeek': '지난주',
  'lastMonth': '지난달',
  'lastYear': '작년',
  'nextWeek': '다음주',
  'nextMonth': '다음달',
  'nextYear': '내년',
  'all': '전체기간',
}

/**
 * 프리셋에 따라 동적으로 날짜 범위를 계산
 * @param preset 선택된 프리셋
 * @param weekStartsOn 주 시작 요일 (0: 일요일, 1: 월요일)
 * @returns 계산된 날짜 범위 또는 null (전체기간인 경우)
 */
export function calculateDateRangeFromPreset(
  preset: DateRangePreset,
  weekStartsOn: 0 | 1 = 1
): DateRange | null {
  if (!preset || preset === 'all' || preset === 'custom') {
    return null
  }

  const now = new Date()
  let from: Date
  let to: Date

  switch (preset) {
    case 'today':
      from = startOfDay(now)
      to = endOfDay(now)
      break

    case 'thisWeek':
      from = startOfWeek(now, { weekStartsOn })
      to = endOfWeek(now, { weekStartsOn })
      break

    case 'thisMonth':
      from = startOfMonth(now)
      to = endOfMonth(now)
      break

    case 'thisYear':
      from = startOfYear(now)
      to = endOfYear(now)
      break

    case 'lastWeek':
      from = startOfWeek(addWeeks(now, -1), { weekStartsOn })
      to = endOfWeek(addWeeks(now, -1), { weekStartsOn })
      break

    case 'lastMonth':
      from = startOfMonth(addMonths(now, -1))
      to = endOfMonth(addMonths(now, -1))
      break

    case 'lastYear':
      from = startOfYear(addYears(now, -1))
      to = endOfYear(addYears(now, -1))
      break

    case 'nextWeek':
      from = startOfWeek(addWeeks(now, 1), { weekStartsOn })
      to = endOfWeek(addWeeks(now, 1), { weekStartsOn })
      break

    case 'nextMonth':
      from = startOfMonth(addMonths(now, 1))
      to = endOfMonth(addMonths(now, 1))
      break

    case 'nextYear':
      from = startOfYear(addYears(now, 1))
      to = endOfYear(addYears(now, 1))
      break

    default:
      return null
  }

  return { from, to }
}
