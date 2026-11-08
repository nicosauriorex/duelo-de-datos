# web/ — Primero los Datos (Next.js + TypeScript + uPlot)

Sitio estático (`output: "export"`). Los datos salen de `pipeline/` y quedan en `web/public/datos/` (no se versionan).

```bash
python pipeline/obtener_datos.py --solo-json   # regenera web/public/datos/ desde datos/cache/compilado.json, sin red
cd web && npm ci && npm run build              # genera web/out/
npm run tipos                                  # tsc --noEmit
```

- `lib/`: cálculos (motor, estadísticas, catálogo, curiosidades), una sola fuente de verdad para todas las secciones.
- `components/secciones/`: una por ruta. El estado de filtros vive en la URL (`lib/url.ts`).
- Los textos de `lib/info.ts` y `lib/fuentes.ts` salieron del sitio viejo y se editan acá.
