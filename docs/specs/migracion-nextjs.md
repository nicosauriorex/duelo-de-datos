# Migración del frontend a Next.js + uPlot (fase 2)

Estado: spec lista para implementar. Sale de D-001 (stack) y D-002 (nombre), y de las respuestas de la entrevista del 2026-11-08.

## Objetivo

Reemplazar la página única generada (`src/` → `DueloDeDatos.html`, ~1,2 MB con todos los datos adentro) por un proyecto Next.js en TypeScript con una ruta por sección, gráficos con uPlot y datos en JSON por categoría. La migración es **a paridad**: el sitio nuevo hace lo mismo que el actual, y de paso se arregla el filtro de período de Histórico que flota y se superpone. Sin backend, sin cuentas, sin cambios de contenido.

## Decisiones tomadas

1. **Despliegue**: export estático de Next.js (`output: "export"`), publicado en Cloudflare Pages con `wrangler` como hoy. OpenNext/Workers se agrega en la fase 4, cuando haga falta servidor. Se registra en `docs/DECISIONES.md` como D-003.
2. **Una sola spec**, migración completa; el sitio viejo sigue publicado hasta verificar paridad sección por sección y recién ahí se corta.
3. **TypeScript**.
4. **Una ruta por sección**: `/historico` (home, `/` redirige), `/presidentes`, `/mandato`, `/curiosidades`, `/elecciones`, `/fuentes`. Los filtros viven en la URL (query string) para poder compartir.
5. **Estructura del repo**: `web/` (Next.js) al lado de `pipeline/`. El pipeline escribe los JSON en `web/public/datos/`. Al cortar se borran `src/`, `DueloDeDatos.html` y `datos/datos.js`.
6. **Datos**: un JSON por categoría + un índice liviano.
7. **Filtro de período**: se rediseña al migrar (ver requisito 9).

## Qué ve y hace el usuario

Igual que hoy: entra a la página, ve las pestañas (ahora son links a rutas), arma gráficos en Histórico eligiendo variables, medida ("en términos de"), modo y período; compara presidentes en tablas, mira meses de mandato, curiosidades, elecciones y fuentes. Las diferencias visibles son solo: URL propia por sección con los filtros dentro, gráficos uPlot (hover, zoom por arrastre) y el filtro de período que ya no tapa contenido.

## Requisitos

1. **Pipeline**: `pipeline/obtener_datos.py` escribe en `web/public/datos/`: `catalogo.json` (por serie: `id, n, cat, tipo, u, dir, fuente, desc, agg, flujo` y el archivo donde está; más `fechas`), y un `<categoria>.json` por cada `cat[0]` con los arrays de valores (`i0`, `v`, y `min`/`max` si hay). Las series transversales que usan los cálculos de todas las secciones (IPC, dólares, población, PIB anual, etc.; las que hoy toman `POB`, `PIB_AN` y los deflactores) van en un `base.json` que se carga siempre. El formato documentado en `pipeline/catalogo.py` se actualiza.
2. **Compatibilidad hacia atrás durante la migración**: mientras el sitio viejo siga vivo, `--solo-pagina` y `datos/datos.js` siguen funcionando. El flag nuevo para generar solo los JSON sin red es `--solo-json` (usa `datos/cache/`).
3. **Proyecto `web/`**: Next.js (App Router) + TypeScript + uPlot; `npm run build` produce `web/out/` sin errores ni warnings de tipos.
4. **Cálculos portados** de `src/app.js` a módulos tipados en `web/lib/` sin cambiar su resultado: `transformar`/`variacion`/`calc` (medidas, deflactores, por habitante, % del PIB, modos, escala), `agrupar` y estadísticas de Histórico, estadísticas de mandato, desempeño/ranking de presidentes, correlaciones de elecciones (`pearson`). Una sola fuente de verdad: no duplicar lógica entre secciones.
5. **Formato es-AR** en todos los números y fechas (mismos `Intl.NumberFormat` y `fmtMes` que hoy).
6. **Histórico**: selector de variables (árbol + búsqueda con sinónimos), hasta las mismas combinaciones de ejes/bandas/escala log que hoy, tiles de resumen, leyenda, tooltip con valores, tabla de datos desplegable y los bloques fijos (Dólares, soja Chicago vs. Rosario, ratios, etc.). Los gráficos usan uPlot; cualquier cosa que uPlot no resuelva sola (bandas, referencias de presidentes) se dibuja con hooks de uPlot sobre su canvas.
7. **Resto de secciones** con las mismas tablas, selectores y textos: Por presidente (bases T-1/T/T+n, columnas, ranking A y B), Meses de mandato, Curiosidades (incluye sparklines), Elecciones (correlaciones y dispersión), Fuentes.
8. **Carga de datos**: cada ruta baja `catalogo.json` + `base.json` + solo los `<categoria>.json` que necesita (en Histórico, los de las variables elegidas; en Presidentes/Curiosidades/Elecciones, los de sus indicadores). Mientras carga se ve un estado de carga, y si falla una descarga se ve un mensaje y el resto sigue andando.
9. **Filtro de período (arreglo del bug)**: pasa a un panel que se abre debajo de la barra y empuja el contenido (no flota encima), se cierra con Escape o clic afuera, y en celular ocupa el ancho completo. Mantiene desde/hasta, atajos y meses del año.
10. **Estado en la URL**: variables, medidas, modo, período, base de presidentes y presidentes elegidos se reflejan en el query string y se restauran al abrir el link. Un parámetro inválido se ignora y cae al valor por defecto, sin error.
11. **Accesibilidad y responsive** al menos al nivel actual: funciona de 360 px de ancho, tema claro/oscuro si hoy lo tiene, navegación con teclado en tabs y popovers.
12. **Metadatos**: `<title>` y descripción por ruta con el nombre "Duelo de Datos"; favicon.
13. **Action**: `.github/workflows/actualizar.yml` pasa a instalar Node, correr el pipeline, `npm ci && npm run build` en `web/` y publicar `web/out/`. Hasta el corte, se publica **preview** (rama o proyecto de preview de Cloudflare) y el sitio principal sigue siendo el viejo; al cortar se invierte. La parte de Python y del caché no cambia.
14. **Corte**: solo cuando se cumpla "Cómo se verifica". En ese paso se borran `src/`, la generación de `DueloDeDatos.html`, `compilar_pagina()` y `datos/datos.js`, y se actualizan `CLAUDE.md` (comandos y estructura), `README.md`, `.claude/settings.json`, la skill `nueva-serie` y `.gitignore`.

