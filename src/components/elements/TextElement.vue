<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import type { TextElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit, resolveElementPosition, isElementInteractive, TEXT_BOX_RESET } from '../../utils/units'
import { useElementAnimations } from '../../composables/useElementAnimations'
import ElementLink from './ElementLink.vue'

const props = defineProps<{ element: TextElement }>()

const elementRef = ref<HTMLElement | null>(null)
const sectionProgress = inject<Ref<number>>('sectionProgress', ref(0))
const reducedMotion = inject<Ref<boolean>>('reducedMotion', ref(false))
const device = inject<Ref<DeviceType>>('parallaxDevice', ref('desktop'))

const el = computed(() => mergeResponsiveOverrides(props.element, device.value))

const { style: animStyle, hasEntered } = useElementAnimations({
  // Reactive getter (merged source) so editing an element's animations updates
  // the live preview without remounting the engine, and per-device animation
  // overrides stay reactive.
  animations: () => el.value.animations,
  sectionProgress,
  reducedMotion,
  elementRef,
  elementId: props.element.id,
})

// ─── Split text ────────────────────────────────────────────────────────────────

const splitParts = computed(() => {
  const mode = el.value.splitMode
  if (!mode || mode === 'none') return null
  const text = el.value.content
  if (mode === 'chars') return text.split('')
  if (mode === 'words') return text.split(/(\s+)/) // preserve spaces
  if (mode === 'lines') return text.split('\n')
  return null
})

const stagger = computed(() => el.value.staggerDelay || 0)

// Shared line-height for split host + parts so the host line box and each
// inline-block part agree (host clientHeight === content) and the box hugs
// the text without collapsing. 1.3 comfortably contains the glyph box of the
// display fonts in use (Playfair Display, Lato) while staying tight enough
// for headings. An author lineHeight from the schema still wins (themed
// typography preserved).
const SPLIT_LINE_HEIGHT = 1.3

// Base delay of the element's own enter/scroll animation, so the per-part
// stagger starts AFTER any configured animation delay rather than at 0.
const baseDelay = computed(() => {
  const a = (props.element.animations ?? []).find(
    (an) => an.trigger === 'enter' || an.trigger === 'scroll',
  )
  return a?.delay ?? 0
})

// Per-part reveal duration: reuse the element's animation duration if present
// so the typewriter cadence matches the rest of the element's motion.
const partDuration = computed(() => {
  const a = (props.element.animations ?? []).find(
    (an) => an.trigger === 'enter' || an.trigger === 'scroll',
  )
  return a?.duration ?? 600
})

// The split reveal must run when the element is in view (same trigger model as
// `enter`), not fire-and-forget on mount. If there is an explicit scroll/enter
// animation we follow hasEntered; with no animations at all we still want the
// split to play once it scrolls in. Reduced motion → reveal immediately,
// visibly (never leave the text blank).
const partsRevealed = computed(() => reducedMotion.value || hasEntered.value)

const isLines = computed(() => el.value.splitMode === 'lines')

