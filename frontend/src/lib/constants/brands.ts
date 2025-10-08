import { Brand } from '@/features/schedule/types/schedule'

export const BRANDS: Brand[] = ['K7', 'B7', 'A+', 'Graphy', '2ndFlow']

export const BRAND_COLORS: Record<Brand, string> = {
  K7: 'bg-blue-500',
  B7: 'bg-purple-500',
  'A+': 'bg-orange-500',
  Graphy: 'bg-green-500',
  '2ndFlow': 'bg-pink-500',
}

/**
 * 브랜드명을 폴더 접두사로 변환하는 매핑
 */
export const BRAND_FOLDER_PREFIX_MAP: Record<string, string> = {
  '세컨플로루': '세컨',
  '더그라피': '더그',
  'A 세븐스프리미엄': '세프',
} as const
