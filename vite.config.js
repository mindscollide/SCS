import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const BASE = env.VITE_BASE_URL || 'http://192.168.18.243'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Each entry: path prefix → forward to BASE + port
        // Browser calls  → http://localhost:5173/Auth/...
        // Vite forwards  → http://192.168.18.243:6000/Auth/...
        '/Auth':  { target: `${BASE}:6000`, changeOrigin: true, secure: false },
        '/Admin': { target: `${BASE}:6001`, changeOrigin: true, secure: false },
      },
    },
  }
})
