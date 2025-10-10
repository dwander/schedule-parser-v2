import { useState, useRef, useEffect, useMemo } from 'react'
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
  const textRef = useRef<HTMLDivElement>(null)

  // 텍스트가 잘렸는지 확인
  useEffect(() => {
    if (!cardMode || !textRef.current) return

    const element = textRef.current
    const isOverflowing = element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth
    setIsTruncated(isOverflowing)
  }, [value, cardMode, isExpanded])

  if (!cardMode) {
    // 테이블 모드 (기존 동작)
    return (
      <>
        <div
          onClick={() => setDialogOpen(true)}
          className="w-full cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors truncate text-muted-foreground"
        >
          {value || '클릭하여 입력'}
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

  // memo 파싱
  const parsedMemo = useMemo(() => parseMemo(value), [value])
  const isStructured = useMemo(() => hasStructuredMemo(value), [value])

  // 카드 모드 (확장/축소 기능)
  return (
    <>
      <div className="relative space-y-1">
        {/* 우측 상단 편집 버튼 (내용이 있을 때만 표시) */}
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDialogOpen(true)
            }}
            className="absolute top-1 right-1 p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors z-10"
            title="메모 편집"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* 메모 내용 (클릭 시 펼침/접기 토글) */}
        <div
          onClick={() => {
            if (!value) {
              // 빈 메모는 클릭 시 에디터 열기
              setDialogOpen(true)
            } else if (isTruncated || isExpanded) {
              // 긴 메모는 펼침/접기 토글 (펼쳐진 상태에서도 토글 가능)
              setIsExpanded(!isExpanded)
            }
          }}
          className={`px-2 py-1 rounded transition-colors ${
            value ? 'pr-8' : ''
          } ${
            !value || isTruncated || isExpanded ? 'cursor-pointer hover:bg-accent/50' : ''
          }`}
        >
          {!value && (
            <span className="text-muted-foreground text-sm">클릭하여 입력</span>
          )}

          {value && !isStructured && (
            <div
              ref={textRef}
              className={`text-muted-foreground text-sm ${
                isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
              }`}
            >
              {value}
            </div>
          )}

          {value && isStructured && (
            <div
              ref={textRef}
              className={`space-y-2 text-sm ${isExpanded ? '' : 'line-clamp-2'}`}
            >
              {parsedMemo.map((item, index) => {
                // 내용 길이 판단: 25자 이상 또는 줄바꿈 포함 시 블록 형태
                const isLongContent = item.content.length > 25 || item.content.includes('\n')

                return (
                  <div key={index}>
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

        {/* 접힌 상태일 때 하단 v 아이콘 (위아래 애니메이션) */}
        {isTruncated && !isExpanded && (
          <div className="w-full flex items-center justify-center py-1">
            <ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" />
          </div>
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
