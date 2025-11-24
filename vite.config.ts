import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/K-PredLog/',
  build: {
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})

