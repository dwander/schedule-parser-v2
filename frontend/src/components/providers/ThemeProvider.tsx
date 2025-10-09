import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { ReactNode, useEffect, useRef } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface ThemeProviderProps {
  children: ReactNode
}

// useSettingsStore <-> next-themes 양방향 동기화
function ThemeSynchronizer() {
  const { theme: nextTheme, setTheme: setNextTheme, resolvedTheme } = useTheme()
  const { theme: storeTheme, setTheme: setStoreTheme } = useSettingsStore()
  const isSyncingRef = useRef(false)

  // Settings 모달에서 변경 -> next-themes 반영
  useEffect(() => {
    if (isSyncingRef.current) return
    if (storeTheme && nextTheme && storeTheme !== nextTheme) {
      isSyncingRef.current = true
      setNextTheme(storeTheme)
      setTimeout(() => { isSyncingRef.current = false }, 0)
    }
  }, [storeTheme, nextTheme, setNextTheme])

  // ScheduleTable 드롭다운에서 변경 -> useSettingsStore 반영
  useEffect(() => {
    if (isSyncingRef.current) return
    if (nextTheme && storeTheme && nextTheme !== storeTheme) {
      isSyncingRef.current = true
      setStoreTheme(nextTheme as 'light' | 'dark' | 'system')
      setTimeout(() => { isSyncingRef.current = false }, 0)
    }
  }, [nextTheme, storeTheme, setStoreTheme])

  return null
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useSettingsStore((state) => state.theme)

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem
      storageKey="app-theme"
    >
      <ThemeSynchronizer />
      {children}
    </NextThemesProvider>
  )
}
