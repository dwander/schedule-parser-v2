import { useState, useLayoutEffect, useEffect } from 'react'
import type { RefObject } from 'react'
import type { Table } from '@tanstack/react-table'
import type { Schedule } from '../types/schedule'

/**
 * 테이블의 가변폭 컬럼(memo 또는 spacer) 크기를 자동으로 계산하는 훅
 *
 * 이 로직은 고정 컬럼들의 크기를 계산하고, 남은 공간을 가변폭 컬럼에 할당합니다.
 * memo 컬럼이 보이면 spacer를 숨기고, memo가 숨겨지면 spacer를 활성화합니다.
 * 윈도우 리사이즈, 뷰모드 전환, 폰트 크기 변경 시 자동으로 재계산됩니다.
 *
 * @param containerRef - 테이블 컨테이너 DOM 참조
 * @param table - TanStack Table 인스턴스
 * @param flexColumnId - 가변폭을 적용할 컬럼 ID ('memo' 또는 'spacer')
 * @param viewMode - 현재 뷰 모드 ('list' 또는 'card')
 * @param data - 스케줄 데이터 배열
 * @returns flexWidth: 계산된 가변폭, tableWidth: 계산된 전체 테이블 폭
 */
export function useFlexColumnWidth(
  containerRef: RefObject<HTMLDivElement>,
  table: Table<Schedule>,
  flexColumnId: string,
  viewMode: 'list' | 'card',
  data: Schedule[]
) {
  const [flexWidth, setFlexWidth] = useState(0)
  const [tableWidth, setTableWidth] = useState('auto')

  // 가변폭 계산 핵심 로직
  const calculateFlexWidth = () => {
    if (!containerRef.current) return

    // clientWidth는 border를 제외한 내부 너비 (offsetWidth - border)
    const containerWidth = containerRef.current.clientWidth

    // memo와 spacer 컬럼 가시성 제어
    const memoColumn = table.getAllColumns().find((col) => col.id === 'memo')
    const spacerColumn = table.getAllColumns().find((col) => col.id === 'spacer')
    const isMemoVisible = memoColumn?.getIsVisible() ?? false

    // memo가 보이면 spacer 숨기고, memo가 숨겨지면 spacer 보이기
    if (isMemoVisible && spacerColumn && spacerColumn.getIsVisible()) {
      table.setColumnVisibility({ ...table.getState().columnVisibility, spacer: false })
    } else if (!isMemoVisible && spacerColumn && !spacerColumn.getIsVisible()) {
      table.setColumnVisibility({ ...table.getState().columnVisibility, spacer: true })
    }

    // 현재 활성화된 가변폭 컬럼 결정
    const activeFlexColumnId = isMemoVisible ? 'memo' : 'spacer'

    // 보이는 고정 컬럼만 필터링하여 계산
    const fixedColumnsWidth = table
      .getAllColumns()
      .filter((col) => col.getIsVisible() && col.id !== 'memo' && col.id !== 'spacer')
      .reduce((sum, col) => sum + col.getSize(), 0)

    // 가변폭 계산 (최소 150px 보장)
    const availableWidth = Math.max(150, containerWidth - fixedColumnsWidth)
    setFlexWidth(availableWidth)

    // 실제 필요한 테이블 폭 계산
    const calculatedTableWidth = fixedColumnsWidth + availableWidth
    setTableWidth(`${calculatedTableWidth}px`)

    // 활성화된 가변폭 컬럼 크기 업데이트
    const activeFlexColumn = table.getAllColumns().find((col) => col.id === activeFlexColumnId)
    if (activeFlexColumn) {
      activeFlexColumn.columnDef.size = availableWidth
    }
  }

  // 초기 계산 및 리사이즈 이벤트 등록
  useLayoutEffect(() => {
    if (!containerRef.current) return

    // 초기 측정 (RAF로 레이아웃 완료 대기)
    const rafId = requestAnimationFrame(() => {
      calculateFlexWidth()
    })

    // ResizeObserver로 컨테이너 크기 변경 감지
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateFlexWidth)
    })

    resizeObserver.observe(containerRef.current)

    // 윈도우 리사이즈도 함께 처리
    const handleResize = () => {
      requestAnimationFrame(calculateFlexWidth)
    }
    window.addEventListener('resize', handleResize)

    // 폰트 로딩 완료 대기
    document.fonts.ready.then(() => {
      calculateFlexWidth()
    })

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [table, data, flexColumnId, table.getState().columnVisibility])

  // 뷰모드 전환 시 강제 재계산
  useEffect(() => {
    if (viewMode === 'list') {
      // RAF로 DOM 업데이트 대기 후 재계산
      const rafId = requestAnimationFrame(() => {
        calculateFlexWidth()
      })
      return () => cancelAnimationFrame(rafId)
    }
  }, [viewMode])

  return { flexWidth, tableWidth }
}
