import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks (v0.15.1 code-split): app-code releases don't
        // re-hash these, so returning devices keep them cached across deploys.
        // Route pages split automatically via the lazyWithRetry imports in
        // App.tsx; the vendored Twemoji artwork (64 KB source, shared by
        // several pages) gets its own once-cached chunk instead of being
        // duplicated into page chunks.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
            if (id.includes('node_modules/framer-motion/') || id.includes('node_modules/motion-')) return 'motion';
            if (/node_modules\/(@tanstack|axios|sonner)\//.test(id)) return 'data';
            // One shared chunk for the tree-shaken lucide icons: without this,
            // icons shared across page chunks get hoisted as ~40 micro-chunks
            // (0.1-1 KB each = pointless request spray).
            if (id.includes('node_modules/lucide-react/')) return 'icons';
            return undefined; // everything else: rollup decides (@sentry stays dynamic)
          }
          if (id.includes('src/data/twemoji-icons')) return 'twemoji';
          return undefined;
        },
      },
    },
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
