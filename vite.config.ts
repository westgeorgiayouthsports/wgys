import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  // base: mode === 'production' ? '/wgys/' : '/',  base: './',
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}));
