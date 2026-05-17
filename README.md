# parallax-engine

Engine de parallax compartido (Vue 3). Núcleo del sistema de sitios de Daniela Reyes.

## Instalación (consumidores)

En `package.json` del proyecto consumidor:

```json
"dependencies": {
  "parallax-engine": "link:../parallax-engine"
}
```

Luego `yarn install` crea el symlink automáticamente.

## Desarrollo

```bash
yarn install
yarn dev          # watch build (recompila al guardar)
yarn build        # build completo (types + bundle)
yarn typecheck    # verifica tipos sin emitir
```

## Exports

- `parallax-engine` — componentes Vue del engine
- `parallax-engine/schema` — schema Zod + tipos TypeScript (sin dependencia de Vue)
