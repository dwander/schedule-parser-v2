import { useState, useEffect, useRef, memo } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEBOUNCE } from '@/lib/constants/timing'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onExpandedChange?: (expanded: boolean) => void
}

export const SearchInput = memo(function SearchInput({ value, onChange, onExpandedChange }: SearchInputProps) {
  const [expanded, setExpanded] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // 확장 시 포커스
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus()
    }
    // 확장 상태 변경 알림
    onExpandedChange?.(expanded)
  }, [expanded, onExpandedChange])

  // 디바운싱된 변경 전파
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, DEBOUNCE.SEARCH)

    return () => clearTimeout(timeoutId)
  }, [localValue, onChange, value])

  // 외부 value 변경 시 동기화 (초기값만)
  useEffect(() => {
    if (!expanded && value !== localValue) {
      setLocalValue(value)
    }
  }, [value])

  return (
    <div
      className={`flex items-center border border-input rounded-md bg-background overflow-hidden transition-all duration-300 ease-in-out ${
        expanded ? 'w-full sm:w-64' : 'w-10'
      }`}
    >
      <input
        ref={inputRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue === '') {
            setExpanded(false)
          }
        }}
        placeholder="검색..."
        className={`pl-2 pr-0 py-1.5 text-sm bg-transparent text-foreground focus:outline-none transition-all duration-300 ${
          expanded ? 'w-full opacity-100' : 'w-0 opacity-0'
        }`}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="flex-shrink-0 hover:bg-transparent h-8 w-8 p-0 pr-2"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  )
})