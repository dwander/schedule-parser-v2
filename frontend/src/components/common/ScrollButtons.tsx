import { ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollPosition } from '@/hooks/useScrollPosition'
import { cn } from '@/lib/utils'

export function ScrollButtons() {
  const { canScrollUp, canScrollDown } = useScrollPosition(300)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  }

  // 둘 다 표시 안 되면 렌더링 안 함
  if (!canScrollUp && !canScrollDown) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {/* 맨 위로 버튼 */}
      {canScrollUp && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToTop}
          className={cn(
            'h-12 w-12 rounded-full shadow-lg',
            'bg-background/95 backdrop-blur-sm',
            'hover:bg-accent hover:scale-110',
            'transition-all duration-200',
            'border-2'
          )}
          aria-label="맨 위로 스크롤"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* 맨 아래로 버튼 */}
      {canScrollDown && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToBottom}
          className={cn(
            'h-12 w-12 rounded-full shadow-lg',
            'bg-background/95 backdrop-blur-sm',
            'hover:bg-accent hover:scale-110',
            'transition-all duration-200',
            'border-2'
          )}
          aria-label="맨 아래로 스크롤"
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
