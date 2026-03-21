import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // Native modules must stay external for Electron main process runtime loading.
      external: ['sqlite3', 'sqlite'],
    },
  },
});
