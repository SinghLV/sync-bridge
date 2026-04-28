import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'strip-sourcemap-links',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('node_modules')) {
          return {
            code: code.replace(/\/\/# sourceMappingURL=.*/g, ''),
            map: null,
          }
        }
      },
    },
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
    ],
    exclude: [
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow/tfjs-backend-cpu',
      '@tensorflow-models/coco-ssd',
    ],
  },
  build: {
    sourcemap: false,
  },
  server: {
    fs: {
      strict: false,
    },
  },
})
