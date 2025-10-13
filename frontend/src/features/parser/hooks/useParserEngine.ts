import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { Schedule } from '@/features/schedule/types/schedule'
import type { ParsedScheduleData } from '../types/parser'
import { parseText, parseFile } from '../api/parserApi'
import { hasRequiredFields } from '../utils/validation'
import { filterDuplicateSchedules } from '../utils/duplicateCheck'

export type ParserEngine = 'classic' | 'llm' | 'hybrid'
export type ParsingStep = 'classic' | 'gpt' | null

interface UseParserEngineResult {
  isParsing: boolean
  parsedData: ParsedScheduleData[] | null
  error: string | null
  parsingStep: ParsingStep
  parseFromText: (text: string, engine: ParserEngine) => Promise<void>
  parseFromFile: (file: File, engine: ParserEngine) => Promise<void>
  reset: () => void
}

/**
 * 파서 엔진 통합 훅
 * @param existingSchedules - 중복 체크를 위한 기존 스케줄 목록
 * @returns 파싱 상태 및 함수들
 */
export function useParserEngine(existingSchedules: Schedule[]): UseParserEngineResult {
  const [isParsing, setIsParsing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedScheduleData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsingStep, setParsingStep] = useState<ParsingStep>(null)

  /**
   * 파싱 결과 처리 (중복 체크 포함)
   */
  const handleParseResult = useCallback((
    result: { success: boolean; data?: ParsedScheduleData[]; error?: string }
  ) => {
    if (result.success && result.data) {
      const { unique, duplicateCount } = filterDuplicateSchedules(result.data, existingSchedules)

      setParsedData(unique)

      if (duplicateCount > 0) {
        toast.info(`${duplicateCount}개의 중복 스케줄이 제외되었습니다`)
      }

      if (unique.length === 0) {
        setError('추가할 새로운 스케줄이 없습니다 (모두 중복)')
      }
    } else {
      setError(result.error || '파싱에 실패했습니다')
    }
  }, [existingSchedules])

  /**
   * Hybrid 모드 파싱 (Classic → GPT 순차 시도)
   */
  const parseWithHybrid = useCallback(async (
    parseFn: (engine: 'classic' | 'llm') => Promise<{ success: boolean; data?: ParsedScheduleData[]; error?: string }>
  ) => {
    // 먼저 Classic 시도
    setParsingStep('classic')
    let result = await parseFn('classic')

    // Classic이 실패하거나 결과가 없거나 필수 필드가 누락되면 GPT-4로 재시도
    const needsGPT = !result.success ||
                     !result.data ||
                     result.data.length === 0 ||
                     !result.data.every(hasRequiredFields)

    if (needsGPT) {
      setParsingStep('gpt')
      result = await parseFn('llm')
    }

    setParsingStep(null)
    return result
  }, [])

  /**
   * 텍스트 파싱
   */
  const parseFromText = useCallback(async (text: string, engine: ParserEngine) => {
    if (!text.trim()) {
      setParsedData(null)
      setError(null)
      return
    }

    setIsParsing(true)
    setError(null)
    setParsedData(null)
    setParsingStep(null)

    try {
      let result

      if (engine === 'hybrid') {
        result = await parseWithHybrid((engineType) => parseText(text, engineType))
      } else {
        result = await parseText(text, engine)
      }

      handleParseResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파싱 중 오류가 발생했습니다')
    } finally {
      setIsParsing(false)
      setParsingStep(null)
    }
  }, [parseWithHybrid, handleParseResult])

  /**
   * 파일 파싱
   */
  const parseFromFile = useCallback(async (file: File, engine: ParserEngine) => {
    setIsParsing(true)
    setError(null)
    setParsedData(null)
    setParsingStep(null)

    try {
      let result

      if (engine === 'hybrid') {
        result = await parseWithHybrid((engineType) => parseFile(file, engineType))
      } else {
        result = await parseFile(file, engine)
      }

      handleParseResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 파싱 중 오류가 발생했습니다')
    } finally {
      setIsParsing(false)
      setParsingStep(null)
    }
  }, [parseWithHybrid, handleParseResult])

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setParsedData(null)
    setError(null)
    setParsingStep(null)
  }, [])

  return {
    isParsing,
    parsedData,
    error,
    parsingStep,
    parseFromText,
    parseFromFile,
    reset
  }
}
