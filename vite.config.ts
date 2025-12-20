import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), ...(process.env.ENABLE_HTTPS !== 'false' ? [mkcert()] : [])],
  base: '/',
  resolve: {
    // Ensure only one copy of React/ReactDOM is bundled to avoid runtime interop issues
    dedupe: ['react', 'react-dom']
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self'",
      'Cache-Control': 'no-cache, max-age=0',
      'X-XSS-Protection': '',
      'X-Content-Type-Options': 'nosniff',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
              return 'vendor-redux';
            }
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'vendor-antd';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('lexical')) {
              return 'vendor-lexical';
            }
            if (id.includes('dayjs')) {
              return 'vendor-dayjs';
            }
            return 'vendor-other';
          }
        },
      },
    },
  },
}));
