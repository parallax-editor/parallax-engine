import { describe, it, expect } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import TextElement from '../src/components/elements/TextElement.vue'
import { textElementSchema, TEXT_ALIGN, validateSite } from '../src/schema'

/**
 * Coverage for the v1.1 additive `textAlign` capability on text elements.
 *
 * Contract:
 *  - `textAlign` is OPTIONAL. Absent ⇒ NO `text-align` is forced into the
 *    rendered style (existing content renders byte-for-byte the same).
 *  - When present, the corresponding `text-align` CSS is emitted.
 *  - Composes with split/stagger: a split text with `textAlign` keeps the FULL
 *    text (not clipped to "Nos ca") and still pins width:max-content + nowrap
 *    (so anchor/position geometry is unchanged).
 *  - Existing typography fields `letterSpacing` / `lineHeight` are still
 *    applied (they were untouched by this change).
 *
 * SSR-rendered in the repo's DOM-less node env, mirroring
 * tests/text-split-stagger.test.ts.
 */

function parseEl(raw: Record<string, unknown>) {
  return textElementSchema.parse(raw)
}

async function ssr(element: Record<string, unknown>) {
  const app = createSSRApp(
    defineComponent({
      setup() {
        return () => h(TextElement, { element })
      },
    }),
  )
  app.provide('reducedMotion', ref(false))
  return renderToString(app)
}

describe('schema: TEXT_ALIGN const + optional textAlign field (additive, v1.1)', () => {
  it('TEXT_ALIGN tuple is left/center/right/justify', () => {
    expect(TEXT_ALIGN).toEqual(['left', 'center', 'right', 'justify'])
  })

  it('text element WITHOUT textAlign still validates (backward compatible)', () => {
    const result = validateSite({
      schemaVersion: '1.1',
      meta: { title: 'T' },
      sections: [{
        layers: [{
          elements: [{ type: 'text', content: 'Hola', position: { x: 50, y: 50 } }],
        }],
      }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const el = result.data.sections[0].layers[0].elements[0] as any
      // absent ⇒ undefined (no default injected)
      expect(el.textAlign).toBeUndefined()
    }
  })

  it.each(['left', 'center', 'right', 'justify'] as const)(
    'text element WITH textAlign:%s validates and is preserved',
    (align) => {
      const result = validateSite({
        schemaVersion: '1.1',
        meta: { title: 'T' },
        sections: [{
          layers: [{
            elements: [{
              type: 'text', content: 'Hola', position: { x: 50, y: 50 },
              textAlign: align,
            }],
          }],
        }],
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        const el = result.data.sections[0].layers[0].elements[0] as any
        expect(el.textAlign).toBe(align)
      }
    },
  )

  it('rejects an invalid textAlign value', () => {
    const result = textElementSchema.safeParse({
      type: 'text', content: 'x', position: { x: 0, y: 0 },
      textAlign: 'middle',
    })
    expect(result.success).toBe(false)
  })
})

describe('TextElement: applies text-align from the schema field when present', () => {
  it.each(['center', 'right', 'justify'] as const)(
    'textAlign:%s ⇒ inline style carries text-align:%s',
    async (align) => {
      const html = await ssr(
        parseEl({
          type: 'text', id: 't', position: { x: 50, y: 50 },
          content: 'Texto que se alinea', textAlign: align,
        }),
      )
      expect(html).toContain(`text-align:${align}`)
    },
  )

  it('absent textAlign ⇒ NO text-align forced (existing content unchanged)', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 't', position: { x: 50, y: 50 },
        content: 'Sin alineacion',
      }),
    )
    expect(html).not.toContain('text-align')
  })
})

describe('TextElement: letterSpacing / lineHeight still applied (untouched by textAlign)', () => {
  it('letterSpacing and lineHeight are emitted into the inline style', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 't', position: { x: 50, y: 50 },
        content: 'Tipografia', letterSpacing: '0.08em', lineHeight: '1.4',
      }),
    )
    expect(html).toContain('letter-spacing:0.08em')
    expect(html).toContain('line-height:1.4')
  })

  it('letterSpacing/lineHeight coexist with textAlign', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 't', position: { x: 50, y: 50 },
        content: 'Todo junto', letterSpacing: '0.05em', lineHeight: '1.2',
        textAlign: 'center',
      }),
    )
    expect(html).toContain('letter-spacing:0.05em')
    expect(html).toContain('line-height:1.2')
    expect(html).toContain('text-align:center')
  })
})

describe('TextElement: textAlign composes with split/stagger (no clipping regression)', () => {
  it('split chars + textAlign:center keeps the FULL text and width:max-content + nowrap', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'c', position: { x: 50, y: 50 },
        content: 'Nos casamos', splitMode: 'chars', staggerDelay: 30,
        textAlign: 'center', animations: [],
      }),
    )
    // Geometry guard: split host still pinned so the "Nos ca" clip can't return.
    expect(html).toContain('width:max-content')
    expect(html).toContain('white-space:nowrap')
    // text-align is still emitted (inert on a max-content nowrap line, but
    // proves the field is honored without breaking the box).
    expect(html).toContain('text-align:center')
    // Full text present, not truncated.
    const text = html.replace(/<[^>]+>/g, '')
    expect(text).toContain('Nos casamos')
  })

  it('split words + textAlign:right with an explicit author width: width respected, text-align applied', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'w', position: { x: 50, y: 50 },
        size: { width: '600px' },
        content: 'Titulo largo de varias palabras', splitMode: 'words',
        staggerDelay: 20, textAlign: 'right', animations: [],
      }),
    )
    expect(html).toContain('width:600px')
    expect(html).not.toContain('width:max-content')
    expect(html).toContain('text-align:right')
    const text = html.replace(/<[^>]+>/g, '')
    expect(text).toContain('Titulo largo de varias palabras')
  })

  it('anchor + position geometry intact when textAlign is set', async () => {
    const html = await ssr(
      parseEl({
        type: 'text', id: 'a', position: { x: 50, y: 35 },
        anchor: 'center', content: 'Centrado', textAlign: 'center',
      }),
    )
    // left/top + anchor translate untouched by text-align.
    expect(html).toContain('left:50%')
    expect(html).toContain('top:35%')
    expect(html).toContain('translate(-50%, -50%)')
    expect(html).toContain('text-align:center')
  })
})
