import { useState, useEffect, useRef } from 'react'

interface EditableCellProps {
  value: string | number
  onSave: (value: string) => void
  type?: 'text' | 'number' | 'date' | 'time'
  className?: string
  doubleClick?: boolean // 더블클릭으로 편집 모드 전환
  validate?: (value: string) => boolean // 입력 검증 함수
  format?: (value: string | number) => string // 표시 포맷 함수
  placeholder?: string // 빈 값일 때 표시할 텍스트
}

export function EditableCell({
  value,
  onSave,
  type = 'text',
  className = '',
  doubleClick = false,
  validate,
  format,
  placeholder = ''
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(String(value))
  }, [value])

  const handleSave = () => {
    const trimmedValue = editValue.trim()

    // 검증 함수가 있으면 검증
    if (validate && !validate(trimmedValue)) {
      // 검증 실패 시 원래 값으로 되돌림
      setEditValue(String(value))
      setIsEditing(false)
      return
    }

    if (trimmedValue !== String(value)) {
      onSave(trimmedValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(String(value))
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 border border-ring/50 rounded bg-background text-foreground focus:ring-1 focus:ring-ring/30 focus:outline-none ${className}`}
      />
    )
  }

  // 표시할 값 (포맷 함수가 있으면 적용)
  const displayValue = format ? format(value) : value
  const isEmpty = !displayValue || String(displayValue).trim() === ''

  return (
    <div
      onClick={doubleClick ? undefined : () => setIsEditing(true)}
      onDoubleClick={doubleClick ? () => setIsEditing(true) : undefined}
      className={`w-full min-h-[24px] cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors flex items-center ${className}`}
    >
      <span className={isEmpty ? 'text-muted-foreground/50' : ''}>
        {isEmpty ? placeholder : displayValue}
      </span>
    </div>
  )
}
