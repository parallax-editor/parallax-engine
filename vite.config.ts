import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    // NO vaciar dist/ en cada build. Las declaraciones (.d.ts) las emite
    // `vue-tsc --emitDeclarationOnly` en un paso aparte; si vite limpiara dist
    // en cada rebuild del watch (`yarn dev` = vite build --watch), borraría esos
    // .d.ts y los consumidores se quedarían sin tipos (yarn typecheck roto). Con
    // emptyOutDir:false el watch solo reescribe los .js y conserva los .d.ts. El
    // `yarn build` completo hace `rm -rf dist` antes para una build limpia.
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        schema: resolve(__dirname, 'src/schema.ts'),
      },
      formats: ['es'],
    },
    // cssCodeSplit:false + assetFileNames keep the CSS at the stable
    // `dist/style.css` path (the package.json exports map points to it).
    // Vite 6+ changed the default to the lib name (`parallax-engine.css`),
    // which would have broken downstream `import '...engine/style.css'`.
    cssCodeSplit: false,
    rollupOptions: {
      external: ['vue', 'lenis'],
      output: {
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'style.css'
          return '[name][extname]'
        },
      },
    },
  },
})
