import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ParserEngine } from '../hooks/useParserEngine'

interface ParserEngineSelectorProps {
  engine: ParserEngine
  onEngineChange: (engine: ParserEngine) => void
  isAdmin: boolean
  id?: string
}

export function ParserEngineSelector({
  engine,
  onEngineChange,
  isAdmin,
  id = 'parser-engine'
}: ParserEngineSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>파서 엔진</Label>
      <Select value={engine} onValueChange={(value) => onEngineChange(value as ParserEngine)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="classic">Classic (정규표현식)</SelectItem>
          <SelectItem value="hybrid">Hybrid (클래식+GPT)</SelectItem>
          {isAdmin && <SelectItem value="llm">GPT-4</SelectItem>}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {engine === 'classic' && '빠르고 정확한 패턴 기반 파싱'}
        {engine === 'hybrid' && '정규표현식으로 시도 후 필요시 GPT-4로 재분석 (최대 5개, 3000자 제한)'}
        {engine === 'llm' && 'GPT-4 기반 파싱 (관리자 전용, 최대 5개, 3000자 제한)'}
      </p>
    </div>
  )
}
