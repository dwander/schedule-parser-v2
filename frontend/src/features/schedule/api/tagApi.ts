import { apiClient } from '@/lib/api/client'
import { getUserId } from '@/lib/utils/userUtils'

export interface Tag {
  id: number
  user_id: string
  tag_type: 'brand' | 'album' | 'tags'
  tag_value: string
  created_at: string
  updated_at: string
}

export interface CreateTagRequest {
  tag_type: 'brand' | 'album' | 'tags'
  tag_value: string
}

export async function fetchTags(tagType?: 'brand' | 'album' | 'tags'): Promise<Tag[]> {
  const userId = getUserId()
  const { data } = await apiClient.get(`/api/tags/${userId}`, {
    params: tagType ? { tag_type: tagType } : undefined
  })
  return data.tags
}

export async function createTag(tagData: CreateTagRequest): Promise<Tag> {
  const userId = getUserId()
  const { data } = await apiClient.post(`/api/tags/${userId}`, tagData)
  return data.tag
}

export async function deleteTag(tagId: number): Promise<void> {
  const userId = getUserId()
  await apiClient.delete(`/api/tags/${userId}/${tagId}`)
}

export async function syncTagsFromSchedules(): Promise<{ created_count: number }> {
  const userId = getUserId()
  const { data } = await apiClient.post(`/api/tags/${userId}/sync`)
  return { created_count: data.created_count }
}
