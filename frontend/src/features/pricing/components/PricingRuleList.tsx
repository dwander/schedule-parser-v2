import { Upload, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { PricingRule } from './PricingRuleDialog'
import type { PricingRuleResponse } from '../api/pricingApi'

interface PricingRuleListProps {
  rules: PricingRuleResponse[]
  selectedIds: number[]
  onToggleSelection: (id: number) => void
  onToggleAllSelection: () => void
  onEdit: (rule: PricingRuleResponse) => void
  onDelete: (id: number) => void
}

/**
 * 규칙 설명 생성 함수
 */
function getRuleDescription(rule: PricingRule): string {
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

export function PricingRuleList({
  rules,
  selectedIds,
  onToggleSelection,
  onToggleAllSelection,
  onEdit,
  onDelete
}: PricingRuleListProps) {
  if (rules.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">등록된 단가 규칙 ({rules.length}개)</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleAllSelection}
        >
          {selectedIds.length === rules.length ? '전체 해제' : '전체 선택'}
        </Button>
      </div>
      <div className="space-y-2 max-h-[32rem] overflow-y-auto">
        <ScrollArea className="h-full">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className={cn(
                "p-2.5 cursor-pointer transition-colors hover:bg-accent/50 mb-2",
                selectedIds.includes(rule.id!) && "border-2 border-primary bg-accent/30"
              )}
              onClick={() => onToggleSelection(rule.id!)}
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
                      onEdit(rule)
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
                      onDelete(rule.id!)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </ScrollArea>
      </div>
    </div>
  )
}
