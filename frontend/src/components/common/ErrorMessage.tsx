import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  title?: string
  message?: string
  error?: Error | unknown
  onRetry?: () => void
  className?: string
}

export function ErrorMessage({
  title = '오류가 발생했습니다',
  message,
  error,
  onRetry,
  className,
}: ErrorMessageProps) {
  const errorMessage = message || (error instanceof Error ? error.message : '알 수 없는 오류')

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-8 rounded-lg border border-destructive/50 bg-destructive/10',
        className
      )}
    >
      <ExclamationTriangleIcon className="h-[3rem] w-[3rem] text-destructive" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-destructive">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}
