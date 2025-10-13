import { useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
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
import type { PricingRule } from './PricingRuleDialog'
import type { Tag } from '@/features/schedule/api/tagApi'

interface PricingRuleFormProps {
  currentRule: PricingRule
  onRuleChange: (rule: PricingRule) => void
  onSave: () => void
  onSaveAsNew?: () => void
  onCancel?: () => void
  editMode: 'new' | 'edit'
  loading: boolean
  brandTags: Tag[]
  albumTags: Tag[]
}

export function PricingRuleForm({
  currentRule,
  onRuleChange,
  onSave,
  onSaveAsNew,
  onCancel,
  editMode,
  loading,
  brandTags,
  albumTags
}: PricingRuleFormProps) {
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  return (
    <Card className="max-md:border-0 max-md:shadow-none max-md:bg-transparent max-md:px-2 max-md:py-4 md:p-4">
      <div className="grid gap-4">
        {/* 지역/장소/홀 - 모바일 2열, 데스크탑 3열 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="location">지역</Label>
            <Input
              id="location"
              value={currentRule.location || ''}
              onChange={(e) => onRuleChange({ ...currentRule, location: e.target.value })}
              placeholder="예: 서울, 경기, 부산 .."
              className="text-base"
            />
          </div>
          <div>
            <Label htmlFor="venue">장소(예식장)</Label>
            <Input
              id="venue"
              value={currentRule.venue || ''}
              onChange={(e) => onRuleChange({ ...currentRule, venue: e.target.value })}
              placeholder="예: 신라호텔"
              className="text-base"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <Label htmlFor="hall">홀</Label>
            <Input
              id="hall"
              value={currentRule.hall || ''}
              onChange={(e) => onRuleChange({ ...currentRule, hall: e.target.value })}
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
                      onRuleChange({ ...currentRule, startDate: date || undefined })
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
                  onClick={() => onRuleChange({ ...currentRule, startDate: undefined })}
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
                      onRuleChange({ ...currentRule, endDate: date || undefined })
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
                  onClick={() => onRuleChange({ ...currentRule, endDate: undefined })}
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
              onValueChange={(value) => onRuleChange({ ...currentRule, brand: value === 'all' ? undefined : value })}
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
              onValueChange={(value) => onRuleChange({ ...currentRule, album: value === 'all' ? undefined : value })}
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
              onChange={(e) => onRuleChange({ ...currentRule, price: parseInt(e.target.value) || 0 })}
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
              onChange={(e) => onRuleChange({ ...currentRule, description: e.target.value })}
              placeholder="예: 평일 촬영, 추가 금액"
              className="text-base"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {editMode === 'edit' ? (
            <>
              <Button
                onClick={onSave}
                disabled={!currentRule.price || currentRule.price === 0 || loading}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                수정
              </Button>
              <Button
                variant="secondary"
                onClick={onSaveAsNew}
                disabled={!currentRule.price || currentRule.price === 0 || loading}
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="max-md:hidden">새 규칙으로 저장</span>
                <span className="md:hidden">새로 저장</span>
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                <X className="mr-2 h-4 w-4" />
                취소
              </Button>
            </>
          ) : (
            <Button
              onClick={onSave}
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
  )
}
