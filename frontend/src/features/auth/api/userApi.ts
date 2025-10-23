import { apiClient } from '@/lib/api/client'
import type { VoiceTrainingData } from '@/features/schedule/types/voiceRecognition'
import type { ColumnLabels } from '@/stores/useSettingsStore'

/**
 * UI Settings type stored in database
 */
export interface UiSettings {
  columnLabels?: Partial<ColumnLabels> // 부분 업데이트 지원
  // 향후 추가될 설정들 (예시)
  // listColumnVisibility?: ColumnVisibility
  // cardColumnVisibility?: ColumnVisibility
  // fontSize?: number
  // priceMode?: 'total' | 'net'
  [key: string]: unknown // 유연한 확장을 위한 index signature
}

/**
 * User detail type (from backend with snake_case fields)
 */
export interface UserDetail {
  id: string
  auth_provider: string
  is_anonymous: boolean
  email: string | null
  name: string | null
  is_admin: boolean
  has_seen_sample_data: boolean
  voice_training_data: VoiceTrainingData | null
  ui_settings: UiSettings | null
  created_at: string | null
  last_login: string | null
  schedule_count?: number
}

/**
 * Fetch all users (admin only)
 */
export async function fetchUsers(): Promise<UserDetail[]> {
  const response = await apiClient.get('/api/users')
  return response.data.users || []
}

/**
 * Fetch voice training data for a user
 */
export async function fetchVoiceTrainingData(userId: string): Promise<VoiceTrainingData | null> {
  const response = await apiClient.get(`/api/users/${userId}/voice-training`)
  return response.data.voice_training_data
}

/**
 * Update voice training data for a user
 */
export async function updateVoiceTrainingData(
  userId: string,
  voiceTrainingData: VoiceTrainingData
): Promise<VoiceTrainingData> {
  const response = await apiClient.patch(`/api/users/${userId}/voice-training`, {
    voice_training_data: voiceTrainingData
  })
  return response.data.voice_training_data
}

/**
 * Fetch UI settings for a user
 */
export async function fetchUiSettings(userId: string): Promise<UiSettings | null> {
  const response = await apiClient.get(`/api/users/${userId}/settings`)
  return response.data.ui_settings
}

/**
 * Update UI settings for a user (partial update supported)
 */
export async function updateUiSettings(
  userId: string,
  uiSettings: Partial<UiSettings>
): Promise<UiSettings> {
  const response = await apiClient.patch(`/api/users/${userId}/settings`, {
    ui_settings: uiSettings
  })
  return response.data.ui_settings
}

/**
 * Delete user response type
 */
export interface DeleteUserResponse {
  success: boolean
  message: string
  deleted_data: {
    schedules: number
    tags: number
    pricing_rules: number
    trash: number
  }
}

/**
 * Delete a user and all associated data (admin only)
 */
export async function deleteUser(
  userId: string,
  requesterUserId: string
): Promise<DeleteUserResponse> {
  const response = await apiClient.delete(`/api/users/${userId}`, {
    data: {
      requester_user_id: requesterUserId
    }
  })
  return response.data
}
