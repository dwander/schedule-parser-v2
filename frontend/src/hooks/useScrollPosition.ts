import { useEffect, useState } from 'react'

interface ScrollPosition {
  scrollY: number
  isNearTop: boolean
  isNearBottom: boolean
  canScrollUp: boolean
  canScrollDown: boolean
}

export function useScrollPosition(threshold = 300) {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    scrollY: 0,
    isNearTop: true,
    isNearBottom: false,
    canScrollUp: false,
    canScrollDown: false,
  })

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      const isNearTop = scrollY < threshold
      const isNearBottom = scrollY + windowHeight > documentHeight - threshold
      const canScrollUp = scrollY > threshold
      const canScrollDown = scrollY + windowHeight < documentHeight - threshold

      setScrollPosition({
        scrollY,
        isNearTop,
        isNearBottom,
        canScrollUp,
        canScrollDown,
      })
    }

    // Initial check
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrollPosition
}
