import { apiClient } from '@/lib/api/client'
import type { VoiceTrainingData } from '@/features/schedule/types/voiceRecognition'

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
