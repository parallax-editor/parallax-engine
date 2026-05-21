import type { Component } from 'vue'

/**
 * Tipos de campo configurables para un componente custom.
 * Los nuevos tipos (textarea/url/range/date) son aditivos: un editor que no los
 * conozca puede degradar a un input de texto.
 */
export type EditablePropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'array'
  | 'color'
  | 'image'
  | 'textarea'
  | 'url'
  | 'range'
  | 'date'

/**
 * Metadata de un campo configurable. SOLO sirve para que el editor pinte el
 * panel de propiedades del componente — nunca se persiste en site.json (ahí
 * vive el valor en `element.props`). Todos los campos extra son opcionales y
 * backwards-compatible.
 */
export interface EditableProp {
  type: EditablePropType
  label: string
  /** Texto de ayuda mostrado en el editor (icono "?" / HelpHint). */
  help?: string
  /** Marca el campo como obligatorio → validación visual en el editor. */
  required?: boolean
  /** Agrupa campos en secciones dentro del panel de propiedades. */
  group?: string
  /** Muestra el campo solo si otro campo del mismo componente cumple la condición. */
  showIf?: { field: string; equals: unknown }
  /** Opciones para type:'select'. */
  options?: string[]
  /** Valor por defecto al crear el elemento o agregar un item de array. */
  default?: unknown
  /** Para type:'range' (y opcional en 'number'): límites y paso. */
  min?: number
  max?: number
  step?: number
  /** Para type:'textarea': filas visibles. */
  rows?: number
  /** Para type:'array': esquema de cada item. */
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
