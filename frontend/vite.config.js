import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['recharts'],
          http: ['axios'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
