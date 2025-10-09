import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, ChevronLeft } from 'lucide-react'
import type { PhotoSequenceItem } from '../types/schedule'
import type { VoiceTrainingData } from '../types/voiceRecognition'
import { DEFAULT_VOICE_TRAINING } from '../types/voiceRecognition'

interface TrainingDataManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainingData: VoiceTrainingData
  onSave: (data: VoiceTrainingData) => void
  items: PhotoSequenceItem[]
}

export function TrainingDataManager({
  open,
  onOpenChange,
  trainingData,
  onSave,
  items
}: TrainingDataManagerProps) {
  const [editingData, setEditingData] = useState<VoiceTrainingData>(trainingData)
  const [newKeywords, setNewKeywords] = useState<{ [itemText: string]: string }>({})
  const [editingKeyword, setEditingKeyword] = useState<{ itemText: string; index: number } | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // 다이얼로그가 열릴 때 데이터 초기화
  useEffect(() => {
    if (open) {
      setEditingData({ ...trainingData })
      setNewKeywords({})
      setEditingKeyword(null)
    }
  }, [open, trainingData])

  const handleAddKeyword = (itemText: string) => {
    const keyword = newKeywords[itemText]?.trim()
    if (!keyword) return

    setEditingData(prev => ({
      ...prev,
      [itemText]: [...(prev[itemText] || []), keyword],
    }))
    setNewKeywords(prev => ({ ...prev, [itemText]: '' }))
  }

  const handleRemoveKeyword = (itemText: string, keywordIndex: number) => {
    setEditingData(prev => ({
      ...prev,
      [itemText]: prev[itemText].filter((_, i) => i !== keywordIndex),
    }))
  }

  const handleStartEdit = (itemText: string, index: number, currentValue: string) => {
    setEditingKeyword({ itemText, index })
    setEditingValue(currentValue)
  }

  const handleSaveEdit = () => {
    if (!editingKeyword || !editingValue.trim()) {
      setEditingKeyword(null)
      return
    }

    setEditingData(prev => ({
      ...prev,
      [editingKeyword.itemText]: prev[editingKeyword.itemText].map((kw, i) =>
        i === editingKeyword.index ? editingValue.trim() : kw
      ),
    }))
    setEditingKeyword(null)
    setEditingValue('')
  }

  const handleCancelEdit = () => {
    setEditingKeyword(null)
    setEditingValue('')
  }

  const handleReset = () => {
    setEditingData({ ...DEFAULT_VOICE_TRAINING })
  }

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSave(editingData)
    onOpenChange(false)
  }

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onOpenChange(false)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenChange(false)
  }

  const handleResetClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleReset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-h-full max-w-full sm:max-w-2xl sm:max-h-[85vh] sm:h-auto p-0 sm:p-6">
        {/* Header */}
        <DialogHeader className="pb-4 border-b px-4 pt-4 sm:px-0 sm:pt-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2"
              onClick={handleClose}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <DialogTitle>훈련 데이터 관리</DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-2">
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="font-medium mb-3">{item.text}</div>
                <div className="space-y-2 mb-3">
                  {(editingData[item.text] || []).map((keyword, index) => {
                    const isEditing = editingKeyword?.itemText === item.text && editingKeyword?.index === index

                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {isEditing ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveEdit()
                              } else if (e.key === 'Escape') {
                                handleCancelEdit()
                              }
                            }}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="flex-1 h-8"
                          />
                        ) : (
                          <span
                            className="flex-1 px-2 py-1 bg-muted rounded cursor-pointer hover:bg-muted/70"
                            onClick={() => handleStartEdit(item.text, index, keyword)}
                          >
                            {keyword}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveKeyword(item.text, index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="새 키워드 추가..."
                    value={newKeywords[item.text] || ''}
                    onChange={(e) =>
                      setNewKeywords(prev => ({ ...prev, [item.text]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddKeyword(item.text)
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleAddKeyword(item.text)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="pt-4 border-t px-4 pb-4 sm:px-0 sm:pb-0">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleResetClick}>
              초기화
            </Button>
            <div className="flex-1"></div>
            <Button onClick={handleSave}>
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
