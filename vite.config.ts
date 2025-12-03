import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  base: '/wgys/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor';
            }
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
              return 'redux';
            }
            // if (id.includes('antd') || id.includes('@ant-design')) {
            //   return 'antd';
            // }
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('lexical')) {
              return 'lexical';
            }
            return 'vendor-libs';
          }
        },
      },
    },
  },
}));
