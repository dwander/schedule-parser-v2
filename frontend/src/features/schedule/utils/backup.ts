import type { Schedule } from '../types/schedule'

export interface BackupData {
  version: string
  backup_date: string
  user_id: string
  schedules: Schedule[]
}

/**
 * 스케줄 데이터를 JSON 파일로 백업
 */
export function exportBackup(schedules: Schedule[], userId: string = 'unknown'): void {
  const backupData: BackupData = {
    version: 'v2025.10',
    backup_date: new Date().toISOString(),
    user_id: userId,
    schedules: schedules
  }

  const jsonString = JSON.stringify(backupData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  // 다운로드 링크 생성
  const link = document.createElement('a')
  link.href = url
  link.download = `schedules-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // URL 해제
  URL.revokeObjectURL(url)
}

/**
 * JSON 파일에서 스케줄 데이터 가져오기
 */
export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const data = JSON.parse(text) as BackupData

        // 백업 데이터 유효성 검사
        if (!data.version || !data.schedules || !Array.isArray(data.schedules)) {
          throw new Error('유효하지 않은 백업 파일 형식입니다.')
        }

        resolve(data)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'))
    }

    reader.readAsText(file)
  })
}

/**
 * 백업 데이터 검증 (중복 체크 등)
 */
export function validateBackupData(backupData: BackupData, existingSchedules: Schedule[]): {
  valid: boolean
  duplicates: number
  newSchedules: number
  errors: string[]
} {
  const errors: string[] = []
  const existingIds = new Set(existingSchedules.map(s => s.id))
  let duplicates = 0
  let newSchedules = 0

  for (const schedule of backupData.schedules) {
    // 필수 필드 검증
    if (!schedule.date || !schedule.time || !schedule.location) {
      errors.push(`필수 필드 누락: ID ${schedule.id}`)
      continue
    }

    // 중복 체크
    if (existingIds.has(schedule.id)) {
      duplicates++
    } else {
      newSchedules++
    }
  }

  return {
    valid: errors.length === 0,
    duplicates,
    newSchedules,
    errors
  }
}
