// parallax-engine — main entry

// Components
export { default as ParallaxSite } from './components/ParallaxSite.vue'
export { default as ParallaxSection } from './components/ParallaxSection.vue'
export { default as ParallaxLayer } from './components/ParallaxLayer.vue'
export { default as PngElement } from './components/elements/PngElement.vue'
export { default as TextElement } from './components/elements/TextElement.vue'
export { default as ComponentElement } from './components/elements/ComponentElement.vue'
export { default as AudioElement } from './components/elements/AudioElement.vue'
export { default as VideoElement } from './components/elements/VideoElement.vue'
export { default as ErrorOverlay } from './components/ErrorOverlay.vue'
export { default as FormBlock } from './components/FormBlock.vue'
export { default as WorldTransition } from './components/WorldTransition.vue'
export { default as GyroscopePrompt } from './components/GyroscopePrompt.vue'
export { default as UnmuteButton } from './components/UnmuteButton.vue'
export { default as CustomCursor } from './components/CustomCursor.vue'

// Composables
export { useReducedMotion } from './composables/useReducedMotion'
export { useScrollProgress } from './composables/useScrollProgress'
export { useErrorHandler } from './composables/useErrorHandler'
export { useElementAnimations, computeLoopValue } from './composables/useElementAnimations'
export { useResponsive, mergeResponsiveOverrides } from './composables/useResponsive'
export { useQualityTier, computeQualityTier } from './composables/useQualityTier'
export { useMouseTracking } from './composables/useMouseTracking'
export { useGyroscope } from './composables/useGyroscope'
export { useInteractionBus } from './composables/useInteractionBus'
export { useCursorEffect } from './composables/useCursorEffect'

// Config
export { defineParallaxConfig } from './config'
export type { ParallaxConfig, ComponentRegistration, EditableProp } from './config'

// Utils
export { resolveUnit, resolvePosition, resolveSize } from './utils/units'
export { assignIds } from './utils/ids'

// Schema re-exports (convenience — canonical import is 'parallax-engine/schema')
export { SCHEMA_VERSION, validateSite } from './schema'
export type { Site, Section, Layer, AnyElement, Animation, CursorConfig } from './schema'
