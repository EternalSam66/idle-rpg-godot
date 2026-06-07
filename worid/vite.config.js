import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3001,
    host: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
  },
});
