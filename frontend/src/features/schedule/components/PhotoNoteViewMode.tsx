import type { PhotoNote } from '../types/schedule'
import { cn } from '@/lib/utils'
import {
  Scissors,
  Users,
  Sparkles,
  Camera,
  Palette,
  MessageSquare,
  AlertCircle,
  type LucideIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PhotoNoteViewModeProps {
  noteData: PhotoNote
}

// Section 컴포넌트 - 컴팩트한 디자인
function ViewSection({
  icon: Icon,
  title,
  subtitle,
  children,
  className
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="p-1 rounded bg-primary/10 flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3 className="font-medium text-sm flex-shrink-0">{title}</h3>
          {subtitle && (
            <>
              <div className="h-3 w-px bg-border flex-shrink-0" />
              <span className="text-sm font-normal text-muted-foreground truncate">{subtitle}</span>
            </>
          )}
        </div>
      </div>
      {children && (
        <div className="text-sm text-foreground flex-shrink-0">{children}</div>
      )}
    </div>
  )
}

// 인라인 라벨:값 컴포넌트
function InlineField({ label, value }: { label: string; value?: string }) {
  if (!value || value.trim() === '') return null

  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="text-foreground">{value}</span>
    </span>
  )
}

// 사회자 타입 변환 함수
function getHostTypeLabel(type?: string): string | undefined {
  if (!type) return undefined
  const labels: Record<string, string> = {
    professional: '전문사회자',
    acquaintance: '지인'
  }
  return labels[type] || type
}

export function PhotoNoteViewMode({ noteData }: PhotoNoteViewModeProps) {
  // 데이터 존재 여부 확인
  const hasMakeupShop = noteData.makeupShop?.name || noteData.makeupShop?.departureTime || noteData.makeupShop?.arrivalTime
  const hasDress = noteData.dress?.type || noteData.dress?.material || noteData.dress?.company
  const hasFamilyRelations = noteData.familyRelations?.groomFamily || noteData.familyRelations?.brideFamily
  const hasCeremonyHost = noteData.ceremony?.host?.type || noteData.ceremony?.host?.memo
  const hasCeremonyEvents = noteData.ceremony?.events && (
    Object.entries(noteData.ceremony.events).some(([key, value]) => key !== 'memo' && value === true) ||
    noteData.ceremony?.events?.memo
  )
  const hasSubPhotographer = noteData.subPhotographer?.videoDvd || noteData.subPhotographer?.subIphoneSnap

  // 선택된 이벤트들
  const selectedEvents = noteData.ceremony?.events ? Object.entries(noteData.ceremony.events)
    .filter(([key, value]) => key !== 'memo' && value === true)
    .map(([key]) => {
      const eventLabels: Record<string, string> = {
        blessing: '축도',
        congratulatorySpeech: '축사',
        congratulatorySong: '축가',
        congratulatoryDance: '축무',
        flowerGirl: '플라워걸',
        ringExchange: '반지교환',
        videoPlay: '영상',
        flashCut: '플래시컷',
        bouquetCut: '부케컷',
        flowerShower: '플라워샤워'
      }
      return eventLabels[key] || key
    }) : []

  return (
    <div className="space-y-4 px-1">
      {/* 중요 메모 (최상단, 강조) */}
      {noteData.importantMemo && (
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <h3 className="font-semibold text-sm text-primary">중요 메모</h3>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-6">
            {noteData.importantMemo}
          </p>
        </div>
      )}

      {/* 메이크업샵 정보 */}
      {hasMakeupShop && (
        <div className="space-y-2">
          <ViewSection
            icon={Sparkles}
            title="메이크업샵"
            subtitle={noteData.makeupShop?.name}
          />
          {(noteData.makeupShop?.departureTime || noteData.makeupShop?.arrivalTime) && (
            <div className="pl-7 flex items-center gap-3 text-sm">
              {noteData.makeupShop?.departureTime && (
                <span className="text-muted-foreground">
                  출발 <span className="text-foreground font-medium">{noteData.makeupShop.departureTime}</span>
                </span>
              )}
              {noteData.makeupShop?.departureTime && noteData.makeupShop?.arrivalTime && (
                <span className="text-border">•</span>
              )}
              {noteData.makeupShop?.arrivalTime && (
                <span className="text-muted-foreground">
                  도착 <span className="text-foreground font-medium">{noteData.makeupShop.arrivalTime}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 드레스 정보 */}
      {hasDress && (
        <div className="space-y-2">
          <ViewSection
            icon={Scissors}
            title="드레스"
            subtitle={noteData.dress?.company}
          />
          {(noteData.dress?.type || noteData.dress?.material) && (
            <div className="pl-7 flex items-center gap-3 text-sm">
              <InlineField label="종류" value={noteData.dress?.type} />
              {noteData.dress?.type && noteData.dress?.material && <span className="text-border">•</span>}
              <InlineField label="재질/장식" value={noteData.dress?.material} />
            </div>
          )}
        </div>
      )}

      {/* 직계 가족 */}
      {hasFamilyRelations && (
        <div className="space-y-2">
          <ViewSection icon={Users} title="직계 가족" />
          <div className="pl-7 flex items-center gap-3 text-sm">
            <InlineField label="신랑측" value={noteData.familyRelations?.groomFamily} />
            {noteData.familyRelations?.groomFamily && noteData.familyRelations?.brideFamily && (
              <span className="text-border">|</span>
            )}
            <InlineField label="신부측" value={noteData.familyRelations?.brideFamily} />
          </div>
        </div>
      )}

      {/* 예식 정보 */}
      {(hasCeremonyHost || hasCeremonyEvents) && (
        <div className="space-y-2">
          <ViewSection icon={Palette} title="예식 정보" />

          {noteData.ceremony?.host?.type && (
            <div className="pl-7 text-sm">
              <InlineField label="사회자" value={getHostTypeLabel(noteData.ceremony.host.type)} />
            </div>
          )}

          {noteData.ceremony?.host?.memo && (
            <div className="pl-7 text-sm text-muted-foreground">
              {noteData.ceremony.host.memo}
            </div>
          )}

          {selectedEvents.length > 0 && (
            <div className="pl-7 flex flex-wrap gap-1.5">
              {selectedEvents.map((event, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                  {event}
                </Badge>
              ))}
            </div>
          )}

          {noteData.ceremony?.events?.memo && (
            <div className="pl-7 text-sm text-foreground whitespace-pre-wrap">
              {noteData.ceremony.events.memo}
            </div>
          )}
        </div>
      )}

      {/* 서브 */}
      {hasSubPhotographer && (
        <div className="space-y-2">
          <ViewSection icon={Camera} title="서브" />
          <div className="pl-7 flex items-center gap-3 text-sm">
            <InlineField label="영상/DVD" value={noteData.subPhotographer?.videoDvd} />
            {noteData.subPhotographer?.videoDvd && noteData.subPhotographer?.subIphoneSnap && (
              <span className="text-border">•</span>
            )}
            <InlineField label="서브/아이폰" value={noteData.subPhotographer?.subIphoneSnap} />
          </div>
        </div>
      )}

      {/* 사진 컨셉 메모 */}
      {noteData.photoConceptMemo && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-primary/10 flex-shrink-0">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="font-medium text-sm">사진 컨셉 메모</h3>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-7">
            {noteData.photoConceptMemo}
          </p>
        </div>
      )}

      {/* 요청사항 */}
      {noteData.requestsMemo && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-primary/10 flex-shrink-0">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="font-medium text-sm">요청사항</h3>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-7">
            {noteData.requestsMemo}
          </p>
        </div>
      )}
    </div>
  )
}
