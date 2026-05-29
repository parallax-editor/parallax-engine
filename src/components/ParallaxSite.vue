<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, computed, type Component } from 'vue'
import { validateSite, type Site } from '../schema'
import { useReducedMotion } from '../composables/useReducedMotion'
import { useErrorHandler } from '../composables/useErrorHandler'
import { useResponsive } from '../composables/useResponsive'
import { useQualityTier } from '../composables/useQualityTier'
import { useMouseTracking } from '../composables/useMouseTracking'
import { useGyroscope } from '../composables/useGyroscope'
import { useInteractionBus } from '../composables/useInteractionBus'
import { useCursorEffect } from '../composables/useCursorEffect'
import { resolveSections } from '../utils/views'
import { buildSiteHead } from '../utils/head'
import ParallaxSection from './ParallaxSection.vue'
import ErrorOverlay from './ErrorOverlay.vue'
import GyroscopePrompt from './GyroscopePrompt.vue'
import CustomCursor from './CustomCursor.vue'

const props = withDefaults(defineProps<{
  site: Site
  mode?: 'dev' | 'prod'
  components?: Record<string, Component>
  // Cuando es true, el engine se renderiza en estado "estático": sin animaciones
  // (enter/scroll/loop/hover…), sin parallax y con el texto split totalmente
  // revelado — exactamente la ruta de `prefers-reduced-motion`. Lo usa el CANVAS
  // del editor en modo EDICIÓN, donde las animaciones solo distraen y dificultan
  // el posicionamiento; en Preview / Vista en vivo va false y todo anima normal.
  staticMotion?: boolean
  // Prefijo donde el consumidor sirve los assets de ESTE site (p. ej.
  // "/content/<slug>/"). El engine resuelve contra él TODA ruta de asset
  // RELATIVA del site.json — `png/video/audio.src`, `video.poster`, las URLs de
  // fuentes custom y los fondos de sección tipo imagen — sin que el sitio tenga
  // que reescribir el JSON. Additive: si se omite, las rutas se usan tal cual
  // (comportamiento previo) y en dev se avisa. Rutas absolutas/`/`/data: nunca
  // se tocan. Ver `resolveAssetUrl` y CLAUDE.md (§assets).
  assetBase?: string
  // How the site sizes itself within its host element.
  //   'viewport' (default) → the engine takes 100vh (legacy behavior: the
  //     site IS the page; consumer dedicates the whole viewport to it).
  //   'container' → the engine fills its host element instead. Use this when
  //     embedding the engine as a widget (hero block, card, modal) inside a
  //     larger page. The host needs an explicit height (e.g. `aspect-ratio`)
  //     for percentage heights to resolve. Sections without an explicit
  //     `height` get '100%' instead of '100vh' so layers fit the box.
  fit?: 'viewport' | 'container'
}>(), {
  mode: import.meta.env.DEV ? 'dev' : 'prod',
  staticMotion: false,
  assetBase: '',
  fit: 'viewport',
})

// Internal normalization: callers may pass a raw site.json that never went
// through validateSite. Run it through the Zod schema once so optional
// defaults (parallaxMode, animations, fonts, anchor, opacity, …) are filled
// in before any downstream code iterates them. If validation fails we fall
// back to the raw site so a broken site never crashes the engine — the dev
// error overlay surfaces the issue instead.
const normalizedSite = computed<Site>(() => {
  const result = validateSite(props.site)
  return result.ok ? result.data : (props.site as Site)
})

// Navegación in-engine a otro sitio (link.site). Al click en un elemento con
// link.site (SOLO en mode "prod"), el engine emite `navigate` con el slug
// destino; el consumidor carga ese site.json y transiciona (WorldTransition),
// sin recargar la página. En "dev" (editor) no navega: el elemento es editable.
const emit = defineEmits<{ navigate: [slug: string] }>()
provide('parallaxMode', props.mode)
provide('parallaxFit', () => props.fit)
provide('parallaxNavigate', (slug: string) => emit('navigate', slug))

// ─── Scroll state ──────────────────────────────────────────────────────────────

const scrollY = ref(0)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
let lenis: any = null
let rafId: number | null = null

