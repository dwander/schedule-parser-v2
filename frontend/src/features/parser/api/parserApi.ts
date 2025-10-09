import { apiClient } from '@/lib/api/client'
import type { ParsedScheduleData } from '../types/parser'

export type ParserEngine = 'classic' | 'ai_only' | 'llm' | 'hybrid'

export interface ParseTextRequest {
  text: string
  engine: ParserEngine
}

export interface ParseTextResponse {
  data: ParsedScheduleData[]
  success: boolean
  engine_used?: string
  error?: string
}

export async function parseText(text: string, engine: ParserEngine = 'classic'): Promise<ParseTextResponse> {
  const { data } = await apiClient.post<ParseTextResponse>('/api/parse-text', {
    text,
    engine
  })

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

  return data
}
