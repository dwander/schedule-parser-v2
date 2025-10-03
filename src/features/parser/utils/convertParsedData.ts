import type { NewSchedule } from '@/features/schedule/types/schedule'

/**
 * 파서에서 반환된 데이터를 NewSchedule 형식으로 변환
 */
export function convertParsedDataToSchedules(parsedData: any[]): NewSchedule[] {
  return parsedData.map((item) => {
    // couple 필드를 groom/bride로 분리
    const couple = item.couple || ''
    const parts = couple.split('♥').map((s: string) => s.trim())
    const groom = parts[0] || ''
    const bride = parts[1] || couple

    return {
      date: item.date || '',
      time: item.time || '',
      location: item.venue || '',
      groom,
      bride,
      cuts: item.cutsCount || 0,
      price: item.price || 0,
      fee: 0, // TODO: fee 계산 로직
      manager: item.contractor || '',
      brand: item.brand || '',
      memo: item.comments || '',
      isDuplicate: item.needs_review || false,
    }
  })
}
