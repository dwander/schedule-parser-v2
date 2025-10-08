/**
 * 파일 타입 및 확장자 관련 상수
 */

/**
 * RAW 파일 확장자 정규식
 * 지원: raw, cr2, nef, arw, dng, orf, rw2, pef, srw, x3f, raf, 3fr, fff, erf, mrw, dcr, kdc, srf, arq
 */
export const RAW_FILE_EXTENSIONS_REGEX = /\.(raw|cr2|nef|arw|dng|orf|rw2|pef|srw|x3f|raf|3fr|fff|erf|mrw|dcr|kdc|srf|arq)$/i

/**
 * JPG 파일 확장자 정규식
 */
export const JPG_FILE_EXTENSIONS_REGEX = /\.(jpg|jpeg)$/i

/**
 * 텍스트 파일 확장자
 */
export const TEXT_FILE_EXTENSIONS = ['.txt', '.eml'] as const

/**
 * JSON 파일 확장자
 */
export const JSON_FILE_EXTENSION = '.json'
