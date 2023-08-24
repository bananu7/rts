import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
              if (id.includes("three")) {
                  return "vendor_three";
              }
              return "vendor";
          }
        }
      },
    },
  },
})
