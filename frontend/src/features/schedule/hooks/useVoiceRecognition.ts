import { useState, useEffect, useRef, useCallback } from 'react'
import type { VoiceTrainingData } from '../types/voiceRecognition'

interface UseVoiceRecognitionProps {
  enabled: boolean
  trainingData: VoiceTrainingData
  onMatch: (itemText: string) => void
}

export function useVoiceRecognition({ enabled, trainingData, onMatch }: UseVoiceRecognitionProps) {
  const [isListening, setIsListening] = useState(false)
  const [lastRecognized, setLastRecognized] = useState<string>('')
  const recognitionRef = useRef<any>(null)

  // 키워드 매칭 함수
  const matchKeyword = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase()

    // 모든 항목을 순회하면서 키워드 매칭
    for (const [itemText, keywords] of Object.entries(trainingData)) {
      for (const keyword of keywords) {
        if (lowerTranscript.includes(keyword.toLowerCase())) {
          console.log(`🎤 매칭 성공: "${transcript}" → "${itemText}" (키워드: "${keyword}")`)
          onMatch(itemText)
          return true
        }
      }
    }
    return false
  }, [trainingData, onMatch])

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
      if (enabled) {
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
        matchKeyword(transcript)
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
  }, [enabled, matchKeyword])

  // enabled 상태에 따라 시작/중지
  useEffect(() => {
    if (!recognitionRef.current) return

    if (enabled) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.log('이미 음성 인식이 실행 중입니다.')
      }
    } else {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [enabled])

  return {
    isListening,
    lastRecognized,
  }
}
