import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        schema: resolve(__dirname, 'src/schema.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue', 'lenis'],
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
})
