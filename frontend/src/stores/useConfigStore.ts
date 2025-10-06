import { create } from 'zustand'
import type { AppConfig } from '@/lib/api/config'

interface ConfigStore {
  config: AppConfig | null
  isLoaded: boolean
  setConfig: (config: AppConfig) => void
}

/**
 * 런타임 설정 전역 상태 관리
 * Backend에서 가져온 OAuth Client ID 등 저장
 */
export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  isLoaded: false,
  setConfig: (config) => set({ config, isLoaded: true }),
}))
