import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 如果原本就有 host/port，就一起放進來
    // host: '0.0.0.0',
    allowedHosts: [
      // 只開給 Kavia 的預覽網域
      '.cloud.kavia.ai',
      // 或照錯誤訊息寫死整個 host 也可以：
      // 'vscode-internal-15668-beta.beta01.cloud.kavia.ai',
    ],
  },
})
