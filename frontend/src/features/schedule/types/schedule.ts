export type Brand = 'K7' | 'B7' | 'A+' | 'Graphy' | '2ndFlow'

export interface PhotoSequenceItem {
  id: string
  text: string
  completed: boolean
  order: number
  deleted?: boolean
}

export interface PhotoNote {
  importantMemo?: string
  makeupShop?: {
    name?: string
    departureTime?: string
    arrivalTime?: string
  }
  dress?: {
    type?: string
    material?: string
    company?: string
  }
  familyRelations?: {
    groomFamily?: string
    brideFamily?: string
  }
  ceremony?: {
    host?: {
      type?: 'professional' | 'acquaintance' | ''
      memo?: string
    }
    events?: {
      blessing?: boolean
      congratulatorySpeech?: boolean
      congratulatorySong?: boolean
      congratulatoryDance?: boolean
      flowerGirl?: boolean
      ringExchange?: boolean
      videoPlay?: boolean
      flashCut?: boolean
      bouquetCut?: boolean
      flowerShower?: boolean
      memo?: string
    }
  }
  subPhotographer?: {
    videoDvd?: string
    subIphoneSnap?: string
  }
  photoConceptMemo?: string
  requestsMemo?: string
  [key: string]: unknown  // index signature for deep merge compatibility
}

export interface Schedule {
  id: string
  date: string // ISO 8601
  time: string
  location: string
  couple: string
  contact?: string
  cuts: number
  price: number
  manager: string
  brand: Brand
  album?: string
  photographer?: string
  memo?: string
  photoNote?: PhotoNote
  photoSequence?: PhotoSequenceItem[]
  currentTemplate?: string // POSE_FIRST, FRIENDS_FIRST, POSE_LAST, CUSTOM
  shootTimeDuration?: number // 촬영 예상 시간 (분)
  isDuplicate: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type NewSchedule = Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateSchedule = Partial<NewSchedule> & { id: string }
