import type { Component } from 'vue'

export interface EditableProp {
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'color' | 'image'
  label: string
  options?: string[]
  default?: unknown
  itemSchema?: Record<string, EditableProp>
}

export interface ComponentRegistration {
  component: Component
  label: string
  description?: string
  editableProps?: Record<string, EditableProp>
}

export interface ParallaxConfig {
  components: Record<string, ComponentRegistration>
}

/**
 * Helper to define a parallax config with full type safety.
 * Used in parallax.config.ts at the root of each consuming repo.
 */
export function defineParallaxConfig(config: ParallaxConfig): ParallaxConfig {
  return config
}
