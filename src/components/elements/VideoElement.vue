<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, type Ref } from 'vue'
import type { VideoElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit } from '../../utils/units'
import UnmuteButton from '../UnmuteButton.vue'

const props = defineProps<{ element: VideoElement }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const device = inject<Ref<DeviceType>>('parallaxDevice', ref('desktop'))
const el = computed(() => mergeResponsiveOverrides(props.element, device.value))

const isVisible = ref(false)
const isMuted = ref(true)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const wrapper = videoRef.value?.parentElement
  if (!wrapper) return
  observer = new IntersectionObserver(
    (entries) => {
      const wasVisible = isVisible.value
      isVisible.value = entries[0]?.isIntersecting ?? false
      if (isVisible.value && !wasVisible && videoRef.value) {
        videoRef.value.src = el.value.src
        if (el.value.autoplay) videoRef.value.play().catch(() => {})
      }
      if (!isVisible.value && wasVisible && videoRef.value) {
        videoRef.value.pause()
      }
    },
    { rootMargin: '200px' },
  )
  observer.observe(wrapper)
})

onUnmounted(() => { observer?.disconnect() })

function handleUnmute() {
  if (videoRef.value) {
    videoRef.value.muted = false
    isMuted.value = false
  }
}

const positionStyle = computed(() => {
  const e = el.value
  const base: Record<string, string | number> = {
    position: 'absolute',
    left: resolveUnit(e.position.x),
    top: resolveUnit(e.position.y),
  }
  if (e.size?.width != null) base.width = resolveUnit(e.size.width)
  if (e.size?.height != null) base.height = resolveUnit(e.size.height)
  return base
})
</script>

<template>
  <div v-if="el.visible !== false" :style="positionStyle" class="parallax-video-element">
    <video
      ref="videoRef"
      :poster="el.poster"
      :muted="el.muted !== false"
      :loop="el.loopMedia || false"
      :controls="el.controls || false"
      :playsinline="el.playsinline !== false"
      preload="none"
      style="width: 100%; height: 100%; object-fit: cover;"
    />
    <UnmuteButton v-if="isMuted && isVisible && el.autoplay" @unmute="handleUnmute" />
  </div>
</template>

<style scoped>
.parallax-video-element {
  pointer-events: auto;
}
</style>
