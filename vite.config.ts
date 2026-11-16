import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Algumas rotas da API têm o mesmo caminho de páginas da SPA (/orders,
// /products, /reports...). Uma navegação do navegador (Accept: text/html)
// precisa receber o index.html; sem isso, abrir ou atualizar /orders no dev
// ou no preview davam 500, porque o pedido ia para a API em outra porta.
const bypassHtmlNavigation: ProxyOptions['bypass'] = (req) => {
  if (req.method !== 'GET') return undefined
  // Navegação do navegador manda Accept: text/html (e Sec-Fetch-Mode: navigate);
  // chamadas de API mandam application/json. Só as navegações viram index.html.
  const isNavigation =
    (req.headers.accept ?? '').includes('text/html') ||
    req.headers['sec-fetch-mode'] === 'navigate'
  return isNavigation ? '/index.html' : undefined
}

const apiProxy = {
  target: 'http://localhost:4000',
  changeOrigin: true,
  bypass: bypassHtmlNavigation,
}

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
      '/api': apiProxy,
      '/auth': apiProxy,
      '/shifts': apiProxy,
      '/products': apiProxy,
      '/orders': apiProxy,
      '/payments': apiProxy,
      '/refunds': apiProxy,
      '/stock': apiProxy,
      '/cash': apiProxy,
      '/reports': apiProxy,
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