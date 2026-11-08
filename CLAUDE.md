# Primero los Datos

Página de datos económicos de Argentina (precios, salarios, dólar, actividad, pobreza, fiscal, externo) con fuentes oficiales.
Hoy: pipeline Python que baja series y las escribe como JSON; sitio Next.js (export estático) en `web/`. Próximo: sitio público con usuarios, comentarios y votos (ver docs/ROADMAP.md).

Todo en español: código, comentarios, nombres de variables, commits y textos de la UI. Números en formato es-AR.

# Comandos
- Bajar todo y armar la página: `python pipeline/obtener_datos.py` (tarda, usa red)
- Regenerar solo los JSON de la web (sin red, desde `datos/cache/compilado.json`): `python pipeline/obtener_datos.py --solo-json`
- Sitio: `cd web && npm ci && npm run build` (genera `web/out/`); `npm run tipos` para `tsc --noEmit`
- Python 3.14 + pandas. No hay tests todavía; la verificación es que el comando de arriba termine sin error y la página abra bien.

# Estructura que no se deduce sola
- `web/public/datos/` es GENERADO por el pipeline (no versionado): nunca editarlo. `datos/cache/compilado.json` también es generado (respaldo para `--solo-json`): no leerlo entero.
- El frontend vive en `web/`: cálculos en `web/lib/` (una sola fuente de verdad), una sección por ruta en `web/components/secciones/`, estado de filtros en la URL (`web/lib/url.ts`).
- `datos/cache/` es el respaldo de cada fuente: si una API falla se usa la última copia. Se versiona en git, no borrar.
- El formato de cada serie (`id, n, cat, tipo, u, dir...`) está documentado al principio de `pipeline/catalogo.py`.

# Cómo trabajamos
- Features nuevas: primero spec en `docs/specs/<nombre>.md` (skill `/spec`), después implementar en sesión limpia.
- Al terminar de implementar una spec, sin esperar a que el usuario lo pida:
  1. Correr la verificación de la sección "Cómo se verifica" que se pueda hacer localmente.
  2. Correr el agente `revisor` contra la spec, corregir lo que marque y volver a correrlo hasta que no queden problemas.
  3. Recién ahí ofrecer el commit y el push, con un resumen de lo que dijo el revisor.
  4. Si la spec incluye un workflow de GitHub Actions: después del push, dispararlo con `gh workflow run`, seguirlo con `gh run watch` y reportar si terminó en verde (y el link del sitio si publica). Si falla, mostrar el error y proponer el arreglo.
- Decisiones de arquitectura: registrarlas en `docs/DECISIONES.md`.
- Ideas sueltas del usuario: `docs/IDEAS.md`. No implementarlas sin que se pida.
- Detalle de modelos/agentes/flujo: `docs/COMO-TRABAJAMOS.md` (para el usuario; no hace falta leerlo en cada tarea).

# Compact instructions
Al compactar, conservar: archivos tocados, comandos de verificación y su resultado, decisiones tomadas y pendientes.
