import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // Load environment variables with no prefix filter to allow VITE_* variables
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT || 3000)
  const host = env.VITE_HOST || '0.0.0.0'
  const strictPort = env.VITE_STRICT_PORT === 'true'

  return {
    plugins: [vue()],
    server: {
      host,
      port,
      strictPort,
      allowedHosts: true,
    },
    preview: {
      host,
      port,
      strictPort,
    },
  }
})
