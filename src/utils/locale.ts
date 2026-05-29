// parallax-engine — minimal i18n for engine-emitted UI/error strings.
//
// Goals: zero runtime deps (no vue-i18n), tiny API, Spanish default for
// back-compat. Consumers that want English call `setEngineLocale('en')`
// once at boot; subsequent error labels render in the chosen locale.
//
// Scope intentionally small: this only covers strings the engine itself
// surfaces (overlay labels, console prefixes). Site content is NOT
// translated here — that lives in `site.json`.

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

let currentLocale: EngineLocale = 'es'

export function setEngineLocale(locale: EngineLocale): void {
  currentLocale = locale
}

export function getEngineLocale(): EngineLocale {
  return currentLocale
}

/**
 * Tiny translation helper. Looks up `key` in the current locale's
 * dictionary, falls back to Spanish, then to the key itself. Supports
 * `{name}` interpolation from `params`.
 */
export function tr(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale] ?? dictionaries.es
  let str = dict[key] ?? dictionaries.es[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return str
}
