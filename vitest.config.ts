import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // @vitejs/plugin-vue lets tests import/SSR-render real .vue SFCs (e.g.
  // TextElement.vue) instead of re-mirroring their style logic. Test-only;
  // does not affect the library build (vite.config.ts builds the lib).
  plugins: [vue()],
  test: {
    globals: true,
  },
})
