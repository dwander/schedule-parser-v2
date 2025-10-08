import {
  AlertDialog as ShadcnAlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, ReactNode, useState } from 'react'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  onConfirm?: () => void
  children?: ReactNode
  showDontAskAgain?: boolean
  onDontAskAgainChange?: (checked: boolean) => void
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '확인',
  onConfirm,
  children,
  showDontAskAgain = false,
  onDontAskAgainChange,
}: AlertDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false)

  const handleConfirm = () => {
    if (showDontAskAgain && dontAskAgain && onDontAskAgainChange) {
      onDontAskAgainChange(true)
    }
    onConfirm?.()
    onOpenChange(false)
  }

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <ShadcnAlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || <span className="sr-only">알림 내용</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        {showDontAskAgain && (
          <div className="flex items-center space-x-2 px-6">
            <Checkbox
              id="dont-ask-again-alert"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <label
              htmlFor="dont-ask-again-alert"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              다시 알리지 않기
            </label>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </ShadcnAlertDialog>
  )
}
