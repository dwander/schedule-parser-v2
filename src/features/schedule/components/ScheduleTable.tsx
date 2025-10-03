import { flexRender } from '@tanstack/react-table'
import { useSchedules } from '../hooks/useSchedules'
import { useScheduleTable } from '../hooks/useScheduleTable'
import { useScheduleVirtual } from '../hooks/useScheduleVirtual'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'

export function ScheduleTable() {
  const { data, isLoading, error } = useSchedules()
  const { table, globalFilter, setGlobalFilter } = useScheduleTable(data)
  const { virtualizer, tableRef } = useScheduleVirtual(table.getRowModel().rows)
  const containerRef = useRef<HTMLDivElement>(null)
  const [spacerWidth, setSpacerWidth] = useState(0)

  // 스페이서 컬럼 폭 계산
  useLayoutEffect(() => {
    const calculateSpacerWidth = () => {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.offsetWidth
      const fixedColumnsWidth = table
        .getAllColumns()
        .filter((col) => col.id !== 'spacer')
        .reduce((sum, col) => sum + col.getSize(), 0)

      const spacer = Math.max(0, containerWidth - fixedColumnsWidth)
      setSpacerWidth(spacer)

      // 스페이서 컬럼 크기 업데이트
      const spacerColumn = table.getAllColumns().find((col) => col.id === 'spacer')
      if (spacerColumn) {
        spacerColumn.columnDef.size = spacer
      }
    }

    // 초기 계산 및 리사이즈 이벤트 등록
    calculateSpacerWidth()
    window.addEventListener('resize', calculateSpacerWidth)
    return () => window.removeEventListener('resize', calculateSpacerWidth)
  }, [table, data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">
          에러가 발생했습니다: {(error as Error).message}
        </div>
      </div>
    )
  }

  const rows = table.getRowModel().rows

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="검색..."
          className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
        />
        <div className="text-sm text-muted-foreground">
          {rows.length}개 스케줄
        </div>
      </div>

      {/* Table */}
      <div ref={containerRef} className="border border-border rounded-md">
        <div ref={tableRef}>
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            <table style={{ tableLayout: 'fixed' }}>
              <thead className="bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      // 스페이서 컬럼은 동적 폭 사용
                      const width = header.column.id === 'spacer' ? spacerWidth : header.getSize()
                      return (
                        <th
                          key={header.id}
                          style={{
                            width: `${width}px`,
                            minWidth: `${width}px`,
                            maxWidth: `${width}px`
                          }}
                          className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-border overflow-hidden whitespace-nowrap"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={
                                header.column.getCanSort()
                                  ? 'cursor-pointer select-none'
                                  : ''
                              }
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: ' ↑',
                                desc: ' ↓',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody style={{ paddingTop: '48px' }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <tr
                      key={row.id}
                      style={{
                        position: 'absolute',
                        top: '48px',
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${
                          virtualRow.start - virtualizer.options.scrollMargin
                        }px)`,
                      }}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => {
                        // 스페이서 컬럼은 동적 폭 사용
                        const width = cell.column.id === 'spacer' ? spacerWidth : cell.column.getSize()
                        return (
                          <td
                            key={cell.id}
                            style={{
                              width: `${width}px`,
                              minWidth: `${width}px`,
                              maxWidth: `${width}px`
                            }}
                            className="px-3 py-2 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