provide('parallaxScrollY', scrollY)
provide('parallaxViewportHeight', viewportHeight)

// ─── Disparador de recálculo de progreso ante CUALQUIER scroll ─────────────────
// sectionProgress se calcula con getBoundingClientRect() en vivo y usa `scrollY`
// solo como disparador reactivo. En el sitio real el scroll es de `window`
// (Lenis), pero en el PREVIEW del editor el scroll ocurre en un contenedor
// interno y la ventana no tiene scroll → Lenis/scrollY se quedan en 0 → el
// progreso nunca se recalcula y las animaciones por scroll se ven congeladas.
// Escuchamos scroll en fase de CAPTURA (atrapa el scroll de cualquier contenedor
// anidado, incluido el del editor) y bumpeamos un nonce que sectionProgress lee
// → recálculo desde los rects vivos. En el sitio real es un disparo redundante e
// inofuensivo; en el editor hace que el Preview anime como el sitio publicado.
const scrollNonce = ref(0)
provide('parallaxScrollNonce', scrollNonce)
let scrollNonceScheduled = false
function onAnyScroll() {
  if (scrollNonceScheduled) return
  scrollNonceScheduled = true
  requestAnimationFrame(() => {
    scrollNonceScheduled = false
    scrollNonce.value++
  })
}

// ─── Device + responsive ───────────────────────────────────────────────────────

const device = useResponsive()
provide('parallaxDevice', device)

// ─── Base de assets (#assetBase) ───────────────────────────────────────────────
// Se inyecta (computed) para que png/video/audio/section resuelvan sus rutas
// relativas contra ella sin que el consumidor reescriba el site.json.
const assetBase = computed(() => props.assetBase || '')
provide('parallaxAssetBase', assetBase)

// ─── Resolved sections (v1.1 views OR legacy single tree) ──────────────────────
// `resolveSections` returns the legacy `site.sections` verbatim when `views` is
// absent (per-element mobile/desktop override behavior continues downstream,
// unchanged). When `views` is present, it returns the chosen view's full tree
// as-is (no per-element override merging — the two trees are independent).
// Viewport comes from the EXISTING `useResponsive` determination (`device`).
// Hidden sections (visible:false) are kept in the source tree (the editor needs
// them) but skipped at render time. Filtering here, rather than inside
// ParallaxSection, keeps the engine's section index stable for hidden ones.
const sections = computed(() =>
  resolveSections(normalizedSite.value, device.value).filter((s) => s.visible !== false),
)

// ─── Quality tier ──────────────────────────────────────────────────────────────

const qualityTier = useQualityTier(device, normalizedSite.value.quality)
provide('parallaxQuality', qualityTier)

// ─── Reduced motion ────────────────────────────────────────────────────────────

// `reducedMotion` efectivo = preferencia del sistema OR el modo estático del
// editor. Computado (no el ref crudo) para que activar/desactivar staticMotion
// se propague reactivamente a todos los elementos/capas que lo inyectan.
const systemReducedMotion = useReducedMotion()
const reducedMotion = computed(() => props.staticMotion || systemReducedMotion.value)
provide('reducedMotion', reducedMotion)

// ─── Mouse tracking ───────────────────────────────────────────────────────────

const mouse = useMouseTracking()
provide('parallaxMouse', mouse)

// ─── Gyroscope ─────────────────────────────────────────────────────────────────

const gyroscope = useGyroscope()
provide('parallaxGyroscope', gyroscope)

// ─── Component registry ────────────────────────────────────────────────────────

provide('parallaxComponents', computed(() => props.components ?? {}))

// ─── Interaction bus (hover/click/depends) ─────────────────────────────────────

const interactionBus = useInteractionBus()
provide('parallaxInteractionBus', interactionBus)

// ─── Custom cursor ─────────────────────────────────────────────────────────────

const cursorState = useCursorEffect(normalizedSite.value.cursor)
provide('parallaxCursor', cursorState)

// ─── Error handler ─────────────────────────────────────────────────────────────

const { errors, reportError, clearErrors } = useErrorHandler(props.mode)
provide('parallaxErrors', errors)
provide('parallaxReportError', reportError)

// ─── Theme CSS variables ───────────────────────────────────────────────────────

