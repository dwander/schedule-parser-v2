import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, X, Tags } from 'lucide-react'

interface MultiTagSelectCellProps {
  value: string[] // 태그 배열
  onSave: (value: string[]) => void
  onDelete?: (tag: string) => void
  options: string[]
  placeholder?: string
}

export function MultiTagSelectCell({ value = [], onSave, onDelete, options, placeholder = '태그' }: MultiTagSelectCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleToggleTag = (option: string) => {
    const newTags = value.includes(option)
      ? value.filter(tag => tag !== option) // 이미 선택된 태그면 제거
      : [...value, option] // 선택되지 않은 태그면 추가

    onSave(newTags)
  }

  const handleCustomInput = () => {
    if (search.trim() && !value.includes(search.trim())) {
      onSave([...value, search.trim()])
      setSearch('')
    }
  }

  const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newTags = value.filter(t => t !== tag)
    onSave(newTags)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions.length > 0) {
        handleToggleTag(filteredOptions[0])
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
      onClick={(e) => {
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
        onClick={(e) => e.stopPropagation()}
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
              {filteredOptions.map((option) => {
                const isSelected = value.includes(option)
                return (
                  <div
                    key={option}
                    className={`px-3 py-1 rounded-full transition-colors text-sm flex items-center gap-1 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <span
                      onClick={() => handleToggleTag(option)}
                      className="cursor-pointer"
                    >
                      {option}
                    </span>
                    {isSelected ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      onDelete && (
                        <button
                          onClick={(e) => {
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
                )
              })}
            </div>
          ) : search.trim() ? (
            <div
              onClick={(e) => {
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
          className="w-full h-full min-h-[32px] cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors flex items-center gap-2"
        >
          <Tags className="h-[1.05rem] w-[1.05rem] text-muted-foreground/70 flex-shrink-0" />
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1 flex-1">
              {value.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tag}
                  <button
                    onClick={(e) => handleRemoveTag(tag, e)}
                    className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                    aria-label={`${tag} 제거`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground/50 text-sm">{placeholder}</span>
          )}
        </div>
      </div>
      {dropdownContent}
    </>
  )
}
