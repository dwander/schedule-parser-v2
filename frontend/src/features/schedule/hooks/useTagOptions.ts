import { useMemo } from 'react'
import { useTags } from './useTags'

export function useTagOptions() {
  const { data: brandTags = [] } = useTags('brand')
  const { data: albumTags = [] } = useTags('album')
  const { data: customTags = [] } = useTags('tags')

  const brandOptions = useMemo(() => {
    return brandTags.map(tag => tag.tag_value).sort()
  }, [brandTags])

  const albumOptions = useMemo(() => {
    return albumTags.map(tag => tag.tag_value).sort()
  }, [albumTags])

  const tagOptions = useMemo(() => {
    // DB에서 가져온 태그만 사용
    return customTags.map(tag => tag.tag_value).sort()
  }, [customTags])

  return {
    brandOptions,
    albumOptions,
    tagOptions,
  }
}
