import { describe, it, expect } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import TextElement from '../src/components/elements/TextElement.vue'
import { cssEasingFor } from '../src/composables/useElementAnimations'
import { textElementSchema } from '../src/schema'

/**
 * Regression coverage for the 4 reported TEXT-animation defects:
 *
 *  1. splitMode + staggerDelay produced no per-part stagger (parts used a
 *     fire-on-mount @keyframes that finished before the element scrolled in /
 *     before the parent enter-fade, so the stagger was never visible).
 *  2. enter fadeIn did not run (transition attached in the same commit as the
 *     value flip → browser had nothing to tween from; and schema easings like
 *     easeOutCubic are NOT valid CSS timing functions → voided the whole
 *     `transition` shorthand).
 *  3. enter/scroll inconsistent (IntersectionObserver threshold:0.1 unmet by a
 *     thin pre-animation text box).
 *  4. split/animated text clipped ("Nos casamos" → "Nos ca") — an
 *     unconstrained absolute host shrink-to-fit collapsed inline-block parts
 *     to ≈1-char width.
 *
 * These run in the repo's DOM-less node env, so the component is SSR-rendered
 * (initial = not-yet-entered state) and the post-enter / enter-mapping
 * contract is asserted on the pure exported logic, mirroring the existing
 * tests/text-element-box.test.ts approach.
 */

function parseEl(raw: Record<string, unknown>) {
  return textElementSchema.parse(raw)
}

async function ssr(element: Record<string, unknown>, reducedMotion = false) {
  const app = createSSRApp(
    defineComponent({
      setup() {
        return () => h(TextElement, { element })
      },
    }),
  )
  app.provide('reducedMotion', ref(reducedMotion))
  return renderToString(app)
}

describe('cssEasingFor (defect 2: schema easings must be valid CSS)', () => {
  it('maps non-CSS schema easings to real cubic-bezier (never emitted verbatim)', () => {
    // These would void the `transition` shorthand if passed through as-is.
    expect(cssEasingFor('easeOutCubic')).toMatch(/^cubic-bezier\(/)
    expect(cssEasingFor('easeInQuart')).toMatch(/^cubic-bezier\(/)
    expect(cssEasingFor('easeOut')).toMatch(/^cubic-bezier\(/)
    expect(cssEasingFor('linear')).toBe('linear')
  })
  it('falls back to a valid easing for unknown values', () => {
    expect(cssEasingFor('nope' as string)).toMatch(/cubic-bezier|linear/)
  })
})

describe('splitMode produces N part spans with an incremental stagger offset', () => {
  it('chars: one .split-part per character, each delay = baseDelay + i*stagger', async () => {
    const element = parseEl({
      type: 'text',
      id: 't',
      position: { x: 50, y: 35 },
      content: 'Hola',
      splitMode: 'chars',
      staggerDelay: 60,
      animations: [
        { type: 'fadeIn', trigger: 'enter', from: 0, to: 1, duration: 800, delay: 100, easing: 'easeOut' },
      ],
    })
    const html = await ssr(element)
    const parts = html.match(/class="split-part"/g) || []
    expect(parts.length).toBe(4) // H o l a

    // Each part carries its own transition with delay = 100 + i*60 ms.
    const delays = [...html.matchAll(/transition:opacity \d+ms ease (\d+)ms/g)].map(
      (m) => Number(m[1]),
    )
    expect(delays).toEqual([100, 160, 220, 280])
    // strictly increasing → real typewriter stagger
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1])
    }
  })

  it('words: split keeps spaces and staggers per token', async () => {
    const element = parseEl({
      type: 'text',
      id: 'w',
      position: { x: 50, y: 50 },
      content: 'uno dos',
      splitMode: 'words',
      staggerDelay: 40,
      animations: [
        { type: 'fadeIn', trigger: 'enter', from: 0, to: 1, duration: 600, easing: 'easeOut' },
      ],
    })
    const html = await ssr(element)
    const parts = (html.match(/class="split-part"/g) || []).length
    // "uno", " ", "dos" → 3 parts (spaces preserved)
    expect(parts).toBe(3)
    const delays = [...html.matchAll(/transition:opacity \d+ms ease (\d+)ms/g)].map((m) => Number(m[1]))
    expect(delays).toEqual([0, 40, 80])
  })

  it('staggerDelay:0 still renders the parts (no crash, all same delay)', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'z', position: { x: 0, y: 0 },
        content: 'AB', splitMode: 'chars', staggerDelay: 0, animations: [],
      }),
    )
    expect((html.match(/class="split-part"/g) || []).length).toBe(2)
  })
})

describe('defect 4: split text box is NOT shrink-to-fit collapsed (clipping)', () => {
  it('chars host gets width:max-content + nowrap so the full string fits', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'c', position: { x: 50, y: 50 },
        content: 'Nos casamos', splitMode: 'chars', staggerDelay: 30, animations: [],
      }),
    )
    expect(html).toContain('width:max-content')
    expect(html).toContain('white-space:nowrap')
    // The whole text is present (not truncated to "Nos ca").
    const text = html.replace(/<[^>]+>/g, '')
    expect(text).toContain('Nos casamos')
  })

  it('an explicit author width is respected (not overridden to max-content)', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'cw', position: { x: 50, y: 50 },
        size: { width: '600px' },
        content: 'Titulo largo', splitMode: 'words', staggerDelay: 20, animations: [],
      }),
    )
    expect(html).toContain('width:600px')
    expect(html).not.toContain('width:max-content')
  })

  it('lines mode stacks block spans (each line its own part), full text present', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'l', position: { x: 50, y: 50 },
        content: 'linea uno\nlinea dos', splitMode: 'lines', staggerDelay: 150, animations: [],
      }),
    )
    expect((html.match(/class="split-part"/g) || []).length).toBe(2)
    expect(html).toContain('display:block')
    const text = html.replace(/<[^>]+>/g, '')
    expect(text).toContain('linea uno')
    expect(text).toContain('linea dos')
  })
})

describe('defect 1+3: split parts start hidden (pre-enter) and are gated, not fire-on-mount', () => {
  it('before entering (SSR state) every part is opacity:0 with a transition pre-attached', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'g', position: { x: 50, y: 50 },
        content: 'Hi', splitMode: 'chars', staggerDelay: 50,
        animations: [{ type: 'fadeIn', trigger: 'enter', from: 0, to: 1, duration: 600, easing: 'easeOut' }],
      }),
    )
    // hidden initially (will reveal on viewport entry, staggered)
    expect(html).toContain('opacity:0')
    // transition already on the element so the reveal actually tweens
    expect(html).toMatch(/transition:opacity \d+ms ease \d+ms/)
    // no legacy fire-on-mount keyframe animation
    expect(html).not.toContain('splitReveal')
  })
})

describe('defect 2: reduced motion still ends VISIBLE (never blank)', () => {
  it('split parts render at opacity:1 (no zero-delay blank) under reduced motion', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'r', position: { x: 50, y: 50 },
        content: 'Visible', splitMode: 'chars', staggerDelay: 60,
        animations: [{ type: 'fadeIn', trigger: 'enter', from: 0, to: 1, duration: 800, easing: 'easeOut' }],
      }),
      true, // prefers-reduced-motion
    )
    expect(html).toContain('opacity:1')
    expect(html).not.toContain('opacity:0')
    const text = html.replace(/<[^>]+>/g, '')
    expect(text).toContain('Visible')
  })
})
