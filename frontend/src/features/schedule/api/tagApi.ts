import { API_BASE_URL } from '@/config/api'

export interface Tag {
  id: number
  user_id: string
  tag_type: 'brand' | 'album'
  tag_value: string
  created_at: string
  updated_at: string
}

export interface CreateTagRequest {
  tag_type: 'brand' | 'album'
  tag_value: string
}

const getUserId = () => {
  return localStorage.getItem('user_id') || 'anonymous'
}

export async function fetchTags(tagType?: 'brand' | 'album'): Promise<Tag[]> {
  const userId = getUserId()
  const url = new URL(`${API_BASE_URL}/api/tags/${userId}`)

  if (tagType) {
    url.searchParams.set('tag_type', tagType)
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error('Failed to fetch tags')
  }

  const data = await response.json()
  return data.tags
}

export async function createTag(tagData: CreateTagRequest): Promise<Tag> {
  const userId = getUserId()

  const response = await fetch(`${API_BASE_URL}/api/tags/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tagData),
  })

  if (!response.ok) {
    throw new Error('Failed to create tag')
  }

  const data = await response.json()
  return data.tag
}

export async function deleteTag(tagId: number): Promise<void> {
  const userId = getUserId()

  const response = await fetch(`${API_BASE_URL}/api/tags/${userId}/${tagId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete tag')
  }
}

export async function syncTagsFromSchedules(): Promise<{ created_count: number }> {
  const userId = getUserId()

  const response = await fetch(`${API_BASE_URL}/api/tags/${userId}/sync`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to sync tags')
  }

  const data = await response.json()
  return { created_count: data.created_count }
}
