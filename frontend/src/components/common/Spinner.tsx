import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-[1rem] w-[1rem] border-[0.125rem]',
  md: 'h-[1.5rem] w-[1.5rem] border-[0.1875rem]',
  lg: 'h-[2rem] w-[2rem] border-[0.25rem]',
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]',
        sizeClasses[size],
        className
      )}
      role="status"
    >
      <span className="sr-only">로딩중...</span>
    </div>
  )
}
