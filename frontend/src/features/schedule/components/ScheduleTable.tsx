import { flexRender } from '@tanstack/react-table'
import { useSchedules, useDeleteSchedules } from '../hooks/useSchedules'
import { useScheduleTable } from '../hooks/useScheduleTable'
import { useScheduleVirtual } from '../hooks/useScheduleVirtual'
import { Button } from '@/components/ui/button'
import { Trash2, Settings } from 'lucide-react'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
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
import { toast } from 'sonner'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function ScheduleTable() {
  const { data, isLoading, error } = useSchedules()
  const { table, globalFilter, setGlobalFilter, flexColumnId, rowSelection, columnLabels, deleteConfirmDialog } = useScheduleTable(data)
  const { virtualizer, tableRef } = useScheduleVirtual(table.getRowModel().rows)
  const deleteSchedules = useDeleteSchedules()
  const containerRef = useRef<HTMLDivElement>(null)
  const [flexWidth, setFlexWidth] = useState(0)
  const [tableWidth, setTableWidth] = useState('100%')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list')
  const { theme, setTheme } = useSettingsStore()

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
        <div className="flex items-center justify-between gap-2 sm:gap-4">
        <input
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="검색..."
          className="px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-input rounded-md bg-background text-foreground flex-1 sm:flex-initial sm:min-w-[200px] focus:ring-1 focus:ring-ring/30 focus:border-ring/50 focus:outline-none"
        />
        <div className="flex items-center gap-1">
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

      {/* Table */}
      <div ref={containerRef} className="border border-border rounded-md overflow-x-auto overflow-y-hidden w-full">
        <div ref={tableRef} style={{ minWidth: tableWidth }}>
          <div
            style={{
              height: `${virtualizer.getTotalSize() + 48}px`,
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
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
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
      </div>
    </>
  )
}
