/**
 * 사용자 설정 동기화 훅
 *
 * DB와 Zustand store 간 설정 동기화
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserSettings, updateUserSettings } from '../api/settingsApi'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useEffect, useRef } from 'react'

/**
 * 사용자 설정 조회
 */
export function useUserSettings() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: () => getUserSettings(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 사용자 설정 업데이트
 */
export function useUpdateUserSettings() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      updateUserSettings(user!.id, settings),
    onSuccess: (data) => {
      // 캐시 업데이트
      queryClient.setQueryData(['userSettings', user?.id], data)
    },
  })
}

/**
 * 설정 동기화 훅
 *
 * - 앱 시작 시 DB에서 설정 로드
 * - 설정 변경 시 자동으로 DB에 저장 (debounce 적용)
 */
export function useSettingsSync() {
  const { user } = useAuthStore()
  const { data: dbSettings } = useUserSettings()
  const updateMutation = useUpdateUserSettings()
  const initialized = useRef(false)

  // 브랜드/장소 단축어만 동기화 (점진적 마이그레이션)
  const brandShortcuts = useSettingsStore((state) => state.brandShortcuts)
  const locationShortcuts = useSettingsStore((state) => state.locationShortcuts)
  const setBrandShortcuts = useSettingsStore((state) => state.setBrandShortcuts)
  const setLocationShortcuts = useSettingsStore((state) => state.setLocationShortcuts)

  // DB → Zustand (초기 로드)
  useEffect(() => {
    if (!dbSettings || initialized.current) return

    // settings가 undefined일 수 있으므로 체크
    if (!dbSettings.settings) {
      initialized.current = true
      return
    }

    const settings = dbSettings.settings as {
      brandShortcuts?: Record<string, string>
      locationShortcuts?: Record<string, string>
    }

    if (settings.brandShortcuts) {
      setBrandShortcuts(settings.brandShortcuts)
    }
    if (settings.locationShortcuts) {
      setLocationShortcuts(settings.locationShortcuts)
    }

    initialized.current = true
  }, [dbSettings, setBrandShortcuts, setLocationShortcuts])

  // Zustand → DB (설정 변경 감지)
  const previousBrandShortcuts = useRef(brandShortcuts)
  const previousLocationShortcuts = useRef(locationShortcuts)

  useEffect(() => {
    if (!user?.id || !initialized.current) return

    // 변경 감지
    const brandChanged = JSON.stringify(brandShortcuts) !== JSON.stringify(previousBrandShortcuts.current)
    const locationChanged = JSON.stringify(locationShortcuts) !== JSON.stringify(previousLocationShortcuts.current)

    if (brandChanged || locationChanged) {
      // Debounce: 설정 변경 후 500ms 후 저장
      const timer = setTimeout(() => {
        updateMutation.mutate({
          brandShortcuts,
          locationShortcuts,
        })

        previousBrandShortcuts.current = brandShortcuts
        previousLocationShortcuts.current = locationShortcuts
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [brandShortcuts, locationShortcuts, user?.id, updateMutation])
}
