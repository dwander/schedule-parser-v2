import { useState, useEffect, useRef } from 'react'

interface EditableCellProps {
  value: string | number
  onSave: (value: string) => void
  type?: 'text' | 'number' | 'date' | 'time'
  className?: string
  doubleClick?: boolean // 더블클릭으로 편집 모드 전환
}

export function EditableCell({
  value,
  onSave,
  type = 'text',
  className = '',
  doubleClick = false
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
    if (editValue !== String(value)) {
      onSave(editValue)
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

  return (
    <div
      onClick={doubleClick ? undefined : () => setIsEditing(true)}
      onDoubleClick={doubleClick ? () => setIsEditing(true) : undefined}
      className={`w-full cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors ${className}`}
    >
      {value}
    </div>
  )
}
