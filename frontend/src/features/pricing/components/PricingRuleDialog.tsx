import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { ContentModal } from '@/components/common/ContentModal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTags } from '@/features/schedule/hooks/useTags'
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
import { logger } from '@/lib/utils/logger'
import { PricingRuleForm } from './PricingRuleForm'
import { PricingRuleList } from './PricingRuleList'
import { isDuplicatePricingRule } from '../utils/pricingValidation'

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
      logger.error('Failed to load pricing rules:', error)
      toast.error('단가 규칙을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 규칙 추가/수정
  const handleSaveRule = async () => {
    if (!user) return

    // 중복 체크 (단가 제외)
    if (isDuplicatePricingRule(currentRule, rules, editingId ?? undefined)) {
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
      logger.error('Failed to save pricing rule:', error)
      toast.error('단가 규칙 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 새 규칙으로 저장
  const handleSaveAsNew = async () => {
    if (!user) return

    // 중복 체크 (모든 규칙과 비교, 단가 제외)
    if (isDuplicatePricingRule(currentRule, rules)) {
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
      logger.error('Failed to save pricing rule:', error)
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
      logger.error('Failed to delete pricing rule:', error)
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
      logger.error('Failed to apply pricing rules:', error)
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

  return (
    <>
      <ContentModal
        open={open}
        onOpenChange={onOpenChange}
        size="fullscreen-mobile"
        className="sm:max-w-3xl"
        title="촬영비 단가 설정"
        subtitle="조건별 촬영 단가를 설정하고 기존 스케줄에 일괄 적용할 수 있습니다."
        showFooter={true}
        footerContent={
          <div className="flex gap-2 w-full">
            <div className="flex-1"></div>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
              닫기
            </Button>
            {rules.length > 0 && (
              <Button onClick={handleApplyToSchedules} disabled={applying}>
                {applying ? '적용 중...' : '기존 스케줄에 적용'}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          {/* 단가 규칙 입력 폼 */}
          <PricingRuleForm
            currentRule={currentRule}
            onRuleChange={setCurrentRule}
            onSave={handleSaveRule}
            onSaveAsNew={handleSaveAsNew}
            onCancel={handleNewRule}
            editMode={editMode}
            loading={loading}
            brandTags={brandTags}
            albumTags={albumTags}
          />

          {/* 단가 규칙 목록 */}
          <PricingRuleList
            rules={rules}
            selectedIds={selectedRuleIds}
            onToggleSelection={toggleRuleSelection}
            onToggleAllSelection={toggleAllSelection}
            onEdit={handleSelectRule}
            onDelete={handleDeleteRule}
          />

          {/* 하단 액션 버튼 */}
          {rules.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                선택된 단가 규칙을 기존 스케줄에 적용하면, 조건이 일치하는 모든 스케줄의 촬영비가 업데이트됩니다.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </ContentModal>

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
    </>
  )
}
