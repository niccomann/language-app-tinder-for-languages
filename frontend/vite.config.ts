import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }
          if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) {
            return 'motion-vendor';
          }
          if (id.includes('/d3') || id.includes('/internmap/') || id.includes('/delaunator/') || id.includes('/robust-predicates/')) {
            return 'd3-vendor';
          }
          if (id.includes('/react-simple-maps/') || id.includes('/topojson') || id.includes('/geojson')) {
            return 'maps-vendor';
          }
          if (id.includes('/lucide-react/')) {
            return 'icons-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
})
