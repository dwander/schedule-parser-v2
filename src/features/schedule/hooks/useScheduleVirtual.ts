import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { Row } from '@tanstack/react-table'
import type { Schedule } from '../types/schedule'

export function useScheduleVirtual(rows: Row<Schedule>[]) {
  const parentRef = useRef<HTMLDivElement>(null)

  return {
    parentRef,
    virtualizer: useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 50, // 행 높이
      overscan: 10,
    }),
  }
}
