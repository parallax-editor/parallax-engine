<script setup lang="ts">
import { inject } from 'vue'
import type { CursorState } from '../composables/useCursorEffect'
import type { CursorConfig } from '../schema'

defineProps<{ config: CursorConfig }>()
const cursor = inject<CursorState>('parallaxCursor')
</script>

<template>
  <div
    v-if="cursor?.visible.value"
    class="parallax-cursor"
    :style="{
      left: `${cursor.x.value}px`,
      top: `${cursor.y.value}px`,
      width: `${config.size}px`,
      height: `${config.size}px`,
      backgroundColor: config.color,
      mixBlendMode: config.blendMode as any,
      transform: `translate(-50%, -50%) scale(${cursor.hovering.value ? config.hoverScale : 1})`,
    }"
  />
</template>

<style scoped>
.parallax-cursor {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 99998;
  transition: transform 0.15s ease-out, width 0.15s ease-out, height 0.15s ease-out;
  will-change: left, top, transform;
}
</style>
