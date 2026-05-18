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
    // Outer wrapper: full scrollable height
    style.height = props.section.height
    style.position = 'relative'
  }
  return style
})

const sectionStyle = computed(() => {
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
}
</style>
