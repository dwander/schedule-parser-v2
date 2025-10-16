import { useState, useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Trash2, X } from 'lucide-react'
import type { PhotoSequenceItem } from '../types/schedule'
import { PHOTO_SEQUENCE_TIMERS } from '@/lib/constants/photoSequence'

interface SortableItemProps {
  item: PhotoSequenceItem
  isLocked: boolean
  voiceEnabled: boolean
  handlePosition: 'left' | 'right'
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
  trainingTargetId: string | null
  collectedCount: number
  isExpanded: boolean
  collectedPhrases: string[]
  onStartTraining: (id: string) => void
  onSaveTraining: (itemText: string, phrases: string[]) => void
  onCancelTraining: () => void
}

export function SortableItem({
  item,
  isLocked,
  voiceEnabled,
  handlePosition,
  onToggleComplete,
  onDelete,
  trainingTargetId,
  collectedCount,
  isExpanded,
  collectedPhrases: initialPhrases,
  onStartTraining,
  onSaveTraining,
  onCancelTraining,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isLocked })

  const [editablePhrases, setEditablePhrases] = useState<string[]>([])
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressExecuted = useRef(false)

  // 펼쳐질 때 편집 가능한 복사본 생성
  useEffect(() => {
    if (isExpanded) {
      setEditablePhrases([...initialPhrases])
    }
  }, [isExpanded, initialPhrases])

  const handlePointerDown = () => {
    if (!isLocked && voiceEnabled) {
      longPressTimer.current = setTimeout(() => {
        longPressExecuted.current = true
        onStartTraining(item.id)
      }, PHOTO_SEQUENCE_TIMERS.LONG_PRESS)
    }
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleClick = () => {
    // 롱프레스가 실행되었으면 클릭 무시
    if (longPressExecuted.current) {
      longPressExecuted.current = false
      return
    }
    // 마킹된 카드는 클릭 무시
    if (isTraining) return
    onToggleComplete(item.id)
  }

  const handleRemovePhrase = (index: number) => {
    setEditablePhrases(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (editablePhrases.length > 0) {
      onSaveTraining(item.text, editablePhrases)
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  const isTraining = trainingTargetId === item.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer group transition-[transform,opacity] duration-[250ms] ease-out will-change-transform origin-right ${
          item.completed ? 'scale-[0.83] opacity-50' : 'scale-100 opacity-100'
        } ${isTraining ? 'ring-2 ring-red-500' : ''}`}
      >
        {handlePosition === 'left' ? (
          <>
            {!isLocked && (
              <div
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <div className={`flex-1 min-h-8 text-base select-none flex items-center gap-2 ${isLocked ? 'ml-3' : ''}`}>
              <span>{item.text}</span>
              {isTraining && (
                <Badge variant="destructive" className="ml-2">
                  🎯 {collectedCount}개
                </Badge>
              )}
            </div>

            {!isLocked && !item.completed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(item.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex-1 min-h-8 text-base select-none flex items-center gap-2 ml-3">
              <span>{item.text}</span>
              {isTraining && (
                <Badge variant="destructive" className="ml-2">
                  🎯 {collectedCount}개
                </Badge>
              )}
            </div>

            {!isLocked && !item.completed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(item.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {!isLocked && (
              <div
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>

      {/* 펼쳐진 훈련 데이터 */}
      {isExpanded && editablePhrases.length > 0 && (
        <div className={`mt-2 p-3 rounded-lg border bg-muted/30 ${handlePosition === 'right' ? 'mr-12' : 'ml-12'}`}>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            수집된 문장 ({editablePhrases.length}개)
          </div>
          <div className="space-y-1 mb-3">
            {editablePhrases.map((phrase, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{phrase}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemovePhrase(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              {editablePhrases.length}개 저장
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelTraining}>
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
