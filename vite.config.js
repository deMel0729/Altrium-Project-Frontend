import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import process from 'node:process'

// The backend has no CORS policy, so the dev server proxies /api straight to it.
// Point VITE_PROXY_TARGET at the https profile (https://localhost:7069) if you
// prefer running the API over TLS.
const target = process.env.VITE_PROXY_TARGET ?? 'http://localhost:5169'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
