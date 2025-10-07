import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import checker from 'vite-plugin-checker'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      overlay: {
        initialIsOpen: false, // 에러 발생 시 자동으로 오버레이 표시
      },
    }),
  ],
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
