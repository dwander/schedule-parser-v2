import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { ReactNode, useEffect } from 'react'

interface ThemeProviderProps {
  children: ReactNode
}

// 테마 변경 시 OS 상태바 색상 업데이트
function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!resolvedTheme) return

    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    const themeColor = resolvedTheme === 'dark' ? '#101419' : '#fcfcfc'

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor)
    }
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="app-theme"
    >
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  )
}
