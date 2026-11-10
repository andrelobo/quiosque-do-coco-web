import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // O registro é feito manualmente em src/main.tsx (com updater periódico).
      injectRegister: null,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Quiosque do Coco',
        short_name: 'Quiosque',
        description: 'Sistema de atendimento e gestão de turnos',
        theme_color: '#16a34a',
        background_color: '#fafaf9',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/shifts': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/products': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/orders': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/payments': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/refunds': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/stock': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/cash': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/reports': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})