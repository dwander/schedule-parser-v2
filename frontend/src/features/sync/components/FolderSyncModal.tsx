import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FolderOpen,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileImage,
  Loader2,
  Copy,
  ChevronRight,
  Smartphone
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSchedules, useUpdateSchedule } from '@/features/schedule/hooks/useSchedules'
import { toast } from 'sonner'
import { RAW_FILE_EXTENSIONS_REGEX, JPG_FILE_EXTENSIONS_REGEX } from '@/lib/constants/fileTypes'
import {
  parseFolderName,
  findMatchingSchedule,
  countPhotosInFolder,
  findScheduleFolders,
  isSelectFolder,
  type FolderAnalysisResult
} from '../utils/folderAnalyzer'

interface FolderSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MismatchDetail {
  jpgOnly: string[]
  rawOnly: string[]
}

export function FolderSyncModal({ open, onOpenChange }: FolderSyncModalProps) {
  const { data: schedules = [] } = useSchedules()
  const updateSchedule = useUpdateSchedule()

  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [folders, setFolders] = useState<FolderAnalysisResult[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [mismatchDetail, setMismatchDetail] = useState<MismatchDetail | null>(null)
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))

  // 모달이 열릴 때마다 상태 초기화
  useEffect(() => {
    if (open) {
      setIsDragging(false)
      setIsAnalyzing(false)
      setFolders([])
      setSelectedFolder(null)
      setMismatchDetail(null)
    }
  }, [open])

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setIsAnalyzing(true)
    setFolders([])

    try {
      const items = e.dataTransfer.items
      const folderEntries: FileSystemDirectoryEntry[] = []

      // 폴더 엔트리 수집
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry()
          if (entry && entry.isDirectory) {
            folderEntries.push(entry as FileSystemDirectoryEntry)
          }
        }
      }

      if (folderEntries.length === 0) {
        toast.error('폴더를 드래그해주세요. 파일은 지원하지 않습니다.')
        return
      }

      // 1단계: 모든 스케줄 폴더 찾기
      const allScheduleFolders: Array<{
        entry: FileSystemDirectoryEntry
        fullPath: string
        parsedData: {
          date: string
          time: string
          couple?: string
          cutsFromName?: number
        }
      }> = []
      const processedFolders = new Set<string>()

      for (const folderEntry of folderEntries) {
        // 셀렉 폴더 제외
        if (isSelectFolder(folderEntry.name)) {
          continue
        }

        // 드래그한 폴더 자체가 스케줄 폴더인지 확인
        const directParsed = parseFolderName(folderEntry.name)

        if (directParsed) {
          const folderKey = `${directParsed.date}_${directParsed.time}_${directParsed.couple || 'unknown'}`
          if (!processedFolders.has(folderKey)) {
            processedFolders.add(folderKey)
            allScheduleFolders.push({
              entry: folderEntry,
              fullPath: folderEntry.name,
              parsedData: directParsed
            })
          }
        } else {
          // 상위 폴더 → 재귀 탐색
          const foundFolders = await findScheduleFolders(folderEntry, processedFolders)
          allScheduleFolders.push(...foundFolders)
        }
      }

      if (allScheduleFolders.length === 0) {
        toast.error('스케줄 폴더를 찾을 수 없습니다. 날짜와 시간이 포함된 폴더가 있는지 확인해주세요.')
        return
      }

      // 2단계: 각 스케줄 폴더 처리
      const results: FolderAnalysisResult[] = []

      for (const scheduleFolder of allScheduleFolders) {
        const { entry, fullPath, parsedData } = scheduleFolder

        // 파일 카운팅
        const fileCountResult = await countPhotosInFolder(entry)

        // 컷수 결정
        const cutsCount = parsedData.cutsFromName || fileCountResult.count

        // 스케줄 매칭
        const matchingSchedule = findMatchingSchedule(parsedData, schedules)

        // RAW/JPG 불일치 시 매칭 무효화
        const hasMismatch = fileCountResult.mismatch
        const finalMatched = !hasMismatch && !!matchingSchedule

        results.push({
          folderName: fullPath,
          date: parsedData.date,
          time: parsedData.time,
          couple: parsedData.couple,
          jpgCount: fileCountResult.jpgCount,
          rawCount: fileCountResult.rawCount,
          finalCount: cutsCount,
          matched: finalMatched,
          mismatch: hasMismatch,
          scheduleId: matchingSchedule?.id,
          mismatchFiles: fileCountResult.mismatchFiles
        })
      }

      setFolders(results)

      // 불일치 경고
      const mismatchCount = results.filter(r => r.mismatch).length
      if (mismatchCount > 0) {
        toast.warning(`${mismatchCount}개 폴더에서 RAW/JPG 파일 수가 일치하지 않습니다.`)
      }

    } catch (error) {
      console.error('폴더 처리 오류:', error)
      toast.error('폴더 처리 중 오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const matchedFolders = folders.filter(f => f.matched)
  const unmatchedFolders = folders.filter(f => !f.matched)
  const mismatchFolders = folders.filter(f => f.mismatch)

  const handleFolderClick = (folder: FolderAnalysisResult) => {
    if (folder.mismatch && folder.mismatchFiles) {
      setSelectedFolder(folder.folderName)

      // RAW와 JPG 파일 분리
      const rawOnly = folder.mismatchFiles.filter(file => RAW_FILE_EXTENSIONS_REGEX.test(file))
      const jpgOnly = folder.mismatchFiles.filter(file => JPG_FILE_EXTENSIONS_REGEX.test(file))

      setMismatchDetail({ rawOnly, jpgOnly })
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('클립보드에 복사되었습니다')
    } catch (error) {
      toast.error('클립보드 복사에 실패했습니다')
    }
  }

  const handleSync = async () => {
    if (matchedFolders.length === 0) return

    try {
      for (const folder of matchedFolders) {
        if (folder.scheduleId) {
          await updateSchedule.mutateAsync({
            id: folder.scheduleId,
            cuts: folder.finalCount
          })
        }
      }

      toast.success(`${matchedFolders.length}개 스케줄의 컷수가 업데이트되었습니다`)
      onOpenChange(false)
      setFolders([])
    } catch (error) {
      toast.error('컷수 업데이트 중 오류가 발생했습니다')
    }
  }

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              데스크탑 전용 기능
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-3">
              <p className="text-base">
                폴더 동기화는 데스크탑 환경에서만 사용할 수 있는 기능입니다.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p className="font-medium text-foreground">주요 기능:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 촬영 폴더를 드래그 앤 드롭</li>
                  <li>• 자동으로 컷 수 계산</li>
                  <li>• 스케줄과 자동 매칭</li>
                  <li>• JPG/RAW 파일 일치 여부 검증</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                데스크탑 브라우저에서 접속하여 이용해주세요.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            폴더 동기화
          </DialogTitle>
          <DialogDescription>
            촬영 폴더를 분석하여 스케줄의 컷 수를 자동으로 업데이트합니다
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* 왼쪽: 드롭존 & 리스트 */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* 드롭존 */}
            {folders.length === 0 && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 py-12 transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <p className="text-sm font-medium">폴더 분석 중...</p>
                    <p className="text-xs text-muted-foreground">잠시만 기다려주세요</p>
                  </>
                ) : (
                  <>
                    <Upload className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        촬영 폴더를 드래그하여 업로드
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        폴더 구조를 자동으로 분석하여 컷 수를 계산합니다
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileImage className="h-4 w-4" />
                      <span>JPG, PNG, RAW 파일 지원</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 폴더 리스트 */}
            {folders.length > 0 && (
              <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                {/* 요약 통계 */}
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1">
                    <span className="text-muted-foreground">전체</span>
                    <span className="font-semibold">{folders.length}</span>
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30 bg-green-600/5">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>매칭 {matchedFolders.length}</span>
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-red-600 border-red-600/30 bg-red-600/5">
                    <XCircle className="h-3 w-3" />
                    <span>실패 {unmatchedFolders.length}</span>
                  </Badge>
                  {mismatchFolders.length > 0 && (
                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600/30 bg-orange-600/5">
                      <AlertTriangle className="h-3 w-3" />
                      <span>불일치 {mismatchFolders.length}</span>
                    </Badge>
                  )}
                </div>

                {/* 탭 */}
                <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">전체</TabsTrigger>
                    <TabsTrigger value="matched">매칭 성공</TabsTrigger>
                    <TabsTrigger value="unmatched">매칭 실패</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="flex-1 mt-3 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-2 pr-4">
                        {folders.map((folder, idx) => (
                          <FolderItem
                            key={idx}
                            folder={folder}
                            onClick={() => handleFolderClick(folder)}
                            selected={selectedFolder === folder.folderName}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="matched" className="flex-1 mt-3 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-2 pr-4">
                        {matchedFolders.map((folder, idx) => (
                          <FolderItem
                            key={idx}
                            folder={folder}
                            onClick={() => handleFolderClick(folder)}
                            selected={selectedFolder === folder.folderName}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="unmatched" className="flex-1 mt-3 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-2 pr-4">
                        {unmatchedFolders.map((folder, idx) => (
                          <FolderItem
                            key={idx}
                            folder={folder}
                            onClick={() => handleFolderClick(folder)}
                            selected={selectedFolder === folder.folderName}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          {/* 오른쪽: 불일치 상세 정보 (선택 시에만 표시) */}
          {selectedFolder && mismatchDetail && (
            <div className="w-96 border-l pl-4 flex flex-col gap-4 overflow-hidden">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  불일치 상세 정보
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {selectedFolder}
                </p>
              </div>

              <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                {/* JPG만 있는 파일 */}
                <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">JPG만 있음</span>
                      <Badge variant="secondary" className="text-xs">
                        {mismatchDetail.jpgOnly.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => copyToClipboard(mismatchDetail.jpgOnly.join('\n'))}
                    >
                      <Copy className="h-3 w-3" />
                      복사
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 border rounded-md">
                    <div className="p-2 space-y-1">
                      {mismatchDetail.jpgOnly.map((file, idx) => (
                        <div key={idx} className="text-xs font-mono text-muted-foreground py-0.5">
                          {file}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* RAW만 있는 파일 */}
                <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      <span className="text-sm font-medium">RAW만 있음</span>
                      <Badge variant="secondary" className="text-xs">
                        {mismatchDetail.rawOnly.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => copyToClipboard(mismatchDetail.rawOnly.join('\n'))}
                    >
                      <Copy className="h-3 w-3" />
                      복사
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 border rounded-md">
                    <div className="p-2 space-y-1">
                      {mismatchDetail.rawOnly.map((file, idx) => (
                        <div key={idx} className="text-xs font-mono text-muted-foreground py-0.5">
                          {file}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFolder(null)
                  setMismatchDetail(null)
                }}
              >
                닫기
              </Button>
            </div>
          )}
        </div>

        {/* 하단 액션 버튼 */}
        {folders.length > 0 && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setFolders([])
                setSelectedFolder(null)
                setMismatchDetail(null)
              }}
              className="flex-1"
            >
              초기화
            </Button>
            <Button
              onClick={handleSync}
              className="flex-1"
              disabled={matchedFolders.length === 0}
            >
              {matchedFolders.length}개 스케줄 업데이트
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface FolderItemProps {
  folder: FolderAnalysisResult
  onClick: () => void
  selected: boolean
}

function FolderItem({ folder, onClick, selected }: FolderItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      } ${folder.matched ? '' : 'opacity-60'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {folder.matched ? (
            folder.mismatch ? (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{folder.folderName}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{folder.date} {folder.time}</span>
            <span>•</span>
            <span>{folder.couple}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <FileImage className="h-3 w-3" />
              {folder.finalCount}컷
            </Badge>
            {folder.mismatch && (
              <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-600/30">
                JPG {folder.jpgCount} / RAW {folder.rawCount}
              </Badge>
            )}
          </div>
        </div>

        {folder.mismatch && (
          <ChevronRight className="h-5 w-5 text-orange-600 flex-shrink-0 mt-2 animate-slide-horizontal" />
        )}
      </div>
    </button>
  )
}
