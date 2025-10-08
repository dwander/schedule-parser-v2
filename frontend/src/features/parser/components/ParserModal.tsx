import { useState, useCallback, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePickerCell } from '@/features/schedule/components/DatePickerCell'
import { TimePickerCell } from '@/features/schedule/components/TimePickerCell'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, RotateCcw, ChevronLeft } from 'lucide-react'
import { parseText, parseFile } from '../api/parserApi'
import { useBatchAddSchedules } from '@/features/schedule/hooks/useSchedules'
import { toast } from 'sonner'
import type { NewSchedule, Schedule } from '@/features/schedule/types/schedule'
import type { ParsedScheduleData } from '../types/parser'

interface ParserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSchedules: Schedule[]
}

export function ParserModal({ open, onOpenChange, existingSchedules }: ParserModalProps) {
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedScheduleData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('text')
  const batchAddSchedules = useBatchAddSchedules()
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 직접 입력 폼 상태
  const [manualForm, setManualForm] = useState({
    date: '',
    time: '',
    location: '',
    groom: '',
    bride: '',
    contact: '',
    memo: ''
  })

  const handleParse = async (input: string) => {
    if (!input.trim()) {
      setParsedData(null)
      setError(null)
      return
    }

    setIsParsing(true)
    setError(null)
    setParsedData(null)

    try {
      const result = await parseText(input, 'classic')

      if (result.success && result.data) {
        // 중복 체크 (날짜 + 장소로 판단)
        const duplicates = result.data.filter(parsed =>
          existingSchedules.some(existing =>
            existing.date === parsed.date && existing.location === parsed.location
          )
        )

        const unique = result.data.filter(parsed =>
          !existingSchedules.some(existing =>
            existing.date === parsed.date && existing.location === parsed.location
          )
        )

        setParsedData(unique)

        if (duplicates.length > 0) {
          toast.info(`${duplicates.length}개의 중복 스케줄이 제외되었습니다`)
        }

        if (unique.length === 0) {
          setError('추가할 새로운 스케줄이 없습니다 (모두 중복)')
        }
      } else {
        setError(result.error || '파싱에 실패했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파싱 중 오류가 발생했습니다')
    } finally {
      setIsParsing(false)
    }
  }

  // 텍스트 입력 시 자동 파싱 (디바운스)
  useEffect(() => {
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current)
    }

    if (!text.trim()) {
      setParsedData(null)
      setError(null)
      return
    }

    parseTimerRef.current = setTimeout(() => {
      handleParse(text)
    }, 800) // 800ms 후 자동 파싱

    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current)
      }
    }
  }, [text, existingSchedules])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.eml')) {
      setError('.txt 또는 .eml 파일만 업로드할 수 있습니다')
      return
    }

    setIsParsing(true)
    setError(null)
    setParsedData(null)

    try {
      const result = await parseFile(file, 'classic')

      if (result.success && result.data) {
        const unique = result.data.filter(parsed =>
          !existingSchedules.some(existing =>
            existing.date === parsed.date && existing.location === parsed.location
          )
        )

        setParsedData(unique)

        const duplicateCount = result.data.length - unique.length
        if (duplicateCount > 0) {
          toast.info(`${duplicateCount}개의 중복 스케줄이 제외되었습니다`)
        }

        if (unique.length === 0) {
          setError('추가할 새로운 스케줄이 없습니다 (모두 중복)')
        }
      } else {
        setError(result.error || '파싱에 실패했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 파싱 중 오류가 발생했습니다')
    } finally {
      setIsParsing(false)
    }
  }, [existingSchedules])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setError(null)
    setParsedData(null)

    try {
      const result = await parseFile(file, 'classic')

      if (result.success && result.data) {
        const unique = result.data.filter(parsed =>
          !existingSchedules.some(existing =>
            existing.date === parsed.date && existing.location === parsed.location
          )
        )

        setParsedData(unique)

        const duplicateCount = result.data.length - unique.length
        if (duplicateCount > 0) {
          toast.info(`${duplicateCount}개의 중복 스케줄이 제외되었습니다`)
        }

        if (unique.length === 0) {
          setError('추가할 새로운 스케줄이 없습니다 (모두 중복)')
        }
      } else {
        setError(result.error || '파싱에 실패했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 파싱 중 오류가 발생했습니다')
    } finally {
      setIsParsing(false)
    }
  }, [existingSchedules])

  const handleSave = () => {
    if (activeTab === 'manual') {
      // 직접 입력 모드
      if (!manualForm.date || !manualForm.time || !manualForm.location) {
        toast.error('날짜, 시간, 장소는 필수 입력 항목입니다')
        return
      }

      setIsParsing(true)

      // 신랑신부 합치기
      const couple = [manualForm.groom, manualForm.bride].filter(Boolean).join(' ')

      const newSchedule = {
        date: manualForm.date,
        time: manualForm.time,
        location: manualForm.location,
        couple: couple,
        contact: manualForm.contact || undefined,
        memo: manualForm.memo || undefined,
        isDuplicate: false,
      } as NewSchedule

      batchAddSchedules.mutate([newSchedule], {
        onSuccess: () => {
          toast.success('스케줄이 추가되었습니다')
          onOpenChange(false)
          setIsParsing(false)
          // 리셋
          setManualForm({
            date: '',
            time: '',
            location: '',
            groom: '',
            bride: '',
            contact: '',
            memo: ''
          })
        },
        onError: () => {
          toast.error('스케줄 저장 중 오류가 발생했습니다')
          setIsParsing(false)
        }
      })
    } else {
      // 파싱 모드
      if (!parsedData || parsedData.length === 0) return

      setIsParsing(true)

      batchAddSchedules.mutate(parsedData as NewSchedule[], {
        onSuccess: () => {
          toast.success(`${parsedData.length}개의 스케줄이 추가되었습니다`)
          onOpenChange(false)
          setIsParsing(false)
          // 리셋
          setText('')
          setParsedData(null)
          setError(null)
        },
        onError: () => {
          toast.error('스케줄 저장 중 오류가 발생했습니다')
          setIsParsing(false)
        }
      })
    }
  }

  const handleReset = () => {
    setText('')
    setParsedData(null)
    setError(null)
  }

  const handleClose = () => {
    setText('')
    setParsedData(null)
    setError(null)
    setManualForm({
      date: '',
      time: '',
      location: '',
      groom: '',
      bride: '',
      contact: '',
      memo: ''
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="fixed inset-0 md:inset-auto left-0 top-0 md:left-[50%] md:top-[50%] translate-x-0 translate-y-0 md:translate-x-[-50%] md:translate-y-[-50%] max-w-none md:max-w-2xl w-full md:w-[80%] h-full md:h-auto md:max-h-[80vh] p-0 flex flex-col rounded-none md:rounded-lg border-0 md:border [&>button]:hidden">
        {/* 헤더 */}
        <div className="flex-shrink-0 px-4 pt-6 pb-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleClose} className="-ml-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <DialogTitle className="text-xl font-bold">스케줄 가져오기</DialogTitle>
        </div>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="h-4 w-4" />
                  텍스트 입력
                </TabsTrigger>
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="h-4 w-4" />
                  파일 업로드
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <FileText className="h-4 w-4" />
                  직접 입력
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="text" className="flex flex-col gap-4 mt-4 px-6">
              <div className="relative min-h-[300px]">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="카카오톡 대화방에서 내보낸 스케줄 텍스트를 붙여넣으세요..."
                  className="w-full h-full min-h-[300px] px-3 py-2 border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isParsing}
                />
                {isParsing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">파싱 중...</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="file" className="flex flex-col gap-4 mt-4 px-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`min-h-[300px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              >
                <Upload className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    카카오톡 대화방에서 내보내기한 스케줄 데이터를 업로드하세요
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    .txt 및 .eml 파일 지원
                  </p>
                </div>
                <input
                  type="file"
                  accept=".txt,.eml"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                  disabled={isParsing}
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" disabled={isParsing} asChild>
                    <span>파일 선택</span>
                  </Button>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="flex flex-col gap-4 mt-4 px-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>날짜</Label>
                  <DatePickerCell
                    value={manualForm.date}
                    onSave={(value) => setManualForm(prev => ({ ...prev, date: value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>시간</Label>
                  <TimePickerCell
                    value={manualForm.time}
                    onSave={(value) => setManualForm(prev => ({ ...prev, time: value }))}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="manual-location">장소</Label>
                  <Input
                    id="manual-location"
                    value={manualForm.location}
                    onChange={(e) => setManualForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="예: 서울 강남구 웨딩홀"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-groom">신랑</Label>
                  <Input
                    id="manual-groom"
                    value={manualForm.groom}
                    onChange={(e) => setManualForm(prev => ({ ...prev, groom: e.target.value }))}
                    placeholder="신랑 이름"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-bride">신부</Label>
                  <Input
                    id="manual-bride"
                    value={manualForm.bride}
                    onChange={(e) => setManualForm(prev => ({ ...prev, bride: e.target.value }))}
                    placeholder="신부 이름"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="manual-contact">연락처</Label>
                  <Input
                    id="manual-contact"
                    value={manualForm.contact}
                    onChange={(e) => setManualForm(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="예: 010-1234-5678"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="manual-memo">전달사항</Label>
                  <Textarea
                    id="manual-memo"
                    value={manualForm.memo}
                    onChange={(e) => {
                      setManualForm(prev => ({ ...prev, memo: e.target.value }))
                      // 자동 높이 조절
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    placeholder="전달사항을 입력하세요"
                    rows={3}
                    className="resize-none overflow-hidden"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 결과 영역 */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md mx-6 mt-4">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {parsedData && parsedData.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-primary/10 text-primary rounded-md mx-6 mt-4">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {parsedData.length}개의 스케줄을 찾았습니다
                </p>
                <p className="text-xs mt-1 opacity-80">
                  날짜: {parsedData.map(d => d.date).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-2 px-6 pb-6 pt-4">
            {activeTab === 'text' && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 gap-2"
                disabled={!text.trim()}
              >
                <RotateCcw className="h-4 w-4" />
                입력된 텍스트 초기화
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={
                activeTab === 'manual'
                  ? !manualForm.date || !manualForm.time || !manualForm.location || isParsing
                  : !parsedData || parsedData.length === 0 || isParsing
              }
              className="flex-1"
            >
              {activeTab === 'manual'
                ? '추가하기'
                : parsedData
                ? `${parsedData.length}개 추가하기`
                : '추가하기'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
