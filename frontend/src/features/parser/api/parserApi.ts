import { apiClient } from '@/lib/api/client'

export type ParserEngine = 'classic' | 'ai_only' | 'hybrid'

export interface ParseTextRequest {
  text: string
  engine: ParserEngine
}

export interface ParseTextResponse {
  data: any[]
  success: boolean
  engine_used?: string
  error?: string
}

export async function parseText(text: string, engine: ParserEngine = 'classic'): Promise<ParseTextResponse> {
  const { data } = await apiClient.post<ParseTextResponse>('/api/parse-text', {
    text,
    engine
  })

  // 백엔드 필드명을 프론트엔드 필드명으로 매핑
  if (data.success && data.data) {
    data.data = data.data.map((item: any) => {
      const [groom, bride] = item.couple ? item.couple.split(' ') : ['', '']
      return {
        date: item.date,
        time: item.time,
        location: item.venue,
        groom: groom,
        bride: bride || '',
        couple: item.couple,
        contact: item.contact || '',
        brand: item.brand || '',
        album: item.album || '',
        photographer: item.photographer || '',
        cuts: item.cuts_count || 0,
        price: item.price || 0,
        manager: item.contractor || '',
        memo: item.comments || '',
        isDuplicate: item.needs_review || false,
      }
    })
  }

  return data
}

export async function parseFile(file: File, engine: ParserEngine = 'classic'): Promise<ParseTextResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('engine', engine)

  const { data } = await apiClient.post<ParseTextResponse>('/api/parse-uploaded-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })

  // 백엔드 필드명을 프론트엔드 필드명으로 매핑
  if (data.success && data.data) {
    data.data = data.data.map((item: any) => {
      const [groom, bride] = item.couple ? item.couple.split(' ') : ['', '']
      return {
        date: item.date,
        time: item.time,
        location: item.venue,
        groom: groom,
        bride: bride || '',
        couple: item.couple,
        contact: item.contact || '',
        brand: item.brand || '',
        album: item.album || '',
        photographer: item.photographer || '',
        cuts: item.cuts_count || 0,
        price: item.price || 0,
        manager: item.contractor || '',
        memo: item.comments || '',
        isDuplicate: item.needs_review || false,
      }
    })
  }

  return data
}
