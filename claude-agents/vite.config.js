import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3739,
    proxy: {
      '/api': {
        target: 'http://localhost:3740',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3740',
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
});
