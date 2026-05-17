// parallax-engine — main entry

// Components
export { default as ParallaxSite } from './components/ParallaxSite.vue'
export { default as ParallaxSection } from './components/ParallaxSection.vue'
export { default as ParallaxLayer } from './components/ParallaxLayer.vue'
export { default as PngElement } from './components/elements/PngElement.vue'
export { default as TextElement } from './components/elements/TextElement.vue'
export { default as ErrorOverlay } from './components/ErrorOverlay.vue'

// Composables
export { useReducedMotion } from './composables/useReducedMotion'
export { useScrollProgress } from './composables/useScrollProgress'
export { useErrorHandler } from './composables/useErrorHandler'
export { useElementAnimations } from './composables/useElementAnimations'

// Utils
export { resolveUnit, resolvePosition, resolveSize } from './utils/units'
export { assignIds } from './utils/ids'

// Schema re-exports (convenience — canonical import is 'parallax-engine/schema')
export { SCHEMA_VERSION, validateSite } from './schema'
export type { Site, Section, Layer, AnyElement, Animation } from './schema'
