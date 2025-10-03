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

  const columns = useMemo<ColumnDef<Schedule>[]>(
    () => [
      {
        accessorKey: 'date',
        header: '날짜',
        size: 100,
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'time',
        header: '시간',
        size: 80,
      },
      {
        accessorKey: 'couple',
        header: '신랑 ♥ 신부',
        size: 180,
      },
      {
        accessorKey: 'location',
        header: '장소',
        size: 220,
      },
      {
        accessorKey: 'brand',
        header: '브랜드',
        size: 80,
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
        accessorKey: 'fee',
        header: 'Fee',
        size: 100,
        cell: (info) => `₩${(info.getValue() as number).toLocaleString()}`,
      },
      {
        accessorKey: 'manager',
        header: '담당자',
        size: 100,
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
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return {
    table,
    globalFilter,
    setGlobalFilter,
  }
}
