import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorFallbackProps {
  error: Error | null
  resetError?: () => void
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            문제가 발생했습니다
          </h1>
          <p className="text-sm text-muted-foreground">
            예상치 못한 오류가 발생했습니다. 페이지를 다시 로드해 주세요.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <p className="text-xs font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {resetError && (
            <Button
              onClick={resetError}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </Button>
          )}
          <Button onClick={handleReload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            페이지 새로고침
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          문제가 계속되면 개발자에게 문의해 주세요.
        </p>
      </div>
    </div>
  )
}
