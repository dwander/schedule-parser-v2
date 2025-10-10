/**
 * Memo 파서 유틸리티
 *
 * 구조화된 memo 문자열을 파싱하여 표시 가능한 형식으로 변환
 */

export interface ParsedMemoItem {
  type: 'key-value'
  title?: string
  content: string
}

/**
 * Memo 문자열을 파싱하여 구조화된 데이터로 변환
 *
 * @param memo - 파싱할 memo 문자열
 * @returns ParsedMemoItem 배열
 *
 * @example
 * ```typescript
 * const memo = `
 * 사진업체: 세컨플로우
 * 촬영범위: 사전촬영, 본식
 *
 * [신부님 전달사항]
 * - 로비 촬영 중요
 * - 원판 순서 체크
 * `
 *
 * const parsed = parseMemo(memo)
 * // [
 * //   { type: 'key-value', title: '사진업체', content: '세컨플로우' },
 * //   { type: 'key-value', title: '촬영범위', content: '사전촬영, 본식' },
 * //   { type: 'section', title: '신부님 전달사항', content: '- 로비 촬영 중요\n- 원판 순서 체크', rawLines: [...] }
 * // ]
 * ```
 */
export function parseMemo(memo: string): ParsedMemoItem[] {
  if (!memo || !memo.trim()) {
    return []
  }

  // LLM 파싱 마커 제거
  let processedMemo = memo
  if (memo.trim().startsWith('<!-- LLM_PARSED -->')) {
    processedMemo = memo.replace(/^\s*<!--\s*LLM_PARSED\s*-->\s*\n?/, '')
  }

  const items: ParsedMemoItem[] = []
  const lines = processedMemo.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // 빈 줄 스킵
    if (!trimmedLine) {
      i++
      continue
    }

    // 섹션 헤더 감지: [제목] → 일반 key-value로 처리
    const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      const title = sectionMatch[1].trim()
      const contentLines: string[] = []

      // 다음 섹션이나 키-값 쌍이 나올 때까지 내용 수집
      let j = i + 1
      while (j < lines.length) {
        const nextLine = lines[j]
        const nextTrimmed = nextLine.trim()

        // 다음 섹션이나 키-값 쌍을 만나면 중단
        if (nextTrimmed.match(/^\[/) || nextTrimmed.match(/^[^:]+:/)) {
          break
        }

        contentLines.push(nextLine)
        j++
      }

      items.push({
        type: 'key-value',
        title,
        content: contentLines.join('\n').trim()
      })

      i = j
      continue
    }

    // 키-값 쌍 감지: "키: 값"
    const keyValueMatch = trimmedLine.match(/^([^:]+):\s*(.*)$/)
    if (keyValueMatch) {
      const title = keyValueMatch[1].trim()
      let content = keyValueMatch[2].trim()

      // 여러 줄에 걸친 값 처리
      const contentLines = [content]
      let j = i + 1
      while (j < lines.length) {
        const nextLine = lines[j].trim()
        // 다음 키-값 쌍이나 섹션 헤더를 만나면 중단
        if (!nextLine || nextLine.match(/^\[/) || nextLine.match(/^[^:]+:/)) {
          break
        }
        contentLines.push(nextLine)
        j++
      }

      items.push({
        type: 'key-value',
        title,
        content: contentLines.join('\n').trim()
      })

      i = j
      continue
    }

    // 어디에도 속하지 않는 일반 텍스트는 content만 있는 항목으로 추가
    // (구조화되지 않은 memo인 경우)
    if (trimmedLine) {
      // 연속된 일반 텍스트 수집
      const textLines = [line]
      let j = i + 1
      while (j < lines.length) {
        const nextLine = lines[j]
        const nextTrimmed = nextLine.trim()
        // 키-값이나 섹션을 만나면 중단
        if (nextTrimmed.match(/^\[/) || nextTrimmed.match(/^[^:]+:/)) {
          break
        }
        textLines.push(nextLine)
        j++
      }

      items.push({
        type: 'key-value',
        content: textLines.join('\n').trim()
      })

      i = j
      continue
    }

    i++
  }

  return items
}

/**
 * ParsedMemoItem이 비어있는지 확인
 */
export function isMemoEmpty(items: ParsedMemoItem[]): boolean {
  return items.length === 0 || items.every(item => !item.content.trim())
}

/**
 * 구조화된 memo가 있는지 확인
 *
 * 조건:
 * 1. LLM 파싱 마커가 있거나
 * 2. "짧은키: 값" 패턴이 3개 이상 발견되면 구조화된 것으로 판단
 */
export function hasStructuredMemo(memo: string): boolean {
  if (!memo || !memo.trim()) return false

  // 1. LLM 파싱 마커 감지
  if (memo.trim().startsWith('<!-- LLM_PARSED -->')) {
    return true
  }

  // 2. 구조화된 키-값 패턴 감지 (6글자 미만 키: 내용)
  // "담당자: 홍길동", "플래너: 한화리조트" 같은 패턴
  const keyValuePattern = /^[가-힣a-zA-Z]{1,6}\s*:\s*.+$/gm
  const matches = memo.match(keyValuePattern)

  // 3개 이상의 키-값 쌍이 있으면 구조화된 memo로 판단
  return matches ? matches.length >= 3 : false
}
