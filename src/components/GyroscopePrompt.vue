<script setup lang="ts">
import { inject } from 'vue'
import type { GyroscopeState } from '../composables/useGyroscope'

const gyroscope = inject<GyroscopeState>('parallaxGyroscope')

async function handleActivate() {
  if (gyroscope) {
    await gyroscope.requestPermission()
  }
}
</script>

<template>
  <Transition name="gyro-prompt">
    <button
      v-if="gyroscope?.needsPermission.value"
      class="parallax-gyro-prompt"
      @click="handleActivate"
      aria-label="Activar efectos de movimiento"
    >
      ✨ Activar efectos
    </button>
  </Transition>
</template>

<style scoped>
.parallax-gyro-prompt {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12px 24px;
  border: none;
  border-radius: 24px;
  background: var(--color-accent, #333);
  color: var(--color-paper, #fff);
  font-family: var(--font-body, sans-serif);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.parallax-gyro-prompt:focus-visible {
  outline: 2px solid var(--color-ink, #000);
  outline-offset: 2px;
}
.gyro-prompt-enter-active,
.gyro-prompt-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.gyro-prompt-enter-from,
.gyro-prompt-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
