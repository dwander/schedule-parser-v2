import { useState, useCallback, useEffect, useRef } from 'react'
import { ContentModal } from '@/components/common/ContentModal'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { useBatchAddSchedules } from '@/features/schedule/hooks/useSchedules'
import { useAuthStore } from '@/stores/useAuthStore'
import { toast } from 'sonner'
import type { NewSchedule, Schedule } from '@/features/schedule/types/schedule'
import { DEBOUNCE } from '@/lib/constants/timing'
import { convertParsedDataToSchedules } from '../utils/convertParsedData'
import { useParserEngine } from '../hooks/useParserEngine'
import type { ParserEngine } from '../hooks/useParserEngine'
import { ManualScheduleForm } from './ManualScheduleForm'
import { ParserEngineSelector } from './ParserEngineSelector'

interface ParserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSchedules: Schedule[]
}

export function ParserModal({ open, onOpenChange, existingSchedules }: ParserModalProps) {
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState('text')
  const [engine, setEngine] = useState<ParserEngine>('classic')
  const batchAddSchedules = useBatchAddSchedules()
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { user } = useAuthStore()
  const isAdmin = user?.isAdmin || false

  // 파서 엔진 훅
  const {
    isParsing,
    parsedData,
    error,
    parsingStep,
    parseFromText,
    parseFromFile,
    reset
  } = useParserEngine(existingSchedules)

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

  // 텍스트 입력 시 자동 파싱 (디바운스)
  useEffect(() => {
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current)
    }

    if (!text.trim()) {
      reset()
      return
    }

    parseTimerRef.current = setTimeout(() => {
      parseFromText(text, engine)
    }, DEBOUNCE.PARSER_AUTO)

    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current)
      }
    }
  }, [text, engine, parseFromText, reset])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.eml')) {
      toast.error('.txt 또는 .eml 파일만 업로드할 수 있습니다')
      return
    }

    await parseFromFile(file, engine)
  }, [engine, parseFromFile])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await parseFromFile(file, engine)
  }, [engine, parseFromFile])

  const handleSave = () => {
    if (activeTab === 'manual') {
      // 직접 입력 모드
      if (!manualForm.date || !manualForm.time || !manualForm.location) {
        toast.error('날짜, 시간, 장소는 필수 입력 항목입니다')
        return
      }

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
        }
      })
    } else {
      // 파싱 모드
      if (!parsedData || parsedData.length === 0) return

      // ParsedScheduleData[]를 NewSchedule[]로 변환
      const schedulesToAdd = convertParsedDataToSchedules(parsedData)

      batchAddSchedules.mutate(schedulesToAdd, {
        onSuccess: () => {
          toast.success(`${parsedData.length}개의 스케줄이 추가되었습니다`)
          onOpenChange(false)
          // 리셋
          setText('')
          reset()
        },
        onError: () => {
          toast.error('스케줄 저장 중 오류가 발생했습니다')
        }
      })
    }
  }

  const handleReset = useCallback(() => {
    setText('')
    reset()
  }, [reset])

  const handleClose = useCallback(() => {
    setText('')
    reset()
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
  }, [onOpenChange, reset])

  return (
    <ContentModal
      open={open}
      onOpenChange={handleClose}
      size="fullscreen-mobile"
      className="sm:max-w-2xl sm:w-[80%]"
      title="스케줄 가져오기"
      showFooter={true}
      footerContent={
        <div className="flex gap-2 w-full">
          {activeTab === 'text' && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1 gap-2"
              disabled={!text.trim()}
            >
              <RotateCcw className="h-4 w-4" />
              초기화
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
      }
    >
      <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
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

        <TabsContent value="text" className="flex flex-col gap-4">
          {/* 파서 엔진 선택 */}
          <ParserEngineSelector
            engine={engine}
            onEngineChange={setEngine}
            isAdmin={isAdmin}
          />

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
                  <span className="text-sm">
                    {parsingStep === 'classic' && 'Classic으로 시도 중...'}
                    {parsingStep === 'gpt' && 'GPT-4로 재분석 중...'}
                    {!parsingStep && '파싱 중...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="file" className="flex flex-col gap-4">
          {/* 파서 엔진 선택 */}
          <ParserEngineSelector
            engine={engine}
            onEngineChange={setEngine}
            isAdmin={isAdmin}
            id="parser-engine-file"
          />

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

        <TabsContent value="manual" className="flex flex-col gap-4">
          <ManualScheduleForm formData={manualForm} onChange={setManualForm} />
        </TabsContent>

        {/* 결과 영역 */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {parsedData && parsedData.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-primary/10 text-primary rounded-md">
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
      </Tabs>
    </ContentModal>
  )
}
