---
paths:
  - "web/**"
---

# Frontend (web/: Next.js + TypeScript + uPlot, export estático)

- Los datos llegan por `fetch` de `/datos/*.json` (los escribe el pipeline). `DatosProvider` carga `catalogo.json` + `base.json` siempre y cada `<categoria>.json` cuando una sección lo pide (`useSeccion`).
- Cálculos solo en `web/lib/` (`motor.ts`, `estadisticas.ts`, `catalogo.ts`, `curiosidades.ts`); no duplicar lógica en los componentes.
- Colores de series vía variables CSS `--series-N` en `web/app/globals.css`; no hardcodear colores.
- Números siempre con los `Intl.NumberFormat("es-AR")` de `web/lib/formato.ts`. Meses con `fmtMes`.
- Los filtros viven en el query string (`web/lib/url.ts`); un parámetro inválido cae al valor por defecto.
- Tras cualquier cambio: `cd web && npm run tipos && npm run build`, y revisar la sección afectada en el navegador (también a 375 px).
