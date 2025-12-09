import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',   // 讓容器裡可以從外面打進來
    port: 3000,        // 一定要 3000，配合 Kavia
    strictPort: true,
    allowedHosts: true // 讓各種 vscode-internal-xxxx.cloud.kavia.ai 都能連
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  }
})
