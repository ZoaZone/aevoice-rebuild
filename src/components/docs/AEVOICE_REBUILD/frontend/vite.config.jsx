import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to backend in dev mode
    proxy: {
      '/auth': 'http://localhost:3001',
      '/clients': 'http://localhost:3001',
      '/apps': 'http://localhost:3001',
      '/proxy': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});