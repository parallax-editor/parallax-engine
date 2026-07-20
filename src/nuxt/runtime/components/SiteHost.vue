<script setup lang="ts">
/**
 * `<SiteHost>` — host wrapper used by the `linked-home` preset. Mounts the
 * current site with `<ParallaxSite mode="prod">`, listens for `navigate`
 * events the engine emits when a `link.site` element is clicked, and
 * cross-fades to the destination site in place — same URL surface as a
 * regular Nuxt route (`history.pushState` + popstate handling) but no
 * full reload, no Nuxt re-mount, so animations stay smooth.
 *
 * Layout invariant: the INCOMING site renders as a plain `<ParallaxSite>` in
 * normal flow (no absolute wrapper, no measured-children frame) so viewport
 * sizing is always correct. The OUTGOING site freezes in a
 * `position:fixed inset:0` overlay above it and fades out per the source
 * site's `meta.transition.out` config. If the source has no out-transition
 * configured, the swap is instant.
 *
 * Multi-tenant repos don't import this — they render the site directly in
 * `[slug].vue` because they have no cross-site navigation.
 */

import { ref, shallowRef, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Component } from 'vue'
// Explicit import — see `runtime/pages/slug.vue` for the full rationale.
// Auto-imports don't reach files inside `node_modules`.
import { useRuntimeConfig } from '#imports'
import { ParallaxSite } from '../../..'
import type { Site } from '../../../schema'
import { loadSiteContent } from '../composables/useSiteContent'

const props = defineProps<{
  initialSlug: string
  initialSite?: Site | null
  components: Record<string, Component>
}>()

const cfg = useRuntimeConfig()?.public?.parallax || {}
const HOME_SLUG: string = cfg.homeSlug || 'home'
// Subpath deploys (GitHub Pages, S3 bajo prefijo): las URLs que empujamos a
// history y las que leemos en popstate viven BAJO app.baseURL, no en la raíz.
const APP_BASE: string = ((useRuntimeConfig()?.app as any)?.baseURL || '/').replace(/\/*$/, '/')

const current = shallowRef<{ slug: string; site: Site } | null>(
  props.initialSite ? { slug: props.initialSlug, site: props.initialSite } : null,
)
const notFound = ref(false)

// STALE-HOME (v4): the parent page re-fetches the home's site.json after
// hydration and pushes the fresh tree through this prop. Patch the SAME
// mounted instance reactively — Vue diffs and repaints only what changed, so
// there is no unmount/remount "jump" (no scroll reset, no restarted
// animations). Same patch-in-place model the editor's live preview uses.
// Only applies while we're still ON the initial slug — after an in-engine
// navigation, `current` belongs to another site and the update is stale.
watch(
  () => props.initialSite,
  (fresh) => {
    if (!fresh) return
    if (current.value && current.value.slug !== props.initialSlug) return
    current.value = { slug: props.initialSlug, site: fresh }
  },
)

// Cross-fade of the outgoing site.
const fadeSite = shallowRef<Site | null>(null)
const fadeOut = ref(false)
const txDuration = ref(600)

function slugToUrl(slug: string): string {
  return slug === HOME_SLUG ? APP_BASE : APP_BASE + slug
}
function urlToSlug(path: string): string {
  let p = path || '/'
  if (APP_BASE !== '/' && p.startsWith(APP_BASE)) p = '/' + p.slice(APP_BASE.length)
  if (!p || p === '/') return HOME_SLUG
  return p.replace(/^\/+|\/+$/g, '').split('/')[0] || HOME_SLUG
}

// Reset de scroll ROBUSTO. Un `scrollTo(0,0)` único pierde contra cualquier
// re-scroll asíncrono posterior (smooth-scroll libs, restauración del
// navegador, inercia del trackpad): el mundo destino aparecía abierto por la
// mitad, heredando la posición del mundo anterior. Se re-afirma en los dos
// frames siguientes para ganar la carrera.
function resetScroll() {
  if (typeof window === 'undefined') return
  window.scrollTo(0, 0)
  requestAnimationFrame(() => {
    window.scrollTo(0, 0)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  })
}

async function go(slug: string, opts: { push?: boolean } = {}) {
  const push = opts.push !== false
  if (!slug) return
  if (current.value && current.value.slug === slug && !notFound.value) return
  const site = await loadSiteContent(slug)
  if (!site) {
    notFound.value = true
    return
  }
  notFound.value = false
  const outgoing = current.value?.site || null
  // The cross-fade is, visually, the previous site fading out OVER the new
  // one. So it's gated by the SOURCE site's `meta.transition.out` — if the
  // source has no out configured, the swap is instant.
  const sourceTransition = (outgoing as any)?.meta?.transition
  const transitionType = sourceTransition?.out

  current.value = { slug, site }
  resetScroll()
  if (push) {
    try { history.pushState({ slug }, '', slugToUrl(slug)) } catch { /* no-op */ }
  }
  if (outgoing && transitionType) {
    // Only touched when we'll actually run the transition; the value stays
    // stable across instant swaps so a later transitioned navigation
    // doesn't pick up a leaked-from-elsewhere duration.
    txDuration.value = sourceTransition?.duration || 600
    fadeSite.value = outgoing
    fadeOut.value = false
    await nextTick()
    requestAnimationFrame(() =>
      requestAnimationFrame(() => { fadeOut.value = true }),
    )
  }
}

