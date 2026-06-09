<script setup lang="ts">
/**
 * Default page for any `/<slug>` route. Used by BOTH presets — they only
 * differ in whether they wrap the engine in `<SiteHost>` (for in-engine
 * cross-fade between sites, linked-home only) or render it bare
 * (multi-tenant). The runtime config tells us which.
 *
 * SEO: title/description/OG come from the build-time `seoMap`. We read the
 * runtimeConfig.public.parallax block ONCE in setup and close over the
 * resolved seoMap / siteUrl — calling useRuntimeConfig() from inside the
 * lazy SEO computeds blows up at prerender time because unhead evaluates
 * them after the Nuxt instance is gone (`[nuxt] instance unavailable`).
 *
 * SSR fonts: when the site JSON happens to be available at SSR time (the
 * linked-home `/` route fetches it on the server), `buildSiteHead` emits
 * the <link rel="stylesheet" data-parallax-font> entries into the head so
 * the first paint already has the right typography. For `/<slug>` it isn't
 * loaded server-side, so the engine injects them on mount instead (same
 * shape as a plain SPA).
 */
import { computed, ref } from 'vue'
// Explicit imports from '#imports' — NOT auto-imports. When this page lives
// in node_modules (a regular `yarn install` of the published tarball), Nuxt's
// unimport transform skips it (node_modules is excluded by default), so the
// usual `useRoute() / useAsyncData() / useRuntimeConfig() / useHead() /
// useSeoMeta()` magic doesn't apply and SSR explodes with `useRoute is not
// defined`. `yarn link` happens to mask the bug because realpath resolves
// outside node_modules and unimport DOES transform that path — so the engine
// dev loop never saw the failure. Keep these explicit forever.
import { useRoute, useRuntimeConfig, useHead, useSeoMeta } from '#imports'
import { ParallaxSite, FormBlock, buildSiteHead } from '../../..'
import { useSiteContent } from '../composables/useSiteContent'
import type { SiteSeo } from '../composables/useSiteSeo'
import type { SiteSeoMap } from '../types'
import SiteHost from '../components/SiteHost.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

// Read once at setup time. Inlining instead of going through useSiteSeo /
// buildCanonical because the lazy useSeoMeta computeds below are evaluated
// during renderSSRHead, AFTER the Nuxt context is gone — any
// useRuntimeConfig() call in that window throws "[nuxt] instance
// unavailable". Capturing as plain values keeps the computeds pure.
const cfg = (useRuntimeConfig().public as any).parallax || {}
const seoMap: SiteSeoMap = cfg.seoMap || {}
const siteUrl: string = cfg.siteUrl || ''
const hasComponentsConfig: boolean = !!cfg.hasComponentsConfig
const isLinkedHome: boolean = cfg.preset === 'linked-home'

function lookupSeo(s: string): SiteSeo | null {
  const e = seoMap[s]
  return e ? { ...e } : null
}
function absUrl(path: string): string {
  if (!siteUrl) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return siteUrl + (path.startsWith('/') ? path : `/${path}`)
}

const seo = computed(() => lookupSeo(slug.value))

// Body: client-only fetch. The linked-home `/` route fetches its site
// server-side from index.vue.
const { data: site } = await useSiteContent(slug.value)

// Components registry: dynamically loaded once when there IS a consumer
// config; an empty record otherwise. Built into a computed so the template
// `<ParallaxSite :components>` reactively picks it up after the import
// resolves.
const componentsRegistry = computed<Record<string, any>>(() => ({ FormBlock }))
const componentsLoaded = ref<Record<string, any> | null>(null)
if (hasComponentsConfig) {
  ;(async () => {
    try {
      const mod: any = await import('#parallax-components')
      // `defineParallaxConfig` wraps each entry as
      // `{ component, label, description, editableProps }` so the editor can
      // render its property panel. ParallaxSite's `:components` prop expects
      // a flat `Record<string, VueComponent>` — unwrap `.component` here so
      // we don't hand Vue an object-literal where it expects a component.
      const raw = mod?.default?.components || {}
      const map = Object.fromEntries(
        Object.entries(raw).map(([name, def]: [string, any]) => [name, def?.component ?? def]),
      )
      componentsLoaded.value = { FormBlock, ...map }
    } catch (e) {
      console.error('[parallax-engine/nuxt] componentsConfig failed to load:', e)
    }
  })()
}
const componentsResolved = computed(() => componentsLoaded.value || componentsRegistry.value)

// useHead: html lang + (when site is on-hand) the font tags.
useHead(() => {
  const head: any = { htmlAttrs: {} }
  if (seo.value?.lang) head.htmlAttrs.lang = seo.value.lang
  if (site.value?.meta) {
    const ssrHead = buildSiteHead(site.value.meta, { assetBase: `/content/${slug.value}/` })
    head.link = ssrHead.link
    head.style = ssrHead.style
  }
  return head
})

useSeoMeta({
  title: () => seo.value?.title || slug.value,
  description: () => seo.value?.description || undefined,
  ogTitle: () => seo.value?.title || slug.value,
  ogDescription: () => seo.value?.description || undefined,
  // og:image and og:url MUST be absolute for social-link unfurlers (WhatsApp,
  // iMessage, X, Slack) — they fetch the URL as-is without resolving it
  // against the document.
  ogImage: () => seo.value?.ogImage ? absUrl(seo.value.ogImage) : undefined,
  ogUrl: () => absUrl(`/${slug.value}`),
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => seo.value?.title || slug.value,
  twitterDescription: () => seo.value?.description || undefined,
  twitterImage: () => seo.value?.ogImage ? absUrl(seo.value.ogImage) : undefined,
})
</script>

<template>
  <SiteHost
    v-if="isLinkedHome && site"
    :initial-slug="slug"
    :initial-site="site"
    :components="componentsResolved"
  />
  <ParallaxSite
    v-else-if="!isLinkedHome && site"
    :site="site"
    :components="componentsResolved"
    :asset-base="`/content/${slug}/`"
    mode="prod"
  />
  <!-- Loading state: the body is fetched client-side (server:false on
       useSiteContent), so during SSR + initial paint `site` is null. A
       branded spinner here keeps the first paint from being a stark blank
       page. Disappears once the engine mounts. -->
  <div v-else class="parallax-page-loading" aria-label="Loading" role="status">
    <span class="parallax-page-spinner" />
  </div>
</template>

<style scoped>
.parallax-page-loading {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: #fff;
}
.parallax-page-spinner {
  width: 34px; height: 34px;
  border: 3px solid rgba(0, 0, 0, 0.12); border-top-color: #444;
  border-radius: 50%; animation: parallax-page-spin 0.8s linear infinite;
}
@keyframes parallax-page-spin { to { transform: rotate(360deg); } }
</style>
