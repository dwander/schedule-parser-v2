export type Brand = 'K7' | 'B7' | 'A+' | 'Graphy' | '2ndFlow'

export interface Schedule {
  id: string
  date: string // ISO 8601
  time: string
  location: string
  groom: string
  bride: string
  contact?: string
  cuts: number
  price: number
  fee: number
  manager: string
  brand: Brand
  album?: string
  photographer?: string
  memo?: string
  isDuplicate: boolean
  createdAt: string
  updatedAt: string
}

export type NewSchedule = Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateSchedule = Partial<NewSchedule> & { id: string }
