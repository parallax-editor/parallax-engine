/**
 * Unit resolution utilities.
 * Numbers are interpreted as percentages, strings are passed through as-is.
 */

export function resolveUnit(value: number | string): string {
  return typeof value === 'number' ? `${value}%` : value
}

/**
 * ¿La ruta de un asset es RELATIVA? (la única que hay que resolver contra el
 * assetBase). Absolutas (http/https), root-relativas (`/…`), protocol-relative
 * (`//…`) y `data:`/`blob:` se dejan EXACTAMENTE como están.
 */
export function isRelativeAssetPath(src: string): boolean {
  return (
    !!src &&
    !/^https?:\/\//i.test(src) &&
    !src.startsWith('//') &&
    !src.startsWith('/') &&
    !src.startsWith('data:') &&
    !src.startsWith('blob:')
  )
}

// Aviso de "lo pida" (#assetBase): si un site trae rutas RELATIVAS pero el
// consumidor no pasó `assetBase`, el engine no sabe dónde viven los assets y se
// romperían (404). En DEV avisamos UNA vez con instrucciones claras; en prod
// callamos (degradamos a la ruta verbatim, que es el comportamiento histórico).
let warnedMissingAssetBase = false
function warnMissingAssetBase(src: string): void {
  if (warnedMissingAssetBase) return
  warnedMissingAssetBase = true
  // import.meta.env.DEV no existe fuera de Vite/build; protegido para SSR/tests.
  const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV
  if (!isDev) return
  // eslint-disable-next-line no-console
  console.warn(
    `[parallax-engine] El site usa rutas de assets RELATIVAS (ej. "${src}") pero ` +
      'no se pasó la prop `assetBase` a <ParallaxSite>. Esas rutas se usarán tal cual y ' +
      'probablemente fallen (404). Pasa assetBase="/content/<slug>/" (o el prefijo donde ' +
      'sirves los assets de ese site) para que el engine las resuelva.',
  )
}

/**
 * Resuelve la ruta de un asset (`src`, `url`, `poster`, fondo…) contra el
 * `assetBase` del site. El ENGINE es autosuficiente: el consumidor solo declara
 * DÓNDE viven los assets (assetBase) y el engine prefija las rutas relativas; no
 * necesita reescribir el site.json. Additive/backwards-compatible: sin assetBase,
 * devuelve la ruta verbatim (comportamiento previo intacto) y, en dev, avisa.
 * Las rutas no-relativas (http/https//, `/…`, data:, blob:) pasan sin tocar.
 */
export function resolveAssetUrl(assetBase: string | undefined, src: string | undefined | null): string {
  if (!src) return ''
  if (!isRelativeAssetPath(src)) return src
  if (!assetBase) {
    warnMissingAssetBase(src)
    return src
  }
  // Une base + src con UNA sola barra (la base puede o no terminar en `/`).
  return `${assetBase.replace(/\/+$/, '')}/${src.replace(/^\/+/, '')}`
}

export function resolvePosition(pos: { x: number | string; y: number | string }): { left: string; top: string } {
  return {
    left: resolveUnit(pos.x),
    top: resolveUnit(pos.y),
  }
}

export function resolveSize(size?: { width?: number | string; height?: number | string }): { width?: string; height?: string } {
  if (!size) return {}
  const result: { width?: string; height?: string } = {}
  if (size.width != null) result.width = resolveUnit(size.width)
  if (size.height != null) result.height = resolveUnit(size.height)
  return result
}

/**
 * translate() offsets per anchor: positions the element so the named anchor
 * point sits at the configured (x, y). `center` → translate(-50%, -50%),
 * `top-left` → translate(0%, 0%), etc.
 */
export const ANCHOR_OFFSETS: Record<string, [string, string]> = {
  'center': ['-50%', '-50%'],
  'top-left': ['0%', '0%'],
  'top-right': ['-100%', '0%'],
  'bottom-left': ['0%', '-100%'],
  'bottom-right': ['-100%', '-100%'],
  'top': ['-50%', '0%'],
  'bottom': ['-50%', '-100%'],
  'left': ['0%', '-50%'],
  'right': ['-100%', '-50%'],
}

