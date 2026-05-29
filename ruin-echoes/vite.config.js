import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
  },
});
