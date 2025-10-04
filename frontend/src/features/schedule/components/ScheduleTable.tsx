import { flexRender } from '@tanstack/react-table'
import { useSchedules, useDeleteSchedules } from '../hooks/useSchedules'
import { useScheduleTable } from '../hooks/useScheduleTable'
import { useScheduleVirtual } from '../hooks/useScheduleVirtual'
import { ScheduleCard } from './ScheduleCard'
import { Button } from '@/components/ui/button'
import { Trash2, Settings, Search, Calendar, CalendarOff } from 'lucide-react'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorFallback } from '@/components/error/ErrorFallback'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DateRangeFilterDialog } from './DateRangeFilterDialog'
import { toast } from 'sonner'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface ScheduleTableProps {
  data: Schedule[]
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
}

export function ScheduleTable({ data, globalFilter, onGlobalFilterChange }: ScheduleTableProps) {
  const { isLoading, error } = useSchedules()
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false)
  const { dateRangeFilter, setDateRangeFilter: setDateRange } = useSettingsStore()

  // localStorage에서 불러온 문자열을 Date 객체로 변환
  const dateRange = {
    from: dateRangeFilter.from ? new Date(dateRangeFilter.from) : null,
    to: dateRangeFilter.to ? new Date(dateRangeFilter.to) : null,
  }

  const { table, flexColumnId, rowSelection, columnLabels, columnVisibility, setColumnVisibility, duplicateSchedules, conflictSchedules, handleDeleteTag, deleteConfirmDialog } = useScheduleTable(data)
  const { virtualizer: listVirtualizer, tableRef } = useScheduleVirtual(table.getRowModel().rows)
  const deleteSchedules = useDeleteSchedules()
  const containerRef = useRef<HTMLDivElement>(null)
  const [flexWidth, setFlexWidth] = useState(0)
  const [tableWidth, setTableWidth] = useState('100%')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { theme, setTheme, viewMode, setViewMode } = useSettingsStore()

  // Grid virtualizer (card 모드일 때만)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const cardWidth = 320
  const gap = 16
  const [gridColumns, setGridColumns] = useState(() => {
    // 초기값을 window 크기로 계산
    if (typeof window !== 'undefined') {
      return Math.max(1, Math.floor((window.innerWidth + gap) / (cardWidth + gap)))
    }
    return 1 // SSR fallback
  })

  useLayoutEffect(() => {
    if (viewMode !== 'card') return

    const updateColumns = () => {
      if (!gridContainerRef.current) return
      const containerWidth = gridContainerRef.current.clientWidth
      const cols = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
      setGridColumns(cols)
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [viewMode])

  const rowCount = Math.ceil(table.getRowModel().rows.length / gridColumns)

  const gridVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => window as any,
    estimateSize: () => 400,
    overscan: 3,
    scrollMargin: gridContainerRef.current?.offsetTop ?? 0,
    observeElementRect: (instance, cb) => {
      const handler = () => {
        cb({
          width: window.innerWidth,
          height: window.innerHeight,
        } as DOMRectReadOnly)
      }

      handler()
      window.addEventListener('resize', handler)
      return () => window.removeEventListener('resize', handler)
    },
    observeElementOffset: (instance, cb) => {
      const handler = () => {
        cb(window.scrollY)
      }

      handler()
      window.addEventListener('scroll', handler)
      return () => window.removeEventListener('scroll', handler)
    },
    measureElement: (el) => el.getBoundingClientRect().height + gap,
  })

  // 가변폭 컬럼 크기 계산 (memo 또는 spacer)
  useLayoutEffect(() => {
    const calculateFlexWidth = () => {
      if (!containerRef.current) return

      // clientWidth는 border를 제외한 내부 너비 (offsetWidth - border)
      const containerWidth = containerRef.current.clientWidth

      // 보이는 컬럼만 필터링하여 계산
      const fixedColumnsWidth = table
        .getAllColumns()
        .filter((col) => col.getIsVisible() && col.id !== 'memo' && col.id !== 'spacer')
        .reduce((sum, col) => sum + col.getSize(), 0)

      // 가변폭 계산 시 24px 패딩 고려
      const availableWidth = Math.max(150, containerWidth - fixedColumnsWidth - 24)
      setFlexWidth(availableWidth)

      // 실제 필요한 테이블 폭 계산 (고정 + 가변 + 24px 보정)
      const calculatedTableWidth = fixedColumnsWidth + availableWidth + 24
      setTableWidth(`${calculatedTableWidth}px`)

      // 가변폭 컬럼 크기 업데이트
      const flexColumn = table.getAllColumns().find((col) => col.id === flexColumnId)
      if (flexColumn) {
        flexColumn.columnDef.size = availableWidth
      }
    }

    // 초기 계산 및 리사이즈 이벤트 등록
    calculateFlexWidth()
    window.addEventListener('resize', calculateFlexWidth)
    return () => window.removeEventListener('resize', calculateFlexWidth)
  }, [table, data, flexColumnId, table.getState().columnVisibility])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="스케줄을 불러오는 중..." />
      </div>
    )
  }

  if (error) {
    return <ErrorFallback error={error as Error} />
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="스케줄이 없습니다"
        description="새로운 스케줄을 추가하거나 카카오톡 메시지를 파싱해보세요"
      />
    )
  }

  const rows = table.getRowModel().rows
  const selectedCount = Object.keys(rowSelection).length
  const hasSelection = selectedCount > 0

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    const selectedRows = table.getSelectedRowModel().rows
    const selectedIds = selectedRows.map(row => row.original.id)

    deleteSchedules.mutate(selectedIds, {
      onSuccess: () => {
        toast.success(`${selectedIds.length}개 스케줄이 삭제되었습니다`)
        table.resetRowSelection()
        setDeleteDialogOpen(false)
      },
      onError: (error) => {
        toast.error('삭제 실패: ' + (error as Error).message)
      }
    })
  }

  return (
    <>
      {deleteConfirmDialog}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="스케줄 삭제"
        description={`선택한 ${selectedCount}개의 스케줄을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

      <div className="space-y-4 w-full">
        {/* Search and Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Expandable Search */}
          <div
            className={`flex items-center border border-input rounded-md bg-background overflow-hidden transition-all duration-300 ease-in-out ${
              searchExpanded ? 'w-full sm:w-64' : 'w-10'
            }`}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchExpanded(!searchExpanded)}
              className="flex-shrink-0 hover:bg-transparent h-8 w-8 p-0"
            >
              <Search className="h-4 w-4" />
            </Button>
            <input
              value={globalFilter ?? ''}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              placeholder="검색..."
              className={`px-2 py-1.5 text-sm bg-transparent text-foreground focus:outline-none transition-all duration-300 ${
                searchExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'
              }`}
              autoFocus={searchExpanded}
            />
          </div>

          {/* Date Range Filter Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRangeDialogOpen(true)}
            className="flex-shrink-0 gap-2"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">
              {dateRange.from && dateRange.to
                ? `${dateRange.from.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')} ~ ${dateRange.to.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}`
                : '전체기간'}
            </span>
          </Button>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDeleteClick}
            disabled={!hasSelection}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <MixerHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuLabel>컬럼 표시</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* 체크박스 항목 */}
              <DropdownMenuCheckboxItem
                checked={columnVisibility.select}
                onCheckedChange={(value) => setColumnVisibility({ select: !!value })}
                onSelect={(e) => e.preventDefault()}
              >
                체크박스
              </DropdownMenuCheckboxItem>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {columnLabels[column.id as keyof typeof columnLabels] || column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuLabel>보기 모드 전환</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'card')}>
                <DropdownMenuRadioItem value="list">리스트형</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="card">카드형</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>UI 테마</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
                <DropdownMenuRadioItem value="light">라이트 모드</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">다크 모드</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">시스템 설정</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>섹션3</DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div ref={containerRef} className="border border-border rounded-md overflow-x-auto overflow-y-hidden w-full">
          <div ref={tableRef} style={{ minWidth: tableWidth }}>
            <div
              style={{
                height: `${listVirtualizer.getTotalSize() + 48}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead className="bg-muted">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        // 가변폭 컬럼 (memo 또는 spacer)
                        const width = header.column.id === flexColumnId ? flexWidth : header.getSize()
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
                              </div>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody style={{ paddingTop: '48px' }}>
                  {listVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index]
                    const isDuplicate = duplicateSchedules.has(virtualRow.index)
                    const isConflict = conflictSchedules.has(virtualRow.index)
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
                            virtualRow.start - listVirtualizer.options.scrollMargin
                          }px)`,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        className={`border-b border-border hover:bg-accent/50 transition-colors ${
                          isDuplicate
                            ? 'bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500'
                            : isConflict
                            ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500'
                            : ''
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => {
                          // 가변폭 컬럼 (memo 또는 spacer)
                          const width = cell.column.id === flexColumnId ? flexWidth : cell.column.getSize()
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
      )}

      {/* Grid View */}
      {viewMode === 'card' && (
        <div ref={gridContainerRef} className="w-full">
          <div
            style={{
              height: `${gridVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {gridVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIdx = virtualRow.index * gridColumns
              const endIdx = Math.min(startIdx + gridColumns, table.getRowModel().rows.length)
              const rowSchedules = table.getRowModel().rows.slice(startIdx, endIdx)

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={gridVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start - (gridVirtualizer.options.scrollMargin || 0)}px)`,
                  }}
                >
                  <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
                  >
                    {rowSchedules.map((row, idx) => {
                      const schedule = row.original
                      const rowIndex = virtualRow.index * gridColumns + idx
                      const isDuplicate = duplicateSchedules.has(rowIndex)
                      const isConflict = conflictSchedules.has(rowIndex)
                      return (
                        <div key={schedule.id} className="min-w-0 overflow-hidden">
                          <ScheduleCard
                            schedule={schedule}
                            isSelected={row.getIsSelected()}
                            isDuplicate={isDuplicate}
                            isConflict={isConflict}
                            onToggleSelect={() => row.toggleSelected()}
                            onDeleteTag={handleDeleteTag}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Date Range Filter Dialog */}
      <DateRangeFilterDialog
        open={dateRangeDialogOpen}
        onOpenChange={setDateRangeDialogOpen}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      </div>
    </>
  )
}