export function resolveAnchorOffset(anchor?: string): [string, string] {
  return ANCHOR_OFFSETS[anchor || 'center'] || ['-50%', '-50%']
}

/**
 * transform-origin per anchor, derived from the SAME offsets so it is always
 * consistent with the translate: the named anchor point is both the placement
 * point AND the pivot, so an appended rotate()/scale() (TextElement,
 * PngElement, animations) rotates/scales about the exact point that sits at
 * (x%, y%) instead of swinging the element to the opposite side. The offset
 * `-50%/-100%/0%` maps to origin `50%/100%/0%` on each axis; `center` →
 * `50% 50%` (identical to the previous `center`).
 */
export function resolveAnchorOrigin(anchor?: string): string {
  const [ox, oy] = resolveAnchorOffset(anchor)
  return `${ox.replace('-', '')} ${oy.replace('-', '')}`
}

/**
 * `object-position` per anchor, for replaced elements (PngElement's <img>)
 * that are given an explicit size and therefore use `object-fit: cover`.
 * `cover` scales the image to fill the box and crops the overflow; the crop
 * should keep the side the author anchored to. So `top-left` keeps the
 * top-left of the photo (`0% 0%`), `bottom-right` keeps the bottom-right
 * (`100% 100%`), `center` keeps the center (`50% 50%`), etc. Derived from the
 * SAME ANCHOR_OFFSETS table so it can never drift from the placement geometry:
 * the offset `-50%/-100%/0%` maps to position `50%/100%/0%` on each axis —
 * identical mapping to `resolveAnchorOrigin`.
 */
export function resolveAnchorObjectPosition(anchor?: string): string {
  const [ox, oy] = resolveAnchorOffset(anchor)
  return `${ox.replace('-', '')} ${oy.replace('-', '')}`
}

/**
 * The browser user-agent default box of a semantic text tag (e.g. <h1> has
 * margin-block ≈ 0.67em). Left in place this margin shifts the text box and
 * effectively cancels the vertical anchor translate, so an `anchor:center`
 * element renders its visual center off by a font-size-proportional amount.
 * Applied inline on the rendered tag so the geometry is exact on BOTH axes
 * even when a consumer does not import the engine's stylesheet. This only
 * neutralizes the UA box — themed typography from the schema still applies.
 */
export const TEXT_BOX_RESET = {
  margin: '0',
  padding: '0',
  boxSizing: 'border-box',
} as const

/**
 * The base wrapper style every positioned element gets: absolute positioning
 * with left/top derived from position.x/y (number → %, string → as-is) plus
 * the anchor translate. This is what makes an element land at its configured
 * spot inside its section instead of collapsing to the top.
 */
export function resolveElementPosition(el: {
  position: { x: number | string; y: number | string }
  anchor?: string
}): { position: 'absolute'; left: string; top: string; transform: string; transformOrigin: string } {
  const [ox, oy] = resolveAnchorOffset(el.anchor)
  return {
    position: 'absolute',
    left: resolveUnit(el.position.x),
    top: resolveUnit(el.position.y),
    transform: `translate(${ox}, ${oy})`,
    transformOrigin: resolveAnchorOrigin(el.anchor),
  }
}

/**
 * Centralized "is this element interactive?" rule (single source of truth so
 * Text/Png/etc. never drift apart again).
 *
 * An element must be hit-testable (pointer-events:auto) when ANY of:
 *  - it is explicitly `interactive: true`, or
 *  - it carries a `link` (the wrapping <a> must receive the click), or
 *  - it has at least one animation whose trigger is `hover` or `click`.
 *
 * The last clause is the fix for the "hover/click animation never fires"
 * bug: an element with `interactive:false` and no link but a `hover`/`click`
 * animation was rendered pointer-events:none, so the mouseenter/click that the
 * animation listens for could never reach it. The animation's own listeners
 * (attached in useElementAnimations) are inert without it.
 */
export function isElementInteractive(el: {
  interactive?: boolean
  link?: unknown
  animations?: { trigger?: string }[]
}): boolean {
  if (el.interactive) return true
  if (el.link) return true
  const anims = el.animations
  if (anims && anims.some((a) => a.trigger === 'hover' || a.trigger === 'click')) return true
  return false
}
