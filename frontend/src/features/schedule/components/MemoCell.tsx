import { useState } from 'react'
import { MemoEditDialog } from './MemoEditDialog'

interface MemoCellProps {
  value: string
  onSave: (value: string) => void
}

export function MemoCell({ value, onSave }: MemoCellProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => setDialogOpen(true)}
        className="w-full cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors truncate text-muted-foreground"
      >
        {value || '클릭하여 입력'}
      </div>
      <MemoEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        value={value}
        onSave={onSave}
      />
    </>
  )
}
