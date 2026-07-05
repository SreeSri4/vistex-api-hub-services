import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    host: '127.0.0.1',
    proxy: {
      // In dev, Vite only serves the frontend — API requests are forwarded
      // to the Express server (started separately via `npm run dev:server`,
      // or together via `npm run dev`) so /api/tenants etc. actually resolve.
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    sourcemap: false,
  },
});
