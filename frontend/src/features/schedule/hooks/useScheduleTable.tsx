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

export function useScheduleTable(data: Schedule[] = []) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

  // 컬럼 가시성 설정 (나중에 settings store로 이동 예정)
  const [columnVisibility, setColumnVisibility] = useState({
    select: true,
    date: true,
    location: true,
    time: true,
    couple: true,
    contact: true,
    brand: true,
    album: true,
    photographer: true,
    cuts: true,
    price: true,
    manager: true,
    memo: true,
    folderName: true,
  })

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
      },
      {
        accessorKey: 'date',
        header: '날짜',
        size: 100,
      },
      {
        accessorKey: 'location',
        header: '장소',
        size: 200,
      },
      {
        accessorKey: 'time',
        header: '시간',
        size: 80,
      },
      {
        accessorKey: 'couple',
        header: '신랑신부',
        size: 150,
        cell: (info) => info.row.original.groom,
      },
      {
        accessorKey: 'contact',
        header: '연락처',
        size: 120,
      },
      {
        accessorKey: 'brand',
        header: '브랜드',
        size: 80,
      },
      {
        accessorKey: 'album',
        header: '앨범',
        size: 80,
      },
      {
        accessorKey: 'photographer',
        header: '작가',
        size: 100,
      },
      {
        accessorKey: 'cuts',
        header: '컷수',
        size: 70,
        cell: (info) => `${info.getValue()}컷`,
      },
      {
        accessorKey: 'price',
        header: '촬영비',
        size: 100,
        cell: (info) => `₩${(info.getValue() as number).toLocaleString()}`,
      },
      {
        accessorKey: 'manager',
        header: '담당자',
        size: 150,
      },
      {
        accessorKey: 'memo',
        header: '전달사항',
        size: 0, // 가변폭 (동적 계산)
      },
      {
        id: 'folderName',
        header: '폴더',
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
        cell: () => null,
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
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
