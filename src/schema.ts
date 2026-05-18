/**
 * Schema del site.json — contrato compartido (§4 del plan)
 *
 * Este archivo es LA FUENTE DE VERDAD. Engine, editor, sitios y skill de Claude
 * Code todos respetan este schema. Cualquier cambio rompe los cuatro.
 *
 * Decisiones documentadas:
 * - §4 es canónico: text usa `fontSize`/`fontWeight` (no `size`/`weight` de §3)
 * - `loopMedia` para audio/video (evita colisión con `loop` boolean de animaciones)
 * - `trigger: "loop"` es tipo de disparo; `loop`/`yoyo` son modificadores opcionales
 * - Schema completo desde v1 (incluye audio/video/component)
 * - v1.0 addendum: hover/click/depends triggers, clipPath animation, splitMode,
 *   blendMode, scrollDirection, cursor — todos opcionales, backwards-compatible
 */

import { z } from 'zod'

// ─── Version ───────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = '1.0' as const

// ─── Const enums (runtime + type-level) ────────────────────────────────────────

export const TRANSITION_TYPES = ['fade', 'wipe', 'crossfade-blur', 'zoom', 'page-flip'] as const
export const SCROLL_BEHAVIORS = ['pinned', 'continuous', 'snap'] as const
export const SCROLL_DIRECTIONS = ['vertical', 'horizontal'] as const
export const PARALLAX_MODES = ['scroll-vertical', 'scroll-horizontal', 'mouse', 'gyroscope', 'tilt'] as const
export const ELEMENT_TYPES = ['png', 'text', 'component', 'audio', 'video'] as const
export const ANCHOR_TYPES = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'] as const
export const SEMANTIC_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span'] as const
export const SPLIT_MODES = ['none', 'words', 'chars', 'lines'] as const
export const DEPENDS_EVENTS = ['hover', 'click', 'enter'] as const

export const ANIMATION_TYPES = [
  'fadeIn', 'fadeOut', 'translateX', 'translateY',
  'rotate', 'rotateX', 'rotateY', 'scale', 'blur', 'skew',
  'clipPath',
] as const

export const TRIGGER_TYPES = ['enter', 'scroll', 'mouse', 'gyroscope', 'loop', 'hover', 'click', 'depends'] as const

export const EASING_PRESETS = [
  'linear', 'easeIn', 'easeOut', 'easeInOut',
  'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
  'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
  'easeInQuint', 'easeOutQuint', 'easeInOutQuint',
] as const

// ─── Primitive helpers ─────────────────────────────────────────────────────────

/** Number (interpreted as %) or CSS string (used as-is) */
const lengthValue = z.union([z.number(), z.string()])

const positionSchema = z.object({
  x: lengthValue,
  y: lengthValue,
})

const sizeSchema = z.object({
  width: lengthValue.optional(),
  height: lengthValue.optional(),
})

// ─── Animation ─────────────────────────────────────────────────────────────────

export const animationSchema = z.object({
  type: z.enum(ANIMATION_TYPES),
  trigger: z.enum(TRIGGER_TYPES),
  from: z.number(),
  to: z.number(),
  range: z.tuple([z.number(), z.number()]).optional(),
  duration: z.number().min(0).optional(),
  delay: z.number().min(0).optional(),
  easing: z.enum(EASING_PRESETS).default('easeInOut'),
  loop: z.boolean().optional(),
  yoyo: z.boolean().optional(),
  // depends trigger fields
  dependsOn: z.string().optional(),
  dependsEvent: z.enum(DEPENDS_EVENTS).optional(),
})

// ─── Element overrides (responsive mobile/desktop) ─────────────────────────────

const elementOverridesSchema = z.object({
  position: positionSchema.optional(),
  size: sizeSchema.optional(),
  anchor: z.enum(ANCHOR_TYPES).optional(),
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  visible: z.boolean().optional(),
  // text overrides
  fontSize: z.string().optional(),
  fontWeight: z.number().optional(),
  color: z.string().optional(),
  letterSpacing: z.string().optional(),
  lineHeight: z.string().optional(),
}).partial().optional()