const hasSnap = computed(() =>
  sections.value.some((s) => s.scrollBehavior === 'snap'),
)

const themeStyle = computed(() => {
  const t = normalizedSite.value.theme
  const style: Record<string, string> = {}
  if (t) {
    style['--color-ink'] = t.colors.ink
    style['--color-paper'] = t.colors.paper
    style['--color-accent'] = t.colors.accent
    style['--font-display'] = t.typography.display
    style['--font-body'] = t.typography.body
    style.color = t.colors.ink
    style.backgroundColor = t.colors.paper
    style.fontFamily = t.typography.body
  }
  if (hasSnap.value) {
    style.scrollSnapType = 'y mandatory'
  }
  return style
})

// ─── Font injection ────────────────────────────────────────────────────────────

function injectFonts() {
  if (typeof document === 'undefined') return
  // Single source of truth: the same pure builder SSR consumers call. Runtime
  // path keeps working for SPA hosts (editor, daniela-reyes-site after
  // hydration) AND idempotently skips anything SSR already added — the unique
  // `key` (e.g. parallax-font-Inter / parallax-font-preconnect-css) is what we
  // mirror into a `data-parallax-key` attr so both preconnect entries (which
  // share the data-parallax-font="preconnect" tag) get inserted exactly once.
  const head = buildSiteHead(normalizedSite.value.meta, { assetBase: props.assetBase })
  for (const entry of head.link) {
    if (document.querySelector(`link[data-parallax-key="${entry.key}"]`)) continue
    const el = document.createElement('link')
    el.rel = entry.rel
    el.href = entry.href
    el.setAttribute('data-parallax-font', entry['data-parallax-font'])
    el.setAttribute('data-parallax-key', entry.key)
    document.head.appendChild(el)
  }
  for (const entry of head.style) {
    if (document.querySelector(`style[data-parallax-key="${entry.key}"]`)) continue
    const el = document.createElement('style')
    el.setAttribute('data-parallax-font', entry['data-parallax-font'])
    el.setAttribute('data-parallax-key', entry.key)
    el.textContent = entry.textContent
    document.head.appendChild(el)
  }
}

// ─── Lenis setup ───────────────────────────────────────────────────────────────

async function initLenis() {
  try {
    const Lenis = (await import('lenis')).default
    lenis = new Lenis()

    lenis.on('scroll', ({ scroll }: { scroll: number }) => {
      scrollY.value = scroll
    })

    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
  } catch {
    const onScroll = () => { scrollY.value = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
  }
}

function updateViewport() {
  viewportHeight.value = window.innerHeight
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  if (typeof window === 'undefined') return
  injectFonts()
  updateViewport()
  window.addEventListener('resize', updateViewport, { passive: true })
  // Captura: atrapa el scroll de CUALQUIER contenedor (window o el frame interno
  // del editor) para recalcular el progreso de las secciones. Ver onAnyScroll.
  window.addEventListener('scroll', onAnyScroll, { capture: true, passive: true })
  initLenis()
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  lenis?.destroy()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewport)
    window.removeEventListener('scroll', onAnyScroll, { capture: true } as any)
  }
})
</script>

<template>
  <div
    class="parallax-site"
    :class="{ 'parallax-site--fit-container': fit === 'container' }"
    :style="themeStyle"
    :lang="normalizedSite.meta.lang"
  >
    <ParallaxSection
      v-for="(section, i) in sections"
      :key="section.id || i"
      :section="section"
    />
    <GyroscopePrompt />
    <CustomCursor v-if="normalizedSite.cursor?.enabled" :config="normalizedSite.cursor" />
    <ErrorOverlay
      v-if="mode === 'dev'"
      @dismiss="clearErrors"
    />
  </div>
</template>

<style scoped>
.parallax-site {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}
/* fit="container" mode: the site fills its host element instead of the
   viewport. Use this when embedding the engine inside a larger page (hero
   block, modal). The host needs an explicit height (e.g. aspect-ratio) for
   percentage heights to resolve. */
.parallax-site--fit-container {
  height: 100%;
  min-height: 0;
}
.parallax-site--fit-container :deep(.parallax-section) {
  height: 100%;
}
</style>