function partStyle(i: number) {
  const revealed = partsRevealed.value
  const delay = reducedMotion.value ? 0 : baseDelay.value + i * stagger.value
  const dur = reducedMotion.value ? 200 : partDuration.value
  return {
    // chars/words: inline-block on one nowrap line so translateY applies and
    // the box grows to the FULL text (no shrink-to-fit-to-one-part clip,
    // the "Nos ca" bug). lines: each line is its own block stacked
    // vertically.
    display: isLines.value ? 'block' : 'inline-block',
    // top-align inline-block parts to the line box: an inline-block's box
    // otherwise extends past the baseline by its descender, inflating the
    // host's scrollHeight beyond clientHeight (a measurable vertical
    // "clip"/overflow even though nothing is hidden). vertical-align:top makes
    // the box size exactly to the text line.
    verticalAlign: isLines.value ? undefined : ('top' as const),
    lineHeight: el.value.lineHeight || SPLIT_LINE_HEIGHT,
    whiteSpace: isLines.value ? ('pre-wrap' as const) : ('pre' as const),
    opacity: revealed ? 1 : 0,
    // Once revealed, clear the transform entirely (not translateY(0)) and do
    // NOT keep will-change: a promoted `will-change:transform` layer makes
    // Chrome reserve phantom scrollable overflow on the host (scrollHeight >
    // clientHeight ≈ the reveal offset) even though nothing is visually
    // clipped. Dropping it makes the host box exactly fit the text.
    transform: revealed ? 'none' : 'translateY(0.4em)',
    transition: `opacity ${dur}ms ease ${delay}ms, transform ${dur}ms cubic-bezier(0.215,0.61,0.355,1) ${delay}ms`,
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const positionStyle = computed(() => {
  const e = el.value
  const base: Record<string, string | number> = {
    ...resolveElementPosition(e),
    // Neutralize the semantic tag's UA box (e.g. <h1> margin-block ≈ 0.67em)
    // inline so position+anchor is geometrically exact on both axes even
    // without the engine stylesheet. Themed typography below still applies.
    ...TEXT_BOX_RESET,
  }
  if (e.size?.width != null) base.width = resolveUnit(e.size.width)
  if (e.size?.height != null) base.height = resolveUnit(e.size.height)
  // Split text: the host is position:absolute with no explicit width, so it
  // shrink-to-fits. With per-part inline-block spans an unconstrained
  // shrink-to-fit collapses the box to the widest single part (≈1 char) and
  // wraps the rest into a tall narrow column — the reported clipping where
  // "Nos casamos" rendered as "Nos ca". Pinning the box to max-content with
  // nowrap forces the whole string onto one line and sizes the box to the
  // FULL text so nothing is cut off. Only when the author did not set an
  // explicit width.
  if (splitParts.value && e.size?.width == null) {
    base.width = 'max-content'
    base.maxWidth = '90vw'
    // chars/words live on one nowrap line; lines mode stacks block spans and
    // must keep its own wrapping (each line can wrap if long).
    base.whiteSpace = el.value.splitMode === 'lines' ? 'normal' : 'nowrap'
  }
  // With inline-block split parts the host's line box uses line-height:normal
  // (≈1.0–1.3 depending on font), while each part's own box renders the full
  // glyph ascent+descent — so the host clientHeight ends up SHORTER than the
  // stacked content (scrollHeight), a measurable vertical overflow even though
  // nothing is visually hidden. Pin BOTH host and parts to the same explicit
  // line-height so the box hugs the text exactly. Author lineHeight wins.
  if (e.opacity !== 1) base.opacity = e.opacity
  if (e.rotation !== 0) base.transform += ` rotate(${e.rotation}deg)`
  if (e.font) base.fontFamily = e.font
  if (e.fontSize) base.fontSize = e.fontSize
  if (e.fontWeight) base.fontWeight = e.fontWeight
  if (e.color) base.color = e.color
  if (e.letterSpacing) base.letterSpacing = e.letterSpacing
  if (e.lineHeight) base.lineHeight = e.lineHeight
  else if (splitParts.value) base.lineHeight = SPLIT_LINE_HEIGHT
  // textAlign (v1.1 additive, optional): only emitted when the author set it,
  // so content without it is byte-identical (no forced default). For split
  // chars/words with no author width the host is width:max-content +
  // white-space:nowrap (single line sized to the full text) so text-align is
  // an inert no-op there — it cannot reintroduce the "Nos ca" clip nor shift
  // anchor/position geometry (left/top/translate are untouched). It visibly
  // takes effect for wrapping text, an explicit width, lines mode, and
  // multi-line <p>.
  if (e.textAlign) base.textAlign = e.textAlign
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

const tag = computed(() => el.value.semanticTag || 'p')
// Single source of truth (utils/isElementInteractive): an element with a
// hover/click animation must be pointer-events:auto even when interactive:false
// and no link, otherwise its mouseenter/click listener never fires.
const isInteractive = computed(() =>
  isElementInteractive({
    interactive: el.value.interactive,
    link: el.value.link,
    animations: el.value.animations,
  }),
)
</script>

<template>
  <ElementLink v-if="el.visible !== false" :link="el.link">
    <component
      :is="tag"
      ref="elementRef"
      :data-parallax-id="element.id"
      :style="mergedStyle"
      class="parallax-text-element"
      :class="{ interactive: isInteractive }"
      :data-parallax-interactive="isInteractive || undefined"
    >
      <!-- Split text mode -->
      <template v-if="splitParts">
        <span
          v-for="(part, i) in splitParts"
          :key="i"
          class="split-part"
          :style="partStyle(i)"
        >{{ part }}</span>
      </template>
      <!-- Normal mode -->
      <template v-else>{{ el.content }}</template>
    </component>
  </ElementLink>
</template>

<style scoped>
.parallax-text-element {
  margin: 0;
  pointer-events: none;
  user-select: none;
}
.parallax-text-element.interactive {
  pointer-events: auto;
  cursor: pointer;
}
/* Split parts are fully driven by inline styles (opacity/transform/transition)
   so the reveal is gated to viewport entry with a real per-part stagger.
   No fire-on-mount @keyframes here: that ran once before the element scrolled
   in (and before the parent enter-fade), so the stagger was never seen. */
.split-part {
  /* top-aligned so the inline-block box does not extend past the baseline and
     inflate the host's scrollHeight (vertical overflow). Inline style sets
     this too; kept here for stylesheet-only consumers. */
  vertical-align: top;
}
</style>
