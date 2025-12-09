import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// PUBLIC_INTERFACE
/**
 * Vite configuration for Vue 3 + TS.
 * - Binds server to all hosts (host: true) for preview runner compatibility.
 * - Uses PORT or VITE_PORT env (fallback 3000) and allows override via CLI --port/--host.
 * - Removes allowedHosts restrictions to avoid blocking in CI/preview.
 */
const PORT = Number(process.env.PORT || process.env.VITE_PORT || 3000)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Preserve common @ alias used in Vue + TS projects if referenced
      '@': '/src',
    },
  },
  server: {
    host: true, // 0.0.0.0 binding and external access
    port: PORT,
    strictPort: false, // allow preview system to pass a different --port if needed
  },
  preview: {
    host: true,
    port: PORT,
    strictPort: false,
  },
})
