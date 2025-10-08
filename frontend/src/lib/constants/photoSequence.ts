/**
 * PhotoSequence 기능 관련 상수
 */

// LocalStorage Keys
export const PHOTO_SEQUENCE_STORAGE_KEYS = {
  LOCKED: 'photoSequenceLocked',
  VOICE_ENABLED: 'photoSequenceVoiceEnabled',
  VOICE_TRAINING: 'photoSequenceVoiceTraining',
  VOICE_HINT_DISMISSED: 'photoSequenceVoiceHintDismissed',
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
