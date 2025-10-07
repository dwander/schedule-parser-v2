import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// PWA Service Worker 등록
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // 새 버전 감지 시 자동 업데이트
    console.log('새 버전이 감지되었습니다. 업데이트합니다...')
    updateSW(true)
  },
  onOfflineReady() {
    console.log('오프라인 사용 준비 완료!')
  },
  onRegistered(registration) {
    console.log('Service Worker가 등록되었습니다:', registration)
  },
  onRegisterError(error) {
    console.error('Service Worker 등록 실패:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
