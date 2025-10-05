import { useState, useEffect, useRef, useCallback } from 'react'
import type { VoiceTrainingData } from '../types/voiceRecognition'

interface UseVoiceRecognitionProps {
  enabled: boolean
  trainingData: VoiceTrainingData
  onMatch: (itemText: string) => void
}

// 문자열 정규화 (띄어쓰기 제거, 소문자 변환)
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '')
}

// Levenshtein Distance (편집 거리) 계산
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // 첫 번째 행과 열 초기화
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // 동적 프로그래밍으로 편집 거리 계산
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 교체
          matrix[i][j - 1] + 1,     // 삽입
          matrix[i - 1][j] + 1      // 삭제
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// 유사도 계산 (0~1, 1이 완전 일치)
function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b)
  const maxLength = Math.max(a.length, b.length)
  return maxLength === 0 ? 1 : 1 - distance / maxLength
}

// 문장에서 키워드와 가장 유사한 부분 찾기 (슬라이딩 윈도우)
function findBestMatchInSentence(sentence: string, keyword: string): number {
  // 키워드가 문장보다 길면 전체 비교
  if (keyword.length >= sentence.length) {
    return calculateSimilarity(sentence, keyword)
  }

  let maxSimilarity = 0

  // 키워드 길이만큼 윈도우를 슬라이딩하면서 비교
  for (let i = 0; i <= sentence.length - keyword.length; i++) {
    const substring = sentence.substring(i, i + keyword.length)
    const similarity = calculateSimilarity(substring, keyword)
    maxSimilarity = Math.max(maxSimilarity, similarity)
  }

  // 키워드보다 약간 긴 윈도우도 체크 (조사 등 대응)
  const extendedLength = Math.min(keyword.length + 2, sentence.length)
  for (let i = 0; i <= sentence.length - extendedLength; i++) {
    const substring = sentence.substring(i, i + extendedLength)
    const similarity = calculateSimilarity(substring, keyword)
    maxSimilarity = Math.max(maxSimilarity, similarity)
  }

  return maxSimilarity
}

export function useVoiceRecognition({ enabled, trainingData, onMatch }: UseVoiceRecognitionProps) {
  const [isListening, setIsListening] = useState(false)
  const [lastRecognized, setLastRecognized] = useState<string>('')
  const recognitionRef = useRef<any>(null)
  const enabledRef = useRef(enabled)
  const trainingDataRef = useRef(trainingData)
  const onMatchRef = useRef(onMatch)

  // ref 업데이트
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    trainingDataRef.current = trainingData
  }, [trainingData])

  useEffect(() => {
    onMatchRef.current = onMatch
  }, [onMatch])

  // 음성 인식 인스턴스 생성 (한 번만)
  useEffect(() => {
    // Web Speech API 지원 확인
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('⚠️ 이 브라우저는 음성 인식을 지원하지 않습니다.')
      return
    }

    // 음성 인식 인스턴스 생성
    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = true // 계속 듣기
    recognition.interimResults = true // 중간 결과도 받기

    recognition.onstart = () => {
      console.log('🎤 음성 인식 시작')
      setIsListening(true)
    }

    recognition.onend = () => {
      console.log('🎤 음성 인식 종료')
      setIsListening(false)

      // enabled가 true면 자동으로 재시작 (약간의 딜레이)
      if (enabledRef.current) {
        setTimeout(() => {
          try {
            recognition.start()
          } catch (e) {
            // 이미 시작된 경우 무시
          }
        }, 100)
      }
    }

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1
      const transcript = event.results[last][0].transcript
      const isFinal = event.results[last].isFinal

      console.log(`🎤 인식됨 [${isFinal ? '최종' : '중간'}]:`, transcript)
      setLastRecognized(transcript)

      // 최종 결과일 때만 매칭
      if (isFinal) {
        const normalizedTranscript = normalizeText(transcript)
        let bestMatch: { itemText: string; keyword: string; similarity: number } | null = null

        // 모든 항목을 순회하면서 키워드 매칭
        for (const [itemText, keywords] of Object.entries(trainingDataRef.current)) {
          for (const keyword of keywords) {
            const normalizedKeyword = normalizeText(keyword)

            // 1단계: 정확한 포함 매칭 (우선순위)
            if (normalizedTranscript.includes(normalizedKeyword)) {
              console.log(`🎤 매칭 성공 [정확]: "${transcript}" → "${itemText}" (키워드: "${keyword}")`)
              onMatchRef.current(itemText)
              return
            }

            // 2단계: 유사도 기반 매칭 (슬라이딩 윈도우)
            const similarity = findBestMatchInSentence(normalizedTranscript, normalizedKeyword)

            // 유사도가 75% 이상이고 현재 최고 매칭보다 높으면 업데이트
            if (similarity >= 0.75 && (!bestMatch || similarity > bestMatch.similarity)) {
              bestMatch = { itemText, keyword, similarity }
            }
          }
        }

        // 최고 유사도 매칭이 있으면 실행
        if (bestMatch) {
          console.log(
            `🎤 매칭 성공 [유사도 ${(bestMatch.similarity * 100).toFixed(0)}%]: "${transcript}" → "${bestMatch.itemText}" (키워드: "${bestMatch.keyword}")`
          )
          onMatchRef.current(bestMatch.itemText)
        } else {
          console.log(`🎤 매칭 실패: "${transcript}"`)
        }
      }
    }

    recognition.onerror = (event: any) => {
      console.error('🎤 음성 인식 오류:', event.error)

      // 무시해도 되는 에러들 (자동 재시작됨)
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return
      }

      // network 에러는 경고만 (계속 재시작 시도)
      if (event.error === 'network') {
        console.warn('⚠️ 네트워크 오류 - 재시도 중...')
        return
      }

      setIsListening(false)
    }

    recognitionRef.current = recognition

    // 정리
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, []) // 한 번만 실행

  // enabled 상태에 따라 시작/중지
  useEffect(() => {
    if (!recognitionRef.current) return

    if (enabled) {
      try {
        recognitionRef.current.start()
        console.log('🎤 음성 인식 활성화')
      } catch (e) {
        console.log('이미 음성 인식이 실행 중입니다.')
      }
    } else {
      console.log('🎤 음성 인식 비활성화')
      recognitionRef.current.stop()
      setIsListening(false)
      setLastRecognized('')
    }
  }, [enabled])

  return {
    isListening,
    lastRecognized,
  }
}
