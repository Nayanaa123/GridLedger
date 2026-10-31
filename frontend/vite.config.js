import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api calls are forwarded to the Express backend, so no CORS fuss.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' },
  },
});
