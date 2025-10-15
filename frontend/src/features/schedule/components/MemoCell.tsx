import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { MemoEditDialog } from './MemoEditDialog'
import { Edit2, ChevronDown } from 'lucide-react'
import { parseMemo, hasStructuredMemo } from '@/lib/utils/memoParser'

interface MemoCellProps {
  value: string
  onSave: (value: string) => void
  cardMode?: boolean // 카드 모드 여부
}

export function MemoCell({ value, onSave, cardMode = false }: MemoCellProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [hadMarker, setHadMarker] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // memo 파싱 (useEffect보다 먼저 선언)
  const parsedMemo = useMemo(() => parseMemo(value), [value])
  const isStructured = useMemo(() => hasStructuredMemo(value), [value])

  // 텍스트가 잘렸는지 확인 (value 변경 시에만 체크)
  useEffect(() => {
    // 구조화된 메모: 아이템 개수로 판단
    if (isStructured) {
      // 카드 모드: 3개 초과, 테이블 모드: 2개 초과
      const threshold = cardMode ? 3 : 2
      setIsTruncated(parsedMemo.length > threshold)
      return
    }

    // 일반 텍스트: 간단히 줄바꿈 개수나 길이로 판단
    const lines = value.split('\n').length
    const avgCharsPerLine = 30 // 평균 한 줄 글자 수
    const estimatedLines = Math.ceil(value.length / avgCharsPerLine)
    setIsTruncated(lines > 2 || estimatedLines > 2)
  }, [value, cardMode, isStructured, parsedMemo.length])

  // value 변경 시 editValue 동기화
  useEffect(() => {
    setEditValue(value)
  }, [value])

  // 편집 모드 진입 시 LLM 마커 제거 및 포커스
  useEffect(() => {
    if (isEditing) {
      // LLM 마커 감지 및 제거
      const hasLLMMarker = value.trim().startsWith('<!-- LLM_PARSED -->')
      setHadMarker(hasLLMMarker)

      if (hasLLMMarker) {
        // 마커 제거하고 편집
        const withoutMarker = value.replace(/^\s*<!--\s*LLM_PARSED\s*-->\s*\n?/, '')
        setEditValue(withoutMarker)
      }

      // textarea 포커스
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
      }
    }
  }, [isEditing, value])

  // textarea 높이 자동 조절
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isEditing, editValue])

  // 팝오버 위치 재조정 (렌더링 후 실제 크기로)
  useEffect(() => {
    if (!isExpanded || !popoverPosition || !popoverRef.current) return

    const popover = popoverRef.current
    const popoverWidth = popover.offsetWidth
    const VIEWPORT_PADDING = 8

    // 현재 위치에서 오른쪽 끝 계산
    const rightEdge = popoverPosition.left + popoverWidth
    const viewportWidth = window.innerWidth

    // 오른쪽으로 벗어나는 경우에만 위치 재조정
    if (rightEdge > viewportWidth - VIEWPORT_PADDING) {
      const newLeft = Math.max(
        VIEWPORT_PADDING,
        viewportWidth - popoverWidth - VIEWPORT_PADDING
      )

      if (newLeft !== popoverPosition.left) {
        setPopoverPosition({ ...popoverPosition, left: newLeft })
      }
    }
  }, [isExpanded, popoverPosition])

  // 편집 모드 저장 핸들러
  const handleSaveEdit = () => {
    // 원래 마커가 있었으면 다시 추가
    const finalValue = hadMarker
      ? `<!-- LLM_PARSED -->\n${editValue}`
      : editValue

    if (finalValue !== value) {
      onSave(finalValue)
    }
    setIsEditing(false)
    setIsExpanded(false)
    setPopoverPosition(null)
    setHadMarker(false)
  }

  if (!cardMode) {
    // 테이블 모드 (오버레이 방식 펼침)
    return (
      <>
        <div className="relative w-full">
          {/* 기본 상태 (truncate) - 펼쳐진 상태일 때는 숨김 */}
          {!isExpanded && (
            <div className="relative">
              <div
                ref={textRef}
                onClick={(e) => {
                  if (!value) {
                    setDialogOpen(true)
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect()

                    // 기본 위치 (뷰포트 기준, 패딩 4px 보정)
                    // 실제 크기는 렌더링 후 useEffect에서 체크하여 재조정
                    const left = rect.left - 4
                    const top = rect.top - 4

                    setPopoverPosition({ top, left })
                    setIsExpanded(true)
                    // 펼침이 필요없는 짧은 텍스트는 바로 편집 모드로
                    if (!isTruncated) {
                      setIsEditing(true)
                    }
                  }
                }}
                className={`w-full cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors truncate text-muted-foreground text-sm ${
                  isTruncated ? 'pr-6' : ''
                }`}
              >
                {value || '클릭하여 입력'}
              </div>

              {/* 펼침 가능 표시 v 아이콘 */}
              {isTruncated && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" />
                </div>
              )}
            </div>
          )}

          {/* 펼쳐진 상태: 오버레이 팝오버 (Portal) */}
          {isExpanded && popoverPosition && createPortal(
            <>
              {/* 배경 오버레이 (클릭 시 편집중이면 저장, 아니면 닫기) */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  if (isEditing) {
                    handleSaveEdit()
                  } else {
                    setIsExpanded(false)
                    setPopoverPosition(null)
                  }
                }}
              />

              {/* 메모 팝오버 */}
              <div
                ref={popoverRef}
                className="fixed z-50 rounded-lg shadow-2xl min-w-[300px] max-w-[500px] bg-background"
                style={{
                  top: `${popoverPosition.top}px`,
                  left: `${popoverPosition.left}px`
                }}
              >
                {!isEditing ? (
                  /* 읽기 모드 */
                  <div
                    onClick={() => setIsEditing(true)}
                    className="relative px-3 py-2 max-h-[400px] overflow-y-auto text-sm bg-card border border-border rounded-lg shadow-sm cursor-text hover:bg-accent/30 transition-colors"
                  >
                    {!isStructured && (
                      <div className="text-foreground whitespace-pre-wrap">
                        {value}
                      </div>
                    )}

                    {isStructured && (
                      <div className="space-y-2">
                        {parsedMemo.map((item, index) => {
                          const isLongContent = item.content.length > 25 || item.content.includes('\n')

                          return (
                            <div key={index}>
                              {item.title && !isLongContent && (
                                <dl className="flex gap-2">
                                  <dt className="font-medium text-foreground flex-shrink-0">
                                    {item.title}:
                                  </dt>
                                  <dd className="text-muted-foreground whitespace-pre-wrap">
                                    {item.content}
                                  </dd>
                                </dl>
                              )}

                              {item.title && isLongContent && (
                                <div className="border-l-2 border-primary/30 pl-2">
                                  <h5 className="font-medium text-foreground mb-1">
                                    {item.title}
                                  </h5>
                                  <div className="text-muted-foreground whitespace-pre-wrap text-xs">
                                    {item.content}
                                  </div>
                                </div>
                              )}

                              {!item.title && (
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                  {item.content}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 편집 모드 */
                  <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' || (e.key === 'Enter' && e.ctrlKey)) {
                        handleSaveEdit()
                      }
                    }}
                    className="w-full p-3 bg-card border border-border rounded-lg text-sm text-foreground resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    placeholder="메모 입력..."
                  />
                )}
              </div>
            </>,
            document.body
          )}
        </div>
        <MemoEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          value={value}
          onSave={onSave}
        />
      </>
    )
  }

  // 카드 모드 (확장/축소 기능)
  return (
    <>
      <div className="relative space-y-1">
        {/* 우측 상단 편집 버튼 (편집중이 아닐 때만 표시) */}
        {value && !isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="absolute top-1 right-1 p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors z-10"
            title="메모 편집"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}

        {!isEditing ? (
          /* 읽기 모드 */
          <div
            onClick={() => {
              if (!value) {
                // 빈 메모는 클릭 시 편집 모드로
                setIsEditing(true)
              } else if (isTruncated || isExpanded) {
                // 긴 메모는 펼침/접기 토글
                setIsExpanded(!isExpanded)
              }
            }}
            className={`px-2 py-1 rounded transition-colors ${
              value ? 'pr-8' : ''
            } ${
              !value || isTruncated || isExpanded ? 'cursor-pointer' : ''
            }`}
          >
          {!value && (
            <span className="text-muted-foreground text-sm">클릭하여 입력</span>
          )}

            {value && !isStructured && (
              <div
                ref={textRef}
                className={`text-muted-foreground text-sm overflow-hidden transition-all duration-500 ease-in-out ${
                  isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                }`}
                style={{
                  maxHeight: isExpanded ? '1000px' : '3rem'
                }}
              >
                {value}
              </div>
            )}

            {value && isStructured && (
              <div
                ref={textRef}
                className="space-y-2 text-sm"
              >
                {parsedMemo.map((item, index) => {
                  // 접힌 상태에서는 첫 3개 아이템만 표시 (CSS로 처리)
                  const shouldHide = !isExpanded && index >= 3

                  // 내용 길이 판단: 25자 이상 또는 줄바꿈 포함 시 블록 형태
                  const isLongContent = item.content.length > 25 || item.content.includes('\n')

                  return (
                    <div
                      key={index}
                      className="overflow-hidden transition-all duration-500 ease-in-out"
                      style={{
                        maxHeight: shouldHide ? '0' : '500px',
                        opacity: shouldHide ? 0 : 1,
                        marginTop: shouldHide ? '0' : undefined,
                        marginBottom: shouldHide ? '0' : undefined
                      }}
                    >
                      {/* 제목 있음 + 짧은 내용 → 한 줄 */}
                      {item.title && !isLongContent && (
                        <dl className="flex gap-2">
                          <dt className="font-medium text-foreground flex-shrink-0">
                            {item.title}:
                          </dt>
                          <dd className="text-muted-foreground whitespace-pre-wrap">
                            {item.content}
                          </dd>
                        </dl>
                      )}

                      {/* 제목 있음 + 긴 내용 → 블록 형태 (왼쪽 보더) */}
                      {item.title && isLongContent && (
                        <div className="border-l-2 border-muted-foreground/30 pl-2">
                          <h5 className="font-medium text-foreground mb-1">
                            {item.title}
                          </h5>
                          <div className="text-muted-foreground whitespace-pre-wrap text-xs">
                            {item.content}
                          </div>
                        </div>
                      )}

                      {/* 제목 없음 (일반 텍스트) */}
                      {!item.title && (
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {item.content}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* 편집 모드 */
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || (e.key === 'Enter' && e.ctrlKey)) {
                handleSaveEdit()
              }
            }}
            onBlur={handleSaveEdit}
            className="w-full p-3 bg-card border border-border rounded-lg text-sm text-foreground resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="메모 입력..."
          />
        )}

        {/* 접힌 상태일 때 하단 v 아이콘 (편집중이 아닐 때만) */}
        <div
          className="w-full flex items-center justify-center overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            maxHeight: !isEditing && isTruncated && !isExpanded ? '1rem' : '0',
            opacity: !isEditing && isTruncated && !isExpanded ? 1 : 0
          }}
        >
          <ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" />
        </div>
      </div>
    </>
  )
}
