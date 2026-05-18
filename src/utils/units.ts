/**
 * Unit resolution utilities.
 * Numbers are interpreted as percentages, strings are passed through as-is.
 */

export function resolveUnit(value: number | string): string {
  return typeof value === 'number' ? `${value}%` : value
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
