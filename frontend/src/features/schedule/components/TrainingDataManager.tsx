import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, X, Plus } from 'lucide-react'
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
      <DialogContent
        className="fixed inset-0 md:inset-auto left-0 top-0 md:left-[50%] md:top-[50%] translate-x-0 translate-y-0 md:translate-x-[-50%] md:translate-y-[-50%] max-w-none md:w-[650px] w-full h-full md:h-[90vh] p-0 flex flex-col rounded-none md:rounded-lg border-0 md:border [&>button]:hidden"
        onInteractOutside={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex flex-row items-center gap-3 px-4 py-3 flex-shrink-0 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9 -ml-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">훈련 데이터 관리</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
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

        <div className="flex gap-2 px-4 py-3 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleResetClick}>
            초기화
          </Button>
          <div className="flex-1"></div>
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
