import { useMemo } from 'react'
import { useSchedules } from './useSchedules'

export function useTagOptions() {
  const { data: schedules = [] } = useSchedules()

  const brandOptions = useMemo(() => {
    const brands = new Set<string>()
    schedules.forEach(schedule => {
      if (schedule.brand && schedule.brand.trim()) {
        // 연속된 공백을 하나로 정규화
        const normalized = schedule.brand.trim().replace(/\s+/g, ' ')
        brands.add(normalized)
      }
    })
    return Array.from(brands).sort()
  }, [schedules])

  const albumOptions = useMemo(() => {
    const albums = new Set<string>()
    schedules.forEach(schedule => {
      if (schedule.album && schedule.album.trim()) {
        // 연속된 공백을 하나로 정규화
        const normalized = schedule.album.trim().replace(/\s+/g, ' ')
        albums.add(normalized)
      }
    })
    return Array.from(albums).sort()
  }, [schedules])

  return {
    brandOptions,
    albumOptions,
  }
}