function onFadeEnd() { fadeSite.value = null; fadeOut.value = false }
function onPop() { go(urlToSlug(window.location.pathname), { push: false }) }
// bfcache: al volver con Atrás/Adelante desde otra página completa, el
// navegador restaura la pestaña congelada tal cual estaba — scroll incluido.
// Un mundo siempre arranca arriba.
function onPageShow(e: PageTransitionEvent) { if (e.persisted) resetScroll() }

onMounted(() => {
  window.addEventListener('popstate', onPop)
  window.addEventListener('pageshow', onPageShow)
  if (!current.value) go(props.initialSlug, { push: false })
})
onBeforeUnmount(() => {
  window.removeEventListener('popstate', onPop)
  window.removeEventListener('pageshow', onPageShow)
})

defineExpose({ go })
</script>

<template>
  <ClientOnly>
    <ParallaxSite
      v-if="current"
      :site="current.site"
      :components="components"
      :asset-base="`/content/${current.slug}/`"
      mode="prod"
      @navigate="go"
    />
    <div
      v-if="fadeSite"
      class="parallax-sitehost-fade"
      :class="{ 'is-out': fadeOut }"
      :style="{ transitionDuration: txDuration + 'ms' }"
      @transitionend="onFadeEnd"
    >
      <ParallaxSite :site="fadeSite" :components="components" mode="prod" />
    </div>
    <div v-if="!current && notFound" class="parallax-sitehost-msg">
      <p>Site not found.</p>
    </div>
    <div v-else-if="!current" class="parallax-sitehost-loading">
      <span class="parallax-sitehost-spinner" aria-label="Loading" />
    </div>
    <template #fallback>
      <div class="parallax-sitehost-loading">
        <span class="parallax-sitehost-spinner" aria-label="Loading" />
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.parallax-sitehost-loading {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: #fff;
}
.parallax-sitehost-spinner {
  width: 34px; height: 34px;
  border: 3px solid rgba(0, 0, 0, 0.12); border-top-color: #444;
  border-radius: 50%; animation: parallax-sitehost-spin 0.8s linear infinite;
}
@keyframes parallax-sitehost-spin { to { transform: rotate(360deg); } }
.parallax-sitehost-msg {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; min-height: 100vh; background: #fff; color: #555;
}
.parallax-sitehost-fade {
  position: fixed; inset: 0; z-index: 40; opacity: 1;
  transition-property: opacity; transition-timing-function: ease;
  pointer-events: none; overflow: hidden;
}
.parallax-sitehost-fade.is-out { opacity: 0; }
</style>
