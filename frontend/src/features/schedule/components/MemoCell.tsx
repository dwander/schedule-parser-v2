import { useState, useRef, useEffect, useMemo } from 'react'
import { MemoEditDialog } from './MemoEditDialog'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
      <div className="space-y-1">
        <div
          ref={textRef}
          onClick={() => setDialogOpen(true)}
          className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors"
        >
          {!value && (
            <span className="text-muted-foreground text-sm">클릭하여 입력</span>
          )}

          {value && !isStructured && (
            <div
              className={`text-muted-foreground text-sm ${
                isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
              }`}
            >
              {value}
            </div>
          )}

          {value && isStructured && (
            <div className={`space-y-2 text-sm ${isExpanded ? '' : 'line-clamp-6'}`}>
              {parsedMemo.map((item, index) => (
                <div key={index}>
                  {item.type === 'key-value' && item.title && (
                    <dl className="flex gap-2">
                      <dt className="font-medium text-foreground flex-shrink-0">
                        {item.title}:
                      </dt>
                      <dd className="text-muted-foreground whitespace-pre-wrap">
                        {item.content}
                      </dd>
                    </dl>
                  )}
                  {item.type === 'key-value' && !item.title && (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {item.content}
                    </p>
                  )}
                  {item.type === 'section' && (
                    <div className="border-l-2 border-primary/30 pl-2">
                      <h4 className="font-semibold text-foreground mb-1">
                        {item.title}
                      </h4>
                      <div className="text-muted-foreground whitespace-pre-wrap text-xs">
                        {item.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isTruncated && !isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(true)
            }}
            className="w-full flex items-center justify-center py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
        {isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(false)
            }}
            className="w-full flex items-center justify-center py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
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
