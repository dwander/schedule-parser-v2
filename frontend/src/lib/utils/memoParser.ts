/**
 * Memo 파서 유틸리티
 *
 * 구조화된 memo 문자열을 파싱하여 표시 가능한 형식으로 변환
 */

export interface ParsedMemoItem {
  type: 'key-value' | 'section'
  title?: string
  content: string
  rawLines?: string[] // 원본 라인 (섹션인 경우)
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

  const items: ParsedMemoItem[] = []
  const lines = memo.split('\n')

  let currentSection: ParsedMemoItem | null = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // 빈 줄 스킵
    if (!trimmedLine) {
      // 섹션 내부가 아니면 스킵
      if (!currentSection) {
        i++
        continue
      }
      // 섹션 내부면 빈 줄도 포함
      if (currentSection) {
        currentSection.rawLines!.push(line)
        i++
        continue
      }
    }

    // 섹션 헤더 감지: [제목]
    const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      // 이전 섹션 저장
      if (currentSection) {
        currentSection.content = currentSection.rawLines!.join('\n').trim()
        items.push(currentSection)
      }

      // 새 섹션 시작
      currentSection = {
        type: 'section',
        title: sectionMatch[1].trim(),
        content: '',
        rawLines: []
      }
      i++
      continue
    }

    // 키-값 쌍 감지: "키: 값"
    const keyValueMatch = trimmedLine.match(/^([^:]+):\s*(.*)$/)
    if (keyValueMatch && !currentSection) {
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

    // 섹션 내용 (현재 섹션이 있는 경우)
    if (currentSection) {
      currentSection.rawLines!.push(line)
      i++
      continue
    }

    // 어디에도 속하지 않는 일반 텍스트는 content만 있는 항목으로 추가
    // (구조화되지 않은 memo인 경우)
    if (trimmedLine && !currentSection) {
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

  // 마지막 섹션 저장
  if (currentSection) {
    currentSection.content = currentSection.rawLines!.join('\n').trim()
    items.push(currentSection)
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
 * 구조화된 memo가 있는지 확인 (키-값 또는 섹션이 있으면 true)
 */
export function hasStructuredMemo(memo: string): boolean {
  if (!memo || !memo.trim()) return false

  const items = parseMemo(memo)
  return items.some(item =>
    item.type === 'section' ||
    (item.type === 'key-value' && !!item.title)
  )
}
