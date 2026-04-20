import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env  = loadEnv(mode, process.cwd(), 'VITE_')
  const BASE = env.VITE_BASE_URL || 'http://192.168.18.243'

  return {
    plugins: [react()],

    // ── Dev server ──────────────────────────────────────────────────────────
    server: {
      proxy: {
        '/Auth':  { target: `${BASE}:6000`, changeOrigin: true, secure: false },
        '/Admin': { target: `${BASE}:6001`, changeOrigin: true, secure: false },
      },
    },

    // ── Build optimisations ─────────────────────────────────────────────────
    build: {
      target:           'esnext',   // modern output — smaller, no legacy polyfills
      minify:           'esbuild',  // fastest minifier (default but explicit)
      cssCodeSplit:     true,       // each lazy chunk gets its own CSS file
      sourcemap:        false,      // turn on to 'hidden' if you need error tracking
      chunkSizeWarningLimit: 600,   // suppress warnings for slightly large chunks

      rollupOptions: {
        output: {
          // Split vendor code into stable, long-cacheable chunks.
          // Users who haven't changed pages only re-download the app chunk.
          manualChunks: {
            // Core React runtime — changes almost never
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Networking — changes rarely
            'vendor-axios': ['axios'],
            // MQTT — large lib, isolated so it doesn't bloat other chunks
            'vendor-mqtt':  ['paho-mqtt'],
            // UI utilities
            'vendor-ui':    ['lucide-react', 'react-toastify'],
          },
        },
      },
    },

    // ── Dependency pre-bundling ─────────────────────────────────────────────
    // Vite pre-bundles these on first dev-server start so they resolve instantly.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios', 'paho-mqtt'],
    },
  }
})
