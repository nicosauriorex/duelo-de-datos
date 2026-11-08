# Hoja de ruta

Orden propuesto. Cada fase se divide en specs chicas (`docs/specs/`), y cada spec se implementa en su propia sesión.

| Fase | Qué | Necesita backend | Estado |
|---|---|---|---|
| 0 | Ordenar proyecto, git, config de Claude | No | Hecho (2026-11-07) |
| 1 | Stack decidido (D-001); subir a GitHub, publicar la página actual en Cloudflare, pipeline automático diario (ver detalle abajo) | No | Hecho (2026-11-08) |
| 2 | Migrar el frontend al stack elegido sin perder funciones; arreglar el filtro de fecha de Histórico | No | Hecho (2026-11-08), con dominio propio https://primerolosdatos.com.ar |
| 3 | Precios medidos en salarios; ranking de presidentes (son solo cálculos sobre datos que ya hay) | No | Pendiente |
| 4 | Cuentas (anónimas) + botón Compartir (imagen descargable + texto) | Sí | Pendiente |
| 5 | Comunidad: posts, votos, comentarios, respuestas con dato, moderación, rankings | Sí | Pendiente |
| 6 | Novedades + calendario de publicaciones + predicciones | Sí | Pendiente |

La fase 3 no depende de la 4 y puede ir antes o en paralelo: suma contenido sin sumar complejidad.

## Fase 1 en detalle

Sale de D-001 (Next.js + Cloudflare + Supabase, JSON estáticos, Actions diario, repo público, USD 0). En esta fase todavía no hay Next.js: se publica la página actual tal cual.

1. ~~Decidir stack (D-001)~~ — hecho 2026-11-07.
2. ~~**Subir a GitHub**~~ — hecho 2026-11-07: https://github.com/nicosauriorex/primerolosdatos (público), con README y `requirements.txt`. Historial revisado, sin secretos.
3. ~~**Secret `INDEC_TOKEN`**~~ — hecho 2026-11-08. El pipeline ya lo lee de esa variable de entorno; sin token igual funciona con los Excel de INDEC.
4. ~~**Proyecto en Cloudflare Pages**~~ — hecho 2026-11-08: https://duelo-de-datos.pages.dev, plan gratis. Secrets `CLOUDFLARE_API_TOKEN` (permiso Cloudflare Pages: Edit) y `CLOUDFLARE_ACCOUNT_ID`. Sin integración con Git: lo creó y lo publica la Action del paso 5.
5. ~~**Workflow de GitHub Actions diario**~~ — hecho 2026-11-08 (spec: [`docs/specs/actualizacion-diaria.md`](specs/actualizacion-diaria.md)): `.github/workflows/actualizar.yml`, a las 21:00 hora argentina, al subir cambios y a mano.
6. ~~**Aviso si falla**~~ — hecho 2026-11-08: el resumen de cada corrida lista las fuentes que usaron caché; si falla la corrida, GitHub manda mail (no probado con una falla real).
7. ~~**Verificación**~~ — hecho 2026-11-08: dos corridas en verde. La primera publicó y commiteó datos nuevos; la segunda no generó commit. Falta ver la primera corrida programada (21:00).

## Fase 2 en detalle

Hecho 2026-11-08 (spec: [`docs/specs/migracion-nextjs.md`](specs/migracion-nextjs.md), decisión D-003): `web/` con Next.js + TypeScript + uPlot en export estático, una ruta por sección, datos en JSON por categoría y filtros en la URL. El sitio nuevo ya es el que está publicado en https://primerolosdatos.com.ar (también responde `duelo-de-datos.pages.dev`); el nombre pasó a ser Primero los Datos (D-004).

Pendiente de la fase:
- ~~Conectar `primerolosdatos.com.ar`~~ — hecho 2026-11-08 (zona en Cloudflare, dominio personalizado del proyecto de Pages).
- Opcional: `www.primerolosdatos.com.ar` (CNAME + redirección) y correo con el dominio.
- Reservar `primerolosdatos` en X e Instagram.
- Ver la primera corrida programada (21:00) con el sitio nuevo.
