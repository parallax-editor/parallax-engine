<script setup lang="ts">
import { computed, inject, type Ref, type ComputedRef } from 'vue'
import type { Layer, QualityTier } from '../schema'
import type { MouseState } from '../composables/useMouseTracking'
import type { GyroscopeState } from '../composables/useGyroscope'
import PngElement from './elements/PngElement.vue'
import TextElement from './elements/TextElement.vue'
import ComponentElement from './elements/ComponentElement.vue'
import AudioElement from './elements/AudioElement.vue'
import VideoElement from './elements/VideoElement.vue'

const props = defineProps<{
  layer: Layer
  layerIndex: number
}>()

const viewportHeight = inject<Ref<number>>('parallaxViewportHeight', { value: 800 } as any)
const sectionProgress = inject<Ref<number>>('sectionProgress', { value: 0 } as any)
const reducedMotion = inject<Ref<boolean>>('reducedMotion', { value: false } as any)
const quality = inject<ComputedRef<QualityTier>>('parallaxQuality', computed(() => ({
  maxLayers: 20, blurEnabled: true, loopFps: 60,
})))
const mouse = inject<MouseState>('parallaxMouse', {
  mouseX: { value: 0 }, mouseY: { value: 0 },
} as any)
const gyroscope = inject<GyroscopeState>('parallaxGyroscope', {
  tiltX: { value: 0 }, tiltY: { value: 0 }, available: { value: false },
} as any)

const MOUSE_FACTOR = 30
const GYRO_FACTOR = 20

const shouldRender = computed(() => props.layerIndex < quality.value.maxLayers)

const layerStyle = computed(() => {
  const style: Record<string, string | number> = {
    position: 'relative',
    width: '100%',
    height: '100%',
  }

  if (reducedMotion.value) {
    // No parallax transforms when reduced motion is on
    if (props.layer.blur > 0 && quality.value.blurEnabled) {
      style.filter = `blur(${props.layer.blur}px)`
    }
    if (props.layer.opacity < 1) style.opacity = props.layer.opacity
    return style
  }

  const transforms: string[] = []
  const depth = props.layer.depth
  const modes = props.layer.parallaxMode

  // scroll-vertical
  if (modes.includes('scroll-vertical') && depth !== 0) {
    const scrollDelta = sectionProgress.value * viewportHeight.value
    transforms.push(`translateY(${-depth * scrollDelta * 0.5}px)`)
  }

  // scroll-horizontal
  if (modes.includes('scroll-horizontal') && depth !== 0) {
    const scrollDelta = sectionProgress.value * viewportHeight.value
    transforms.push(`translateX(${-depth * scrollDelta * 0.3}px)`)
  }

  // mouse
  if (modes.includes('mouse') && depth !== 0) {
    const mx = mouse.mouseX.value * depth * MOUSE_FACTOR
    const my = mouse.mouseY.value * depth * MOUSE_FACTOR
    transforms.push(`translate(${mx}px, ${my}px)`)
  }

  // gyroscope
  if (modes.includes('gyroscope') && depth !== 0 && gyroscope.available.value) {
    const gx = gyroscope.tiltY.value * depth * GYRO_FACTOR
    const gy = gyroscope.tiltX.value * depth * GYRO_FACTOR
    transforms.push(`translate(${gx}px, ${gy}px)`)
  }

  // tilt (3D variant of gyroscope)
  if (modes.includes('tilt') && props.layer.perspective3d && gyroscope.available.value) {
    const rx = gyroscope.tiltX.value * 15 // degrees
    const ry = gyroscope.tiltY.value * 15
    transforms.push(`rotateX(${rx}deg) rotateY(${ry}deg)`)
  }

  if (transforms.length > 0) style.transform = transforms.join(' ')

  if (props.layer.blur > 0 && quality.value.blurEnabled) {
    style.filter = `blur(${props.layer.blur}px)`
  }

  if (props.layer.opacity < 1) style.opacity = props.layer.opacity

  return style
})

const wrapperStyle = computed(() => {
  if (!props.layer.perspective3d) return undefined
  return {
    perspective: '1000px',
    transformStyle: 'preserve-3d' as const,
  }
})
</script>

<template>
  <div v-if="shouldRender" :style="wrapperStyle">
    <div class="parallax-layer" :style="layerStyle">
      <template v-for="element in layer.elements" :key="element.id">
        <PngElement v-if="element.type === 'png'" :element="element" />
        <TextElement v-else-if="element.type === 'text'" :element="element" />
        <ComponentElement v-else-if="element.type === 'component'" :element="element" />
        <AudioElement v-else-if="element.type === 'audio'" :element="element" />
        <VideoElement v-else-if="element.type === 'video'" :element="element" />
      </template>
    </div>
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
