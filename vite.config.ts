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
    proxy: {
      '/api/metrics': {
        target: 'https://metricsviews-k5dtqbkowq-uc.a.run.app',
        changeOrigin: true,
        rewrite: (path) => path, // keeps /api/metrics/views
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Use explicit chunk definitions to ensure correct load order
        // React must load before Antd to avoid createContext undefined error
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
          'vendor-router': ['react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-antd': ['antd'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/storage'],
        },
      },
    },
  },
}));