// ─── Link (any element can be a link) ──────────────────────────────────────────

export const LINK_TARGETS = ['_blank', '_self', '_parent', '_top'] as const

const linkSchema = z.object({
  href: z.string(),
  target: z.enum(LINK_TARGETS).default('_blank'),
  rel: z.string().optional(),
  ariaLabel: z.string().optional(),
})

// ─── Common element fields ─────────────────────────────────────────────────────

const elementCommon = {
  id: z.string().optional(),
  position: positionSchema,
  size: sizeSchema.optional(),
  anchor: z.enum(ANCHOR_TYPES).default('center'),
  opacity: z.number().min(0).max(1).default(1),
  rotation: z.number().default(0),
  visible: z.boolean().default(true),
  interactive: z.boolean().default(false),
  link: linkSchema.optional(),
  animations: z.array(animationSchema).default([]),
  mobile: elementOverridesSchema,
  desktop: elementOverridesSchema,
}

// ─── Element variants ──────────────────────────────────────────────────────────

export const pngElementSchema = z.object({
  type: z.literal('png'),
  ...elementCommon,
  src: z.string(),
  alt: z.string().optional(),
})

export const textElementSchema = z.object({
  type: z.literal('text'),
  ...elementCommon,
  content: z.string(),
  font: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.number().optional(),
  color: z.string().optional(),
  letterSpacing: z.string().optional(),
  lineHeight: z.string().optional(),
  semanticTag: z.enum(SEMANTIC_TAGS).default('p'),
  splitMode: z.enum(SPLIT_MODES).default('none'),
  staggerDelay: z.number().min(0).default(0),
})

export const componentElementSchema = z.object({
  type: z.literal('component'),
  ...elementCommon,
  name: z.string(),
  props: z.record(z.unknown()).optional(),
})

export const audioElementSchema = z.object({
  type: z.literal('audio'),
  ...elementCommon,
  src: z.string(),
  autoplay: z.boolean().default(false),
  muted: z.boolean().default(true),
  loopMedia: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(1),
  controls: z.boolean().default(false),
})

export const videoElementSchema = z.object({
  type: z.literal('video'),
  ...elementCommon,
  src: z.string(),
  poster: z.string().optional(),
  autoplay: z.boolean().default(false),
  muted: z.boolean().default(true),
  loopMedia: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(1),
  controls: z.boolean().default(false),
  playsinline: z.boolean().default(true),
})

// ─── Discriminated union of all elements ───────────────────────────────────────

export const elementSchema = z.discriminatedUnion('type', [
  pngElementSchema,
  textElementSchema,
  componentElementSchema,
  audioElementSchema,
  videoElementSchema,
])

// ─── Layer ─────────────────────────────────────────────────────────────────────

export const layerSchema = z.object({
  id: z.string().optional(),
  depth: z.number().min(-1).max(1).default(0),
  parallaxMode: z.array(z.enum(PARALLAX_MODES)).default([]),
  blur: z.number().min(0).default(0),
  opacity: z.number().min(0).max(1).default(1),
  perspective3d: z.boolean().default(false),
  blendMode: z.string().optional(),
  elements: z.array(elementSchema).default([]),
})

// ─── Section ───────────────────────────────────────────────────────────────────

const backgroundSchema = z.object({
  type: z.enum(['color', 'gradient', 'image']),
  value: z.string(),
})

const transitionSchema = z.object({
  in: z.enum(TRANSITION_TYPES).optional(),
  out: z.enum(TRANSITION_TYPES).optional(),
  duration: z.number().min(0).optional(),
})

export const sectionSchema = z.object({
  id: z.string().optional(),
  height: z.string().default('100vh'),
  scrollBehavior: z.enum(SCROLL_BEHAVIORS).default('continuous'),
  scrollDirection: z.enum(SCROLL_DIRECTIONS).default('vertical'),
  background: backgroundSchema.optional(),
  transition: transitionSchema.optional(),
  layers: z.array(layerSchema).default([]),
})

