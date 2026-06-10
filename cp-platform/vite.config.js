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
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/xlsx')) {
            return 'reporting'
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'animation'
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
    open: true,
  },
})