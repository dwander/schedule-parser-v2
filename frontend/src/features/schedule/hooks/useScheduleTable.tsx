import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { useState, useMemo, useCallback } from 'react'
import type { Schedule } from '../types/schedule'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUpdateSchedule, useSchedules } from './useSchedules'
import { useUpdateUiSettings } from '@/features/auth/hooks/useUsers'
import { useAuthStore } from '@/stores/useAuthStore'
import { useState as useConfirmState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { toast } from 'sonner'
import { EditableCell } from '../components/EditableCell'
import { MemoCell } from '../components/MemoCell'
import { DatePickerCell } from '../components/DatePickerCell'
import { TimePickerCell } from '../components/TimePickerCell'
import { TagSelectCell } from '../components/TagSelectCell'
import { useTagOptions } from './useTagOptions'
import { useDeleteTag, useTags } from './useTags'
import { useScheduleConflictDetector } from './useScheduleConflictDetector'
import { FolderCheck, Clipboard } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { formatContact, parseNumber, isValidNumber, formatNumber } from '@/lib/utils/formatters'
import { generateFolderName } from '@/lib/utils/folderNameGenerator'

export function useScheduleTable(
  data: Schedule[] = []
) {
  const updateSchedule = useUpdateSchedule()
  const deleteTagMutation = useDeleteTag()
  const { data: allSchedules = [] } = useSchedules()
  const { data: brandTags = [] } = useTags('brand')
  const { data: albumTags = [] } = useTags('album')
  const { data: customTags = [] } = useTags('tags')
  const { brandOptions, albumOptions } = useTagOptions()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useConfirmState<{ tagId: number; tagValue: string; field: 'brand' | 'album' | 'tags' } | null>(null)
  const updateUiSettings = useUpdateUiSettings()
  const { user } = useAuthStore()

  // 이미 App에서 필터링된 데이터를 받으므로 여기서는 추가 필터링 불필요
  const filteredData = data

  // 중복/충돌 스케줄 탐지 (날짜 + 시간 기준)
  const { duplicateSchedules, conflictSchedules } = useScheduleConflictDetector(filteredData)

  // 뷰 모드에 따른 컬럼 가시성 설정 (zustand store에서 가져오기)
  const viewMode = useSettingsStore((state) => state.viewMode)
  const listColumnVisibility = useSettingsStore((state) => state.listColumnVisibility)
  const cardColumnVisibility = useSettingsStore((state) => state.cardColumnVisibility)
  const updateListColumnVisibility = useSettingsStore((state) => state.setListColumnVisibility)
  const updateCardColumnVisibility = useSettingsStore((state) => state.setCardColumnVisibility)

  // 현재 뷰 모드에 따른 컬럼 가시성 선택
  const columnVisibility = viewMode === 'list' ? listColumnVisibility : cardColumnVisibility

  // 컬럼 라벨 설정
  const columnLabels = useSettingsStore((state) => state.columnLabels)
  const setColumnLabelStore = useSettingsStore((state) => state.setColumnLabel)

  // 폴더명 포맷 설정
  const folderNameFormat = useSettingsStore((state) => state.folderNameFormat)
  const brandShortcuts = useSettingsStore((state) => state.brandShortcuts)
  const locationShortcuts = useSettingsStore((state) => state.locationShortcuts)

  // 컬럼 라벨 변경 핸들러 (로컬 store + DB 저장)
  const handleSetColumnLabel = useCallback((columnId: keyof typeof columnLabels, label: string) => {
    // 1. 로컬 store 업데이트 (즉시 반영)
    setColumnLabelStore(columnId, label)

    // 2. DB에 저장 (사용자가 로그인한 경우만)
    if (user?.id) {
      updateUiSettings.mutate({
        userId: user.id,
        settings: {
          columnLabels: {
            [columnId]: label
          }
        }
      })
    }
  }, [setColumnLabelStore, user, updateUiSettings])

  // TanStack Table용 setter (Record<string, boolean> 형식 받음)
  const setColumnVisibility = (updater: Record<string, boolean> | ((old: Record<string, boolean>) => Record<string, boolean>)) => {
    const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater
    // 현재 뷰 모드에 따라 적절한 setter 호출
    if (viewMode === 'list') {
      updateListColumnVisibility(newVisibility)
    } else {
      updateCardColumnVisibility(newVisibility)
    }
  }

  // 가변폭 컬럼 ID (memo가 숨겨지면 spacer가 대신 사용됨)
  const flexColumnId = columnVisibility.memo ? 'memo' : 'spacer'

  // 태그 삭제 핸들러
  const handleDeleteTag = useCallback((tagValue: string, field: 'brand' | 'album' | 'tags') => {
    const tags = field === 'brand' ? brandTags : field === 'album' ? albumTags : customTags
    const tag = tags.find(t => t.tag_value === tagValue)

    if (!tag) {
      toast.error('태그를 찾을 수 없습니다')
      return
    }
    setDeleteConfirm({ tagId: tag.id, tagValue, field })
  }, [brandTags, albumTags, customTags, setDeleteConfirm])

  const confirmDeleteTag = async () => {
    if (!deleteConfirm) return

    const { tagId, tagValue } = deleteConfirm

    try {
      await deleteTagMutation.mutateAsync(tagId)
      toast.success(`"${tagValue}" 태그가 삭제되었습니다`)
    } catch {
      toast.error('태그 삭제 중 오류가 발생했습니다')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // 태그 생성 핸들러 (TagSelectCell에서 새 태그 입력 시)
  const handleSaveTag = useCallback(async (value: string, field: 'brand' | 'album', scheduleId: string) => {
    // 먼저 스케줄 업데이트
    updateSchedule.mutate({
      id: scheduleId,
      [field]: value
    })

    // 백엔드에서 자동으로 태그를 생성하므로 프론트엔드에서는 별도 처리 불필요
    // updateSchedule가 성공하면 queryClient가 자동으로 tags를 refetch함
  }, [updateSchedule])

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
        size: 35,
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
      },
      {
        accessorKey: 'date',
        header: () => (
          <EditableCell
            value={columnLabels.date}
            onSave={(value) => handleSetColumnLabel('date', value)}
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
            onSave={(value) => handleSetColumnLabel('time', value)}
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
            onSave={(value) => handleSetColumnLabel('location', value)}
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
            onSave={(value) => handleSetColumnLabel('couple', value)}
            doubleClick
          />
        ),
        size: 150,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                couple: value
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
            onSave={(value) => handleSetColumnLabel('contact', value)}
            doubleClick
          />
        ),
        size: 130,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              const formatted = value.includes('@') ? value.trim() : formatContact(value)
              updateSchedule.mutate({
                id: info.row.original.id,
                contact: formatted
              })
            }}
            format={(val) => formatContact(String(val))}
          />
        ),
      },
      {
        accessorKey: 'brand',
        header: () => (
          <EditableCell
            value={columnLabels.brand}
            onSave={(value) => handleSetColumnLabel('brand', value)}
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
            onSave={(value) => handleSetColumnLabel('album', value)}
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
            onSave={(value) => handleSetColumnLabel('photographer', value)}
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
            onSave={(value) => handleSetColumnLabel('cuts', value)}
            doubleClick
          />
        ),
        size: 70,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as number}
            onSave={(value) => {
              const num = parseNumber(value)
              if (num >= 0) {
                updateSchedule.mutate({
                  id: info.row.original.id,
                  cuts: num
                })
              }
            }}
            validate={isValidNumber}
            format={formatNumber}
          />
        ),
      },
      {
        accessorKey: 'price',
        header: () => (
          <EditableCell
            value={columnLabels.price}
            doubleClick
            onSave={(value) => handleSetColumnLabel('price', value)}
          />
        ),
        size: 100,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as number}
            onSave={(value) => {
              const num = parseNumber(value)
              if (num >= 0) {
                updateSchedule.mutate({
                  id: info.row.original.id,
                  price: num
                })
              }
            }}
            validate={isValidNumber}
            format={formatNumber}
          />
        ),
      },
      {
        accessorKey: 'manager',
        header: () => (
          <EditableCell
            doubleClick
            value={columnLabels.manager}
            onSave={(value) => handleSetColumnLabel('manager', value)}
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
            onSave={(value) => handleSetColumnLabel('memo', value)}
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
          <div className="flex items-center justify-end pr-2">
            <Clipboard className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
        size: 60,
        enableSorting: false,
        cell: (info) => {
          const schedule = info.row.original

          const handleFolderCopy = async () => {
            const folderName = generateFolderName(schedule, folderNameFormat, brandShortcuts, locationShortcuts)

            // 클립보드 복사
            try {
              await navigator.clipboard.writeText(folderName)
              toast.success(`폴더명이 복사되었습니다.\n${folderName}`)
            } catch (error) {
              logger.error('클립보드 복사 실패:', error)
              toast.error('클립보드 복사에 실패했습니다')
            }
          }

          return (
            <div className="flex items-center justify-end pr-2">
              <button
                onClick={handleFolderCopy}
                className="hover:text-foreground transition-colors cursor-pointer"
                title="폴더명 복사"
              >
                <FolderCheck className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          )
        },
      },
      {
        id: 'spacer',
        header: '',
        size: 0, // memo 컬럼이 숨겨질 때 활성화되는 가변폭 컬럼
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: true,
        cell: () => null,
      },
    ],
    [columnLabels, brandOptions, albumOptions, updateSchedule, handleSetColumnLabel, handleSaveTag, handleDeleteTag]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      columnFilters,
      rowSelection,
      columnVisibility,
    },
    enableSorting: false,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: true,
    enableHiding: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const affectedCount = deleteConfirm
    ? deleteConfirm.field === 'tags'
      ? allSchedules.filter(s => s.tags?.includes(deleteConfirm.tagValue)).length
      : allSchedules.filter(s => s[deleteConfirm.field] === deleteConfirm.tagValue).length
    : 0

  return {
    table,
    rowSelection,
    flexColumnId, // 가변폭 컬럼 ID 반환
    columnVisibility,
    setColumnVisibility,
    columnLabels, // 컬럼 라벨 (동적으로 변경 가능)
    duplicateSchedules, // 완전 중복 스케줄 인덱스 Set
    conflictSchedules, // 시간 충돌 스케줄 인덱스 Set
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
