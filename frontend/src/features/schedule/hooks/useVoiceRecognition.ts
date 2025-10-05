import { useState, useEffect, useRef, useCallback } from 'react'
import type { VoiceTrainingData } from '../types/voiceRecognition'

interface UseVoiceRecognitionProps {
  enabled: boolean
  trainingData: VoiceTrainingData
  onMatch: (itemText: string) => void
  onCollect?: (phrase: string) => void  // 훈련 모드용
}

// 한글 유니코드 상수
const HANGUL_START = 0xAC00  // '가'
const HANGUL_END = 0xD7A3    // '힣'
const CHOSUNG_COUNT = 19
const JUNGSUNG_COUNT = 21
const JONGSUNG_COUNT = 28

// 초성 배열
const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const JUNGSUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const JONGSUNG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

// 한글 자모 분리
function decomposeHangul(char: string): [string, string, string] | null {
  const code = char.charCodeAt(0)

  if (code < HANGUL_START || code > HANGUL_END) {
    return null  // 한글이 아님
  }

  const index = code - HANGUL_START
  const chosungIndex = Math.floor(index / (JUNGSUNG_COUNT * JONGSUNG_COUNT))
  const jungsungIndex = Math.floor((index % (JUNGSUNG_COUNT * JONGSUNG_COUNT)) / JONGSUNG_COUNT)
  const jongsungIndex = index % JONGSUNG_COUNT

  return [CHOSUNG[chosungIndex], JUNGSUNG[jungsungIndex], JONGSUNG[jongsungIndex]]
}

// 음운론적 유사도 (0~1, 1이 동일)
const PHONETIC_SIMILARITY: { [key: string]: { [key: string]: number } } = {
  // 초성 유사도
  'ㄱ': { 'ㄱ': 1.0, 'ㄲ': 0.8, 'ㅋ': 0.7, 'ㄴ': 0.3 },
  'ㄲ': { 'ㄲ': 1.0, 'ㄱ': 0.8, 'ㅋ': 0.6 },
  'ㄴ': { 'ㄴ': 1.0, 'ㄷ': 0.5, 'ㅁ': 0.4, 'ㄹ': 0.3, 'ㄱ': 0.3 },
  'ㄷ': { 'ㄷ': 1.0, 'ㄸ': 0.8, 'ㅌ': 0.7, 'ㄴ': 0.5, 'ㅈ': 0.4 },
  'ㄸ': { 'ㄸ': 1.0, 'ㄷ': 0.8, 'ㅌ': 0.6 },
  'ㄹ': { 'ㄹ': 1.0, 'ㄴ': 0.3 },
  'ㅁ': { 'ㅁ': 1.0, 'ㅂ': 0.4, 'ㄴ': 0.4 },
  'ㅂ': { 'ㅂ': 1.0, 'ㅃ': 0.8, 'ㅍ': 0.7, 'ㅁ': 0.4 },
  'ㅃ': { 'ㅃ': 1.0, 'ㅂ': 0.8, 'ㅍ': 0.6 },
  'ㅅ': { 'ㅅ': 1.0, 'ㅆ': 0.8, 'ㅈ': 0.5, 'ㅊ': 0.4 },
  'ㅆ': { 'ㅆ': 1.0, 'ㅅ': 0.8 },
  'ㅇ': { 'ㅇ': 1.0 },
  'ㅈ': { 'ㅈ': 1.0, 'ㅉ': 0.8, 'ㅊ': 0.7, 'ㅅ': 0.5, 'ㄷ': 0.4 },
  'ㅉ': { 'ㅉ': 1.0, 'ㅈ': 0.8, 'ㅊ': 0.6 },
  'ㅊ': { 'ㅊ': 1.0, 'ㅈ': 0.7, 'ㅅ': 0.4 },
  'ㅋ': { 'ㅋ': 1.0, 'ㄱ': 0.7, 'ㄲ': 0.6 },
  'ㅌ': { 'ㅌ': 1.0, 'ㄷ': 0.7, 'ㄸ': 0.6 },
  'ㅍ': { 'ㅍ': 1.0, 'ㅂ': 0.7, 'ㅃ': 0.6 },
  'ㅎ': { 'ㅎ': 1.0, 'ㅇ': 0.3 },

  // 중성 유사도
  'ㅏ': { 'ㅏ': 1.0, 'ㅑ': 0.6, 'ㅓ': 0.4 },
  'ㅐ': { 'ㅐ': 1.0, 'ㅔ': 0.8, 'ㅒ': 0.6, 'ㅖ': 0.5 },
  'ㅑ': { 'ㅑ': 1.0, 'ㅏ': 0.6, 'ㅕ': 0.4 },
  'ㅒ': { 'ㅒ': 1.0, 'ㅖ': 0.8, 'ㅐ': 0.6 },
  'ㅓ': { 'ㅓ': 1.0, 'ㅕ': 0.6, 'ㅏ': 0.4, 'ㅗ': 0.3 },
  'ㅔ': { 'ㅔ': 1.0, 'ㅐ': 0.8, 'ㅖ': 0.6 },
  'ㅕ': { 'ㅕ': 1.0, 'ㅓ': 0.6, 'ㅛ': 0.4 },
  'ㅖ': { 'ㅖ': 1.0, 'ㅒ': 0.8, 'ㅔ': 0.6 },
  'ㅗ': { 'ㅗ': 1.0, 'ㅜ': 0.5, 'ㅛ': 0.6, 'ㅓ': 0.3 },
  'ㅘ': { 'ㅘ': 1.0, 'ㅝ': 0.5 },
  'ㅙ': { 'ㅙ': 1.0, 'ㅞ': 0.6 },
  'ㅚ': { 'ㅚ': 1.0, 'ㅟ': 0.5, 'ㅔ': 0.4 },
  'ㅛ': { 'ㅛ': 1.0, 'ㅗ': 0.6, 'ㅠ': 0.5 },
  'ㅜ': { 'ㅜ': 1.0, 'ㅗ': 0.5, 'ㅠ': 0.6 },
  'ㅝ': { 'ㅝ': 1.0, 'ㅘ': 0.5 },
  'ㅞ': { 'ㅞ': 1.0, 'ㅙ': 0.6 },
  'ㅟ': { 'ㅟ': 1.0, 'ㅚ': 0.5 },
  'ㅠ': { 'ㅠ': 1.0, 'ㅜ': 0.6, 'ㅛ': 0.5 },
  'ㅡ': { 'ㅡ': 1.0, 'ㅣ': 0.3 },
  'ㅢ': { 'ㅢ': 1.0, 'ㅣ': 0.5 },
  'ㅣ': { 'ㅣ': 1.0, 'ㅡ': 0.3, 'ㅢ': 0.5 },
}

