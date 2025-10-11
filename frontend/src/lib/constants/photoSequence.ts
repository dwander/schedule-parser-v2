/**
 * PhotoSequence 기능 관련 상수
 */

// LocalStorage Keys
export const PHOTO_SEQUENCE_STORAGE_KEYS = {
  LOCKED: 'photoSequenceLocked',
  VOICE_ENABLED: 'photoSequenceVoiceEnabled',
  VOICE_TRAINING: 'photoSequenceVoiceTraining',
  VOICE_HINT_DISMISSED: 'photoSequenceVoiceHintDismissed',
  VOICE_THRESHOLD: 'photoSequenceVoiceThreshold',
  SHOW_CLOCK: 'photoSequenceShowClock',
} as const

// Timers (milliseconds)
export const PHOTO_SEQUENCE_TIMERS = {
  LONG_PRESS: 500,
  FADE_OUT: 3000,
} as const

// Drag & Drop
export const PHOTO_SEQUENCE_DRAG = {
  ACTIVATION_DISTANCE: 8, // pixels
} as const

// Voice Recognition Threshold
export const VOICE_RECOGNITION_THRESHOLD = {
  DEFAULT: 80, // 기본값 80%
  MIN: 60,     // 최소값 60%
  MAX: 100,    // 최대값 100%
} as const

// Schedule Timer
export const SCHEDULE_TIMER = {
  DURATION_MINUTES: 45, // 스케줄 진행 시간 (분)
} as const
