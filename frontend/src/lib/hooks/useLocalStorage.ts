import { useState } from 'react'

/**
 * localStorage와 동기화되는 state 훅
 *
 * @param key - localStorage 키
 * @param initialValue - 초기값
 * @returns [value, setValue] - useState와 동일한 API
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // 초기값 로드
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // localStorage에 저장하는 함수
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      // 함수형 업데이트 지원
      const valueToStore = value instanceof Function ? value(storedValue) : value

      setStoredValue(valueToStore)
      localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}

/**
 * localStorage에 간단한 문자열을 저장하는 훅 (JSON 파싱 없음)
 *
 * @param key - localStorage 키
 * @param initialValue - 초기값
 * @returns [value, setValue]
 */
export function useLocalStorageString(key: string, initialValue: string): [string, (value: string) => void] {
  const [storedValue, setStoredValue] = useState<string>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ?? initialValue
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = (value: string) => {
    try {
      setStoredValue(value)
      localStorage.setItem(key, value)
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}
