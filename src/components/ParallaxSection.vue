<script setup lang="ts">
import { ref, computed, provide, inject, onMounted, onUnmounted, type Ref } from 'vue'
import type { Section } from '../schema'
import ParallaxLayer from './ParallaxLayer.vue'

const props = defineProps<{ section: Section }>()

const sectionRef = ref<HTMLElement | null>(null)
const innerRef = ref<HTMLElement | null>(null)
const scrollY = inject<Ref<number>>('parallaxScrollY', ref(0))
const viewportHeight = inject<Ref<number>>('parallaxViewportHeight', ref(800))

const isVisible = ref(false)
let observer: IntersectionObserver | null = null

const isPinned = computed(() => props.section.scrollBehavior === 'pinned')
const isSnap = computed(() => props.section.scrollBehavior === 'snap')
const isHorizontal = computed(() => props.section.scrollDirection === 'horizontal')

onMounted(() => {
  // Observe the outer wrapper (which has full height for pinned sections)
  const target = sectionRef.value
  if (!target) return
  observer = new IntersectionObserver(
    (entries) => {
      isVisible.value = entries[0]?.isIntersecting ?? false
    },
    { rootMargin: '100px' },
  )
  observer.observe(target)
})

onUnmounted(() => {
  observer?.disconnect()
})

/**
 * Section progress: 0 when section top reaches viewport bottom,
 * 1 when section bottom passes viewport top.
 * For pinned sections, uses the outer wrapper height for total travel.
 */
const sectionProgress = computed(() => {
  void scrollY.value
  if (!isVisible.value || !sectionRef.value) return 0
  const rect = sectionRef.value.getBoundingClientRect()
  const totalTravel = viewportHeight.value + rect.height
  const traveled = viewportHeight.value - rect.top
  return Math.max(0, Math.min(1, traveled / totalTravel))
})

provide('sectionProgress', sectionProgress)
provide('parallaxHorizontalSection', isHorizontal)

const outerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (isPinned.value) {
    // Outer wrapper: full scrollable height. It MUST stay overflow:visible —
    // the inner is `position:sticky` and travels through this taller box; an
    // `overflow:hidden`/`clip` here would create a scroll container that pins
    // the sticky to the top of the wrapper instead of the viewport (the sticky
    // would never engage). The wrapper does NOT need to clip: its only child is
    // the sticky inner, which clips itself (see sectionStyle), so nothing can
    // bleed out through the wrapper. Set it explicitly so a consumer's global
    // rule cannot accidentally turn it into a clipping scroll container.
    style.height = props.section.height
    style.position = 'relative'
    style.overflow = 'visible'
  }
  return style
})

const sectionStyle = computed(() => {
  // `overflow:hidden` is the load-bearing CLIP: every section confines its own
  // layers/elements to the section box so an oversized full-bleed image or an
  // element dragged past the section margin is clipped at the section edge and
  // can never paint into a neighboring section. Applied inline (not only via
  // the scoped stylesheet) so the clip holds even if a consumer forgets to
  // import the engine's style.css, and so it always wins over consumer CSS.
  //
  //   - continuous / snap : the section box is `section.height`; the layers
  //     translate WITHIN it (standard parallax-stage clipping).
  //   - pinned            : the section box is the 100vh STICKY stage, so the
  //     clip is exactly the viewport the content is pinned to (NOT the taller
  //     outer wrapper — see outerStyle); the sticky still travels normally.
  //   - horizontal        : the inner `.horizontal-track` (200vw of flex cells
  //     translated by translateX) overflows horizontally; this clip is what
  //     turns that into the horizontal reveal AND contains any vertical bleed.
  const style: Record<string, string> = {
    position: 'relative',
    overflow: 'hidden',
  }

  if (isPinned.value) {
    // Sticky inner: locks to viewport while outer scrolls
    style.position = 'sticky'
    style.top = '0'
    style.height = '100vh'
  } else {
    style.height = props.section.height
  }

  if (isSnap.value) {
    style.scrollSnapAlign = 'start'
  }

  if (props.section.background) {
    const bg = props.section.background
    if (bg.type === 'color') {
      style.backgroundColor = bg.value
    } else if (bg.type === 'gradient') {
      style.background = bg.value
    } else if (bg.type === 'image') {
      style.backgroundImage = `url(${bg.value})`
      style.backgroundSize = 'cover'
      style.backgroundPosition = 'center'
    }
  }

  return style
})
</script>

<template>
  <!-- Outer wrapper: only meaningful for pinned (provides scroll height) -->
  <div ref="sectionRef" :style="outerStyle">
    <section ref="innerRef" :id="section.id" :style="sectionStyle" class="parallax-section">
      <div
        v-if="isHorizontal"
        class="horizontal-track"
        :style="{ transform: `translateX(${-sectionProgress * 100}%)`, width: '100%', height: '100%', display: 'flex' }"
      >
        <ParallaxLayer
          v-for="(layer, i) in section.layers"
          :key="layer.id || i"
          :layer="layer"
          :layer-index="i"
          style="flex-shrink: 0; width: 100vw;"
        />
      </div>
      <template v-else>
        <ParallaxLayer
          v-for="(layer, i) in section.layers"
          :key="layer.id || i"
          :layer="layer"
          :layer-index="i"
        />
      </template>
    </section>
  </div>
</template>

<style scoped>
.parallax-section {
  width: 100%;
  /* Baseline clip (the inline `overflow:hidden` in sectionStyle is the
     load-bearing one and always wins; this mirrors it declaratively so the
     invariant is visible in the stylesheet and survives if the inline style is
     ever refactored). Each section confines its own content to the section box
     so nothing bleeds into adjacent sections. */
  overflow: hidden;
}
</style>
