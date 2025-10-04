import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MemoEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onSave: (value: string) => void
}

export function MemoEditDialog({
  open,
  onOpenChange,
  value,
  onSave
}: MemoEditDialogProps) {
  const [editValue, setEditValue] = useState(value)

  useEffect(() => {
    setEditValue(value)
  }, [value, open])

  const handleSave = () => {
    onSave(editValue)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>전달사항 수정</DialogTitle>
        </DialogHeader>
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="min-h-[200px] focus:ring-1 focus:ring-ring/30 focus:outline-none"
          placeholder="전달사항을 입력하세요..."
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
