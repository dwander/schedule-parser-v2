import { useState, useLayoutEffect, useEffect } from 'react'
import type { RefObject } from 'react'
import type { Table } from '@tanstack/react-table'
import type { Schedule } from '../types/schedule'

/**
 * 테이블의 가변폭 컬럼(memo 또는 spacer) 크기를 자동으로 계산하는 훅
 *
 * 이 로직은 고정 컬럼들의 크기를 계산하고, 남은 공간을 가변폭 컬럼에 할당합니다.
 * 윈도우 리사이즈와 뷰모드 전환 시 자동으로 재계산됩니다.
 *
 * @param containerRef - 테이블 컨테이너 DOM 참조
 * @param table - TanStack Table 인스턴스
 * @param flexColumnId - 가변폭을 적용할 컬럼 ID ('memo' 또는 'spacer')
 * @param viewMode - 현재 뷰 모드 ('list' 또는 'grid')
 * @param data - 스케줄 데이터 배열
 * @returns flexWidth: 계산된 가변폭, tableWidth: 계산된 전체 테이블 폭
 */
export function useFlexColumnWidth(
  containerRef: RefObject<HTMLDivElement>,
  table: Table<Schedule>,
  flexColumnId: string,
  viewMode: 'list' | 'grid',
  data: Schedule[]
) {
  const [flexWidth, setFlexWidth] = useState(0)
  const [tableWidth, setTableWidth] = useState('auto')

  // 가변폭 계산 핵심 로직
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
  useLayoutEffect(() => {
    calculateFlexWidth()
    window.addEventListener('resize', calculateFlexWidth)
    return () => window.removeEventListener('resize', calculateFlexWidth)
  }, [table, data, flexColumnId, table.getState().columnVisibility])

  // 뷰모드 전환 시 강제 재계산
  useEffect(() => {
    if (viewMode === 'list') {
      // DOM 업데이트 대기 후 재계산
      const timeoutId = setTimeout(() => {
        calculateFlexWidth()
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [viewMode])

  return { flexWidth, tableWidth }
}
