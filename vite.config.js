import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 1430,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'CAFE_CLOUD_'],
  build: {
    target: 'es2020',
  },
});
