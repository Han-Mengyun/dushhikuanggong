import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/dushhikuanggong/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    open: true,
  },
});
