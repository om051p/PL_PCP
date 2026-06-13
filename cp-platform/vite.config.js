import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/zustand') || id.includes('node_modules/immer')) {
            return 'vendor'
          }
          if (id.includes('node_modules/decimal.js') || id.includes('node_modules/mathjs')) {
            return 'engine'
          }
          if (id.includes('node_modules/recharts')) {
            return 'recharts'
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'animation'
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/xlsx') || id.includes('node_modules/html2canvas')) {
            return 'reporting'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }
        },
      },
    },
    modulePreload: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 3000,
    open: false,
    host: '0.0.0.0',
  },
})