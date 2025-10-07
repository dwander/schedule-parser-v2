import { apiClient } from './client'

/**
 * 사용자가 예제 데이터를 본 것으로 표시
 */
export async function markSampleDataSeen(userId: string): Promise<void> {
  await apiClient.patch(`/api/users/${userId}/sample-data`)
}
