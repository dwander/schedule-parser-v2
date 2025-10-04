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
import { useUpdateSchedule } from './useSchedules'
import { EditableCell } from '../components/EditableCell'
import { MemoCell } from '../components/MemoCell'

export function useScheduleTable(data: Schedule[] = []) {
  const updateSchedule = useUpdateSchedule()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

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
        size: 100,
        // TODO: 날짜 피커로 변경
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
        size: 80,
        // TODO: 시간 피커로 변경
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
        size: 120,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                contact: value
              })
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
        size: 80,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                brand: value
              })
            }}
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
        size: 80,
        cell: (info) => (
          <EditableCell
            value={info.getValue() as string}
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                album: value
              })
            }}
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
            type="number"
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                cuts: parseInt(value)
              })
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
            type="number"
            onSave={(value) => {
              updateSchedule.mutate({
                id: info.row.original.id,
                price: parseInt(value)
              })
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
    [columnLabels]
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

  return {
    table,
    globalFilter,
    setGlobalFilter,
    rowSelection,
    flexColumnId, // 가변폭 컬럼 ID 반환
    columnVisibility,
    setColumnVisibility,
  }
}
