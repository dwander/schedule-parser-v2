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
        size: 150,
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
        size: 0, // 동적으로 계산됨
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
  }
}
