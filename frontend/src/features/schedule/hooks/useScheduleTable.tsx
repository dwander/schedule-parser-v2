import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import type { Schedule } from '../types/schedule'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUpdateSchedule, useSchedules } from './useSchedules'
import { useState as useConfirmState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { toast } from 'sonner'
import { EditableCell } from '../components/EditableCell'
import { MemoCell } from '../components/MemoCell'
import { DatePickerCell } from '../components/DatePickerCell'
import { TimePickerCell } from '../components/TimePickerCell'
import { TagSelectCell } from '../components/TagSelectCell'
import { useTagOptions } from './useTagOptions'
import { useCreateTag, useDeleteTag, useTags } from './useTags'

export function useScheduleTable(data: Schedule[] = []) {
  const updateSchedule = useUpdateSchedule()
  const createTag = useCreateTag()
  const deleteTagMutation = useDeleteTag()
  const { data: allSchedules = [] } = useSchedules()
  const { data: brandTags = [] } = useTags('brand')
  const { data: albumTags = [] } = useTags('album')
  const { brandOptions, albumOptions } = useTagOptions()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useConfirmState<{ tagId: number; tagValue: string; field: 'brand' | 'album' } | null>(null)

  // 컬럼 가시성 설정 (zustand store에서 가져오기)
  const columnVisibility = useSettingsStore((state) => state.columnVisibility)
  const updateColumnVisibility = useSettingsStore((state) => state.setColumnVisibility)

  // 컬럼 라벨 설정
  const columnLabels = useSettingsStore((state) => state.columnLabels)
  const setColumnLabel = useSettingsStore((state) => state.setColumnLabel)

  // TanStack Table용 setter (Record<string, boolean> 형식 받음)
  const setColumnVisibility = (updater: any) => {
    const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater
    updateColumnVisibility(newVisibility)
  }

  // 가변폭 컬럼 ID (memo가 숨겨지면 spacer가 대신 사용됨)
  const flexColumnId = columnVisibility.memo ? 'memo' : 'spacer'

  // 태그 삭제 핸들러
  const handleDeleteTag = (tagValue: string, field: 'brand' | 'album') => {
    const tags = field === 'brand' ? brandTags : albumTags
    const tag = tags.find(t => t.tag_value === tagValue)

    if (!tag) {
      toast.error('태그를 찾을 수 없습니다')
      return
    }

    const affectedCount = allSchedules.filter(s => s[field] === tagValue).length
    setDeleteConfirm({ tagId: tag.id, tagValue, field })
  }

  const confirmDeleteTag = async () => {
    if (!deleteConfirm) return

    const { tagId, tagValue } = deleteConfirm

    try {
      await deleteTagMutation.mutateAsync(tagId)
      toast.success(`"${tagValue}" 태그가 삭제되었습니다`)
    } catch (error) {
      toast.error('태그 삭제 중 오류가 발생했습니다')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // 태그 생성 핸들러 (TagSelectCell에서 새 태그 입력 시)
  const handleSaveTag = async (value: string, field: 'brand' | 'album', scheduleId: number) => {
    // 먼저 스케줄 업데이트
    updateSchedule.mutate({
      id: scheduleId,
      [field]: value
    })

    // 백엔드에서 자동으로 태그를 생성하므로 프론트엔드에서는 별도 처리 불필요
    // updateSchedule가 성공하면 queryClient가 자동으로 tags를 refetch함
  }

  const columns = useMemo<ColumnDef<Schedule>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => {
          return (
            <input
              type="checkbox"
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              className="cursor-pointer"
            />
          )
        },
        cell: ({ row }) => {
          return (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              className="cursor-pointer"
            />
          )
        },
        size: 50,
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
      },
      {
        accessorKey: 'date',
        header: () => (
          <EditableCell
            value={columnLabels.date}
            onSave={(value) => setColumnLabel('date', value)}
            doubleClick
          />
        ),
        size: 120,
        cell: (info) => (
          <DatePickerCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                date: value
              })
            }}
          />
        ),
      },
      {
        accessorKey: 'time',
        header: () => (
          <EditableCell
            value={columnLabels.time}
            onSave={(value) => setColumnLabel('time', value)}
            doubleClick
          />
        ),
        size: 90,
        cell: (info) => (
          <TimePickerCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                time: value
              })
            }}
          />
        ),
      },
      {
        accessorKey: 'location',
        header: () => (
          <EditableCell
            value={columnLabels.location}
            onSave={(value) => setColumnLabel('location', value)}
            doubleClick
          />
        ),
        size: 200,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                location: value
              })
            }}
          />
        ),
      },
      {
        accessorKey: 'couple',
        header: () => (
          <EditableCell
            value={columnLabels.couple}
            onSave={(value) => setColumnLabel('couple', value)}
            doubleClick
          />
        ),
        size: 150,
        cell: (info) => (
          <EditableCell
            value={info.row.original.groom}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                groom: value
              })
            }}
          />
        ),
      },
      {
        accessorKey: 'contact',
        header: () => (
          <EditableCell
            value={columnLabels.contact}
            onSave={(value) => setColumnLabel('contact', value)}
            doubleClick
          />
        ),
        size: 130,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              // 이메일 형식 체크
              const isEmail = value.includes('@')

              if (isEmail) {
                // 이메일은 그대로 저장
                updateSchedule.mutate({
                  id: info.row.original.id,
                  contact: value.trim()
                })
              } else {
                // 전화번호 포맷으로 변환
                const numbers = value.replace(/\D/g, '')
                let formatted = numbers
                if (numbers.length === 11) {
                  formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
                } else if (numbers.length === 10) {
                  // 010 없는 번호도 처리
                  formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
                }
                updateSchedule.mutate({
                  id: info.row.original.id,
                  contact: formatted
                })
              }
            }}
            format={(val) => {
              const str = String(val)
              // 이메일이면 그대로 반환
              if (str.includes('@')) {
                return str
              }
              // 전화번호 포맷 적용
              const numbers = str.replace(/\D/g, '')
              if (numbers.length === 11) {
                return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
              } else if (numbers.length === 10) {
                return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
              }
              return str
            }}
          />
        ),
      },
      {
        accessorKey: 'brand',
        header: () => (
          <EditableCell
            value={columnLabels.brand}
            onSave={(value) => setColumnLabel('brand', value)}
            doubleClick
          />
        ),
        size: 160,
        cell: (info) => (
          <TagSelectCell
            value={info.getValue() as string}
            options={brandOptions}
            onSave={(value) => handleSaveTag(value, 'brand', info.row.original.id)}
            onDelete={(tag) => handleDeleteTag(tag, 'brand')}
          />
        ),
      },
      {
        accessorKey: 'album',
        header: () => (
          <EditableCell
            value={columnLabels.album}
            onSave={(value) => setColumnLabel('album', value)}
            doubleClick
          />
        ),
        size: 110,
        cell: (info) => (
          <TagSelectCell
            value={info.getValue() as string}
            options={albumOptions}
            onSave={(value) => handleSaveTag(value, 'album', info.row.original.id)}
            onDelete={(tag) => handleDeleteTag(tag, 'album')}
          />
        ),
      },
      {
        accessorKey: 'photographer',
        header: () => (
          <EditableCell
            value={columnLabels.photographer}
            onSave={(value) => setColumnLabel('photographer', value)}
            doubleClick
          />
        ),
        size: 100,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                photographer: value
              })
            }}
          />
        ),
      },
      {
        accessorKey: 'cuts',
        header: () => (
          <EditableCell
            value={columnLabels.cuts}
            onSave={(value) => setColumnLabel('cuts', value)}
            doubleClick
          />
        ),
        size: 70,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as number}
            onSave={(value) => {
              const num = parseInt(value.replace(/\D/g, ''))
              if (!isNaN(num)) {
                updateSchedule.mutate({
                  id: info.row.original.id,
                  cuts: num
                })
              }
            }}
            validate={(value) => {
              const num = parseInt(value.replace(/\D/g, ''))
              return !isNaN(num) && num >= 0
            }}
            format={(val) => {
              const num = Number(val)
              return num > 0 ? num.toLocaleString() : ''
            }}
          />
        ),
      },
      {
        accessorKey: 'price',
        header: () => (
          <EditableCell
            value={columnLabels.price}
            doubleClick
            onSave={(value) => setColumnLabel('price', value)}
          />
        ),
        size: 100,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as number}
            onSave={(value) => {
              const num = parseInt(value.replace(/\D/g, ''))
              if (!isNaN(num)) {
                updateSchedule.mutate({
                  id: info.row.original.id,
                  price: num
                })
              }
            }}
            validate={(value) => {
              const num = parseInt(value.replace(/\D/g, ''))
              return !isNaN(num) && num >= 0
            }}
            format={(val) => {
              const num = Number(val)
              return num > 0 ? num.toLocaleString() : ''
            }}
          />
        ),
      },
      {
        accessorKey: 'manager',
        header: () => (
          <EditableCell
            doubleClick
            value={columnLabels.manager}
            onSave={(value) => setColumnLabel('manager', value)}
          />
        ),
        size: 150,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                manager: value
              })
            }}
          />
        ),
      },
      {
        accessorKey: 'memo',
        header: () => (
          <EditableCell
            doubleClick
            value={columnLabels.memo}
            onSave={(value) => setColumnLabel('memo', value)}
          />
        ),
        size: 0, // 가변폭 (동적 계산)
        cell: (info) => (
          <MemoCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                memo: value
              })
            }}
          />
        ),
      },
      {
        id: 'folderName',
        header: () => (
          <EditableCell
            doubleClick
            value={columnLabels.folderName}
            onSave={(value) => setColumnLabel('folderName', value)}
          />
        ),
        size: 60,
        enableSorting: false,
        cell: () => '', // 나중에 구현
      },
      {
        id: 'spacer',
        header: '',
        size: 0, // 숨겨진 컬럼 대비 예비 공간 (나중에 컬럼 ON/OFF 기능 구현 시 사용)
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: () => null,
      },
    ],
    [columnLabels, brandOptions, albumOptions, updateSchedule]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: true,
    enableHiding: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const affectedCount = deleteConfirm
    ? allSchedules.filter(s => s[deleteConfirm.field] === deleteConfirm.tagValue).length
    : 0

  return {
    table,
    globalFilter,
    setGlobalFilter,
    rowSelection,
    flexColumnId, // 가변폭 컬럼 ID 반환
    columnVisibility,
    setColumnVisibility,
    columnLabels, // 컬럼 라벨 (동적으로 변경 가능)
    handleDeleteTag, // 태그 삭제 핸들러 export
    deleteConfirmDialog: deleteConfirm && (
      <ConfirmDialog
        open={true}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        onConfirm={confirmDeleteTag}
        title="태그 삭제"
        description={`"${deleteConfirm.tagValue}" 태그를 삭제하시겠습니까?\n\n이 태그를 사용하는 ${affectedCount}개의 항목이 빈 값으로 변경됩니다.`}
        variant="destructive"
      />
    )
  }
}
