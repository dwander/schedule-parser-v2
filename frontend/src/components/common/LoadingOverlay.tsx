import { Spinner } from './Spinner'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message = '로딩중...', className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-8',
        className
      )}
    >
      <Spinner size="lg" className="text-primary" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
