import { flexRender } from '@tanstack/react-table'
import { useSchedules, useDeleteSchedules } from '../hooks/useSchedules'
import { useScheduleTable } from '../hooks/useScheduleTable'
import { useScheduleVirtual } from '../hooks/useScheduleVirtual'
import { useFlexColumnWidth } from '../hooks/useFlexColumnWidth'
import { ScheduleCard } from './ScheduleCard'
import { SearchInput } from './SearchInput'
import type { Schedule } from '../types/schedule'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarOff, LayoutList, LayoutGrid, ArrowUp, ArrowDown, ChevronRight, ChevronLeft } from 'lucide-react'
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
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DateRangeFilterDialog } from './DateRangeFilterDialog'
import { toast } from 'sonner'
import { useState, useLayoutEffect, useRef, useEffect } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { UI_SIZES } from '@/lib/constants/ui'
import { presetLabels } from '@/lib/utils/datePresets'

interface ScheduleTableProps {
  data: Schedule[]
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  onSelectedCountChange?: (count: number) => void
  deleteDialogOpen?: boolean
  onDeleteDialogChange?: (open: boolean) => void
}

export function ScheduleTable({ data, globalFilter, onGlobalFilterChange, onSelectedCountChange, deleteDialogOpen: externalDeleteDialogOpen, onDeleteDialogChange }: ScheduleTableProps) {
  const { isLoading, error } = useSchedules()
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false)
  const [internalDeleteDialogOpen, setInternalDeleteDialogOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const deleteDialogOpen = externalDeleteDialogOpen ?? internalDeleteDialogOpen
  const setDeleteDialogOpen = onDeleteDialogChange ?? setInternalDeleteDialogOpen
  const { dateRangeFilter, setDateRangeFilter: setDateRange, sortBy, setSortBy, dateRangeCollapsed, setDateRangeCollapsed } = useSettingsStore()

  // localStorage에서 불러온 문자열을 Date 객체로 변환
  const dateRange = {
    preset: dateRangeFilter.preset,
    from: dateRangeFilter.from ? new Date(dateRangeFilter.from) : null,
    to: dateRangeFilter.to ? new Date(dateRangeFilter.to) : null,
  }

  // 날짜를 YY.MM.DD 형식으로 포맷
  const formatShortDate = (date: Date) => {
    const year = date.getFullYear() % 100 // 마지막 2자리
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
  }

  // sortBy 파싱 (예: 'date-desc' → { type: 'date', order: 'desc' })
  const getSortParts = (sortBy: string) => {
    const parts = sortBy.split('-')
    const order = parts[parts.length - 1] as 'asc' | 'desc'
    const type = parts.slice(0, -1).join('-')
    return { type, order }
  }

  const { type: sortType, order: sortOrder } = getSortParts(sortBy)

  const sortTypeLabels: Record<string, string> = {
    'date': '날짜',
    'location': '장소',
    'cuts': '컷수'
  }

  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    const newSortBy = `${sortType}-${newOrder}` as 'date-desc' | 'date-asc' | 'location-asc' | 'location-desc' | 'cuts-desc' | 'cuts-asc'
    setSortBy(newSortBy)
  }

  const { table, flexColumnId, rowSelection, columnLabels, columnVisibility, setColumnVisibility, duplicateSchedules, conflictSchedules, handleDeleteTag, deleteConfirmDialog } = useScheduleTable(data)
  const { virtualizer: listVirtualizer, tableRef } = useScheduleVirtual(table.getRowModel().rows)
  const deleteSchedules = useDeleteSchedules()
  const containerRef = useRef<HTMLDivElement>(null)
  const { viewMode, setViewMode } = useSettingsStore()

  // 가변폭 컬럼 크기 자동 계산 (memo 또는 spacer)
  const { flexWidth, tableWidth } = useFlexColumnWidth(
    containerRef as React.RefObject<HTMLDivElement>,
    table,
    flexColumnId,
    viewMode,
    data
  )

  // Grid virtualizer (card 모드일 때만)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const cardWidth = UI_SIZES.CARD_WIDTH
  const gap = UI_SIZES.CARD_GAP
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
    getScrollElement: () => (typeof window !== 'undefined' ? window : null) as unknown as Element,
    estimateSize: () => UI_SIZES.CARD_ESTIMATED_HEIGHT,
    overscan: UI_SIZES.GRID_OVERSCAN,
    scrollMargin: gridContainerRef.current?.offsetTop ?? 0,
    observeElementRect: (_instance, cb) => {
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
    observeElementOffset: (_instance, cb) => {
      const handler = () => {
        cb(window.scrollY, false)
      }

      handler()
      window.addEventListener('scroll', handler)
      return () => window.removeEventListener('scroll', handler)
    },
    measureElement: (el) => el.getBoundingClientRect().height + gap,
  })

  const rows = table.getRowModel().rows
  const selectedCount = Object.keys(rowSelection).length

  // selectedCount 변경 시 부모에게 알림
  useEffect(() => {
    onSelectedCountChange?.(selectedCount)
  }, [selectedCount, onSelectedCountChange])

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
          {/* Date Range Filter Split Button */}
          <div className="flex items-center border border-input rounded-md bg-background overflow-hidden flex-shrink-0">
            {/* Main Button - Calendar Icon + Date Text */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRangeDialogOpen(true)}
              className={`rounded-none overflow-hidden transition-all duration-300 ease-in-out ${
                dateRangeCollapsed ? 'gap-0 px-2' : 'gap-2 px-3'
              }`}
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                dateRangeCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
              }`}>
                {dateRange.preset && dateRange.preset !== 'custom'
                  ? presetLabels[dateRange.preset] || '전체기간'
                  : dateRange.from && dateRange.to
                  ? `${formatShortDate(dateRange.from)} ~ ${formatShortDate(dateRange.to)}`
                  : '전체기간'}
              </span>
            </Button>

            {/* Divider */}
            <div className="w-px h-4 bg-border" />

            {/* Toggle Button - Chevron */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRangeCollapsed(!dateRangeCollapsed)}
              className="h-8 w-8 p-0 rounded-none"
            >
              {dateRangeCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Sort Controls - Split Button */}
          <div className="flex items-center border border-input rounded-md bg-background overflow-hidden flex-shrink-0">
            {/* Sort Order Toggle Button (Icon only) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSortOrder}
              className="h-8 w-8 p-0 rounded-none"
            >
              {sortOrder === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>

            {/* Divider */}
            <div className="w-px h-4 bg-border" />

            {/* Sort Type Dropdown Select */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-none overflow-hidden transition-all duration-300 ease-in-out ${
                    searchExpanded ? 'w-0 px-0' : 'w-auto px-2'
                  }`}
                >
                  <span className={`transition-all duration-300 ease-in-out whitespace-nowrap ${
                    searchExpanded ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
                  }`}>
                    {sortTypeLabels[sortType]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSortBy(`date-${sortOrder}`)}>
                  날짜
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy(`location-${sortOrder}`)}>
                  장소
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy(`cuts-${sortOrder}`)}>
                  컷수
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search Input Component */}
          <SearchInput
            value={globalFilter}
            onChange={onGlobalFilterChange}
            onExpandedChange={setSearchExpanded}
          />

        <div className="flex items-center gap-1 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
              >
                <MixerHorizontalIcon className="h-5 w-5" />
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
                .filter((column) => {
                  if (!column.getCanHide()) return false
                  // 날짜, 시간, 장소, spacer는 항상 제외
                  if (['date', 'time', 'location', 'spacer'].includes(column.id)) return false
                  // 카드뷰 모드일 때 브랜드, 앨범, 연락처, 폴더 제외
                  if (viewMode === 'card' && ['brand', 'album', 'contact', 'folderName'].includes(column.id)) return false
                  return true
                })
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
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode(viewMode === 'list' ? 'card' : 'list')}
            title={viewMode === 'list' ? '카드형으로 전환' : '리스트형으로 전환'}
          >
            {viewMode === 'list' ? (
              <LayoutGrid className="h-5 w-5" />
            ) : (
              <LayoutList className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Content Area - Conditional Rendering */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="스케줄을 불러오는 중..." />
        </div>
      ) : error ? (
        <ErrorFallback error={error as Error} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="스케줄이 없습니다"
          description={globalFilter ? "검색 결과가 없습니다" : "새로운 스케줄을 추가하거나 카카오톡 메시지를 파싱해보세요"}
        />
      ) : (
        <>
          {/* List View */}
          {viewMode === 'list' && (
        <div ref={containerRef} className="overflow-x-auto overflow-y-hidden w-full bg-card border border-border rounded-lg">
          <div ref={tableRef} style={{ minWidth: tableWidth }}>
            <div
              style={{
                height: `${listVirtualizer.getTotalSize() + 48}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
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
                            ? 'bg-warning border-l-4 border-l-warning-border'
                            : isConflict
                            ? 'bg-error border-l-4 border-l-error-border'
                            : ''
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => {
                          // 가변폭 컬럼 (memo 또는 spacer)
                          const width = cell.column.id === flexColumnId ? flexWidth : cell.column.getSize()
                          const isMemoColumn = cell.column.id === 'memo'
                          const isSelectColumn = cell.column.id === 'select'
                          return (
                            <td
                              key={cell.id}
                              style={{
                                width: `${width}px`,
                                minWidth: `${width}px`,
                                maxWidth: `${width}px`
                              }}
                              className={`px-3 py-2 text-sm ${
                                isMemoColumn
                                  ? 'overflow-visible'
                                  : isSelectColumn
                                  ? ''
                                  : 'overflow-hidden text-ellipsis whitespace-nowrap'
                              }`}
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
                            onToggleCheckboxVisibility={() => setColumnVisibility({ ...columnVisibility, select: !columnVisibility.select })}
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
        </>
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
