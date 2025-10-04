import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from './ErrorBoundary'
import { ReactNode } from 'react'

interface QueryErrorBoundaryProps {
  children: ReactNode
}

export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <p className="text-destructive">Query 오류가 발생했습니다</p>
                <button onClick={reset} className="mt-4 underline">
                  다시 시도
                </button>
              </div>
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
