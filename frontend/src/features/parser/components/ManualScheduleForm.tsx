import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePickerCell } from '@/features/schedule/components/DatePickerCell'
import { TimePickerCell } from '@/features/schedule/components/TimePickerCell'

interface ManualScheduleFormData {
  date: string
  time: string
  location: string
  groom: string
  bride: string
  contact: string
  memo: string
}

interface ManualScheduleFormProps {
  formData: ManualScheduleFormData
  onChange: (formData: ManualScheduleFormData) => void
}

export function ManualScheduleForm({ formData, onChange }: ManualScheduleFormProps) {
  const updateField = (field: keyof ManualScheduleFormData, value: string) => {
    onChange({ ...formData, [field]: value })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>날짜</Label>
        <DatePickerCell
          value={formData.date}
          onSave={(value) => updateField('date', value)}
        />
      </div>

      <div className="space-y-2">
        <Label>시간</Label>
        <TimePickerCell
          value={formData.time}
          onSave={(value) => updateField('time', value)}
        />
      </div>

      <div className="space-y-2 col-span-2">
        <Label htmlFor="manual-location">장소</Label>
        <Input
          id="manual-location"
          value={formData.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="예: 서울 강남구 웨딩홀"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-groom">신랑</Label>
        <Input
          id="manual-groom"
          value={formData.groom}
          onChange={(e) => updateField('groom', e.target.value)}
          placeholder="신랑 이름"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-bride">신부</Label>
        <Input
          id="manual-bride"
          value={formData.bride}
          onChange={(e) => updateField('bride', e.target.value)}
          placeholder="신부 이름"
        />
      </div>

      <div className="space-y-2 col-span-2">
        <Label htmlFor="manual-contact">연락처</Label>
        <Input
          id="manual-contact"
          value={formData.contact}
          onChange={(e) => updateField('contact', e.target.value)}
          placeholder="예: 010-1234-5678"
        />
      </div>

      <div className="space-y-2 col-span-2">
        <Label htmlFor="manual-memo">전달사항</Label>
        <Textarea
          id="manual-memo"
          value={formData.memo}
          onChange={(e) => {
            updateField('memo', e.target.value)
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
  )
}
