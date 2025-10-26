import type { Schedule } from '@/features/schedule/types/schedule'
import { BRAND_FOLDER_PREFIX_MAP } from '@/lib/constants/brands'
import { PHOTO_CONSTANTS } from '@/lib/constants/schedule'

/**
 * 폴더명 포맷에서 키워드를 실제 값으로 치환
 * @param format - 폴더명 포맷 ([BRAND], [DATE] 등의 키워드 포함)
 * @param schedule - 스케줄 정보
 * @param brandShortcuts - 브랜드 단축어 맵
 * @param locationShortcuts - 장소 단축어 맵
 * @returns 키워드가 치환된 폴더명
 */
function replaceKeywords(
  format: string,
  schedule: Schedule,
  brandShortcuts?: Record<string, string>,
  locationShortcuts?: Record<string, string>
): string {
  // 브랜드 매핑 (우선순위: 사용자 설정 단축어 > 레거시 매핑)
  // 단축어가 빈 문자열("")인 경우에도 적용되도록 키 존재 여부를 명시적으로 확인
  const brandPrefix = brandShortcuts && schedule.brand in brandShortcuts
    ? brandShortcuts[schedule.brand]
    : BRAND_FOLDER_PREFIX_MAP[schedule.brand] || schedule.brand

  // 시간 형식 변환: "14:00" → "14시", "14:30" → "14시30분"
  const [hours, minutes] = schedule.time.split(':')
  const timeStr = minutes === '00' ? `${hours}시` : `${hours}시${minutes}분`

  // 장소 매핑 (사용자 설정 단축어 우선)
  // 단축어가 빈 문자열("")인 경우에도 적용되도록 키 존재 여부를 명시적으로 확인
  const locationText = locationShortcuts && schedule.location in locationShortcuts
    ? locationShortcuts[schedule.location]
    : schedule.location

  // 컷수 계산
  const totalCuts = schedule.cuts ? schedule.cuts * PHOTO_CONSTANTS.CUTS_MULTIPLIER : 0

  // 키워드 치환
  let result = format
    .replace(/\[BRAND\]/g, brandPrefix)
    .replace(/\[DATE\]/g, schedule.date)
    .replace(/\[TIME\]/g, timeStr)
    .replace(/\[LOCATION\]/g, locationText)
    .replace(/\[COUPLE\]/g, schedule.couple)
    .replace(/\[PHOTOGRAPHER\]/g, schedule.photographer || '')
    .replace(/\[CUTS\]/g, totalCuts.toString())

  // 빈 괄호 정리: () → 제거, ( ) → 제거
  result = result.replace(/\(\s*\)/g, '')

  // 연속된 공백을 하나로
  result = result.replace(/\s+/g, ' ')

  // 앞뒤 공백 제거
  result = result.trim()

  // 마지막 정리: ' -' 또는 '- ' 같은 불필요한 구분자 제거
  result = result.replace(/\s*-\s*$/g, '')
  result = result.replace(/^\s*-\s*/g, '')

  return result
}

/**
 * 스케줄 정보를 기반으로 폴더명 생성 (설정된 포맷 사용)
 * @param schedule - 스케줄 정보
 * @param format - 폴더명 포맷 (기본값: 레거시 포맷)
 * @param brandShortcuts - 브랜드 단축어 맵
 * @param locationShortcuts - 장소 단축어 맵
 * @returns 생성된 폴더명
 */
export function generateFolderName(
  schedule: Schedule,
  format?: { normal: string; noCuts: string },
  brandShortcuts?: Record<string, string>,
  locationShortcuts?: Record<string, string>
): string {
  // 컷수 유무에 따라 포맷 선택
  const hasCuts = schedule.cuts && schedule.cuts > 0

  // 포맷이 제공되지 않으면 레거시 기본 포맷 사용
  const selectedFormat = format
    ? hasCuts
      ? format.normal
      : format.noCuts
    : hasCuts
    ? '[BRAND] [DATE] [TIME] [LOCATION]([COUPLE]) - [PHOTOGRAPHER]([CUTS])'
    : '[BRAND] [DATE] [TIME] [LOCATION]([COUPLE])'

  return replaceKeywords(selectedFormat, schedule, brandShortcuts, locationShortcuts)
}
