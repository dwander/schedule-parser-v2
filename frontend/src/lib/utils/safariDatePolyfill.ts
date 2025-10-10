/**
 * Safari처럼 엄격한 날짜 파싱을 개발 환경에서 재현
 *
 * Safari는 "YYYY.MM.DD" 같은 형식을 Invalid Date로 처리합니다.
 * 이 polyfill을 개발 환경에서 사용하면 Safari와 동일한 오류를 미리 발견할 수 있습니다.
 */

const OriginalDate = Date

export function enableStrictDateParsing() {
  if (import.meta.env.PROD) {
    console.warn('Safari date polyfill should only be used in development')
    return
  }

  // @ts-expect-error - Date 생성자 오버라이드
  window.Date = class StrictDate extends OriginalDate {
    constructor(...args: any[]) {
      // 인자가 1개이고 문자열인 경우만 검증
      if (args.length === 1 && typeof args[0] === 'string') {
        const dateString = args[0]

        // ISO 8601 형식이 아닌 경우 경고
        // Safari는 "YYYY.MM.DD", "YYYY/MM/DD" 등을 제대로 파싱 못함
        const isValidFormat =
          /^\d{4}-\d{2}-\d{2}/.test(dateString) || // YYYY-MM-DD
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString) // ISO 8601

        if (!isValidFormat) {
          console.error(`🚨 Safari-incompatible date format detected: "${dateString}"`)
          console.trace('Date creation stack trace:')

          // Invalid Date 생성 (Safari 동작 재현)
          super('Invalid Date')
          return
        }
      }

      super(...args as [])
    }

    static now = OriginalDate.now
    static parse = OriginalDate.parse
    static UTC = OriginalDate.UTC
  }

  console.log('✅ Safari strict date parsing enabled - "YYYY.MM.DD" format will now fail')
}

export function disableStrictDateParsing() {
  // @ts-expect-error - 원래 Date로 복원
  window.Date = OriginalDate
  console.log('✅ Safari strict date parsing disabled')
}
