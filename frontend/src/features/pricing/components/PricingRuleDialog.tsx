import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X, AlertCircle, Upload, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTags } from '@/features/schedule/hooks/useTags'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { CalendarIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { toast } from 'sonner'
import {
  fetchPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  applyPricingRules,
  parseDate,
  type PricingRuleResponse
} from '../api/pricingApi'
import { useQueryClient } from '@tanstack/react-query'

interface PricingRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface PricingRule {
  id?: number
  location?: string      // 지역
  venue?: string         // 장소(예식장)
  hall?: string          // 홀
  startDate?: Date       // 기간 시작
  endDate?: Date         // 기간 끝
  brand?: string         // 브랜드
  album?: string         // 앨범종류
  price: number          // 단가
  description?: string   // 설명(메모)
}

export function PricingRuleDialog({ open, onOpenChange }: PricingRuleDialogProps) {
  const { data: brandTags = [] } = useTags('brand')
  const { data: albumTags = [] } = useTags('album')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // 현재 편집 중인 규칙
  const [currentRule, setCurrentRule] = useState<PricingRule>({
    price: 0
  })

  // 저장된 규칙 목록
  const [rules, setRules] = useState<PricingRuleResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  // 선택된 규칙 ID 목록
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([])

  // 편집 모드 (새 규칙 or 수정)
  const [editMode, setEditMode] = useState<'new' | 'edit'>('new')
  const [editingId, setEditingId] = useState<number | null>(null)

  // 날짜 선택 팝오버 상태
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  // 다이얼로그 열릴 때 규칙 목록 불러오기
  useEffect(() => {
    if (open && user) {
      loadRules()
    }
  }, [open, user])

  // 규칙 목록 불러오기
  const loadRules = async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await fetchPricingRules(user.id)
      // 날짜 문자열을 Date 객체로 변환
      const rulesWithDates = data.map(rule => ({
        ...rule,
        startDate: rule.start_date ? parseDate(rule.start_date) : undefined,
        endDate: rule.end_date ? parseDate(rule.end_date) : undefined
      }))
      setRules(rulesWithDates)
    } catch (error) {
      console.error('Failed to load pricing rules:', error)
      toast.error('단가 규칙을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 규칙 추가/수정
  const handleSaveRule = async () => {
    if (!user) return

    // 값 정규화 함수 (undefined와 빈 문자열을 동일하게 취급)
    const normalize = (val: string | undefined) => val || undefined

    // 중복 체크 (단가 제외)
    const isDuplicate = rules.some(rule => {
      // 수정 중인 항목은 제외
      if (rule.id === editingId) return false

      const locationMatch = normalize(rule.location) === normalize(currentRule.location)
      const venueMatch = normalize(rule.venue) === normalize(currentRule.venue)
      const hallMatch = normalize(rule.hall) === normalize(currentRule.hall)
      const brandMatch = normalize(rule.brand) === normalize(currentRule.brand)
      const albumMatch = normalize(rule.album) === normalize(currentRule.album)

      // 날짜 비교: 둘 다 없거나, 둘 다 있고 같거나 (한쪽만 있으면 다름)
      const startDateMatch = (!rule.startDate && !currentRule.startDate) ||
                             (rule.startDate && currentRule.startDate &&
                              rule.startDate.getTime() === currentRule.startDate.getTime())
      const endDateMatch = (!rule.endDate && !currentRule.endDate) ||
                           (rule.endDate && currentRule.endDate &&
                            rule.endDate.getTime() === currentRule.endDate.getTime())

      return locationMatch && venueMatch && hallMatch && brandMatch && albumMatch &&
             startDateMatch && endDateMatch
    })

    if (isDuplicate) {
      toast.error('동일한 조건의 단가 규칙이 이미 존재합니다.')
      return
    }

    setLoading(true)
    try {
      if (editMode === 'edit' && editingId !== null) {
        // 수정
        await updatePricingRule(user.id, editingId, currentRule)
        toast.success('단가 규칙이 수정되었습니다.')
      } else {
        // 새로 추가
        await createPricingRule(user.id, currentRule)
        toast.success('단가 규칙이 추가되었습니다.')
      }

      // 목록 새로고침
      await loadRules()

      // 초기화
      handleNewRule()
    } catch (error) {
      console.error('Failed to save pricing rule:', error)
      toast.error('단가 규칙 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 새 규칙으로 저장
  const handleSaveAsNew = async () => {
    if (!user) return

    // 값 정규화 함수 (undefined와 빈 문자열을 동일하게 취급)
    const normalize = (val: string | undefined) => val || undefined

    // 중복 체크 (모든 규칙과 비교, 단가 제외)
    const isDuplicate = rules.some(rule => {
      const locationMatch = normalize(rule.location) === normalize(currentRule.location)
      const venueMatch = normalize(rule.venue) === normalize(currentRule.venue)
      const hallMatch = normalize(rule.hall) === normalize(currentRule.hall)
      const brandMatch = normalize(rule.brand) === normalize(currentRule.brand)
      const albumMatch = normalize(rule.album) === normalize(currentRule.album)

      // 날짜 비교: 둘 다 없거나, 둘 다 있고 같거나 (한쪽만 있으면 다름)
      const startDateMatch = (!rule.startDate && !currentRule.startDate) ||
                             (rule.startDate && currentRule.startDate &&
                              rule.startDate.getTime() === currentRule.startDate.getTime())
      const endDateMatch = (!rule.endDate && !currentRule.endDate) ||
                           (rule.endDate && currentRule.endDate &&
                            rule.endDate.getTime() === currentRule.endDate.getTime())

      return locationMatch && venueMatch && hallMatch && brandMatch && albumMatch &&
             startDateMatch && endDateMatch
    })

    if (isDuplicate) {
      toast.error('동일한 조건의 단가 규칙이 이미 존재합니다.')
      return
    }

    setLoading(true)
    try {
      // 무조건 새로 추가
      await createPricingRule(user.id, currentRule)
      toast.success('새 단가 규칙이 추가되었습니다.')

      // 목록 새로고침
      await loadRules()

      // 초기화
      handleNewRule()
    } catch (error) {
      console.error('Failed to save pricing rule:', error)
      toast.error('단가 규칙 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 새 규칙 생성
  const handleNewRule = () => {
    setCurrentRule({ price: 0 })
    setEditMode('new')
    setEditingId(null)
  }

  // 규칙 선택 (수정 모드)
  const handleSelectRule = (rule: PricingRuleResponse) => {
    setCurrentRule({
      location: rule.location,
      venue: rule.venue,
      startDate: rule.startDate,
      endDate: rule.endDate,
      brand: rule.brand,
      album: rule.album,
      price: rule.price,
      description: rule.description
    })
    setEditMode('edit')
    setEditingId(rule.id || null)
  }

  // 규칙 삭제
  // 삭제 확인 다이얼로그 열기
  const handleDeleteRule = (id: number) => {
    setDeleteTargetId(id)
    setConfirmDeleteOpen(true)
  }

  // 실제 삭제 실행
  const confirmDeleteRule = async () => {
    if (!user || !deleteTargetId) return

    setLoading(true)
    try {
      await deletePricingRule(user.id, deleteTargetId)
      toast.success('단가 규칙이 삭제되었습니다.')

      // 목록 새로고침
      await loadRules()

      // 다이얼로그 닫기
      setConfirmDeleteOpen(false)
      setDeleteTargetId(null)
    } catch (error) {
      console.error('Failed to delete pricing rule:', error)
      toast.error('단가 규칙 삭제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 스케줄에 적용 확인 다이얼로그 열기
  const handleApplyToSchedules = () => {
    setConfirmApplyOpen(true)
  }

  // 실제 스케줄 적용 실행
  const confirmApplyToSchedules = async () => {
    if (!user) return

    if (selectedRuleIds.length === 0) {
      toast.error('적용할 단가 규칙을 선택해주세요.')
      return
    }

    setApplying(true)
    try {
      const result = await applyPricingRules(user.id, selectedRuleIds)
      toast.success(result.message)

      // 스케줄 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['schedules'] })

      // 확인 다이얼로그만 닫기 (메인 다이얼로그는 유지)
      setConfirmApplyOpen(false)
    } catch (error) {
      console.error('Failed to apply pricing rules:', error)
      toast.error('단가 규칙 적용에 실패했습니다.')
    } finally {
      setApplying(false)
    }
  }

  // 규칙 선택 토글
  const toggleRuleSelection = (ruleId: number) => {
    setSelectedRuleIds(prev =>
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    )
  }

  // 전체 선택/해제 토글
  const toggleAllSelection = () => {
    if (selectedRuleIds.length === rules.length) {
      setSelectedRuleIds([])
    } else {
      setSelectedRuleIds(rules.map(r => r.id!))
    }
  }

  // 규칙 설명 생성
  const getRuleDescription = (rule: PricingRule) => {
    const parts = []
    if (rule.location) parts.push(rule.location)
    if (rule.venue) parts.push(rule.venue)
    if (rule.hall) parts.push(rule.hall)
    if (rule.brand) parts.push(rule.brand)
    if (rule.album) parts.push(rule.album)

    // 기간 표시 (한쪽만 있어도 표시)
    if (rule.startDate && rule.endDate) {
      parts.push(`${format(rule.startDate, 'yyyy.MM.dd', { locale: ko })}~${format(rule.endDate, 'yyyy.MM.dd', { locale: ko })}`)
    } else if (rule.startDate) {
      parts.push(`${format(rule.startDate, 'yyyy.MM.dd', { locale: ko })}~`)
    } else if (rule.endDate) {
      parts.push(`~${format(rule.endDate, 'yyyy.MM.dd', { locale: ko })}`)
    }

    return parts.length > 0 ? parts.join(' · ') : '전체 적용'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-md:border-0 max-md:shadow-none max-md:left-0 max-md:top-0 max-md:translate-x-0 max-md:translate-y-0 max-md:h-screen max-md:w-screen max-md:max-w-none max-md:max-h-none max-md:rounded-none md:max-w-3xl md:max-h-[90vh] overflow-y-auto p-0"
        hideClose
      >
        {/* 커스텀 헤더 */}
        <div className="sticky top-0 bg-background z-10">
          <div className="flex items-center gap-3 px-3 py-4 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <DialogTitle className="text-left">촬영비 단가 설정</DialogTitle>
              <DialogDescription className="text-left">
                조건별 촬영 단가를 설정하고 기존 스케줄에 일괄 적용할 수 있습니다.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="px-[5px] pb-[5px] md:px-6 md:pb-6">

        <div className="space-y-4 md:space-y-6">
          {/* 단가 규칙 입력 폼 */}
          <Card className="max-md:border-0 max-md:shadow-none max-md:bg-transparent max-md:px-2 max-md:py-4 md:p-4">
            <div className="grid gap-4">
              {/* 지역/장소/홀 - 모바일 2열, 데스크탑 3열 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location">지역</Label>
                  <Input
                    id="location"
                    value={currentRule.location || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, location: e.target.value })}
                    placeholder="예: 서울, 경기, 부산 .."
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="venue">장소(예식장)</Label>
                  <Input
                    id="venue"
                    value={currentRule.venue || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, venue: e.target.value })}
                    placeholder="예: 신라호텔"
                    className="text-base"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label htmlFor="hall">홀</Label>
                  <Input
                    id="hall"
                    value={currentRule.hall || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, hall: e.target.value })}
                    placeholder="예: 컨벤션, 체플 .."
                    className="text-base"
                  />
                </div>
              </div>

              {/* 기간/브랜드/앨범 - 모바일 2열, 데스크탑 4열 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>기간 시작</Label>
                  <div className="flex gap-1">
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'flex-1 justify-start text-left font-normal text-base',
                            !currentRule.startDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentRule.startDate
                            ? format(currentRule.startDate, 'yyyy.MM.dd', { locale: ko })
                            : '시작'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={currentRule.startDate}
                          onSelect={(date) => {
                            setCurrentRule({ ...currentRule, startDate: date || undefined })
                            setStartDateOpen(false)
                          }}
                          defaultMonth={currentRule.startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {currentRule.startDate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-5"
                        onClick={() => setCurrentRule({ ...currentRule, startDate: undefined })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label>기간 종료</Label>
                  <div className="flex gap-1">
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'flex-1 justify-start text-left font-normal text-base',
                            !currentRule.endDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentRule.endDate
                            ? format(currentRule.endDate, 'yyyy.MM.dd', { locale: ko })
                            : '종료'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={currentRule.endDate}
                          onSelect={(date) => {
                            setCurrentRule({ ...currentRule, endDate: date || undefined })
                            setEndDateOpen(false)
                          }}
                          disabled={(date) =>
                            currentRule.startDate ? date < currentRule.startDate : false
                          }
                          defaultMonth={currentRule.endDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {currentRule.endDate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-5"
                        onClick={() => setCurrentRule({ ...currentRule, endDate: undefined })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="brand">브랜드</Label>
                  <Select
                    value={currentRule.brand || 'all'}
                    onValueChange={(value) => setCurrentRule({ ...currentRule, brand: value === 'all' ? undefined : value })}
                  >
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {brandTags.map(tag => (
                        <SelectItem key={tag.id} value={tag.tag_value}>
                          {tag.tag_value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="album">앨범종류</Label>
                  <Select
                    value={currentRule.album || 'all'}
                    onValueChange={(value) => setCurrentRule({ ...currentRule, album: value === 'all' ? undefined : value })}
                  >
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {albumTags.map(tag => (
                        <SelectItem key={tag.id} value={tag.tag_value}>
                          {tag.tag_value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 단가/메모 - 모바일 1열, 데스크탑 2열 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">단가 *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="10000"
                    value={currentRule.price || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, price: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    required
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="description">메모</Label>
                  <Input
                    id="description"
                    value={currentRule.description || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, description: e.target.value })}
                    placeholder="예: 평일 촬영, 추가 금액"
                    className="text-base"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {editMode === 'edit' ? (
                  <>
                    <Button
                      onClick={handleSaveRule}
                      disabled={!currentRule.price || currentRule.price === 0 || loading}
                      className="flex-1"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      수정
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSaveAsNew}
                      disabled={!currentRule.price || currentRule.price === 0 || loading}
                      className="flex-1"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="max-md:hidden">새 규칙으로 저장</span>
                      <span className="md:hidden">새로 저장</span>
                    </Button>
                    <Button variant="outline" onClick={handleNewRule} disabled={loading}>
                      <X className="mr-2 h-4 w-4" />
                      취소
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSaveRule}
                    disabled={!currentRule.price || currentRule.price === 0 || loading}
                    className="flex-1"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="max-md:hidden">단가 규칙 추가</span>
                    <span className="md:hidden">추가</span>
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* 단가 규칙 목록 */}
          {rules.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">등록된 단가 규칙 ({rules.length}개)</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllSelection}
                >
                  {selectedRuleIds.length === rules.length ? '전체 해제' : '전체 선택'}
                </Button>
              </div>
              <div className="space-y-2 max-h-[32rem] overflow-y-auto">
                {rules.map((rule) => (
                  <Card
                    key={rule.id}
                    className={cn(
                      "p-2.5 cursor-pointer transition-colors hover:bg-accent/50",
                      selectedRuleIds.includes(rule.id!) && "border-2 border-primary bg-accent/30"
                    )}
                    onClick={() => toggleRuleSelection(rule.id!)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {getRuleDescription(rule)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-primary">
                            {rule.price.toLocaleString()}원
                          </span>
                          {rule.description && (
                            <span className="text-xs text-muted-foreground">
                              ({rule.description})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectRule(rule)
                          }}
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRule(rule.id!)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 하단 액션 버튼 */}
          {rules.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                선택된 단가 규칙을 기존 스케줄에 적용하면, 조건이 일치하는 모든 스케줄의 촬영비가 업데이트됩니다.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
              닫기
            </Button>
            {rules.length > 0 && (
              <Button onClick={handleApplyToSchedules} disabled={applying}>
                {applying ? '적용 중...' : '기존 스케줄에 적용'}
              </Button>
            )}
          </div>
        </div>
        </div>
      </DialogContent>

      {/* 스케줄 적용 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmApplyOpen}
        onOpenChange={setConfirmApplyOpen}
        title="기존 스케줄에 적용"
        description={`선택된 ${selectedRuleIds.length}개의 단가 규칙을 기존 스케줄에 적용하시겠습니까? 조건이 일치하는 모든 스케줄의 촬영비가 업데이트됩니다.`}
        confirmText="적용"
        cancelText="취소"
        onConfirm={confirmApplyToSchedules}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="단가 규칙 삭제"
        description="이 단가 규칙을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        variant="destructive"
        onConfirm={confirmDeleteRule}
      />
    </Dialog>
  )
}