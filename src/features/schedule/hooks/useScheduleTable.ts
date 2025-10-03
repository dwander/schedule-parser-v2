import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { Schedule } from '../types/schedule'

export function useScheduleTable(data: Schedule[] = []) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<Schedule>[]>(
    () => [
      {
        accessorKey: 'date',
        header: '날짜',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'time',
        header: '시간',
      },
      {
        accessorKey: 'groom',
        header: '신랑',
      },
      {
        accessorKey: 'bride',
        header: '신부',
      },
      {
        accessorKey: 'location',
        header: '장소',
      },
      {
        accessorKey: 'brand',
        header: '브랜드',
      },
      {
        accessorKey: 'cuts',
        header: '컷수',
        cell: (info) => `${info.getValue()} 컷`,
      },
      {
        accessorKey: 'price',
        header: '촬영비',
        cell: (info) => `₩${(info.getValue() as number).toLocaleString()}`,
      },
      {
        accessorKey: 'fee',
        header: 'Fee',
        cell: (info) => `₩${(info.getValue() as number).toLocaleString()}`,
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
