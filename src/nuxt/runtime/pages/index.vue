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
import type { Site } from '../../../schema'
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
const { data: site } = await useAsyncData(
  `parallax-home-${HOME_SLUG}`,
  () => loadSiteContent(HOME_SLUG),
)

// STALE-HOME FIX (v2): the prerendered payload embeds the home's site.json AS
// OF BUILD TIME, and Nuxt hydrates from that payload without ever
// re-fetching. But the home slug's content can be republished to the static
// host WITHOUT rebuilding the shell (the same runtime-publish flow `/<slug>`
// pages already support via their client-side fetch), so after hydration we
// fetch the JSON fresh and swap it in.
//
// Deliberately NOT `refresh()` from useAsyncData: against a prerendered
// payload it resolves without re-running the handler (verified empirically —
// "refresh done", zero network), so the stale snapshot survived. Calling
// `loadSiteContent` directly always hits `/content/<home>/site.json` on the
// client and the assignment swaps the tree in place. SSR fonts/SEO keep
// working exactly as before (they come from the server-rendered pass); when
// nothing changed, the swap is a no-op re-render of identical data.
// STALE-HOME (v5, definitive): the body NEVER paints from the build
// snapshot. The server-loaded `site` above feeds ONLY the <head> (SSR fonts,
// SEO/OG tags — what social unfurlers and first-paint typography need). The
// engine body mounts exclusively from `clientSite`: fetched fresh on the
// client, so the FIRST paint of the site is already the latest published
// content — no old→new repaint of any kind (a large republish would
// otherwise visibly jump mid-hydration). While it loads, the page shows the
// same neutral spinner the /<slug> routes always had. If the fetch fails
// (offline), fall back to the build snapshot rather than a blank page.
const clientSite = ref<Site | null>(null)
onMounted(async () => {
  const fresh = await loadSiteContent(HOME_SLUG)
  clientSite.value = fresh || site.value || null
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
    v-if="clientSite"
    :initial-slug="HOME_SLUG"
    :initial-site="clientSite"
    :components="componentsRegistry"
  />
  <!-- SSR/prerender + first client frames: neutral loader, NOT the build
       snapshot — the site body paints exactly once, with the final data. -->
  <div v-else class="parallax-page-loading" aria-label="Loading" role="status">
    <span class="parallax-page-spinner" />
  </div>
</template>

<style scoped>
/* Same neutral loader as slug.vue — shown during SSR/prerender and the first
   client frames, until the fresh site.json resolves. */
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
