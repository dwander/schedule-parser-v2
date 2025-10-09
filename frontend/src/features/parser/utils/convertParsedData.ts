import type { NewSchedule } from '@/features/schedule/types/schedule'
import type { ParsedScheduleData } from '../types/parser'

/**
 * 파서에서 반환된 데이터를 NewSchedule 형식으로 변환
 */
export function convertParsedDataToSchedules(parsedData: ParsedScheduleData[]): NewSchedule[] {
  return parsedData.map((item) => {
    return {
      date: item.date || '',
      time: item.time || '',
      location: item.location || '',
      couple: item.couple || '',
      contact: item.contact || '',
      cuts: 0, // ParsedScheduleData에는 cuts 필드가 없으므로 기본값 사용
      price: item.price || 0,
      manager: item.manager || '',
      brand: item.brand as any, // Brand 타입으로 강제 변환 (백엔드에서 유효한 값 반환)
      album: item.album || '',
      photographer: item.photographer || '',
      memo: item.memo || '',
      isDuplicate: item.needs_review || false,
    }
  })
}
