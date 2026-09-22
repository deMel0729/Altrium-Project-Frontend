import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import process from 'node:process'

// The dev server proxies /api to the backend. Going through the proxy keeps the
// browser on a single http origin, which avoids CORS entirely and - because
// `secure: false` lets the proxy ignore the self-signed localhost certificate -
// works in embedded browsers (VS Code, IDE previews) that cannot show a
// certificate prompt.
//
// loadEnv, not process.env: Vite only exposes .env files to client code through
// import.meta.env, so a plain process.env read here silently misses them and
// falls back to the default below.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'https://localhost:7069'

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