## Datos

Sin tablas nuevas. Cambia solo el formato de salida del pipeline (requisito 1). `datos/cache/` no se toca.

## Casos borde

- Serie con `i0` > 0 o con huecos (`null`): se grafican como hoy (corte de línea), no se interpolan.
- Variable elegida cuyo JSON de categoría falla o no existe: se muestra el error en esa variable, no se rompe el gráfico entero.
- Link con ids de series que ya no existen en el catálogo: se descartan en silencio.
- Rango de período vacío o `desde > hasta`: se corrige al rango válido más cercano.
- Series diarias (dólar) con `min`/`max` mensual: mismo manejo de bandas que hoy.
- Pestaña abierta justo cuando el pipeline publicó datos nuevos: los JSON se piden con un parámetro de versión (hash o fecha de `catalogo.json`) para no mezclar cachés viejos y nuevos.
- Sin JavaScript: se muestra un aviso (no hace falta prerenderizar los gráficos en esta fase).

## Fuera de alcance

- Cuentas, votos, comentarios, botón Compartir, página por indicador, imágenes de vista previa (fases 3 a 6).
- Cambios de contenido, series nuevas o cálculos nuevos (el ranking en salarios es la fase 3).
- OpenNext, Workers, Supabase.
- Prerenderizado de gráficos / SEO de datos.
- Dominio propio.

## Cómo se verifica

Sin tests automáticos hoy, así que la paridad se comprueba así:

1. `python pipeline/obtener_datos.py --solo-json` termina sin error y `web/public/datos/` tiene `catalogo.json`, `base.json` y un JSON por categoría; la cantidad de series del catálogo coincide con `datos/datos.js` (se cuenta con un script, sin leerlo entero).
2. Script de comparación numérica (en `pipeline/` o `web/scripts/`, descartable): para una lista de expresiones representativas (cada medida y modo, por habitante, % del PIB, real/USD, mensual vs. promedio de 12 meses), el resultado de los módulos TS coincide con el de `src/app.js` dentro de 1e-9. Se corre con Node.
3. `cd web && npm run build` sin errores; `npx tsc --noEmit` limpio.
4. Servir `web/out/` y recorrer cada ruta en el navegador (pane del navegador de Claude), con captura lado a lado contra el sitio viejo: tablas con las mismas cifras, mismos gráficos en las combinaciones de Histórico más usadas, sin errores en la consola.
5. Filtro de período: abrirlo en Histórico en escritorio y a 375 px y comprobar que no tapa gráficos ni tablas, que cierra con Escape y que cambia el gráfico.
6. Link con estado: copiar la URL de un Histórico configurado, abrirla en pestaña nueva y ver el mismo gráfico; probar un parámetro inválido.
7. Revisor contra esta spec; después commit y push a una rama, y el workflow publica el preview. Confirmar con `gh run watch` que termina en verde y que el preview muestra las rutas.
8. Corte (aprobación del usuario tras revisar el preview): invertir la publicación, borrar lo viejo (requisito 14) y confirmar que https://duelo-de-datos.pages.dev muestra el sitio nuevo.
