import { flexRender } from '@tanstack/react-table'
import { useSchedules } from '../hooks/useSchedules'
import { useScheduleTable } from '../hooks/useScheduleTable'
import { useScheduleVirtual } from '../hooks/useScheduleVirtual'
import { Button } from '@/components/ui/button'

export function ScheduleTable() {
  const { data, isLoading, error } = useSchedules()
  const { table, globalFilter, setGlobalFilter } = useScheduleTable(data)
  const { virtualizer, tableRef } = useScheduleVirtual(table.getRowModel().rows)

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
      <div ref={tableRef} className="border border-border rounded-md">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <table className="w-full">
            <thead className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        width: `${header.getSize()}px`,
                        minWidth: `${header.getSize()}px`,
                        maxWidth: `${header.getSize()}px`
                      }}
                      className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-border overflow-hidden"
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
                  ))}
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
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          width: `${cell.column.getSize()}px`,
                          minWidth: `${cell.column.getSize()}px`,
                          maxWidth: `${cell.column.getSize()}px`
                        }}
                        className="px-3 py-2 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
