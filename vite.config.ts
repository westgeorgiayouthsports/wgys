import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const metricsEnv = env.VITE_METRICS_URL;

  // Convert a provided value to a proxy origin (dev proxy needs origin)
  function metricsProxyTarget(val: string) {
    try {
      const parsed = new URL(val);
      // If they gave a full path, use origin for proxy target
      return parsed.origin;
    } catch {
      // No scheme — assume host (or host/path). Strip any /api/metrics* path and default to https
      const stripped = val.replace(/\/api\/metrics.*$/i, '').replace(/\/+$/,'');
      return /^https?:\/\//i.test(stripped) ? stripped : `https://${stripped}`;
    }
  }

  const proxyTarget = metricsProxyTarget(metricsEnv);

  return {
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
          target: proxyTarget,
          changeOrigin: true,
          headers: {
            origin: 'https://localhost:5173',
          },
          rewrite: (path) => path, // keeps /api/metrics/views
        },
      },
    },
    define: {
      'globalThis.__VITE_ENV__': JSON.stringify(env),
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
  };
});
