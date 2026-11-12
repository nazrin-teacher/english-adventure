/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // On GitHub Pages the site lives under /english-adventure/ (set by scripts/publish-github.mjs).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { port: 5173, host: '127.0.0.1' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
