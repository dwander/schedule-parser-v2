import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'

interface TagSelectCellProps {
  value: string
  onSave: (value: string) => void
  onDelete?: (tag: string) => void
  options: string[]
  placeholder?: string
}

export function TagSelectCell({ value, onSave, onDelete, options, placeholder = '' }: TagSelectCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (option: string) => {
    onSave(option)
    setIsOpen(false)
    setSearch('')
  }

  const handleCustomInput = () => {
    if (search.trim()) {
      onSave(search.trim())
      setIsOpen(false)
      setSearch('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0])
      } else if (search.trim()) {
        handleCustomInput()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    }
  }

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  )

  // 뷰포트 내 포지셔닝 계산
  const getDropdownPosition = (): React.CSSProperties => {
    if (!containerRef.current) return {}

    const rect = containerRef.current.getBoundingClientRect()
    const dropdownWidth = 350 // max-w-[350px]
    const dropdownHeight = 250 // 대략적인 높이 (input + max-h-48 + padding)
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const gap = 2
    const padding = 8

    let top = rect.bottom + gap
    let left: number | undefined = rect.left
    let right: number | undefined

    // 우측 오버플로우 체크
    if (left + dropdownWidth > viewportWidth - padding) {
      // 우측 정렬로 변경
      left = undefined
      right = viewportWidth - rect.right
    }

    // 하단 오버플로우 체크
    if (top + dropdownHeight > viewportHeight - padding) {
      // 위쪽에 배치
      top = rect.top - dropdownHeight - gap

      // 위쪽도 넘치면 화면 안쪽으로 강제 조정
      if (top < padding) {
        top = padding
      }
    }

    return {
      top,
      left,
      right,
    }
  }

  const dropdownContent = isOpen && containerRef.current ? createPortal(
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        // 드롭다운 외부 클릭만 처리
        if (e.target === e.currentTarget) {
          setIsOpen(false)
          setSearch('')
        }
      }}
    >
      <div
        className="absolute bg-popover border border-border rounded-md shadow-lg min-w-[200px] max-w-[350px]"
        style={getDropdownPosition()}
      >
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="검색 또는 입력..."
          className="w-full px-3 py-2 bg-transparent border-b border-border focus:outline-none text-sm"
        />
        <div className="max-h-48 overflow-y-auto p-2">
          {filteredOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredOptions.map((option) => (
                <div
                  key={option}
                  className={`px-3 py-1 rounded-full transition-colors text-sm flex items-center gap-1 ${
                    value === option
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <span
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSelect(option)
                    }}
                    className="cursor-pointer"
                  >
                    {option}
                  </span>
                  {value === option ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    onDelete && (
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDelete(option)
                        }}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                        aria-label={`${option} 삭제`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          ) : search.trim() ? (
            <div
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleCustomInput()
              }}
              className="px-3 py-1 rounded-full cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors text-sm text-muted-foreground inline-block"
            >
              {search} 추가
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              검색 결과 없음
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <div ref={containerRef} className="w-full h-full">
        <div
          onClick={() => setIsOpen(true)}
          className="w-full h-full min-h-[24px] cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors flex items-center"
        >
          <span className={`truncate ${!value ? 'text-muted-foreground/50' : ''}`}>
            {value || placeholder}
          </span>
        </div>
      </div>
      {dropdownContent}
    </>
  )
}
