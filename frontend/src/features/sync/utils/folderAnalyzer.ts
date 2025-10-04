import type { Schedule } from '@/features/schedule/types/schedule'

export interface ParsedFolderData {
  date: string
  time: string
  couple: string
  cutsFromName: number | null
}

export interface FileCountResult {
  count: number
  rawCount: number
  jpgCount: number
  mismatch: boolean
  mismatchFiles: string[]
}

export interface FolderAnalysisResult {
  folderName: string
  date: string
  time: string
  couple: string
  jpgCount: number
  rawCount: number
  finalCount: number
  matched: boolean
  mismatch: boolean
  scheduleId?: string
  mismatchFiles?: string[]
}

// RAW 파일 확장자
const RAW_EXTENSIONS = [
  '.raw', '.cr2', '.nef', '.arw', '.dng', '.orf',
  '.rw2', '.pef', '.srw', '.x3f', '.raf', '.3fr',
  '.fff', '.erf', '.mrw', '.dcr', '.kdc', '.srf', '.arq'
]

// 이미지 파일 확장자
const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.avif',
  '.heic', '.heif', '.tiff', '.tif', '.bmp',
  '.gif', '.jfif', '.pjpeg', '.pjp'
]

// 제외할 폴더 키워드
const EXCLUDE_FOLDERS = ['셀렉', '선택', 'select', 'selected', 'sel']

/**
 * 폴더명에서 스케줄 정보 파싱
 */
