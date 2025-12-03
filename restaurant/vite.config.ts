import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api requests to backend to avoid CORS during development
    proxy: {
      '/api': {
        target: 'http://172.20.10.3:1337',
        changeOrigin: true,
        secure: false,
        // keep the /api prefix so backend routes match
      },
    },
  },
})
