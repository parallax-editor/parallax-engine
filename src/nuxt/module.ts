/**
 * Nuxt module entry — `@parallax-editor/parallax-engine/nuxt`.
 *
 * Wires a Nuxt 3 SSG app for one of the two abstracted client patterns
 * (`multi-tenant` or `linked-home`) with the smallest possible consumer
 * surface — three knobs (`preset`, `siteUrl`, `componentsConfig`) cover the
 * 95% case. Everything that BOTH patterns need (asset routing, content scan,
 * SSR fonts via `buildSiteHead`, robots.txt) lives here; what only one
 * pattern needs (home page, sitemap, SiteHost wrapper) is gated by the
 * preset so the other pattern doesn't pay for it.
 *
 * Sub-path opt-in: importing this module is the ONLY way the engine pulls in
 * `@nuxt/kit`. A consumer who isn't on Nuxt simply imports
 * `@parallax-editor/parallax-engine` (root) and never touches this file, so
 * tree-shaking + bundle size are unaffected.
 */

import {
  addComponent,
  addImports,
  addTemplate,
  createResolver,
  defineNuxtModule,
  extendPages,
} from '@nuxt/kit'
import { resolve } from 'node:path'
import { writeFileSync } from 'node:fs'
import type { ParallaxModuleOptions } from './types'
import { resolveOptions } from './presets'
import { listSiteSlugs, hasHomeSlug, buildSeoMap } from './scanContent'

