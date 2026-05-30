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

import { ref, shallowRef, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type { Component } from 'vue'
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

const current = shallowRef<{ slug: string; site: Site } | null>(
  props.initialSite ? { slug: props.initialSlug, site: props.initialSite } : null,
)
const notFound = ref(false)

// Cross-fade of the outgoing site.
const fadeSite = shallowRef<Site | null>(null)
const fadeOut = ref(false)
const txDuration = ref(600)

function slugToUrl(slug: string): string {
  return slug === HOME_SLUG ? '/' : `/${slug}`
}
function urlToSlug(path: string): string {
  if (!path || path === '/') return HOME_SLUG
  return path.replace(/^\/+|\/+$/g, '').split('/')[0] || HOME_SLUG
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
  txDuration.value = sourceTransition?.duration || 600

  current.value = { slug, site }
  if (typeof window !== 'undefined') window.scrollTo(0, 0)
  if (push) {
    try { history.pushState({ slug }, '', slugToUrl(slug)) } catch { /* no-op */ }
  }
  if (outgoing && transitionType) {
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

onMounted(() => {
  window.addEventListener('popstate', onPop)
  if (!current.value) go(props.initialSlug, { push: false })
})
onBeforeUnmount(() => window.removeEventListener('popstate', onPop))

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
