import { defineConfig, loadEnv, PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Create a simple healthcheck middleware returning 200 OK for /healthz
 * Works for both dev (server.middlewares) and preview (configurePreviewServer)
 */
function healthcheckPlugin(path = '/healthz'): PluginOption {
  return {
    name: 'healthcheck-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === path) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'ok' }))
          return
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === path) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'ok' }))
          return
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load environment variables with no prefix filter to allow VITE_* variables
  const env = loadEnv(mode, process.cwd(), '')

  const base = env.VITE_BASE && env.VITE_BASE !== '/' ? env.VITE_BASE : '/'
  const host = env.VITE_HOST || '0.0.0.0'
  const strictPort = env.VITE_STRICT_PORT ? env.VITE_STRICT_PORT === 'true' : true

  // If VITE_PORT is provided, use it for dev. Preview defaults to dev+1 unless VITE_PREVIEW_PORT provided.
  const devPort = Number(env.VITE_PORT || 3000)
  const previewPort = Number(env.VITE_PREVIEW_PORT || devPort + 1)

  const logLevel = (env.VITE_LOG_LEVEL as any) || 'info'
  const healthPath = env.VITE_HEALTHCHECK_PATH || '/healthz'

  return {
    base,
    logLevel,
    plugins: [vue(), healthcheckPlugin(healthPath)],
    server: {
      host,
      port: devPort,
      strictPort,
      allowedHosts: true,
    },
    preview: {
      host,
      port: previewPort,
      strictPort,
    },
  }
})
