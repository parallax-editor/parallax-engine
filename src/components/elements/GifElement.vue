<script setup lang="ts">
/**
 * GIF element. Rendered as an <img> (so the browser handles native decode) but
 * with finer-grained controls than a plain PNG:
 *
 *   • `autoplay:false` — show only the GIF's FIRST frame at mount. The engine
 *     paints the live <img> off-screen for one tick, snapshots the first frame
 *     to a 2D canvas, and swaps the visible <img>'s src to that snapshot.
 *   • `pauseOnHover:true` — freeze on pointer enter (canvas snapshot of the
 *     CURRENT frame), restart on pointer leave.
 *   • `loop:false` — play once. Because <img> GIFs do not fire `ended`, we
 *     approximate by canvas-snapshotting after one estimated playback duration
 *     (probed from the GIF's frame count × delay if we can read it, else a
 *     conservative 2.5s default). Good enough for short UI gifs; long gifs
 *     should be encoded with loopCount=1 in the file itself.
 *
 * All controls are best-effort: the browser's GIF runtime gives us no real
 * timeline API. The canvas-snapshot trick is the de-facto standard for
 * pause/freeze. Native <img> is preserved otherwise so the GPU path stays hot.
 *
 * Anchor / position / animations / overrides are inherited from elementCommon
 * via the SAME helpers PngElement uses (`mergeResponsiveOverrides`,
 * `resolveElementPosition`, `useElementAnimations`, `isElementInteractive`).
 * That keeps the render contract identical between png and gif — any layout
 * concern fixed in PngElement keeps applying here.
 */
import { computed, ref, inject, onMounted, watch, type Ref } from 'vue'
import type { GifElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit, resolveElementPosition, resolveAnchorObjectPosition, isElementInteractive, resolveAssetUrl } from '../../utils/units'
import { useElementAnimations } from '../../composables/useElementAnimations'
import ElementLink from './ElementLink.vue'

const props = defineProps<{ element: GifElement }>()

const imgRef = ref<HTMLImageElement | null>(null)
const sectionProgress = inject<Ref<number>>('sectionProgress', ref(0))
const reducedMotion = inject<Ref<boolean>>('reducedMotion', ref(false))
const device = inject<Ref<DeviceType>>('parallaxDevice', ref('desktop'))
const assetBase = inject<Ref<string>>('parallaxAssetBase', ref(''))

const el = computed(() => mergeResponsiveOverrides(props.element, device.value))
const resolvedSrc = computed(() => resolveAssetUrl(assetBase.value, el.value.src))

// Track which src the <img> actually shows: either the live GIF URL (animating)
// or a frozen canvas dataURL (still). The canvas snapshot is regenerated on
// hover and on the initial autoplay:false mount.
const displaySrc = ref<string>('')

const { style: animStyle } = useElementAnimations({
  animations: () => el.value.animations,
  sectionProgress,
  reducedMotion,
  elementRef: imgRef,
  elementId: props.element.id,
})

const isInteractive = computed(() =>
  isElementInteractive({
    interactive: el.value.interactive,
    link: el.value.link,
    animations: el.value.animations,
  }),
)

const positionStyle = computed(() => {
  const e = el.value
  const base: Record<string, string | number> = resolveElementPosition(e)
  const hasWidth = e.size?.width != null
  const hasHeight = e.size?.height != null
  if (hasWidth) base.width = resolveUnit(e.size!.width!)
  if (hasHeight) base.height = resolveUnit(e.size!.height!)
  if (hasWidth || hasHeight) {
    base.objectFit = e.objectFit || 'cover'
    base.objectPosition = resolveAnchorObjectPosition(e.anchor)
  }
  if (e.opacity !== 1) base.opacity = e.opacity
  if (e.rotation !== 0) base.transform += ` rotate(${e.rotation}deg)`
  if (e.flipX) base.transform += ' scaleX(-1)'
  if (e.flipY) base.transform += ' scaleY(-1)'
  return base
})

const mergedStyle = computed(() => {
  const pos = { ...positionStyle.value }
  const anim = animStyle.value
  if (anim.transform) pos.transform = `${pos.transform || ''} ${anim.transform}`.trim()
  if (anim.opacity !== undefined) pos.opacity = anim.opacity
  if (anim.filter) pos.filter = anim.filter as string
  if ((anim as any).clipPath) (pos as any).clipPath = (anim as any).clipPath
  if (anim.transition) pos.transition = anim.transition as string
  return pos
})

