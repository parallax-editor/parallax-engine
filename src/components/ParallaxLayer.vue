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
const isHorizontalSection = inject<Ref<boolean>>('parallaxHorizontalSection', { value: false } as any)
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
  // Absolutely fill the wrapper (which itself fills the positioned section).
  // Using inset:0 instead of width/height:100% avoids relying on a
  // percentage-height chain that collapses when an ancestor has auto height,
  // which previously made every element resolve top/left against a 0px box.
  const style: Record<string, string | number> = {
    position: 'absolute',
    inset: '0',
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
  if (props.layer.blendMode) style.mixBlendMode = props.layer.blendMode

  return style
})

const wrapperStyle = computed(() => {
  // The wrapper fills the whole section (absolute inset:0). It MUST be
  // pointer-events:none so a layer rendered LATER in the DOM (e.g. a text/
  // concepto layer) does not sit on top of and swallow clicks meant for an
  // interactive element in an EARLIER layer below it (root cause of "clicking
  // the linked flor does nothing" — a higher empty layer wrapper intercepted
  // the click). Interactive elements re-enable pointer-events:auto on
  // themselves, so events still reach them; only the inert wrapper is
  // transparent to the pointer. The inner .parallax-layer is already
  // pointer-events:none for the same reason.
  const style: Record<string, string> = { pointerEvents: 'none' }
  if (isHorizontalSection.value) {
    // Inside the flex .horizontal-track: a full-height cell that also acts
    // as the positioning context for the absolutely-filled inner layer.
    style.position = 'relative'
    style.height = '100%'
  } else {
    // Fill the relatively-positioned <section> so the inner layer (and its
    // absolutely-positioned elements) resolve against the real section height.
    style.position = 'absolute'
    style.inset = '0'
  }
  if (props.layer.perspective3d) {
    style.perspective = '1000px'
    style.transformStyle = 'preserve-3d'
  }
  return style
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
