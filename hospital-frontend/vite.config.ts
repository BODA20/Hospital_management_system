import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: true,  // Bind to 0.0.0.0 so Windows browser can reach WSL dev server
    proxy: {
      '/api': {
        // Backend Express server (Docker) runs on port 3000
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
