<script setup lang="ts">
import { ref, computed, provide, inject, onMounted, onUnmounted, type Ref } from 'vue'
import type { Section } from '../schema'
import ParallaxLayer from './ParallaxLayer.vue'

const props = defineProps<{ section: Section }>()

const sectionRef = ref<HTMLElement | null>(null)
const scrollY = inject<Ref<number>>('parallaxScrollY', ref(0))
const viewportHeight = inject<Ref<number>>('parallaxViewportHeight', ref(800))

const isVisible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!sectionRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      isVisible.value = entries[0]?.isIntersecting ?? false
    },
    { rootMargin: '100px' },
  )
  observer.observe(sectionRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
})

/**
 * Section progress: 0 when section top reaches viewport bottom,
 * 1 when section bottom passes viewport top.
 */
const sectionProgress = computed(() => {
  // Access scrollY.value to create reactive dependency on scroll changes
  void scrollY.value
  if (!isVisible.value || !sectionRef.value) return 0
  const rect = sectionRef.value.getBoundingClientRect()
  const totalTravel = viewportHeight.value + rect.height
  const traveled = viewportHeight.value - rect.top
  return Math.max(0, Math.min(1, traveled / totalTravel))
})

provide('sectionProgress', sectionProgress)

const sectionStyle = computed(() => {
  const style: Record<string, string> = {
    position: 'relative',
    overflow: 'hidden',
    height: props.section.height,
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
  <section ref="sectionRef" :id="section.id" :style="sectionStyle" class="parallax-section">
    <ParallaxLayer
      v-for="(layer, i) in section.layers"
      :key="layer.id || i"
      :layer="layer"
    />
  </section>
</template>

<style scoped>
.parallax-section {
  width: 100%;
}
</style>
