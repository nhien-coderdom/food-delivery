import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api requests to backend to avoid CORS during development
    proxy: {
      '/api': {
        target: 'http://10.10.30.182:1337',
        changeOrigin: true,
        secure: false,
        // keep the /api prefix so backend routes match
      },
    },
  },
})
