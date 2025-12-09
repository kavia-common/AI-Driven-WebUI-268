import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// PUBLIC_INTERFACE
/**
 * Vite configuration for Vue 3 + TS.
 * - Binds server to all hosts (host: true) for preview runner compatibility.
 * - Uses VITE_PORT env (fallback 3000) and allows override via CLI --port/--host.
 * - Keeps allowedHosts for preview environments.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Preserve common @ alias used in Vue + TS projects if referenced
      '@': '/src',
    },
  },
  server: {
    host: true, // allows 0.0.0.0 binding and external access
    port: Number(process.env.VITE_PORT || 3000),
    strictPort: false, // allow preview system to pass a different --port if needed
    allowedHosts: [
      '.cloud.kavia.ai',
    ],
  },
  preview: {
    host: true,
    port: Number(process.env.VITE_PORT || 3000),
    strictPort: false,
    allowedHosts: [
      '.cloud.kavia.ai',
    ],
  },
})
