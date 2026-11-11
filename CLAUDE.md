# Primero los Datos

Página de datos económicos de Argentina (precios, salarios, dólar, actividad, pobreza, fiscal, externo) con fuentes oficiales.
Hoy: pipeline Python que baja series y las escribe como JSON; sitio Next.js (export estático) en `web/`. Próximo: sitio público con usuarios, comentarios y votos (ver docs/ROADMAP.md).

Todo en español: código, comentarios, nombres de variables, commits y textos de la UI. Números en formato es-AR.

# Comandos
- Bajar todo y armar la página: `python pipeline/obtener_datos.py` (tarda, usa red)
- Regenerar solo los JSON de la web (sin red, desde `datos/cache/compilado.json`): `python pipeline/obtener_datos.py --solo-json`
- Sitio: `cd web && npm ci && npm run build` (genera `web/out/`); `npm run tipos` para `tsc --noEmit`
- Python 3.14 + pandas. No hay tests todavía; la verificación es que el comando de arriba termine sin error y la página abra bien.
- Ver el sitio en local: configuración `web-out` de `.claude/launch.json` (sirve `web/out` en el puerto 3100). Después de cada `npm run build` alcanza con recargar.
- Publicar: `git push` a `main` dispara `.github/workflows/actualizar.yml`. Si el push solo toca `web/` o `docs/`, va en modo rápido (1 minuto, sin bajar datos); si toca `pipeline/`, `datos/`, `requirements.txt` o el workflow, corre completo (10 minutos). Si el push es rechazado, es por el commit diario de datos: `git pull --rebase` y volver a subir.

# Estructura que no se deduce sola
- `web/public/datos/` es GENERADO por el pipeline (no versionado): nunca editarlo. `datos/cache/compilado.json` también es generado (respaldo para `--solo-json`): no leerlo entero.
- El frontend vive en `web/`: cálculos en `web/lib/` (una sola fuente de verdad), una sección por ruta en `web/components/secciones/`, estado de filtros en la URL (`web/lib/url.ts`).
- `datos/cache/` es el respaldo de cada fuente: si una API falla se usa la última copia. Se versiona en git, no borrar.
- Para mirar un archivo de `datos/cache/` usar solo `python pipeline/ver_cache.py <nombre>` (columnas, tamaño y pocas filas; sin argumentos lista los archivos). Leerlos de otra forma está bloqueado a propósito: son enormes.
- `--solo-json` reutiliza valores y textos ya calculados (`compilado.json`): un cambio en cálculos o en `fuente`/`desc` del pipeline se ve recién con la corrida completa.
- Nombres que ve el público: `web/lib/nombres.ts` (series, categorías, sinónimos y alias de ids viejos). Regiones del IPC y qué series se listan: `web/lib/regiones.ts`. Imagen compartible: `web/lib/imagen*.ts` y `web/components/PanelCompartir.tsx`. Ningún id de serie ni parámetro de URL cambia de significado: los links compartidos tienen que seguir mostrando lo mismo.
- Diseño: plugin Impeccable (`impeccable@impeccable`), instalado en este proyecto solo para el usuario (D-010). Si falta, se instala desde una terminal con `claude`: `/plugin marketplace add pbakaus/impeccable` y después `/plugin`. Las críticas de Impeccable (`critique`) pueden usar sus dos subagentes: autorizado por el usuario.
- El formato de cada serie (`id, n, cat, tipo, u, dir...`) está documentado al principio de `pipeline/catalogo.py`.

# Al empezar una sesión
Leer `docs/ESTADO.md`: qué está hecho, qué sigue y qué quedó sin verificar. Actualizarlo al cerrar cada tanda de trabajo.

# Cómo trabajamos
- Features nuevas: primero spec en `docs/specs/<nombre>.md` (skill `/spec`), después implementar **en la misma sesión, orquestando subagentes** (cada subagente arranca limpio, solo con la spec y sus archivos). Sesión nueva solo si cambia el tema o la conversación ya es muy larga; antes de cerrarla, actualizar `docs/ESTADO.md`.
- Al terminar de implementar una spec, sin esperar a que el usuario lo pida:
  1. Correr la verificación de la sección "Cómo se verifica" que se pueda hacer localmente.
  2. Correr el agente `revisor` contra la spec, corregir lo que marque y volver a correrlo hasta que no queden problemas.
  3. Recién ahí ofrecer el commit y el push, con un resumen de lo que dijo el revisor.
  4. Si la spec incluye un workflow de GitHub Actions: después del push, dispararlo con `gh workflow run`, seguirlo con `gh run watch` y reportar si terminó en verde (y el link del sitio si publica). Si falla, mostrar el error y proponer el arreglo.
- Pedidos del usuario al recorrer la página ("tandas de ajustes"): anotarlos en `docs/IDEAS.md`, bajarlos a una spec `docs/specs/ajustes-tanda-N.md` y, salvo que pida no implementar, implementarlos. Cada pedido es un caso de una regla más general: buscar y corregir los errores del mismo tipo en todo el sitio, no solo el caso que señaló (reglas en `.claude/rules/frontend.md`).
- Cómo orquestar: subagentes con un modelo más económico, en paralelo. Repartir por archivos sin superposición, prohibirles `npm run build`, commits y servidores, y pedirles un informe por requisito. Después, en la sesión principal: compilar, verificar en el navegador, pasar el `revisor` y corregir. Los informes de los subagentes no son prueba: revisar su resultado antes de darlo por bueno.
- Al reportar, separar siempre lo verificado de lo no verificado (y decir cómo se verificó). Si las capturas del navegador fallan, verificar leyendo el contenido y midiendo, y decir que el aspecto no se vio.
- Decisiones de arquitectura: registrarlas en `docs/DECISIONES.md`.
- Ideas sueltas del usuario: `docs/IDEAS.md`. No implementarlas sin que se pida.
  - Al bajar una idea a spec: marcarla con `→ spec: docs/specs/<nombre>.md`.
  - Al terminar de implementar y verificar: tachar la idea con la fecha (`~~idea~~ ✅ AAAA-MM-DD`), pasarla a la sección "Hecho" al final y poner `Estado: implementada (fecha)` en la spec. No borrar.
  - Llevar el estado de cada bloque en la tabla "Próximos bloques" de `docs/ROADMAP.md` (spec lista / hecho). "¿Qué sigue?" = el primer bloque no hecho de esa tabla.
- Detalle de modelos/agentes/flujo: `docs/COMO-TRABAJAMOS.md` (para el usuario; no hace falta leerlo en cada tarea).

# Compact instructions
Al compactar, conservar: archivos tocados, comandos de verificación y su resultado, decisiones tomadas y pendientes.