// 두 자모의 유사도 계산
function getPhoneticSimilarity(jamo1: string, jamo2: string): number {
  if (jamo1 === jamo2) return 1.0
  if (!jamo1 || !jamo2) return 0.0
  return PHONETIC_SIMILARITY[jamo1]?.[jamo2] || 0.0
}

// 한글 발음 유사도 계산 (0~1)
function calculatePhoneticSimilarity(char1: string, char2: string): number {
  const decomposed1 = decomposeHangul(char1)
  const decomposed2 = decomposeHangul(char2)

  // 한글이 아니면 정확히 일치하는지만 확인
  if (!decomposed1 || !decomposed2) {
    return char1 === char2 ? 1.0 : 0.0
  }

  const [cho1, jung1, jong1] = decomposed1
  const [cho2, jung2, jong2] = decomposed2

  // 초성 40%, 중성 40%, 종성 20% 가중치
  const choSimilarity = getPhoneticSimilarity(cho1, cho2) * 0.4
  const jungSimilarity = getPhoneticSimilarity(jung1, jung2) * 0.4
  const jongSimilarity = getPhoneticSimilarity(jong1, jong2) * 0.2

  return choSimilarity + jungSimilarity + jongSimilarity
}

// 문자열 정규화 (띄어쓰기 제거, 소문자 변환)
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '')
}

// 발음 기반 편집 거리 계산 (Levenshtein Distance 변형)
function phoneticDistance(a: string, b: string): number {
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
      const char1 = a.charAt(j - 1)
      const char2 = b.charAt(i - 1)

      if (char1 === char2) {
        // 완전히 일치
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        // 발음 유사도 기반 비용 계산
        const phonSim = calculatePhoneticSimilarity(char1, char2)
        const replaceCost = 1 - phonSim  // 유사도가 높을수록 비용 낮음

        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + replaceCost, // 교체 (발음 유사도 반영)
          matrix[i][j - 1] + 1,                // 삽입
          matrix[i - 1][j] + 1                 // 삭제
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// 유사도 계산 (0~1, 1이 완전 일치)
function calculateSimilarity(a: string, b: string): number {
  const distance = phoneticDistance(a, b)
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

export function useVoiceRecognition({ enabled, trainingData, onMatch, onCollect }: UseVoiceRecognitionProps) {
  const [isListening, setIsListening] = useState(false)
  const [lastRecognized, setLastRecognized] = useState<string>('')
  const recognitionRef = useRef<any>(null)
  const enabledRef = useRef(enabled)
  const trainingDataRef = useRef(trainingData)
  const onMatchRef = useRef(onMatch)
  const onCollectRef = useRef(onCollect)

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

  useEffect(() => {
    onCollectRef.current = onCollect
  }, [onCollect])

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
        // onCollect 콜백이 있으면 수집 (훈련 모드)
        if (onCollectRef.current) {
          onCollectRef.current(transcript)
        }

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
