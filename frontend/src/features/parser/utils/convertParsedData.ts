import type { NewSchedule } from '@/features/schedule/types/schedule'

/**
 * 파서에서 반환된 데이터를 NewSchedule 형식으로 변환
 */
export function convertParsedDataToSchedules(parsedData: any[]): NewSchedule[] {
  return parsedData.map((item) => {
    return {
      date: item.date || '',
      time: item.time || '',
      location: item.venue || '',
      couple: item.couple || '',
      cuts: item.cutsCount || 0,
      price: item.price || 0,
      manager: item.contractor || '',
      brand: item.brand || '',
      memo: item.comments || '',
      isDuplicate: item.needs_review || false,
    }
  })
}
