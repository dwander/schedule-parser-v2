import { useMemo } from 'react'
import { useTags } from './useTags'

export function useTagOptions() {
  const { data: brandTags = [] } = useTags('brand')
  const { data: albumTags = [] } = useTags('album')

  const brandOptions = useMemo(() => {
    return brandTags.map(tag => tag.tag_value).sort()
  }, [brandTags])

  const albumOptions = useMemo(() => {
    return albumTags.map(tag => tag.tag_value).sort()
  }, [albumTags])

  return {
    brandOptions,
    albumOptions,
  }
}
