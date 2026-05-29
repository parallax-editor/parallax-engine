// parallax-engine — minimal i18n for engine-emitted UI/error strings.
//
// Goals: zero runtime deps (no vue-i18n), tiny API, Spanish default for
// back-compat. Consumers that want English call `setEngineLocale('en')`
// once at boot; subsequent error labels render in the chosen locale.
//
// Reactivity: the active locale lives in a Vue `shallowRef`, so `tr()`
// invocations from Vue templates (the engine's ErrorOverlay, etc.) re-run
// when the consumer flips `setEngineLocale`. Outside Vue, `tr()` still
// works as a plain function — the ref is just an extra subscription bit.
//
// Scope intentionally small: this only covers strings the engine itself
// surfaces (overlay labels, console prefixes). Site content is NOT
// translated here — that lives in `site.json`.

import { shallowRef } from 'vue'

export type EngineLocale = 'es' | 'en'

type Dict = Record<string, string>

const dictionaries: Record<EngineLocale, Dict> = {
  es: {
    'error.label.single': 'error',
    'error.label.plural': 'errores',
    'error.header': 'Problemas en site.json',
    'error.dismiss': 'Cerrar',
    'error.path': 'ruta',
    'error.suggestion': 'sugerencia',
    'error.engineLog': '[parallax-engine]',
    'error.assetBaseMissing':
      'Falta el prop `assetBase` en <ParallaxSite>. Pasa la base de assets (ej. /content/<slug>/) para que las rutas relativas resuelvan.',
  },
  en: {
    'error.label.single': 'error',
    'error.label.plural': 'errors',
    'error.header': 'site.json issues',
    'error.dismiss': 'Dismiss',
    'error.path': 'path',
    'error.suggestion': 'suggestion',
    'error.engineLog': '[parallax-engine]',
    'error.assetBaseMissing':
      'Missing `assetBase` prop on <ParallaxSite>. Pass the asset base (e.g. /content/<slug>/) so relative paths resolve.',
  },
}

// `shallowRef` so Vue templates that call `tr()` re-render on locale change.
// Plain JS callers ignore the ref wrapping entirely (they read .value below).
const currentLocale = shallowRef<EngineLocale>('es')

export function setEngineLocale(locale: EngineLocale): void {
  currentLocale.value = locale
}

export function getEngineLocale(): EngineLocale {
  return currentLocale.value
}

/**
 * Tiny translation helper. Looks up `key` in the current locale's
 * dictionary, falls back to Spanish, then to the key itself. Supports
 * `{name}` interpolation from `params`. Reactive: reading `currentLocale.value`
 * registers a Vue dep so a re-render fires when the locale changes.
 */
export function tr(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale.value] ?? dictionaries.es
  let str = dict[key] ?? dictionaries.es[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return str
}
