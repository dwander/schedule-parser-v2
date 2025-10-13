import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table'
import type {
  ColumnDef,
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
import { useDeleteTag, useTags } from './useTags'
import { FolderCheck, Clipboard } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

export function useScheduleTable(
  data: Schedule[] = []
) {
  const updateSchedule = useUpdateSchedule()
  const deleteTagMutation = useDeleteTag()
  const { data: allSchedules = [] } = useSchedules()
  const { data: brandTags = [] } = useTags('brand')
  const { data: albumTags = [] } = useTags('album')
  const { brandOptions, albumOptions } = useTagOptions()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useConfirmState<{ tagId: number; tagValue: string; field: 'brand' | 'album' } | null>(null)

  // 이미 App에서 필터링된 데이터를 받으므로 여기서는 추가 필터링 불필요
  const filteredData = data

  // 중복/충돌 스케줄 탐지 (날짜 + 시간 기준)
  const { duplicateSchedules, conflictSchedules } = useMemo(() => {
    const duplicates = new Set<number>()
    const conflicts = new Set<number>()
    const dateTimeMap = new Map<string, number[]>()

    // 시간 문자열을 분 단위로 변환 (HH:MM -> 분)
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    // 날짜+시간 기준으로 그룹화
    filteredData.forEach((schedule, index) => {
      if (schedule.date && schedule.time) {
        const key = `${schedule.date}-${schedule.time}`
        if (!dateTimeMap.has(key)) {
          dateTimeMap.set(key, [])
        }
        dateTimeMap.get(key)!.push(index)
      }
    })

    // 2개 이상인 그룹의 모든 인덱스를 완전 중복으로 표시
    dateTimeMap.forEach((indexes) => {
      if (indexes.length > 1) {
        indexes.forEach(idx => duplicates.add(idx))
      }
    })

    // 시간 충돌 체크 (같은 날짜 내에서 1시간 이내)
    const dateGroups = new Map<string, Array<{ index: number; minutes: number; time: string }>>()

    filteredData.forEach((schedule, index) => {
      if (schedule.date && schedule.time) {
        if (!dateGroups.has(schedule.date)) {
          dateGroups.set(schedule.date, [])
        }
        dateGroups.get(schedule.date)!.push({
          index,
          minutes: timeToMinutes(schedule.time),
          time: schedule.time
        })
      }
    })

    // 각 날짜별로 시간 충돌 검사
    dateGroups.forEach((schedules) => {
      for (let i = 0; i < schedules.length; i++) {
        for (let j = i + 1; j < schedules.length; j++) {
          const timeDiff = Math.abs(schedules[i].minutes - schedules[j].minutes)
          // 1시간(60분) 이내이고, 완전 중복이 아닌 경우 시간 충돌
          if (timeDiff > 0 && timeDiff < 60) {
            conflicts.add(schedules[i].index)
            conflicts.add(schedules[j].index)
          }
        }
      }
    })

    return { duplicateSchedules: duplicates, conflictSchedules: conflicts }
  }, [filteredData])

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
  const setColumnLabel = useSettingsStore((state) => state.setColumnLabel)

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
  const handleDeleteTag = (tagValue: string, field: 'brand' | 'album') => {
    const tags = field === 'brand' ? brandTags : albumTags
    const tag = tags.find(t => t.tag_value === tagValue)

    if (!tag) {
      toast.error('태그를 찾을 수 없습니다')
      return
    }
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
  const handleSaveTag = async (value: string, field: 'brand' | 'album', scheduleId: string) => {
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
          <div className="flex items-center justify-end pr-2">
            <Clipboard className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
        size: 60,
        enableSorting: false,
        cell: (info) => {
          const schedule = info.row.original

          const handleFolderCopy = async () => {
            // 브랜드 매핑
            const brandMap: Record<string, string> = {
              '세컨플로루': '세컨',
              '더그라피': '더그',
              'A 세븐스프리미엄': '세프',
            }
            const brandPrefix = brandMap[schedule.brand] || ''

            // 시간 형식 변환: "14:00" → "14시", "14:30" → "14시30분"
            const [hours, minutes] = schedule.time.split(':')
            const timeStr = minutes === '00' ? `${hours}시` : `${hours}시${minutes}분`

            // 폴더명 구성
            let folderName = ''
            if (brandPrefix) {
              folderName = `${brandPrefix} ${schedule.date} ${timeStr} ${schedule.location}(${schedule.couple})`
            } else {
              folderName = `${schedule.date} ${timeStr} ${schedule.location}(${schedule.couple})`
            }

            // 작가 정보 추가 (컷수가 있을 때만)
            if (schedule.cuts && schedule.cuts > 0) {
              const totalCuts = schedule.cuts * 2
              if (schedule.photographer) {
                folderName += ` - ${schedule.photographer}(${totalCuts})`
              } else {
                folderName += ` - (${totalCuts})`
              }
            }

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
    [columnLabels, brandOptions, albumOptions, updateSchedule]
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
    ? allSchedules.filter(s => s[deleteConfirm.field] === deleteConfirm.tagValue).length
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
