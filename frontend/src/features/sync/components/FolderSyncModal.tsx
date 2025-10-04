import { useState } from 'react'
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

interface FolderSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 임시 타입 정의
interface FolderAnalysis {
  folderName: string
  date: string
  time: string
  couple: string
  jpgCount: number
  rawCount: number
  finalCount: number
  matched: boolean
  mismatch: boolean
  scheduleId?: string
}

interface MismatchDetail {
  jpgOnly: string[]
  rawOnly: string[]
}

export function FolderSyncModal({ open, onOpenChange }: FolderSyncModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [folders, setFolders] = useState<FolderAnalysis[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [mismatchDetail, setMismatchDetail] = useState<MismatchDetail | null>(null)
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setIsAnalyzing(true)

    // TODO: 실제 폴더 분석 로직
    setTimeout(() => {
      // 임시 데모 데이터
      setFolders([
        {
          folderName: '2025.09.27 15시30분 디엘 아모르(최다솔 안연주) - 안현우',
          date: '2025-09-27',
          time: '15:30',
          couple: '최다솔 안연주',
          jpgCount: 234,
          rawCount: 234,
          finalCount: 234,
          matched: true,
          mismatch: false,
          scheduleId: '1'
        },
        {
          folderName: '2025-09-27 15시 30분 디엘 아모르, 최다슬 안연주',
          date: '2025-09-27',
          time: '15:30',
          couple: '최다슬 안연주',
          jpgCount: 189,
          rawCount: 192,
          finalCount: 192,
          matched: true,
          mismatch: true,
          scheduleId: '2'
        },
        {
          folderName: '2025-09-28 14시 그랜드블랑 퀸덤(김철수 이영희)',
          date: '2025-09-28',
          time: '14:00',
          couple: '김철수 이영희',
          jpgCount: 156,
          rawCount: 156,
          finalCount: 156,
          matched: false,
          mismatch: false
        }
      ])
      setIsAnalyzing(false)
    }, 1500)
  }

  const matchedFolders = folders.filter(f => f.matched)
  const unmatchedFolders = folders.filter(f => !f.matched)
  const mismatchFolders = folders.filter(f => f.mismatch)

  const handleFolderClick = (folder: FolderAnalysis) => {
    if (folder.mismatch) {
      setSelectedFolder(folder.folderName)
      // TODO: 실제 불일치 상세 정보 로드
      setMismatchDetail({
        jpgOnly: ['IMG_0001.jpg', 'IMG_0023.jpg', 'IMG_0045.jpg'],
        rawOnly: ['DSC_1234.ARW', 'DSC_1256.ARW', 'DSC_1278.ARW']
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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
                className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 transition-colors ${
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
              onClick={() => {
                // TODO: 실제 동기화 로직
                onOpenChange(false)
              }}
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
  folder: FolderAnalysis
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
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-2" />
        )}
      </div>
    </button>
  )
}
