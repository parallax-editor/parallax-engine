<script setup lang="ts">
/**
 * `/` route for the `linked-home` preset. The home is a *site* — not a
 * codebase page — so this page is intentionally thin: load the home slug
 * server-side (so SSR fonts via `buildSiteHead` land in the prerendered
 * HTML), wire SEO, and hand off to `<SiteHost>` which then handles all
 * in-engine cross-fade navigation to the linked sites.
 *
 * Registered programmatically by the module ONLY when preset is
 * `linked-home`; `multi-tenant` repos don't get this page so `/` simply
 * 404s for them (their model is per-URL access only).
 */
import { ref, onMounted } from 'vue'
// Explicit imports from '#imports' — same rationale as `slug.vue`. Auto-imports
// don't reach files inside `node_modules`; `yarn link` masks the bug because
// realpath resolves outside node_modules. Keep these explicit forever.
import { useAsyncData, useRuntimeConfig, useHead, useSeoMeta } from '#imports'
import { ParallaxSite, FormBlock, buildSiteHead } from '../../..'
import { loadSiteContent } from '../composables/useSiteContent'
import SiteHost from '../components/SiteHost.vue'

// Capture runtimeConfig values at setup time. Lazy SEO computeds below run
// during renderSSRHead, AFTER the Nuxt context is gone — any
// useRuntimeConfig() call in that window throws "[nuxt] instance
// unavailable" (matches the slug.vue rationale).
const cfg = (useRuntimeConfig().public as any).parallax || {}
const HOME_SLUG: string = cfg.homeSlug || 'home'
const siteUrl: string = cfg.siteUrl || ''
const hasComponentsConfig: boolean = !!cfg.hasComponentsConfig

function absUrl(path: string): string {
  if (!siteUrl) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return siteUrl + (path.startsWith('/') ? path : `/${path}`)
}

// Home loads SERVER-side (default { server: true }) so the prerendered HTML
// already carries the right `<link rel="stylesheet" data-parallax-font>` tags
// — first paint shows the configured fonts. The engine body still mounts on
// the client.
const { data: site, refresh } = await useAsyncData(
  `parallax-home-${HOME_SLUG}`,
  () => loadSiteContent(HOME_SLUG),
)

// STALE-HOME FIX: the prerendered payload embeds the home's site.json AS OF
// BUILD TIME, and Nuxt hydrates from that payload without ever re-fetching.
// But the home slug's content can be republished to the static host WITHOUT
// rebuilding the shell (the same runtime-publish flow `/<slug>` pages already
// support via their client-side fetch). Refresh once after hydration: the
// client branch of `loadSiteContent` $fetches `/content/<home>/site.json`
// fresh, so a newer publish replaces the embedded snapshot within a moment
// of first paint. SSR fonts/SEO keep working exactly as before (they come
// from the server-rendered pass); when nothing changed this is a cheap
// no-cache JSON fetch that resolves to identical data.
onMounted(() => {
  refresh()
})

useHead(() => {
  const head: any = { htmlAttrs: {} }
  const meta = site.value?.meta
  if (meta?.lang) head.htmlAttrs.lang = meta.lang
  if (meta) {
    const ssrHead = buildSiteHead(meta, { assetBase: `/content/${HOME_SLUG}/` })
    head.link = ssrHead.link
    head.style = ssrHead.style
  }
  return head
})

useSeoMeta({
  title: () => site.value?.meta?.title || 'Home',
  description: () => site.value?.meta?.description || undefined,
  ogTitle: () => site.value?.meta?.title || 'Home',
  ogDescription: () => site.value?.meta?.description || undefined,
  // Absolute og:image — see [slug].vue for the rationale (social unfurlers
  // need a fully-qualified URL or the preview comes through broken).
  ogImage: () => site.value?.meta?.ogImage ? absUrl(site.value.meta.ogImage) : undefined,
  ogUrl: absUrl('/'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => site.value?.meta?.title || 'Home',
  twitterDescription: () => site.value?.meta?.description || undefined,
  twitterImage: () => site.value?.meta?.ogImage ? absUrl(site.value.meta.ogImage) : undefined,
})

// Components registry: same lazy-load shape as `[slug].vue`. The home is
// special only in its slug + SSR loading — everything else mirrors the slug
// page so author behavior is consistent.
const componentsRegistry = ref<Record<string, any>>({ FormBlock })
if (hasComponentsConfig) {
  ;(async () => {
    try {
      const mod: any = await import('#parallax-components')
      // Unwrap `.component` from each defineParallaxConfig entry — same
      // rationale as [slug].vue. Without this, ParallaxSite receives the
      // `{ component, label, editableProps }` wrapper instead of a
      // VueComponent and the custom components don't render.
      const raw = mod?.default?.components || {}
      const map = Object.fromEntries(
        Object.entries(raw).map(([name, def]: [string, any]) => [name, def?.component ?? def]),
      )
      componentsRegistry.value = { FormBlock, ...map }
    } catch (e) {
      console.error('[parallax-engine/nuxt] componentsConfig failed to load:', e)
    }
  })()
}
</script>

<template>
  <SiteHost
    v-if="site"
    :initial-slug="HOME_SLUG"
    :initial-site="site"
    :components="componentsRegistry"
  />
</template>
