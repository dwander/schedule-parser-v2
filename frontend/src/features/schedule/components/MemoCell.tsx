import { useState, useRef, useEffect } from 'react'
import { MemoEditDialog } from './MemoEditDialog'
import { ChevronDown, ChevronUp } from 'lucide-react'

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

  // 카드 모드 (확장/축소 기능)
  return (
    <>
      <div className="space-y-1">
        <div
          ref={textRef}
          onClick={() => setDialogOpen(true)}
          className={`cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors text-muted-foreground text-sm ${
            isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
          }`}
          style={!isExpanded ? { maxHeight: 'calc(2 * 1.5em - 2px)' } : undefined}
        >
          {value || '클릭하여 입력'}
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
