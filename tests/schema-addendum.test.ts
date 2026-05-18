import { describe, it, expect } from 'vitest'
import {
  validateSite,
  ANIMATION_TYPES,
  TRIGGER_TYPES,
  SCROLL_DIRECTIONS,
  SPLIT_MODES,
  DEPENDS_EVENTS,
} from '../src/schema'

describe('Schema addendum (hover/click/depends, clipPath, split, etc.)', () => {
  it('ANIMATION_TYPES includes clipPath', () => {
    expect(ANIMATION_TYPES).toContain('clipPath')
  })

  it('TRIGGER_TYPES includes hover, click, depends', () => {
    expect(TRIGGER_TYPES).toContain('hover')
    expect(TRIGGER_TYPES).toContain('click')
    expect(TRIGGER_TYPES).toContain('depends')
  })

  it('SCROLL_DIRECTIONS has vertical and horizontal', () => {
    expect(SCROLL_DIRECTIONS).toEqual(['vertical', 'horizontal'])
  })

  it('SPLIT_MODES has none, words, chars, lines', () => {
    expect(SPLIT_MODES).toEqual(['none', 'words', 'chars', 'lines'])
  })

  it('DEPENDS_EVENTS has hover, click, enter', () => {
    expect(DEPENDS_EVENTS).toEqual(['hover', 'click', 'enter'])
  })

  it('validates hover trigger animation', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 'Test' },
      sections: [{
        layers: [{
          elements: [{
            type: 'png', src: '/a.png', position: { x: 0, y: 0 },
            interactive: true,
            animations: [{ type: 'scale', trigger: 'hover', from: 1, to: 1.2 }],
          }],
        }],
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('validates depends trigger with dependsOn/dependsEvent', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 'Test' },
      sections: [{
        layers: [{
          elements: [
            { type: 'png', id: 'btn', src: '/btn.png', position: { x: 0, y: 0 }, interactive: true },
            {
              type: 'png', src: '/slide.png', position: { x: 0, y: 0 },
              animations: [{
                type: 'translateX', trigger: 'depends',
                dependsOn: 'btn', dependsEvent: 'click',
                from: 0, to: -100, duration: 600,
              }],
            },
          ],
        }],
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('validates clipPath animation type', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 'Test' },
      sections: [{
        layers: [{
          elements: [{
            type: 'png', src: '/a.png', position: { x: 0, y: 0 },
            animations: [{ type: 'clipPath', trigger: 'scroll', from: 0, to: 100, range: [0, 0.5] }],
          }],
        }],
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('validates text splitMode and staggerDelay', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 'Test' },
      sections: [{
        layers: [{
          elements: [{
            type: 'text', content: 'Hello World', position: { x: 50, y: 50 },
            splitMode: 'words', staggerDelay: 80,
          }],
        }],
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('validates layer blendMode', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 'Test' },
      sections: [{
        layers: [{ blendMode: 'multiply' }],
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('validates section scrollDirection horizontal', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 'Test' },
      sections: [{
        scrollBehavior: 'pinned',
        scrollDirection: 'horizontal',
        height: '300vh',
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('validates cursor config', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 'Test' },
      cursor: { enabled: true, color: '#fff', size: 30, hoverScale: 2.5, blendMode: 'difference' },
      sections: [],
    })
    expect(result.ok).toBe(true)
  })
})