export function parseFolderName(folderName: string): ParsedFolderData | null {
  try {
    // 경로에서 폴더명만 추출
    const fileName = folderName.split(/[/\\]/).pop() || ''

    // 날짜 패턴: 2025.09.13, 2025/09/13, 2025-09-13
    const dateMatch = fileName.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/)
    if (!dateMatch) return null

    const normalizedDate = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`

    // 시간 패턴: 11시30분, 11시 30분, 11:30
    const timeMatch = fileName.match(/(\d{1,2})시\s*(\d{1,2})?분?|(\d{1,2}):(\d{2})/)
    if (!timeMatch) return null

    let hour: string, minute: string
    if (timeMatch[1] && timeMatch[1].length <= 2 && fileName.includes('시')) {
      // "11시30분" 형식
      hour = timeMatch[1].padStart(2, '0')
      minute = (timeMatch[2] || '00').padStart(2, '0')
    } else if (timeMatch[3] && timeMatch[4]) {
      // "11:30" 형식
      hour = timeMatch[3].padStart(2, '0')
      minute = timeMatch[4].padStart(2, '0')
    } else {
      return null
    }
    const normalizedTime = `${hour}:${minute}`

    // 신랑신부 패턴: (최다솔 안연주), (케이(K)(박정현 서주연))
    const coupleMatch = fileName.match(/\(([^)]+)\)/)
    let coupleNames = ''
    if (coupleMatch) {
      // 괄호 안에서 한글만 추출
      const hangeulOnly = coupleMatch[1].replace(/[^\uac00-\ud7af\s]/g, '').trim()
      coupleNames = hangeulOnly
    }

    // 컷수 패턴: - 작가(1234) 또는 (1234)
    const cutsMatch = fileName.match(/[-\s]*[^(]*\((\d+)\)\s*$/)

    return {
      date: normalizedDate,
      time: normalizedTime,
      couple: coupleNames,
      cutsFromName: cutsMatch ? parseInt(cutsMatch[1]) : null
    }
  } catch (error) {
    console.error('폴더명 파싱 오류:', error)
    return null
  }
}

/**
 * 시간 매칭 (11시30분 ↔ 11:30)
 */
export function timeMatches(scheduleTime: string, folderTime: string): boolean {
  const normalizeTime = (time: string) => {
    return time
      .replace(/\s+/g, '')
      .replace(/시/g, ':')
      .replace(/분/g, '')
      .replace(/:$/, ':00')
  }

  const normalized1 = normalizeTime(scheduleTime)
  const normalized2 = normalizeTime(folderTime)

  return normalized1 === normalized2
}

/**
 * 신랑신부명 정규화
 */
export function normalizeCoupleNames(coupleStr: string): string {
  return coupleStr.replace(/\s+/g, '').replace(/,/g, '').toLowerCase()
}

/**
 * 스케줄과 폴더 매칭
 */
export function findMatchingSchedule(
  parsedFolder: ParsedFolderData,
  schedules: Schedule[]
): Schedule | null {
  return schedules.find(schedule => {
    // 날짜 정확히 일치
    if (schedule.date !== parsedFolder.date) return false

    // 시간 매칭
    if (!timeMatches(schedule.time, parsedFolder.time)) return false

    // 신랑신부 매칭 (있는 경우만)
    if (parsedFolder.couple && schedule.couple) {
      const normalizedScheduleCouple = normalizeCoupleNames(schedule.couple)
      const normalizedFolderCouple = normalizeCoupleNames(parsedFolder.couple)

      // 포함 관계 확인
      if (!normalizedScheduleCouple.includes(normalizedFolderCouple) &&
          !normalizedFolderCouple.includes(normalizedScheduleCouple)) {
        return false
      }
    }

    return true
  }) || null
}

/**
 * FileSystemDirectoryReader의 readEntries를 재귀적으로 호출 (100개 제한 해결)
 */
export async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = []

  const readBatch = async (): Promise<void> => {
    return new Promise((resolve) => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve()
        } else {
          entries.push(...batch)
          readBatch().then(resolve)
        }
      })
    })
  }

  await readBatch()
  return entries
}

/**
 * 셀렉 폴더 체크
 */
export function isSelectFolder(folderName: string): boolean {
  const lowerName = folderName.toLowerCase()
  return EXCLUDE_FOLDERS.some(keyword => lowerName.includes(keyword))
}

/**
 * 폴더 내 사진 파일 카운팅
 */
export async function countPhotosInFolder(
  folderEntry: FileSystemDirectoryEntry
): Promise<FileCountResult> {
  const allFiles = new Set<string>()
  const rawFiles = new Set<string>()
  const jpgFiles = new Set<string>()
  let hasRawFiles = false

  const scanFolder = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const fileName = entry.name.toLowerCase()
      const fullFileName = entry.name

      // 확장자 제거한 베이스명
      const allExtensions = [...RAW_EXTENSIONS, ...IMAGE_EXTENSIONS]
      const extensionPattern = allExtensions.map(ext => ext.slice(1)).join('|')
      const baseName = fileName.replace(new RegExp(`\\.(${extensionPattern})$`, 'i'), '')

      // RAW 파일
      if (RAW_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        hasRawFiles = true
        allFiles.add(baseName)
        rawFiles.add(fullFileName)
      }
      // JPG 파일
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        allFiles.add(baseName)
        jpgFiles.add(fullFileName)
      }
      // 기타 이미지 파일
      else if (IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        allFiles.add(baseName)
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const folderName = dirEntry.name.toLowerCase()

      // 제외 폴더 체크
      if (EXCLUDE_FOLDERS.some(exclude => folderName.includes(exclude))) {
        return
      }

      const reader = dirEntry.createReader()
      const entries = await readAllEntries(reader)

      for (const subEntry of entries) {
        await scanFolder(subEntry)
      }
    }
  }

  try {
    const reader = folderEntry.createReader()
    const entries = await readAllEntries(reader)

    // 1단계: 모든 파일 스캔
    for (const entry of entries) {
      await scanFolder(entry)
    }

    // 2단계: 카운팅 로직
    if (hasRawFiles) {
      // RAW 파일이 있으면 RAW 파일만 카운팅
      const rawCount = rawFiles.size

      // RAW/JPG 불일치 체크
      const mismatchFiles: string[] = []
      if (rawCount !== jpgFiles.size) {
        const rawBaseNames = new Set(
          [...rawFiles].map(f => f.toLowerCase().replace(/\.(raw|cr2|nef|arw|dng|orf|rw2|pef|srw|x3f|raf|3fr|fff|erf|mrw|dcr|kdc|srf|arq)$/i, ''))
        )
        const jpgBaseNames = new Set(
          [...jpgFiles].map(f => f.toLowerCase().replace(/\.(jpg|jpeg)$/i, ''))
        )

        // RAW만 있는 파일
        rawBaseNames.forEach(baseName => {
          if (!jpgBaseNames.has(baseName)) {
            const file = [...rawFiles].find(f =>
              f.toLowerCase().replace(/\.(raw|cr2|nef|arw|dng|orf|rw2|pef|srw|x3f|raf|3fr|fff|erf|mrw|dcr|kdc|srf|arq)$/i, '') === baseName
            )
            if (file) mismatchFiles.push(file)
          }
        })

        // JPG만 있는 파일
        jpgBaseNames.forEach(baseName => {
          if (!rawBaseNames.has(baseName)) {
            const file = [...jpgFiles].find(f =>
              f.toLowerCase().replace(/\.(jpg|jpeg)$/i, '') === baseName
            )
            if (file) mismatchFiles.push(file)
          }
        })
      }

      return {
        count: rawCount,
        rawCount: rawCount,
        jpgCount: jpgFiles.size,
        mismatch: rawCount !== jpgFiles.size,
        mismatchFiles
      }
    } else {
      // RAW 파일이 없으면 이미지 파일 개수 (중복 제거)
      return {
        count: allFiles.size,
        rawCount: 0,
        jpgCount: jpgFiles.size,
        mismatch: false,
        mismatchFiles: []
      }
    }
  } catch (error) {
    console.error('폴더 스캔 오류:', error)
    return {
      count: 0,
      rawCount: 0,
      jpgCount: 0,
      mismatch: false,
      mismatchFiles: []
    }
  }
}

/**
 * 재귀적으로 스케줄 폴더 찾기
 */
export async function findScheduleFolders(
  folderEntry: FileSystemDirectoryEntry,
  processedFolders: Set<string> = new Set()
): Promise<Array<{ entry: FileSystemDirectoryEntry; fullPath: string; parsedData: ParsedFolderData }>> {
  const scheduleFolders: Array<{ entry: FileSystemDirectoryEntry; fullPath: string; parsedData: ParsedFolderData }> = []

  try {
    const reader = folderEntry.createReader()
    const entries = await readAllEntries(reader)

    for (const entry of entries) {
      if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry

        // 셀렉 폴더 제외
        if (isSelectFolder(dirEntry.name)) {
          continue
        }

        // 폴더명이 스케줄 패턴인지 확인
        const parsedFolder = parseFolderName(dirEntry.name)

        if (parsedFolder) {
          // 중복 폴더 체크
          const folderKey = `${parsedFolder.date}_${parsedFolder.time}_${parsedFolder.couple || 'unknown'}`
          if (processedFolders.has(folderKey)) {
            continue
          }
          processedFolders.add(folderKey)

          // 스케줄 폴더 발견
          scheduleFolders.push({
            entry: dirEntry,
            fullPath: `${folderEntry.name}/${dirEntry.name}`,
            parsedData: parsedFolder
          })
        } else {
          // 상위 폴더인 경우 재귀 탐색
          const subFolders = await findScheduleFolders(dirEntry, processedFolders)
          scheduleFolders.push(...subFolders)
        }
      }
    }
  } catch (error) {
    console.error(`폴더 탐색 오류 (${folderEntry.name}):`, error)
  }

  return scheduleFolders
}
