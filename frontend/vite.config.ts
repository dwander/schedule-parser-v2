import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: {
      usePolling: true, // WSL2 환경에서 파일 변경 감지를 위한 폴링 사용
    },
    host: true, // 네트워크에서 접근 가능하도록 설정
  },
})
