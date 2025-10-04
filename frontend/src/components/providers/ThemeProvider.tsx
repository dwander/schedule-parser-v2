import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ReactNode, useEffect } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useSettingsStore((state) => state.theme)

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      forcedTheme={theme}
    >
      {children}
    </NextThemesProvider>
  )
}
