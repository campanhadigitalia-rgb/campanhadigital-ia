import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services':   path.resolve(__dirname, './src/services'),
      '@hooks':      path.resolve(__dirname, './src/hooks'),
      '@context':    path.resolve(__dirname, './src/context'),
      '@types':      path.resolve(__dirname, './src/types'),
      '@pages':      path.resolve(__dirname, './src/pages'),
      '@utils':      path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
