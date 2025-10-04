import { useMemo } from 'react'
import { useSchedules } from './useSchedules'

export function useTagOptions() {
  const { data: schedules = [] } = useSchedules()

  const brandOptions = useMemo(() => {
    const brands = new Set<string>()
    schedules.forEach(schedule => {
      if (schedule.brand && schedule.brand.trim()) {
        brands.add(schedule.brand.trim())
      }
    })
    return Array.from(brands).sort()
  }, [schedules])

  const albumOptions = useMemo(() => {
    const albums = new Set<string>()
    schedules.forEach(schedule => {
      if (schedule.album && schedule.album.trim()) {
        albums.add(schedule.album.trim())
      }
    })
    return Array.from(albums).sort()
  }, [schedules])

  return {
    brandOptions,
    albumOptions,
  }
}
