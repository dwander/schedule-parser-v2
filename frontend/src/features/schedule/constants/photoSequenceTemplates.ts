import type { PhotoSequenceItem } from '../types/schedule'

export const DEFAULT_PHOTO_SEQUENCE: Omit<PhotoSequenceItem, 'id'>[] = [
  { text: '신랑신부 포즈컷', completed: false, order: 1 },
  { text: '신부 독사진', completed: false, order: 2 },
  { text: '신랑신부 정면', completed: false, order: 3 },
  { text: '양가혼주', completed: false, order: 4 },
  { text: '전체 가족 친척', completed: false, order: 5 },
  { text: '신랑측 직계가족', completed: false, order: 6 },
  { text: '신부측 직계가족', completed: false, order: 7 },
  { text: '직장동료 친구 지인', completed: false, order: 8 },
  { text: '부케 던지기', completed: false, order: 9 },
  { text: '플래시 컷', completed: false, order: 10 },
]

export function generatePhotoSequence(template: Omit<PhotoSequenceItem, 'id'>[] = DEFAULT_PHOTO_SEQUENCE): PhotoSequenceItem[] {
  return template.map((item, index) => ({
    ...item,
    id: `seq-${Date.now()}-${index}`,
  }))
}
