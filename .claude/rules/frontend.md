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

# Reglas de interfaz (salen de los pedidos del usuario; valen para todo el sitio)

- **Las cuentas cierran**: una diferencia, variación o porcentaje se calcula con los valores redondeados que se muestran (1,9 y 2,1 → 0,2). Nunca "-0,0".
- **Nada tapa un dato**: botones flotantes, etiquetas y encabezados fijos no se superponen a puntos, valores ni ítems de una lista.
- **Toda ventana, panel o desplegable** tiene una cruz de 44 px, se cierra con el botón Atrás del celular (sin salir de la página) y Escape cierra solo la capa de arriba.
- **Ningún texto se sale de su contenedor** a 360 px: baja de renglón o se corta con puntos suspensivos. La página nunca se desliza de costado; el deslizamiento horizontal ocurre dentro de la tabla o del renglón.
- **Lo que se mueve solo** espera a estar en pantalla y quieto, se pausa al tocarlo y respeta "reducir movimiento".
- **Acciones alineadas**: en una lista de filas, el mismo botón queda en la misma columna.
- **Una sola vez cada cosa**: sin enlaces, títulos ni filas repetidos en la misma pantalla.
- **El dato antes que la configuración**: el gráfico o la tabla se ve sin deslizar; los controles van en botones o plegados; las explicaciones largas, plegadas o detrás de un ícono de información.
- **Lo que se ve se puede compartir**, en la forma en que se ve (gráfico, tabla, velas).
- **Palabras del público**: nombres de `web/lib/nombres.ts`; sin siglas ni jerga a secas. En las imágenes compartibles, palabras neutras (nunca "bueno", "malo", "mejor", "peor") y sin veredicto (D-012).
- **Verde = mejor, rojo = peor**, siempre con signo o texto; nunca solo color.
- Sin `<select>` nativo: `Selector`, `Seg`, `Desplegable` y `Modal` de `web/components/ui.tsx`.
- Las clases CSS nuevas no repiten nombres existentes (buscar antes con grep: `.marca` ya es el logo).
- Después de una tanda: barrido por código de todas las rutas a 360 px y 1280 px (desborde horizontal, pantalla de error, errores de consola) y de cada ventana abierta.
