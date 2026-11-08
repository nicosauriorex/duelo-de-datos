# web/ — Duelo de Datos (Next.js + TypeScript + uPlot)

Sitio estático (`output: "export"`). Los datos salen de `pipeline/` y quedan en `web/public/datos/` (no se versionan).

```bash
python pipeline/obtener_datos.py --solo-json   # regenera web/public/datos/ desde datos/datos.js, sin red
cd web && npm ci && npm run build              # genera web/out/
npm run tipos                                  # tsc --noEmit
npm run paridad                                # compara web/lib contra src/app.js (sitio viejo) dentro de 1e-9
```

- `lib/`: cálculos (motor, estadísticas, catálogo, curiosidades), una sola fuente de verdad para todas las secciones.
- `components/secciones/`: una por ruta. El estado de filtros vive en la URL (`lib/url.ts`).
- Los textos de `lib/info.ts` y `lib/fuentes.ts` salieron de `src/` y se editan ahora acá.
