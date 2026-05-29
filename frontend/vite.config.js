import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://individual-wp27.onrender.com',
        changeOrigin: true,
        ws: true
      },
      '/socket.io': {
        target: 'https://individual-wp27.onrender.com',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
