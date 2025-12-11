/**
 * 앱 API 키 관리 API
 *
 * 데스크탑 앱 연동용 API 키 생성, 조회, 삭제 등
 */

import { apiClient } from '@/lib/api/client'

export interface AppApiKey {
  id: number
  user_id: string
  key_prefix: string
  name: string
  last_used_at: string | null
  is_active: boolean
  created_at: string
  expires_at: string | null
}

export interface CreateApiKeyResponse {
  success: boolean
  key: string  // 평문 키 (생성 시 1회만)
  api_key: AppApiKey
}

export interface ListApiKeysResponse {
  success: boolean
  api_keys: AppApiKey[]
  total: number
}

/**
 * API 키 목록 조회
 */
export async function listAppApiKeys(userId: string): Promise<ListApiKeysResponse> {
  const response = await apiClient.get<ListApiKeysResponse>(
    `/api/app-keys?user_id=${userId}`
  )
  return response.data
}

/**
 * 새 API 키 생성
 */
export async function createAppApiKey(
  userId: string,
  name: string
): Promise<CreateApiKeyResponse> {
  const response = await apiClient.post<CreateApiKeyResponse>(
    `/api/app-keys?user_id=${userId}`,
    { name }
  )
  return response.data
}

/**
 * API 키 삭제
 */
export async function deleteAppApiKey(
  userId: string,
  keyId: number
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `/api/app-keys/${keyId}?user_id=${userId}`
  )
  return response.data
}

/**
 * API 키 비활성화
 */
export async function deactivateAppApiKey(
  userId: string,
  keyId: number
): Promise<{ success: boolean; api_key: AppApiKey }> {
  const response = await apiClient.patch<{ success: boolean; api_key: AppApiKey }>(
    `/api/app-keys/${keyId}/deactivate?user_id=${userId}`
  )
  return response.data
}

/**
 * API 키 활성화
 */
export async function activateAppApiKey(
  userId: string,
  keyId: number
): Promise<{ success: boolean; api_key: AppApiKey }> {
  const response = await apiClient.patch<{ success: boolean; api_key: AppApiKey }>(
    `/api/app-keys/${keyId}/activate?user_id=${userId}`
  )
  return response.data
}

/**
 * API 키 재생성
 */
export async function regenerateAppApiKey(
  userId: string,
  keyId: number
): Promise<CreateApiKeyResponse> {
  const response = await apiClient.post<CreateApiKeyResponse>(
    `/api/app-keys/${keyId}/regenerate?user_id=${userId}`
  )
  return response.data
}
