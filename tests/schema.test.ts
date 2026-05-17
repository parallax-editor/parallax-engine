import { describe, it, expect } from 'vitest'
import {
  validateSite,
  assignIds,
  siteSchema,
  SCHEMA_VERSION,
  type Site,
} from '../src/schema'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function minimalSite(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: '1.0',
    meta: { title: 'Test' },
    sections: [],
    ...overrides,
  }
}

function siteWithElement(element: Record<string, unknown>): Record<string, unknown> {
  return minimalSite({
    sections: [{
      layers: [{
        elements: [element],
      }],
    }],
  })
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('SCHEMA_VERSION', () => {
  it('is 1.0', () => {
    expect(SCHEMA_VERSION).toBe('1.0')
  })
})

describe('validateSite', () => {
  it('passes for a minimal valid site', () => {
    const result = validateSite(minimalSite())
    expect(result.ok).toBe(true)
  })

  it('passes for a full site with all element types', () => {
    const site = minimalSite({
      theme: {
        colors: { ink: '#000', paper: '#fff', accent: '#f00' },
        typography: { display: 'Playfair Display', body: 'Inter' },
      },
      quality: {
        mobile: { maxLayers: 3, blurEnabled: false, loopFps: 30 },
        desktop: { maxLayers: 10, blurEnabled: true, loopFps: 60 },
      },
      sections: [{
        id: 'hero',
        height: '200vh',
        scrollBehavior: 'continuous',
        background: { type: 'color', value: '#f5e6d3' },
        layers: [{
          id: 'bg-layer',
          depth: -0.5,
          parallaxMode: ['scroll-vertical'],
          elements: [
            { type: 'png', src: '/images/bg.png', alt: 'Background', position: { x: 50, y: 50 } },
            { type: 'text', content: 'Hello', position: { x: 50, y: 30 }, semanticTag: 'h1' },
            { type: 'component', name: 'NavButtons', position: { x: 50, y: 10 } },
            { type: 'audio', src: '/audio/song.mp3', position: { x: 0, y: 0 } },
            { type: 'video', src: '/video/intro.mp4', poster: '/images/poster.jpg', position: { x: 50, y: 50 } },
          ],
        }],
      }],
    })
    const result = validateSite(site)
    expect(result.ok).toBe(true)
  })

  it('fails when meta.title is missing', () => {
    const result = validateSite({ schemaVersion: '1.0', meta: {}, sections: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some(e => e.path.includes('title'))).toBe(true)
    }
  })

  it('fails for invalid schemaVersion format', () => {
    const result = validateSite(minimalSite({ schemaVersion: 'v1' }))
    expect(result.ok).toBe(false)
  })

  it('fails for invalid scrollBehavior', () => {
    const result = validateSite(minimalSite({
      sections: [{ scrollBehavior: 'invalid' }],
    }))
    expect(result.ok).toBe(false)
  })

  it('fails for PNG element without src', () => {
    const result = validateSite(siteWithElement({
      type: 'png', position: { x: 0, y: 0 },
    }))
    expect(result.ok).toBe(false)
  })

  it('fails for text element without content', () => {
    const result = validateSite(siteWithElement({
      type: 'text', position: { x: 0, y: 0 },
    }))
    expect(result.ok).toBe(false)
  })

  it('fails for animation with invalid trigger', () => {
    const result = validateSite(siteWithElement({
      type: 'png', src: '/a.png', position: { x: 0, y: 0 },
      animations: [{ type: 'fadeIn', trigger: 'invalid', from: 0, to: 1 }],
    }))
    expect(result.ok).toBe(false)
  })

  it('fails for unknown element type', () => {
    const result = validateSite(siteWithElement({
      type: 'svg', position: { x: 0, y: 0 },
    }))
    expect(result.ok).toBe(false)
  })

  it('validates responsive overrides (partial)', () => {
    const result = validateSite(siteWithElement({
      type: 'png', src: '/a.png', position: { x: 50, y: 50 },
      mobile: { visible: false, opacity: 0.5 },
      desktop: { position: { x: 10, y: 20 } },
    }))
    expect(result.ok).toBe(true)
  })

  it('applies default values correctly', () => {
    const result = validateSite(minimalSite({
      sections: [{
        layers: [{
          elements: [{ type: 'png', src: '/a.png', position: { x: 0, y: 0 } }],
        }],
      }],
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      const el = result.data.sections[0].layers[0].elements[0]
      expect(el.opacity).toBe(1)
      expect(el.visible).toBe(true)
      expect(el.anchor).toBe('center')
      expect(el.rotation).toBe(0)
      expect(result.data.sections[0].layers[0].depth).toBe(0)
      expect(result.data.sections[0].scrollBehavior).toBe('continuous')
    }
  })

  it('returns structured errors with paths', () => {
    const result = validateSite({ schemaVersion: '1.0' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toHaveProperty('path')
      expect(result.errors[0]).toHaveProperty('message')
    }
  })

  it('accepts both number and string units for position', () => {
    const result = validateSite(siteWithElement({
      type: 'png', src: '/a.png',
      position: { x: 50, y: '10vh' },
      size: { width: '80vw', height: 40 },
    }))
    expect(result.ok).toBe(true)
  })

  it('validates depth range (-1 to 1)', () => {
    const result = validateSite(minimalSite({
      sections: [{ layers: [{ depth: 2 }] }],
    }))
    expect(result.ok).toBe(false)
  })

  it('validates animation easing presets', () => {
    const result = validateSite(siteWithElement({
      type: 'png', src: '/a.png', position: { x: 0, y: 0 },
      animations: [{ type: 'fadeIn', trigger: 'enter', from: 0, to: 1, easing: 'easeOutCubic' }],
    }))
    expect(result.ok).toBe(true)
  })
})

describe('assignIds', () => {
  it('assigns IDs to sections, layers and elements that lack them', () => {
    const parsed = siteSchema.parse(minimalSite({
      sections: [{
        layers: [{
          elements: [
            { type: 'png', src: '/a.png', position: { x: 0, y: 0 } },
            { type: 'text', content: 'Hi', position: { x: 0, y: 0 } },
          ],
        }],
      }],
    }))
    const result = assignIds(parsed)
    expect(result.sections[0].id).toBe('section-1')
    expect(result.sections[0].layers[0].id).toBe('layer-1')
    expect(result.sections[0].layers[0].elements[0].id).toBe('el-1')
    expect(result.sections[0].layers[0].elements[1].id).toBe('el-2')
  })

  it('preserves existing IDs', () => {
    const parsed = siteSchema.parse(minimalSite({
      sections: [{
        id: 'my-hero',
        layers: [{
          id: 'my-layer',
          elements: [
            { type: 'png', id: 'my-img', src: '/a.png', position: { x: 0, y: 0 } },
          ],
        }],
      }],
    }))
    const result = assignIds(parsed)
    expect(result.sections[0].id).toBe('my-hero')
    expect(result.sections[0].layers[0].id).toBe('my-layer')
    expect(result.sections[0].layers[0].elements[0].id).toBe('my-img')
  })

  it('increments counters across multiple sections', () => {
    const parsed = siteSchema.parse(minimalSite({
      sections: [
        { layers: [{ elements: [{ type: 'png', src: '/a.png', position: { x: 0, y: 0 } }] }] },
        { layers: [{ elements: [{ type: 'text', content: 'B', position: { x: 0, y: 0 } }] }] },
      ],
    }))
    const result = assignIds(parsed)
    expect(result.sections[0].id).toBe('section-1')
    expect(result.sections[1].id).toBe('section-2')
    expect(result.sections[0].layers[0].id).toBe('layer-1')
    expect(result.sections[1].layers[0].id).toBe('layer-2')
    expect(result.sections[0].layers[0].elements[0].id).toBe('el-1')
    expect(result.sections[1].layers[0].elements[0].id).toBe('el-2')
  })

  it('does not mutate the original', () => {
    const parsed = siteSchema.parse(minimalSite({
      sections: [{ layers: [{}] }],
    }))
    const original = JSON.parse(JSON.stringify(parsed))
    assignIds(parsed)
    expect(parsed).toEqual(original)
  })
})
