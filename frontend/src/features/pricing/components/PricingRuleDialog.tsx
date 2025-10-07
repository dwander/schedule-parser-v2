import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, AlertCircle, Calculator } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

    // 중복 체크
    const isDuplicate = rules.some(rule =>
      rule.id !== editingId && // 수정 중인 항목 제외
      rule.location === currentRule.location &&
      rule.venue === currentRule.venue &&
      rule.brand === currentRule.brand &&
      rule.album === currentRule.album &&
      rule.startDate?.getTime() === currentRule.startDate?.getTime() &&
      rule.endDate?.getTime() === currentRule.endDate?.getTime()
    )

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
  const handleDeleteRule = async (id: number) => {
    if (!user) return

    if (!confirm('이 단가 규칙을 삭제하시겠습니까?')) return

    setLoading(true)
    try {
      await deletePricingRule(user.id, id)
      toast.success('단가 규칙이 삭제되었습니다.')

      // 목록 새로고침
      await loadRules()
    } catch (error) {
      console.error('Failed to delete pricing rule:', error)
      toast.error('단가 규칙 삭제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 스케줄에 적용
  const handleApplyToSchedules = async () => {
    if (!user) return

    if (!confirm('설정한 단가 규칙을 기존 스케줄에 적용하시겠습니까?\n조건이 일치하는 모든 스케줄의 촬영비가 업데이트됩니다.')) return

    setApplying(true)
    try {
      const result = await applyPricingRules(user.id)
      toast.success(result.message)

      // 스케줄 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['schedules'] })

      // 다이얼로그 닫기
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to apply pricing rules:', error)
      toast.error('단가 규칙 적용에 실패했습니다.')
    } finally {
      setApplying(false)
    }
  }

  // 규칙 설명 생성
  const getRuleDescription = (rule: PricingRule) => {
    const parts = []
    if (rule.location) parts.push(rule.location)
    if (rule.venue) parts.push(rule.venue)
    if (rule.brand) parts.push(rule.brand)
    if (rule.album) parts.push(rule.album)
    if (rule.startDate && rule.endDate) {
      parts.push(`${format(rule.startDate, 'MM/dd', { locale: ko })}~${format(rule.endDate, 'MM/dd', { locale: ko })}`)
    }
    return parts.length > 0 ? parts.join(' · ') : '전체 적용'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            촬영비 단가 설정
          </DialogTitle>
          <DialogDescription>
            조건별 촬영 단가를 설정하고 기존 스케줄에 일괄 적용할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 단가 규칙 입력 폼 */}
          <Card className="p-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">지역</Label>
                  <Input
                    id="location"
                    value={currentRule.location || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, location: e.target.value })}
                    placeholder="예: 서울, 경기"
                  />
                </div>
                <div>
                  <Label htmlFor="venue">장소(예식장)</Label>
                  <Input
                    id="venue"
                    value={currentRule.venue || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, venue: e.target.value })}
                    placeholder="예: 그랜드볼룸"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>기간 (선택)</Label>
                  <div className="flex gap-2">
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'flex-1 justify-start text-left font-normal',
                            !currentRule.startDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentRule.startDate
                            ? format(currentRule.startDate, 'MM/dd', { locale: ko })
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'flex-1 justify-start text-left font-normal',
                            !currentRule.endDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentRule.endDate
                            ? format(currentRule.endDate, 'MM/dd', { locale: ko })
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">브랜드</Label>
                    <Select
                      value={currentRule.brand || 'all'}
                      onValueChange={(value) => setCurrentRule({ ...currentRule, brand: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger>
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
                      <SelectTrigger>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">단가 *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={currentRule.price || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, price: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">규칙이름 (선택)</Label>
                  <Input
                    id="description"
                    value={currentRule.description || ''}
                    onChange={(e) => setCurrentRule({ ...currentRule, description: e.target.value })}
                    placeholder="예: 주말 할증, 성수기 요금"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveRule}
                  disabled={!currentRule.price || currentRule.price === 0 || loading}
                  className="flex-1"
                >
                  {editMode === 'edit' ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      수정
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      단가 규칙 추가
                    </>
                  )}
                </Button>
                {editMode === 'edit' && (
                  <Button variant="outline" onClick={handleNewRule} disabled={loading}>
                    <X className="mr-2 h-4 w-4" />
                    취소
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* 단가 규칙 목록 */}
          {rules.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">등록된 단가 규칙 ({rules.length}개)</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {rules.map((rule) => (
                  <Card
                    key={rule.id}
                    className={cn(
                      "p-3 cursor-pointer transition-colors",
                      editingId === rule.id && "ring-2 ring-primary"
                    )}
                    onClick={() => handleSelectRule(rule)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {getRuleDescription(rule)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-bold text-primary">
                            {rule.price.toLocaleString()}원
                          </span>
                          {rule.description && (
                            <span className="text-xs text-muted-foreground">
                              ({rule.description})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectRule(rule)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRule(rule.id!)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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
                설정한 단가 규칙을 기존 스케줄에 적용하면, 조건이 일치하는 모든 스케줄의 촬영비가 업데이트됩니다.
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
      </DialogContent>
    </Dialog>
  )
}