// ─── Cursor config ─────────────────────────────────────────────────────────────

const cursorSchema = z.object({
  enabled: z.boolean().default(false),
  color: z.string().default('#000'),
  size: z.number().default(20),
  hoverScale: z.number().default(2),
  blendMode: z.string().default('difference'),
})

// ─── Site-level schemas ────────────────────────────────────────────────────────

const fontSchema = z.object({
  family: z.string(),
  source: z.enum(['google', 'custom']),
  url: z.string().optional(),
})

export const siteMetaSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  ogImage: z.string().optional(),
  favicon: z.string().optional(),
  fonts: z.array(fontSchema).default([]),
  transition: transitionSchema.optional(),
  lang: z.string().default('es'),
})

export const themeSchema = z.object({
  colors: z.object({
    ink: z.string(),
    paper: z.string(),
    accent: z.string(),
  }),
  typography: z.object({
    display: z.string(),
    body: z.string(),
  }),
})

export const qualityTierSchema = z.object({
  maxLayers: z.number().min(1),
  blurEnabled: z.boolean(),
  loopFps: z.number().min(1),
})

export const qualitySchema = z.object({
  mobile: qualityTierSchema,
  desktop: qualityTierSchema,
})

// ─── Site (root) ───────────────────────────────────────────────────────────────

export const siteSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+$/, 'schemaVersion must be semver (e.g. "1.0")'),
  meta: siteMetaSchema,
  theme: themeSchema.optional(),
  quality: qualitySchema.optional(),
  cursor: cursorSchema.optional(),
  sections: z.array(sectionSchema).default([]),
})

// ─── Inferred types ────────────────────────────────────────────────────────────

export type Animation = z.infer<typeof animationSchema>
export type PngElement = z.infer<typeof pngElementSchema>
export type TextElement = z.infer<typeof textElementSchema>
export type ComponentElement = z.infer<typeof componentElementSchema>
export type AudioElement = z.infer<typeof audioElementSchema>
export type VideoElement = z.infer<typeof videoElementSchema>
export type AnyElement = z.infer<typeof elementSchema>
export type Layer = z.infer<typeof layerSchema>
export type Section = z.infer<typeof sectionSchema>
export type SiteMeta = z.infer<typeof siteMetaSchema>
export type Theme = z.infer<typeof themeSchema>
export type QualityTier = z.infer<typeof qualityTierSchema>
export type Quality = z.infer<typeof qualitySchema>
export type Site = z.infer<typeof siteSchema>
export type CursorConfig = z.infer<typeof cursorSchema>
export type ElementLink = z.infer<typeof linkSchema>
export type ElementOverrides = z.infer<typeof elementOverridesSchema>

// ─── Validator ─────────────────────────────────────────────────────────────────

export interface SchemaError {
  path: string
  message: string
}

export type ValidationResult =
  | { ok: true; data: Site }
  | { ok: false; errors: SchemaError[] }

export function validateSite(input: unknown): ValidationResult {
  const result = siteSchema.safeParse(input)

  if (result.success) {
    return { ok: true, data: result.data }
  }

  const errors: SchemaError[] = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))

  return { ok: false, errors }
}

// ─── ID assignment ─────────────────────────────────────────────────────────────

export function assignIds(site: Site): Site {
  const copy: Site = JSON.parse(JSON.stringify(site))
  const counters = { section: 0, layer: 0, el: 0 }

  for (const section of copy.sections) {
    if (!section.id) {
      counters.section++
      section.id = `section-${counters.section}`
    }
    for (const layer of section.layers) {
      if (!layer.id) {
        counters.layer++
        layer.id = `layer-${counters.layer}`
      }
      for (const element of layer.elements) {
        if (!element.id) {
          counters.el++
          element.id = `el-${counters.el}`
        }
      }
    }
  }

  return copy
}
