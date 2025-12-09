import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // 可選：讓外部也能連到 dev server
    // host: '0.0.0.0',
    allowedHosts: true,
  },
})
