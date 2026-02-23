import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://kidschores.mrberns.tech:8443',
        changeOrigin: true,
        secure: false, // step-ca cert
      },
    },
  },
})