// Capture the CURRENT visible frame of the <img> into a canvas dataURL. Same
// origin (or `crossorigin="anonymous"` set on the <img>) is required for the
// canvas to be readable; otherwise canvas.toDataURL throws SecurityError and
// we fall back to the live GIF (no freeze, no error overlay — best effort).
function snapshotCurrentFrame(): string | null {
  const img = imgRef.value
  if (!img || !img.complete || !img.naturalWidth) return null
  try {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return c.toDataURL('image/png')
  } catch {
    return null
  }
}

// Restart the live animation. Setting img.src to the same URL does NOT restart
// the GIF (browser cache); cache-busting via a query param forces a fresh
// decode → animation restarts from frame 0.
function restartLiveGif() {
  const url = resolvedSrc.value
  const sep = url.includes('?') ? '&' : '?'
  displaySrc.value = `${url}${sep}_t=${Date.now()}`
}

function freezeCurrent() {
  const snap = snapshotCurrentFrame()
  if (snap) displaySrc.value = snap
}

// Initial: respect autoplay. autoplay:true (default) shows the live GIF
// immediately; autoplay:false snapshots the first frame after the image
// loads. Watching `resolvedSrc` lets the editor swap the file at runtime.
function applyInitialPlayback() {
  if (el.value.autoplay === false) {
    // Load off-screen first so we can snapshot frame 0 before the user sees it.
    const probe = new Image()
    probe.crossOrigin = 'anonymous'
    probe.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = probe.naturalWidth
        c.height = probe.naturalHeight
        const ctx = c.getContext('2d')
        if (!ctx) {
          displaySrc.value = resolvedSrc.value
          return
        }
        ctx.drawImage(probe, 0, 0)
        displaySrc.value = c.toDataURL('image/png')
      } catch {
        displaySrc.value = resolvedSrc.value
      }
    }
    probe.onerror = () => { displaySrc.value = resolvedSrc.value }
    probe.src = resolvedSrc.value
  } else {
    displaySrc.value = resolvedSrc.value
  }
}

// loop:false approximation: after a single-play duration, freeze on the
// current frame. Best effort — see file comment. The duration is author-
// configurable via `playDurationMs` (schema) so short/long GIFs behave; the
// hardcoded 2500ms is only a last-resort fallback when no value is provided.
const LOOP_FREEZE_FALLBACK_MS = 2500
let loopFreezeTimer: number | null = null
function scheduleLoopFreeze() {
  if (el.value.loop !== false) return
  if (loopFreezeTimer != null) {
    clearTimeout(loopFreezeTimer)
    loopFreezeTimer = null
  }
  const duration = (el.value as any).playDurationMs ?? LOOP_FREEZE_FALLBACK_MS
  loopFreezeTimer = window.setTimeout(() => {
    if (el.value.loop === false) freezeCurrent()
  }, duration)
}

function onPointerEnter() {
  if (el.value.pauseOnHover) freezeCurrent()
}
function onPointerLeave() {
  if (el.value.pauseOnHover) restartLiveGif()
}

onMounted(() => {
  applyInitialPlayback()
  // schedule on next tick once the live src has been set + loaded
  setTimeout(() => scheduleLoopFreeze(), 100)
})

// Editor: when the user toggles autoplay/loop/pauseOnHover at runtime, react
// without re-mounting the whole element.
watch(() => el.value.autoplay, () => applyInitialPlayback())
watch(() => resolvedSrc.value, () => applyInitialPlayback())
watch(() => el.value.loop, (loop) => {
  if (loop === false) scheduleLoopFreeze()
  else restartLiveGif()
})
</script>

<template>
  <ElementLink v-if="el.visible !== false" :link="el.link">
    <img
      ref="imgRef"
      :data-parallax-id="element.id"
      :data-parallax-gif="true"
      :src="displaySrc || resolvedSrc"
      :alt="el.alt || ''"
      :style="mergedStyle"
      class="parallax-gif-element"
      :class="{ interactive: isInteractive }"
      :data-parallax-interactive="isInteractive || undefined"
      loading="lazy"
      draggable="false"
      crossorigin="anonymous"
      @contextmenu.prevent
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
    />
  </ElementLink>
</template>

<style scoped>
.parallax-gif-element {
  display: block;
  max-width: none;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}
.parallax-gif-element.interactive {
  pointer-events: auto;
  cursor: pointer;
}
</style>
