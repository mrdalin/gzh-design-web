import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend build → dist/ (served by Cloudflare Pages).
// API routes live in functions/ (Cloudflare Pages Functions) and are not part of this build.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
