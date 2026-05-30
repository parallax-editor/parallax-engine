<script setup lang="ts">
/**
 * Default page for any `/<slug>` route. Used by BOTH presets — they only
 * differ in whether they wrap the engine in `<SiteHost>` (for in-engine
 * cross-fade between sites, linked-home only) or render it bare
 * (multi-tenant). The runtime config tells us which.
 *
 * SEO: title/description/OG come from the build-time `seoMap` (see
 * `useSiteSeo`). Body is fetched on the CLIENT to keep the engine tree out
 * of the prerendered HTML — symmetric with what the loose
 * per-repo composables were doing before this module was extracted.
 *
 * SSR fonts: when the site JSON happens to be available at SSR time (the
 * linked-home `/` route fetches it on the server), `buildSiteHead` emits the
 * <link rel="stylesheet" data-parallax-font> entries into the head so the
 * first paint already has the right typography. For `/<slug>` it isn't
 * loaded server-side, so the engine injects them on mount instead (same as
 * a plain SPA).
 */
import { computed, defineAsyncComponent } from 'vue'
import { ParallaxSite, FormBlock, buildSiteHead } from '../../..'
import { useSiteContent } from '../composables/useSiteContent'
import { useSiteSeo, buildCanonical } from '../composables/useSiteSeo'
import SiteHost from '../components/SiteHost.vue'
// Resolved by the module: a runtime alias either points at the consumer's
// parallax.config.ts (custom components registry) or at a stub re-exporting
// only `{ default: { components: {} } }` when `componentsConfig` wasn't set.
// Imported lazily so a multi-tenant repo doesn't ship the import in its
// bundle when there's nothing to register.
const consumerComponents = defineAsyncComponent(async () => {
  const mod = await import('#parallax-components')
  return { template: '<span/>', __components: mod.default?.components ?? {} } as any
})
void consumerComponents // keep reference (avoid tree-shaking when actually used)

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const seo = computed(() => useSiteSeo(slug.value))
const cfg = computed(() => useRuntimeConfig()?.public?.parallax || {})
const isLinkedHome = computed(() => cfg.value.preset === 'linked-home')

// Body: client-only fetch. The home page (linked-home `/`) handles its own
// server-side load — see `index.vue`.
const { data: site } = await useSiteContent(slug.value)

// Components registry: dynamically loaded once when there IS a consumer
// config; an empty record otherwise. Built into a computed so the template
// `<ParallaxSite :components>` reactively picks it up after the import
// resolves.
const componentsRegistry = computed<Record<string, any>>(() => ({ FormBlock }))
const componentsLoaded = ref<Record<string, any> | null>(null)
if (cfg.value.hasComponentsConfig) {
  ;(async () => {
    try {
      const mod: any = await import('#parallax-components')
      const map = mod?.default?.components || {}
      componentsLoaded.value = { FormBlock, ...map }
    } catch (e) {
      console.error('[parallax-engine/nuxt] componentsConfig failed to load:', e)
    }
  })()
}
const componentsResolved = computed(() => componentsLoaded.value || componentsRegistry.value)

// useHead: build SEO + (when site is on-hand) the font tags.
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
  ogImage: () => seo.value?.ogImage || undefined,
  ogUrl: () => buildCanonical(`/${slug.value}`),
  ogType: 'website',
  twitterCard: 'summary_large_image',
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
    v-else-if="site"
    :site="site"
    :components="componentsResolved"
    :asset-base="`/content/${slug}/`"
    mode="prod"
  />
</template>
