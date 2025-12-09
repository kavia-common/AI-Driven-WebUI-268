import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// PUBLIC_INTERFACE
/**
 * Vite configuration for Vue 3 + TS.
 * - Binds server to all hosts (host: true) for preview runner compatibility.
 * - Uses PORT or VITE_PORT env (fallback 3000) and allows override via CLI --port/--host.
 * - Removes allowedHosts restrictions to avoid blocking in CI/preview.
 * - Uses strictPort true so port conflicts fail fast (CI can react).
 */
const rawPort = process.env.PORT || process.env.VITE_PORT
const PORT = Number.isInteger(Number(rawPort)) && Number(rawPort) > 0 ? Number(rawPort) : 3000

/**
 * Normalize host from environment. If HOST is malformed (e.g., '0.0.11.184' or other invalid),
 * fall back to host: true which Vite treats as 0.0.0.0.
 */
function resolveHost(): true | string {
  const envHost = (process.env.HOST || '').trim()
  if (!envHost) return true
  // basic IPv4 validation and 0.0.0.0 allowance; allow hostnames too (letters, digits, dashes, dots)
  const ipv4Regex =
    /^(?:\d{1,3}\.){3}\d{1,3}$/
  const hostnameRegex =
    /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.?$/
  const isIPv4 = ipv4Regex.test(envHost)
  const isHostname = hostnameRegex.test(envHost)
  if (isIPv4) {
    const parts = envHost.split('.').map(n => Number(n))
    const valid = parts.every(n => n >= 0 && n <= 255)
    if (valid) return envHost
    return true
  }
  if (isHostname) return envHost
  return true
}

const HOST = resolveHost()

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Preserve common @ alias used in Vue + TS projects if referenced
      '@': '/src',
    },
  },
  server: {
    // host true binds to 0.0.0.0; if a valid HOST env is supplied, use it
    host: HOST,
    // Force to PORT/VITE_PORT/3000; CLI --port can still override if provided
    port: PORT,
    // Fail fast if 3000 is occupied so CI/preview can detect and adjust
    strictPort: true,
  },
  preview: {
    host: HOST,
    port: PORT,
    strictPort: true,
  },
})