export default defineNuxtModule<ParallaxModuleOptions>({
  meta: {
    name: '@parallax-editor/parallax-engine/nuxt',
    configKey: 'parallax',
    compatibility: { nuxt: '>=3.13.0' },
  },
  // No safe default for `preset` — both options are equally valid and we'd
  // rather fail loud than silently pick one. The consumer MUST set it.
  defaults: { preset: undefined as any },
  async setup(rawOptions, nuxt) {
    const resolver = createResolver(import.meta.url)
    const options = resolveOptions(rawOptions)
    const contentRoot = resolve(nuxt.options.rootDir, options.contentDir)

    // ── Discovery ──────────────────────────────────────────────────────────
    // Content scan is BUILD-TIME only; new sites added post-deploy land via
    // the SPA fallback (200.html on linked-home, or just direct URL on
    // multi-tenant when the bucket serves an index for it).
    const slugs = listSiteSlugs(contentRoot, options.preset === 'linked-home' ? options.homeSlug : undefined)
    const homePresent = options.preset === 'linked-home' && hasHomeSlug(contentRoot, options.homeSlug)
    const seoMap = options.preset === 'linked-home' ? buildSeoMap(contentRoot, slugs) : {}

    // ── runtimeConfig ──────────────────────────────────────────────────────
    // What the runtime composables / pages need at request time. Lives under
    // `public.parallax` to keep all module-owned config in one namespace and
    // out of the consumer's lap.
    nuxt.options.runtimeConfig.public ||= {}
    ;(nuxt.options.runtimeConfig.public as any).parallax = {
      preset: options.preset,
      contentDir: options.contentDir,
      siteUrl: options.siteUrl,
      homeSlug: options.homeSlug,
      hasComponentsConfig: options.hasComponentsConfig,
      seoMap,
    }

    // ── CSS ───────────────────────────────────────────────────────────────
    // Engine stylesheet (split-text reveal, FormBlock layout, error overlay,
    // gyro prompt, world transitions). Without it the renders mismatch what
    // the editor shows. We add it unconditionally — the consumer would have
    // to do it themselves otherwise.
    nuxt.options.css ||= []
    if (!nuxt.options.css.includes('@parallax-editor/parallax-engine/style.css')) {
      nuxt.options.css.push('@parallax-editor/parallax-engine/style.css')
    }

    // ── Vite ──────────────────────────────────────────────────────────────
    // Dedupe Vue across the engine + the host app: a double Vue instance
    // would break inject/provide between the host's `<ParallaxSite>` and the
    // engine's inner components (the editor already learned this lesson).
    nuxt.options.vite ||= {}
    nuxt.options.vite.resolve ||= {}
    nuxt.options.vite.resolve.dedupe = Array.from(
      new Set([...(nuxt.options.vite.resolve.dedupe || []), 'vue']),
    )

    // ── Nitro: publicAssets + prerender ───────────────────────────────────
    nuxt.options.nitro ||= {}
    nuxt.options.nitro.publicAssets ||= []
    nuxt.options.nitro.publicAssets.push({
      dir: contentRoot,
      baseURL: '/content',
      // Aggressive cache for assets; the editor adds a busting nonce in
      // dev/editor mode, but for SSG output the URLs are content-addressed
      // by slug + filename so a year is fine.
      maxAge: 60 * 60 * 24 * 365,
    })
    nuxt.options.nitro.prerender ||= {}
    const slugRoutes = slugs.map((s) => `/${s}`)
    const baseRoutes = options.preset === 'linked-home' && homePresent
      ? ['/', ...slugRoutes]
      : slugRoutes
    nuxt.options.nitro.prerender.routes = Array.from(
      new Set([...(nuxt.options.nitro.prerender.routes || []), ...baseRoutes]),
    )
    // `linked-home` writes a SPA fallback `200.html` (copy of `404.html`)
    // for slugs that didn't exist at build time — the bucket's
    // error-document config serves it, the SPA hydrates, useSiteContent
    // fetches the new site at runtime.
    if (options.preset === 'linked-home') {
      nuxt.options.nitro.prerender.failOnError = false
      nuxt.options.nitro.hooks = nuxt.options.nitro.hooks || {}
      const prevDone = nuxt.options.nitro.hooks['prerender:done']
      nuxt.options.nitro.hooks['prerender:done'] = async function (this: any, ...args: any[]) {
        try {
          const out = resolve(nuxt.options.rootDir, '.output', 'public')
          const { existsSync, copyFileSync } = await import('node:fs')
          const src = resolve(out, '404.html')
          const dest = resolve(out, '200.html')
          if (existsSync(src) && !existsSync(dest)) copyFileSync(src, dest)
        } catch (e) {
          console.warn('[parallax-engine/nuxt] 200.html SPA fallback emit failed:', e)
        }
        if (typeof prevDone === 'function') await prevDone.apply(this, args)
      }
    }

    // ── robots.txt (always written, never inherited) ──────────────────────
    // Critical for `multi-tenant`: a stray legacy permissive robots.txt
    // would leak indexability. We write it every build so the published
    // surface is unambiguous.
    addTemplate({
      filename: 'parallax-engine-robots.txt',
      write: true,
      getContents: () => {
        if (!options.publicIndex) return 'User-agent: *\nDisallow: /\n'
        const lines = ['User-agent: *', 'Allow: /']
        if (options.sitemap && options.siteUrl) {
          lines.push(`Sitemap: ${options.siteUrl}/sitemap.xml`)
        }
        return lines.join('\n') + '\n'
      },
    })
    // Hook the generated robots.txt into the build output. Nitro's
    // `publicAssets` is the simplest way to make Nuxt copy a file from
    // `.nuxt/` into `.output/public/`.
    nuxt.options.nitro.publicAssets.push({
      dir: resolve(nuxt.options.buildDir, '.'),
      baseURL: '/',
    })
    // The above publicAssets entry exposes the entire `.nuxt` dir, which is
    // not what we want. Use a hook instead to copy the single file post-build.
    nuxt.options.nitro.publicAssets.pop()
    nuxt.hook('nitro:build:public-assets', async () => {
      try {
        const src = resolve(nuxt.options.buildDir, 'parallax-engine-robots.txt')
        const dest = resolve(nuxt.options.rootDir, '.output', 'public', 'robots.txt')
        const { existsSync, copyFileSync, mkdirSync } = await import('node:fs')
        const { dirname } = await import('node:path')
        if (existsSync(src)) {
          mkdirSync(dirname(dest), { recursive: true })
          copyFileSync(src, dest)
        }
      } catch (e) {
        console.warn('[parallax-engine/nuxt] robots.txt emit failed:', e)
      }
    })

    // ── sitemap.xml (linked-home + opt-in only) ───────────────────────────
    if (options.sitemap && options.preset === 'linked-home') {
      nuxt.hook('nitro:build:public-assets', async () => {
        try {
          const urls = [
            { loc: '/', priority: '1.0' },
            ...slugs.map((s) => ({ loc: `/${s}`, priority: '0.8' })),
          ]
          const lastmod = new Date().toISOString().slice(0, 10)
          const body = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...urls.map(({ loc, priority }) =>
              `  <url><loc>${options.siteUrl}${loc}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority></url>`,
            ),
            '</urlset>',
          ].join('\n')
          const dest = resolve(nuxt.options.rootDir, '.output', 'public', 'sitemap.xml')
          const { mkdirSync } = await import('node:fs')
          const { dirname } = await import('node:path')
          mkdirSync(dirname(dest), { recursive: true })
          writeFileSync(dest, body)
        } catch (e) {
          console.warn('[parallax-engine/nuxt] sitemap.xml emit failed:', e)
        }
      })
    }

    // ── Optional GA4 head injection ───────────────────────────────────────
    if (options.ga4Id) {
      nuxt.options.app.head ||= {}
      nuxt.options.app.head.script ||= []
      nuxt.options.app.head.script.push(
        { src: `https://www.googletagmanager.com/gtag/js?id=${options.ga4Id}`, async: true },
        {
          innerHTML:
            `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}` +
            `gtag('js',new Date());gtag('config','${options.ga4Id}');`,
        },
      )
    }

    // ── Components catalog (custom Vue components) ────────────────────────
    // Resolved as a virtual `#parallax-components` import inside the
    // runtime pages. Falls back to an empty registry when the consumer
    // didn't set `componentsConfig` — so a multi-tenant repo doesn't pull
    // in a config file it doesn't have.
    const componentsConfigPath = rawOptions.componentsConfig
      ? resolve(nuxt.options.rootDir, rawOptions.componentsConfig)
      : null
    addTemplate({
      filename: 'parallax-components.mjs',
      write: true,
      getContents: () => {
        if (!componentsConfigPath) return 'export default { components: {} }\n'
        // Re-export the consumer's parallax.config.ts. Nuxt's bundler
        // handles the TS, the Vue SFC imports, and per-component options.
        // The runtime pages then unwrap `default.components`.
        return `export { default } from '${componentsConfigPath.replace(/\\/g, '/')}'\n`
      },
    })
    nuxt.options.alias ||= {}
    ;(nuxt.options.alias as any)['#parallax-components'] = resolve(
      nuxt.options.buildDir,
      'parallax-components.mjs',
    )

    // ── Composables: addImports so pages get auto-imports ─────────────────
    addImports([
      {
        name: 'useSiteContent',
        from: resolver.resolve('./runtime/composables/useSiteContent'),
      },
      {
        name: 'loadSiteContent',
        from: resolver.resolve('./runtime/composables/useSiteContent'),
      },
      {
        name: 'useSiteSeo',
        from: resolver.resolve('./runtime/composables/useSiteSeo'),
      },
    ])

    // ── Components: SiteHost auto-import (linked-home only — multi-tenant
    // pages render <ParallaxSite> bare). ─────────────────────────────────
    if (options.preset === 'linked-home') {
      addComponent({
        name: 'SiteHost',
        filePath: resolver.resolve('./runtime/components/SiteHost.vue'),
      })
    }

    // ── Pages: programmatically register `/[slug]` (both presets) and `/`
    // (linked-home only). Consumer's own `pages/` directory takes
    // precedence — these are fallbacks. ──────────────────────────────────
    const slugPage = resolver.resolve('./runtime/pages/slug.vue')
    const indexPage = resolver.resolve('./runtime/pages/index.vue')
    extendPages((pages) => {
      const hasSlug = pages.some((p) => p.path === '/:slug()')
      if (!hasSlug) {
        pages.push({ name: 'parallax-slug', path: '/:slug()', file: slugPage })
      }
      if (options.preset === 'linked-home') {
        const hasIndex = pages.some((p) => p.path === '/')
        if (!hasIndex) {
          pages.unshift({ name: 'parallax-home', path: '/', file: indexPage })
        }
      }
    })
  },
})
