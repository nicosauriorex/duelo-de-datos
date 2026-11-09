# Hoja de ruta

Cómo se trabaja: idea en `docs/IDEAS.md` → spec en `docs/specs/` (sesión de specs) → implementación en una sesión nueva → se tacha la idea. Cuando alguien pregunta "¿qué sigue?", se toma el primer bloque de la tabla de abajo que no esté hecho.

## Hecho

| Fase | Qué | Estado |
|---|---|---|
| 0 | Ordenar proyecto, git, config de Claude | Hecho (2026-11-07) |
| 1 | Stack decidido (D-001); subir a GitHub, publicar en Cloudflare, pipeline automático diario (ver detalle abajo) | Hecho (2026-11-08) |
| 2 | Migrar el frontend a Next.js sin perder funciones | Hecho (2026-11-08), con dominio propio https://primerolosdatos.com.ar |

## Próximos bloques, en orden (2026-11-08)

Del 1 al 5 no necesitan backend ni datos nuevos: se pueden ir publicando de a uno. El cambio de diseño visual va después del 5, cuando ya esté clara la estructura de la página.

| # | Bloque | Ideas (secciones de IDEAS.md) | Backend | Estado |
|---|---|---|---|---|
| 1 | Histórico en el celular | Histórico: celular y gráficos | No | Hecho (2026-11-08) — [spec](specs/historico-celular.md) |
| 2 | Medidas y opciones más simples | Histórico: medidas y opciones (las primeras seis) | No | Hecho (2026-11-08) — [spec](specs/medidas-y-opciones.md) |
| 3 | Configuración global | Presidentes y mandato: inicio de mandato por presidente (T±N), preferencias guardadas en el navegador, afecta a todas las secciones | No | Hecho (2026-11-08) — [spec](specs/configuracion-global.md) |
| 4 | Plantillas y vistas | Plantillas con buscador por palabra, hasta 4 gráficos por vista, "Otros gráficos interesantes", Curiosidades pasa a plantillas, precios medidos en salarios | No | Hecho (2026-11-08) — [spec](specs/plantillas-y-vistas.md) |
| 5 | Inicio y búsqueda guiada | Inicio y búsqueda guiada: página de inicio, elegir tema → principales → subgrupos, página por tema, oración guiada | Sí | Hecho (2026-11-08) — [spec](specs/inicio-y-temas.md) |
| 6a | Ranking, curiosidades y voto estimado | Ranking de presidentes y curiosidades; Elecciones (voto estimado); vista de un presidente con variables elegidas; animación del mandato (sin video) | No | Hecho (2026-11-08) — [spec](specs/presidentes-ranking-curiosidades.md) |
| 6b | Contexto internacional | Contexto para juzgar a un presidente (proyecciones del FMI, vecinos); consumo de carne | No (datos nuevos en el pipeline) | Sin spec |
| 7 | Compartir y responder en redes | Compartir gráficos; Responder y verificar afirmaciones (etapa 1: "mejor dato desde X" + imagen) | No para la etapa 1 | Sin spec |
| 8 | Cuentas y comunidad | Comunidad: posts, votos, comentarios, ratios, rankings, moderación | Sí | Sin spec |
| 9 | Novedades, calendario y predicciones | Novedades, calendario y predicciones | Sí | Sin spec |

El bloque 7 puede adelantarse si la prioridad pasa a ser que el sitio circule en redes.

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
