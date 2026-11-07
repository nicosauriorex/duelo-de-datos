---
paths:
  - "src/**"
---

# Frontend actual (vanilla JS, una sola página)

- `src/app.js` lee `window.DATOS` (fechas + series compactas con `i0` y `v`) y expande cada serie a `s.vals`. No hay frameworks ni librerías externas.
- Colores de series vía variables CSS `--series-N` en `src/estilos.css`; no hardcodear colores.
- Formato de números siempre con los `Intl.NumberFormat("es-AR")` de arriba de app.js (`fmtNum`, `nf0`...). Meses con `fmtMes`.
- Texto de usuario o de series que va a HTML: pasar por `esc()`.
- Tras cualquier cambio: `python pipeline/obtener_datos.py --solo-pagina` y revisar la página en el navegador (pestaña afectada, también en ancho de celular).
- Este frontend se va a migrar (ver docs/DECISIONES.md). Arreglos sí; refactors grandes no, salvo que se pida.
