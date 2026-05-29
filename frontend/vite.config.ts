import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const MERMAID_CORE_PACKAGES = [
  '/mermaid/',
  '/@mermaid-js/',
]

const MERMAID_CYTOSCAPE_PACKAGES = [
  '/cytoscape/',
  '/cytoscape-cose-bilkent/',
  '/cytoscape-fcose/',
]

const MERMAID_DAGRE_PACKAGES = [
  '/dagre-d3-es/',
  '/dagre/',
  '/graphlib/',
]

const MERMAID_RENDER_PACKAGES = [
  '/roughjs/',
  '/khroma/',
]

const MERMAID_TEXT_PACKAGES = [
  '/katex/',
  '/marked/',
  '/dompurify/',
  '/@braintree/sanitize-url/',
]

function includesPackage(id: string, packages: string[]) {
  return packages.some((pkg) => id.includes(`/node_modules${pkg}`));
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Mermaid is isolated in a developer-only async chunk. Keep the warning
    // threshold just above that known cost so unexpected growth still surfaces.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (includesPackage(id, MERMAID_CORE_PACKAGES)) {
            return 'mermaid-core';
          }
          if (includesPackage(id, MERMAID_CYTOSCAPE_PACKAGES)) {
            return 'mermaid-layout-cytoscape';
          }
          if (includesPackage(id, MERMAID_DAGRE_PACKAGES)) {
            return 'mermaid-layout-dagre';
          }
          if (includesPackage(id, MERMAID_RENDER_PACKAGES)) {
            return 'mermaid-render';
          }
          if (includesPackage(id, MERMAID_TEXT_PACKAGES)) {
            return 'mermaid-text';
          }
          if (id.includes('/@capacitor/')) {
            return 'capacitor-vendor';
          }
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
