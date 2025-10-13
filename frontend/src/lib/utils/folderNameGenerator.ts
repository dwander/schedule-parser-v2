import type { Schedule } from '@/features/schedule/types/schedule'
import { BRAND_FOLDER_PREFIX_MAP } from '@/lib/constants/brands'
import { PHOTO_CONSTANTS } from '@/lib/constants/schedule'

/**
 * 스케줄 정보를 기반으로 폴더명 생성
 * @param schedule - 스케줄 정보
 * @returns 생성된 폴더명
 */
export function generateFolderName(schedule: Schedule): string {
  // 브랜드 매핑
  const brandPrefix = BRAND_FOLDER_PREFIX_MAP[schedule.brand] || ''

  // 시간 형식 변환: "14:00" → "14시", "14:30" → "14시30분"
  const [hours, minutes] = schedule.time.split(':')
  const timeStr = minutes === '00' ? `${hours}시` : `${hours}시${minutes}분`

  // 폴더명 구성
  let folderName = ''
  if (brandPrefix) {
    folderName = `${brandPrefix} ${schedule.date} ${timeStr} ${schedule.location}(${schedule.couple})`
  } else {
    folderName = `${schedule.date} ${timeStr} ${schedule.location}(${schedule.couple})`
  }

  // 작가 정보 추가 (컷수가 있을 때만)
  if (schedule.cuts && schedule.cuts > 0) {
    const totalCuts = schedule.cuts * PHOTO_CONSTANTS.CUTS_MULTIPLIER
    if (schedule.photographer) {
      folderName += ` - ${schedule.photographer}(${totalCuts})`
    } else {
      folderName += ` - (${totalCuts})`
    }
  }

  return folderName
}
