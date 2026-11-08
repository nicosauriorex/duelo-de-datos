# Hoja de ruta

Orden propuesto. Cada fase se divide en specs chicas (`docs/specs/`), y cada spec se implementa en su propia sesión.

| Fase | Qué | Necesita backend | Estado |
|---|---|---|---|
| 0 | Ordenar proyecto, git, config de Claude | No | Hecho (2026-11-07) |
| 1 | Stack decidido (D-001); subir a GitHub, publicar la página actual en Cloudflare, pipeline automático diario (ver detalle abajo) | No | En curso |
| 2 | Migrar el frontend al stack elegido sin perder funciones; arreglar el filtro de fecha de Histórico | No | Pendiente |
| 3 | Precios medidos en salarios; ranking de presidentes (son solo cálculos sobre datos que ya hay) | No | Pendiente |
| 4 | Cuentas (anónimas) + botón Compartir (imagen descargable + texto) | Sí | Pendiente |
| 5 | Comunidad: posts, votos, comentarios, respuestas con dato, moderación, rankings | Sí | Pendiente |
| 6 | Novedades + calendario de publicaciones + predicciones | Sí | Pendiente |

La fase 3 no depende de la 4 y puede ir antes o en paralelo: suma contenido sin sumar complejidad.

## Fase 1 en detalle

Sale de D-001 (Next.js + Cloudflare + Supabase, JSON estáticos, Actions diario, repo público, USD 0). En esta fase todavía no hay Next.js: se publica la página actual tal cual.

1. ~~Decidir stack (D-001)~~ — hecho 2026-11-07.
2. ~~**Subir a GitHub**~~ — hecho 2026-11-07: https://github.com/nicosauriorex/datos-argentina (público), con README y `requirements.txt`. Historial revisado, sin secretos.
3. ~~**Secret `INDEC_TOKEN`**~~ — hecho 2026-11-08. El pipeline ya lo lee de esa variable de entorno; sin token igual funciona con los Excel de INDEC.
4. **Proyecto en Cloudflare Pages**, en plan gratis, con subdominio `duelo-de-datos.pages.dev`. Secrets `CLOUDFLARE_API_TOKEN` (permiso Cloudflare Pages: Edit) y `CLOUDFLARE_ACCOUNT_ID` cargados el 2026-11-08. Sin integración con Git: el proyecto lo crea y lo publica la Action del paso 5, con `DatosArgentina.html` como `index.html`.
5. **Workflow de GitHub Actions diario** (spec: [`docs/specs/actualizacion-diaria.md`](specs/actualizacion-diaria.md)): instala Python 3.14 + dependencias, corre `python pipeline/obtener_datos.py`, commitea `datos/cache/` solo si cambió, y despliega la página a Cloudflare con `wrangler` (token de Cloudflare como secret). También se puede disparar a mano.
6. **Aviso si falla**: si una fuente se cae se usa la caché (ya funciona así), pero la Action tiene que dejar registro de qué fuente falló, y avisar por mail si falla el workflow entero.
7. **Verificación**: el sitio abre en el subdominio, los datos de la última corrida aparecen, y una segunda corrida sin cambios no genera commit.

Queda para la fase 2: partir los datos en un JSON por categoría, el proyecto Next.js y uPlot.
