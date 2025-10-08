import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { Row } from '@tanstack/react-table'
import type { Schedule } from '../types/schedule'
import { UI_SIZES } from '@/lib/constants/ui'

export function useScheduleVirtual(rows: Row<Schedule>[]) {
  const tableRef = useRef<HTMLDivElement>(null)

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => UI_SIZES.ROW_ESTIMATED_HEIGHT,
    overscan: UI_SIZES.LIST_OVERSCAN,
    scrollMargin: tableRef.current?.offsetTop ?? 0,
  })

  return { virtualizer, tableRef }
}
