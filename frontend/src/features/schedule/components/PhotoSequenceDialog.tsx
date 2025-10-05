import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Schedule, PhotoSequenceItem } from '../types/schedule'
import { useUpdateSchedule } from '../hooks/useSchedules'
import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, ArrowLeft, RotateCcw, X, Lock, Unlock } from 'lucide-react'
import { generatePhotoSequence } from '../constants/photoSequenceTemplates'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PhotoSequenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: Schedule
}

export function PhotoSequenceDialog({ open, onOpenChange, schedule }: PhotoSequenceDialogProps) {
  const updateSchedule = useUpdateSchedule()
  const [items, setItems] = useState<PhotoSequenceItem[]>(() =>
    schedule.photoSequence || generatePhotoSequence()
  )
  const [newItemText, setNewItemText] = useState('')
  const [isLocked, setIsLocked] = useState(() => {
    const saved = localStorage.getItem('photoSequenceLocked')
    return saved ? JSON.parse(saved) : false
  })

  // 모달이 열릴 때만 초기화
  useEffect(() => {
    if (open) {
      console.log('📋 PhotoSequenceDialog opened:', {
        scheduleId: schedule.id,
        hasPhotoSequence: !!schedule.photoSequence,
        photoSequence: schedule.photoSequence
      })
      setItems(schedule.photoSequence || generatePhotoSequence())
    }
  }, [open])  // open만 의존성으로 설정

  // schedule.photoSequence가 변경되면 items 업데이트
  useEffect(() => {
    if (open && schedule.photoSequence) {
      setItems(schedule.photoSequence)
    }
  }, [schedule.photoSequence])

  // 활성 항목과 삭제된 항목 분리
  const activeItems = items.filter(item => !item.deleted)
  const deletedItems = items.filter(item => item.deleted)

  // 실시간 저장
  const saveToServer = (updatedItems: PhotoSequenceItem[]) => {
    updateSchedule.mutate({
      id: schedule.id,
      photoSequence: updatedItems,
    })
  }

  // 체크 토글 (실시간 저장)
  const toggleComplete = (id: string) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
      saveToServer(updated)
      return updated
    })
  }

  // 항목 추가 (실시간 저장)
  const addItem = () => {
    if (!newItemText.trim()) return

    const newItem: PhotoSequenceItem = {
      id: `seq-${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
      order: items.length + 1,
      deleted: false,
    }

    setItems(prev => {
      const updated = [...prev, newItem]
      saveToServer(updated)
      return updated
    })
    setNewItemText('')
  }

  // 항목 삭제 (deleted 플래그로 변경)
  const deleteItem = (id: string) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, deleted: true } : item
      )
      saveToServer(updated)
      return updated
    })
  }

  // 삭제된 항목 복원 (실시간 저장)
  const restoreItem = (id: string) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, deleted: false } : item
      )
      saveToServer(updated)
      return updated
    })
  }

  // 영구 삭제
  const permanentlyDelete = (id: string) => {
    setItems(prev => {
      const updated = prev.filter(item => item.id !== id)
      saveToServer(updated)
      return updated
    })
  }

  // 모두 초기화 (실시간 저장, 활성 항목만)
  const handleReset = () => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.deleted ? item : { ...item, completed: false }
      )
      saveToServer(updated)
      return updated
    })
  }

  // 잠금 토글
  const toggleLock = () => {
    setIsLocked(prev => {
      const newValue = !prev
      localStorage.setItem('photoSequenceLocked', JSON.stringify(newValue))
      return newValue
    })
  }

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 움직여야 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 드래그 종료 핸들러
  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(item => item.id === active.id)
        const newIndex = prev.findIndex(item => item.id === over.id)

        const newItems = arrayMove(prev, oldIndex, newIndex)

        // order 재계산
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          order: index + 1
        }))

        saveToServer(updatedItems)
        return updatedItems
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 md:inset-auto left-0 top-0 md:left-[50%] md:top-[50%] translate-x-0 translate-y-0 md:translate-x-[-50%] md:translate-y-[-50%] max-w-none md:max-w-2xl w-full md:w-auto md:min-w-[500px] h-full md:h-[90vh] p-0 flex flex-col rounded-none md:rounded-lg border-0 md:border [&>button]:hidden">
        {/* 헤더 */}
        <div className="flex flex-row items-center justify-between px-4 py-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1"></div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLock}
              className="h-9 w-9"
              title={isLocked ? "잠금 해제" : "잠금"}
            >
              {isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-9 w-9"
              title="모두 초기화"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 체크리스트 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              촬영 순서를 추가해주세요
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {activeItems.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      isLocked={isLocked}
                      onToggleComplete={toggleComplete}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* 삭제된 항목 배지 */}
        {deletedItems.length > 0 && (
          <div className="mx-4 mb-3 flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              {deletedItems.map((item) => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent flex items-center gap-1.5 px-3 py-1.5 font-normal"
                >
                  <span onClick={() => restoreItem(item.id)}>{item.text}</span>
                  <X
                    className="h-3 w-3 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      permanentlyDelete(item.id)
                    }}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 항목 추가 */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="항목 추가..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addItem()
                }
              }}
              className="flex-1"
            />
            <Button onClick={addItem} size="icon" variant="outline" className="flex-shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 정렬 가능한 아이템 컴포넌트
interface SortableItemProps {
  item: PhotoSequenceItem
  isLocked: boolean
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
}

function SortableItem({ item, isLocked, onToggleComplete, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isLocked })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        onClick={() => onToggleComplete(item.id)}
        className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer group origin-right transition-[transform,opacity] duration-[250ms] ease-out will-change-transform ${
          item.completed ? 'scale-[0.83] opacity-50' : 'scale-100 opacity-100'
        }`}
      >
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className={`flex-shrink-0 ${isLocked ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 text-base select-none">
        {item.text}
      </div>

      {!isLocked && (
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
      </div>
    </div>
  )
}
