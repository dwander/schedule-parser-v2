import { useEffect, useRef, useState } from 'react'

/**
 * 카드가 뷰포트에서 벗어날 때 scale과 opacity를 조절하는 hook
 * 모바일 카드뷰에서만 적용됨
 */
export function useCardScrollEffect(isEnabled: boolean = true) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!isEnabled || !ref.current) return

    const element = ref.current

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio

          // 뷰포트에 완전히 들어왔을 때: scale 1, opacity 1
          // 뷰포트를 벗어날수록: scale 0.85~1, opacity 0.3~1
          const scale = 0.85 + (ratio * 0.15) // 0.85 ~ 1.0
          const opacity = 0.3 + (ratio * 0.7) // 0.3 ~ 1.0

          setStyle({
            transform: `scale(${scale})`,
            opacity: opacity,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
          })
        })
      },
      {
        threshold: Array.from({ length: 101 }, (_, i) => i / 100), // 0 ~ 1까지 0.01 단위
        rootMargin: '0px', // 뷰포트 기준
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [isEnabled])

  return { ref, style }
}
