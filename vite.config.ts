import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'time2route-logo.svg', '180-ios.png'],
      manifest: {
        name: 'Time2Route',
        short_name: 'Time2Route',
        description: 'Find the shortest way and discover what is along it',
        theme_color: '#1a1917',
        background_color: '#1a1917',
        display: 'standalone',
        icons: [
          {
            src: 'launchericon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'launchericon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: process.env.VITE_BASE ?? '/',
})