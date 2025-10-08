/**
 * UI 레이아웃 및 크기 관련 상수
 */

/**
 * 스케줄 카드뷰 및 가상화 관련 크기
 */
export const UI_SIZES = {
  // Card View
  CARD_WIDTH: 320,              // 카드 너비 (px)
  CARD_GAP: 16,                 // 카드 간격 (px)
  CARD_ESTIMATED_HEIGHT: 400,   // 카드 예상 높이 (가상화용)

  // Virtualization
  ROW_ESTIMATED_HEIGHT: 50,     // 리스트뷰 행 예상 높이 (px)
  GRID_OVERSCAN: 3,             // 그리드 오버스캔 아이템 수
  LIST_OVERSCAN: 5,             // 리스트 오버스캔 아이템 수
} as const
