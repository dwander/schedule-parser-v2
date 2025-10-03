import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { Row } from '@tanstack/react-table'
import type { Schedule } from '../types/schedule'

export function useScheduleVirtual(rows: Row<Schedule>[]) {
  const tableRef = useRef<HTMLDivElement>(null)

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 50,
    overscan: 5,
    scrollMargin: tableRef.current?.offsetTop ?? 0,
  })

  return { virtualizer, tableRef }
}
