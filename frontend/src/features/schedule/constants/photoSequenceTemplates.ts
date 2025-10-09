import type { PhotoSequenceItem } from '../types/schedule'

// 템플릿 1: 포즈컷 먼저 (기본)
export const TEMPLATE_POSE_FIRST: Omit<PhotoSequenceItem, 'id'>[] = [
  { text: '신랑신부 포즈컷', completed: false, order: 1 },
  { text: '신부 독사진', completed: false, order: 2 },
  { text: '신랑신부 정면', completed: false, order: 3 },
  { text: '양가 혼주', completed: false, order: 4 },
  { text: '전체 가족 친척', completed: false, order: 5 },
  { text: '신랑측 직계가족', completed: false, order: 6 },
  { text: '신부측 직계가족', completed: false, order: 7 },
  { text: '직장동료 우인', completed: false, order: 8 },
  { text: '부케 던지기', completed: false, order: 9 },
  { text: '플래시 컷', completed: false, order: 10 },
]

// 템플릿 2: 지인 먼저
export const TEMPLATE_FRIENDS_FIRST: Omit<PhotoSequenceItem, 'id'>[] = [
  { text: '직장동료 우인', completed: false, order: 1 },
  { text: '부케 던지기', completed: false, order: 2 },
  { text: '플래시 컷', completed: false, order: 3 },
  { text: '신랑신부 정면', completed: false, order: 4 },
  { text: '양가 혼주', completed: false, order: 5 },
  { text: '전체 가족 친척', completed: false, order: 6 },
  { text: '신랑측 직계가족', completed: false, order: 7 },
  { text: '신부측 직계가족', completed: false, order: 8 },
  { text: '신랑신부 포즈컷', completed: false, order: 9 },
  { text: '신부 독사진', completed: false, order: 10 },
]

// 템플릿 3: 포즈컷 나중에
export const TEMPLATE_POSE_LAST: Omit<PhotoSequenceItem, 'id'>[] = [
  { text: '신랑신부 정면', completed: false, order: 1 },
  { text: '양가 혼주', completed: false, order: 2 },
  { text: '전체 가족 친척', completed: false, order: 3 },
  { text: '신랑측 직계가족', completed: false, order: 4 },
  { text: '신부측 직계가족', completed: false, order: 5 },
  { text: '직장동료 우인', completed: false, order: 6 },
  { text: '부케 던지기', completed: false, order: 7 },
  { text: '플래시 컷', completed: false, order: 8 },
  { text: '신부 독사진', completed: false, order: 9 },
  { text: '신랑신부 포즈컷', completed: false, order: 10 },
]

export const DEFAULT_PHOTO_SEQUENCE = TEMPLATE_POSE_FIRST

export const PHOTO_SEQUENCE_TEMPLATES = {
  POSE_FIRST: { name: '포즈컷 먼저', items: TEMPLATE_POSE_FIRST },
  FRIENDS_FIRST: { name: '지인 먼저', items: TEMPLATE_FRIENDS_FIRST },
  POSE_LAST: { name: '포즈컷 나중에', items: TEMPLATE_POSE_LAST },
} as const

export type TemplateKey = keyof typeof PHOTO_SEQUENCE_TEMPLATES

export function generatePhotoSequence(template: Omit<PhotoSequenceItem, 'id'>[] = DEFAULT_PHOTO_SEQUENCE): PhotoSequenceItem[] {
  return template.map((item, index) => ({
    ...item,
    id: `seq-${Date.now()}-${index}`,
  }))
}
