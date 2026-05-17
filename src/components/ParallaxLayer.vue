<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import type { Layer } from '../schema'
import PngElement from './elements/PngElement.vue'
import TextElement from './elements/TextElement.vue'

const props = defineProps<{ layer: Layer }>()

const viewportHeight = inject<Ref<number>>('parallaxViewportHeight', { value: 800 } as any)
const sectionProgress = inject<Ref<number>>('sectionProgress', { value: 0 } as any)
const reducedMotion = inject<Ref<boolean>>('reducedMotion', { value: false } as any)

const layerStyle = computed(() => {
  const style: Record<string, string | number> = {
    position: 'relative',
    width: '100%',
    height: '100%',
  }

  // Apply parallax transform for scroll-vertical mode
  if (
    props.layer.parallaxMode.includes('scroll-vertical') &&
    props.layer.depth !== 0 &&
    !reducedMotion.value
  ) {
    const scrollDelta = sectionProgress.value * viewportHeight.value
    const offset = -props.layer.depth * scrollDelta * 0.5
    style.transform = `translateY(${offset}px)`
  }

  if (props.layer.blur > 0) {
    style.filter = `blur(${props.layer.blur}px)`
  }

  if (props.layer.opacity < 1) {
    style.opacity = props.layer.opacity
  }

  return style
})
</script>

<template>
  <div class="parallax-layer" :style="layerStyle">
    <template v-for="element in layer.elements" :key="element.id">
      <PngElement v-if="element.type === 'png'" :element="element" />
      <TextElement v-else-if="element.type === 'text'" :element="element" />
      <!-- component, audio, video → Fase 2 -->
    </template>
  </div>
</template>

<style scoped>
.parallax-layer {
  position: absolute;
  inset: 0;
  will-change: transform;
  pointer-events: none;
}
</style>
