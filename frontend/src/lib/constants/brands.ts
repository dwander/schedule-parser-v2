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
 * @deprecated 이제 설정 > 폴더 설정 > 브랜드 단축어에서 관리합니다
 */
export const BRAND_FOLDER_PREFIX_MAP: Record<string, string> = {} as const
