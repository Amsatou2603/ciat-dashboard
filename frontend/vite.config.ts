/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// En développement, /api est proxifié vers Django : le navigateur ne voit qu'une origine (cookie SameSite=Strict valide).
const backend = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { host: true, port: 5173, proxy: { '/api': { target: backend, changeOrigin: false } } },
  preview: { port: 4173, proxy: { '/api': { target: backend, changeOrigin: false } } },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
})
