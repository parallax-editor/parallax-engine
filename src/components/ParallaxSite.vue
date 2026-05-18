<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, computed, type Component } from 'vue'
import type { Site } from '../schema'
import { useReducedMotion } from '../composables/useReducedMotion'
import { useErrorHandler } from '../composables/useErrorHandler'
import { useResponsive } from '../composables/useResponsive'
import { useQualityTier } from '../composables/useQualityTier'
import { useMouseTracking } from '../composables/useMouseTracking'
import { useGyroscope } from '../composables/useGyroscope'
import { useInteractionBus } from '../composables/useInteractionBus'
import { useCursorEffect } from '../composables/useCursorEffect'
import ParallaxSection from './ParallaxSection.vue'
import ErrorOverlay from './ErrorOverlay.vue'
import GyroscopePrompt from './GyroscopePrompt.vue'
import CustomCursor from './CustomCursor.vue'

const props = withDefaults(defineProps<{
  site: Site
  mode?: 'dev' | 'prod'
  components?: Record<string, Component>
}>(), {
  mode: import.meta.env.DEV ? 'dev' : 'prod',
})

// ─── Scroll state ──────────────────────────────────────────────────────────────

const scrollY = ref(0)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
let lenis: any = null
let rafId: number | null = null

provide('parallaxScrollY', scrollY)
provide('parallaxViewportHeight', viewportHeight)

// ─── Device + responsive ───────────────────────────────────────────────────────

const device = useResponsive()
provide('parallaxDevice', device)

// ─── Quality tier ──────────────────────────────────────────────────────────────

const qualityTier = useQualityTier(device, props.site.quality)
provide('parallaxQuality', qualityTier)

// ─── Reduced motion ────────────────────────────────────────────────────────────

const reducedMotion = useReducedMotion()
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

const cursorState = useCursorEffect(props.site.cursor)
provide('parallaxCursor', cursorState)

// ─── Error handler ─────────────────────────────────────────────────────────────

const { errors, reportError, clearErrors } = useErrorHandler(props.mode)
provide('parallaxErrors', errors)
provide('parallaxReportError', reportError)

// ─── Theme CSS variables ───────────────────────────────────────────────────────

const hasSnap = computed(() =>
  props.site.sections.some((s) => s.scrollBehavior === 'snap'),
)

const themeStyle = computed(() => {
  const t = props.site.theme
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
  const fonts = props.site.meta.fonts
  for (const font of fonts) {
    if (font.source === 'google') {
      const existing = document.querySelector(`link[data-parallax-font="${font.family}"]`)
      if (existing) continue
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@300;400;500;600;700&display=swap`
      link.setAttribute('data-parallax-font', font.family)
      document.head.appendChild(link)
    } else if (font.source === 'custom' && font.url) {
      const existing = document.querySelector(`style[data-parallax-font="${font.family}"]`)
      if (existing) continue
      const style = document.createElement('style')
      style.setAttribute('data-parallax-font', font.family)
      style.textContent = `@font-face { font-family: '${font.family}'; src: url('${font.url}'); font-display: swap; }`
      document.head.appendChild(style)
    }
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
  initLenis()
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  lenis?.destroy()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewport)
  }
})
</script>

<template>
  <div class="parallax-site" :style="themeStyle" :lang="site.meta.lang">
    <ParallaxSection
      v-for="(section, i) in site.sections"
      :key="section.id || i"
      :section="section"
    />
    <GyroscopePrompt />
    <CustomCursor v-if="site.cursor?.enabled" :config="site.cursor" />
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
</style>
