import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseText } from '../api/parserApi'
import type { ParsedScheduleData } from '../types/parser'

interface ParserInputProps {
  onParsed: (data: ParsedScheduleData[]) => void
}

export function ParserInput({ onParsed }: ParserInputProps) {
  const [text, setText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleParse = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요')
      return
    }

    setIsParsing(true)
    setError(null)

    try {
      const result = await parseText(text, 'classic')

      if (result.success && result.data) {
        onParsed(result.data)
        setText('') // 성공 시 입력 초기화
      } else {
        setError(result.error || '파싱에 실패했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파싱 중 오류가 발생했습니다')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="카카오톡 메시지를 붙여넣으세요..."
        className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isParsing}
      />

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handleParse}
        disabled={isParsing || !text.trim()}
      >
        {isParsing ? '파싱 중...' : '파싱하기'}
      </Button>
    </div>
  )
}
