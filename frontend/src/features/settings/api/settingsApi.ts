/**
 * 사용자 설정 API
 *
 * 브랜드/장소 단축어, 폴더명 포맷 등 범용 설정 관리
 */

import { apiClient } from '@/lib/api/client'

export interface UserSettingsResponse {
  user_id: string
  settings: Record<string, unknown>
  created_at: string | null
  updated_at: string | null
}

/**
 * 사용자 설정 조회
 */
export async function getUserSettings(userId: string): Promise<UserSettingsResponse> {
  const response = await apiClient.get<UserSettingsResponse>(
    `/api/users/${userId}/settings`
  )
  return response.data
}

/**
 * 사용자 설정 업데이트 (부분 업데이트)
 *
 * 기존 설정과 merge되므로 변경된 부분만 전송 가능
 */
export async function updateUserSettings(
  userId: string,
  settings: Record<string, unknown>
): Promise<UserSettingsResponse> {
  const response = await apiClient.patch<UserSettingsResponse>(
    `/api/users/${userId}/settings`,
    { settings }
  )
  return response.data
}

/**
 * 사용자 설정 전체 교체
 */
export async function replaceUserSettings(
  userId: string,
  settings: Record<string, unknown>
): Promise<UserSettingsResponse> {
  const response = await apiClient.put<UserSettingsResponse>(
    `/api/users/${userId}/settings`,
    { settings }
  )
  return response.data
}
