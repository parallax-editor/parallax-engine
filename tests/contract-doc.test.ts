import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  SCHEMA_VERSION,
  ELEMENT_TYPES,
  ANIMATION_TYPES,
  TRIGGER_TYPES,
  EASING_PRESETS,
  TRANSITION_TYPES,
} from '../src/schema'

// ─── Guardia de drift de la doc de IA ────────────────────────────────────────
// `ai/contract.md` es el contrato auto-contenido que el editor inyecta en cada
// `claude -p` (los repos de contenido ya NO llevan skill). Es fácil que se
// desincronice de `src/schema.ts` (la fuente de verdad). Este test FALLA si la
// doc no menciona la versión actual del schema o si le falta algún valor de los
// enums que un autor de site.json necesita conocer — obligando a actualizarla
// en el mismo commit que toque el schema.

const CONTRACT = readFileSync(resolve(__dirname, '..', 'ai', 'contract.md'), 'utf-8')

describe('ai/contract.md está sincronizado con el schema', () => {
  it('declara la versión actual del schema', () => {
    expect(CONTRACT).toContain(`Schema v${SCHEMA_VERSION}`)
    expect(CONTRACT).toContain(`schemaVersion: "${SCHEMA_VERSION}"`)
  })

  it('menciona todos los tipos de elemento', () => {
    for (const t of ELEMENT_TYPES) expect(CONTRACT, `falta element type "${t}"`).toContain(t)
  })

  it('menciona todos los tipos de animación', () => {
    for (const t of ANIMATION_TYPES) expect(CONTRACT, `falta animation type "${t}"`).toContain(t)
  })

  it('menciona todos los triggers', () => {
    for (const t of TRIGGER_TYPES) expect(CONTRACT, `falta trigger "${t}"`).toContain(t)
  })

  it('menciona todos los easing presets', () => {
    for (const e of EASING_PRESETS) expect(CONTRACT, `falta easing "${e}"`).toContain(e)
  })

  it('menciona todos los tipos de transición', () => {
    for (const t of TRANSITION_TYPES) expect(CONTRACT, `falta transition "${t}"`).toContain(t)
  })
})
