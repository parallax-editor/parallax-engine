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
