# Actualización diaria y publicación en Cloudflare

## Objetivo

Que la página se actualice y se publique sola en Cloudflare Pages (`duelo-de-datos.pages.dev`) todos los días, sin la PC del usuario. Si una fuente oficial se cae, se publica igual con la caché; si falta una serie entera, no se publica y llega un mail. Es el paso 5 de la fase 1 (ver `docs/ROADMAP.md` y D-001).

## Qué ve y hace el usuario

1. Todos los días a las 21:00 (hora argentina) GitHub corre la tarea sola. No hay que hacer nada.
2. Si todo sale bien: la página nueva está en `https://duelo-de-datos.pages.dev` y, si algún dato cambió, aparece en el repo un commit "Actualizar datos AAAA-MM-DD" del bot de GitHub.
3. Cuando el usuario sube cambios a `main` que tocan `src/`, `pipeline/` o `requirements.txt`, la tarea corre igual y publica en unos minutos.
4. En GitHub → *Actions* → la tarea → *Run workflow* se puede correr a mano, con una casilla **"Aceptar menos series"** (desmarcada por defecto).
5. En cada corrida, el resumen (*Summary*) muestra: cantidad de series, fuentes que usaron caché, fuente de precios e IPC, tamaño de la página y link al sitio.
6. Si la tarea falla, GitHub le manda un mail al usuario (comportamiento por defecto de GitHub, sin configurar nada).

## Requisitos

1. Existe `.github/workflows/actualizar.yml`, con nombre visible "Actualizar datos y publicar".
2. Se dispara con:
   - `schedule`: `0 0 * * *` (00:00 UTC = 21:00 en Argentina, que no tiene horario de verano).
   - `push` a `main` solo si cambian `src/**`, `pipeline/**`, `requirements.txt` o el propio workflow.
   - `workflow_dispatch`, con un input booleano `aceptar_menos_series` (por defecto `false`).
3. Nunca corren dos a la vez: `concurrency` con un grupo fijo y `cancel-in-progress: false` (la segunda espera).
4. Corre en `ubuntu-latest`, con Python 3.14 (`actions/setup-python`) y `pip install -r requirements.txt`, usando la caché de pip de la acción.
5. Corre `python pipeline/obtener_datos.py` con `INDEC_TOKEN` tomado de `secrets.INDEC_TOKEN`. Tiempo máximo del job: 30 minutos.
6. **Fuentes caídas**: si una fuente falla y el pipeline usa la caché, la corrida sigue y publica. Las líneas del log que contienen `uso cache` o `error` (los `print` de `salarios.py` y `catalogo.py`) se copian al resumen de la corrida en una sección "Fuentes con problemas". Si no hay ninguna, dice "Todas las fuentes respondieron".
7. **Control de series**:
   - Existe `datos/series_esperadas.txt`, versionado, con un id de serie por línea, ordenado.
   - Después de correr el pipeline, un script (`pipeline/verificar_series.py`) lee los ids de `datos/datos.js` y los compara con ese archivo.
   - Si **falta** algún id y `aceptar_menos_series` no está marcado: el job falla **antes de publicar y antes de commitear**, y el log y el resumen listan los ids que faltan.
   - Si hay ids **nuevos**, o faltan pero se marcó `aceptar_menos_series`: se reescribe el archivo con los ids actuales y entra en el commit.
   - Si el archivo no existe (primera corrida), se crea con los ids actuales y no falla.
8. **Commit de datos**: si después de correr cambió algo en `datos/cache/` o `datos/series_esperadas.txt`, se commitea a `main` con el usuario `github-actions[bot]` y el mensaje `Actualizar datos AAAA-MM-DD` (fecha argentina). Si no cambió nada, no hay commit. Antes del push se hace `git pull --rebase` por si entró otro commit mientras corría.
9. El commit del bot no vuelve a disparar la tarea (usa el `GITHUB_TOKEN` por defecto, que no dispara workflows, y además no toca rutas del filtro de `push`).
10. **Publicación**:
    - Se arma una carpeta `publicar/` con `DatosArgentina.html` copiado como `index.html`.
    - Se despliega con `cloudflare/wrangler-action` usando `secrets.CLOUDFLARE_API_TOKEN` y `secrets.CLOUDFLARE_ACCOUNT_ID`.
    - Comando: `pages deploy publicar --project-name=duelo-de-datos --branch=main`.
    - Si el proyecto `duelo-de-datos` no existe, se crea antes con `pages project create duelo-de-datos --production-branch=main`. Este paso no falla si el proyecto ya existe.
11. El resumen de la corrida incluye: cantidad de series (actuales y esperadas), la línea "Fuente de precios e IPC: …" del log, el tamaño de la página y el link `https://duelo-de-datos.pages.dev`.
12. El orden de los pasos es: correr el pipeline → verificar series → commitear datos → publicar. Si falla cualquier paso anterior a publicar, no se publica y el sitio queda como estaba.
13. Los permisos del workflow son los mínimos: `contents: write` y nada más.
14. Ningún secreto aparece en el log ni en el resumen.
15. `docs/ROADMAP.md`: tachar los pasos 4 a 7 de la fase 1 cuando la primera corrida publique bien.

## Datos

- Nuevo archivo versionado `datos/series_esperadas.txt`: un id de serie por línea, ordenado alfabéticamente, sin otra cosa.
- Nuevo script `pipeline/verificar_series.py`. No baja nada de internet: solo lee `datos/datos.js` y el archivo de arriba. Admite `--aceptar-menos`. Termina con código ≠ 0 si faltan series y no se pasó esa opción.
- Sin cambios en tablas ni en Supabase.

## Casos borde

- **Archivos de caché que cambian sin que cambien los datos.** Por ejemplo `datos/cache/ipc_indec_completo.pkl`: un pickle puede quedar distinto byte a byte con el mismo contenido. Eso generaría un commit por día sin cambios reales. Verificarlo en la primera implementación corriendo el pipeline dos veces seguidas. Si pasa, no commitear un archivo cuando su contenido, leído con pandas, es igual al anterior (o guardarlo en un formato estable).
- **API de INDEC caída o token vencido**: el pipeline ya cae al Excel de INDEC y lo imprime. Debe verse en el resumen, no hacer fallar la tarea.
- **Fuente caída sin caché previa**: hoy algunos casos hacen fallar `main()` (`_cacheado` relanza la excepción) y otros saltean la serie. El primero hace fallar el job antes de publicar. El segundo lo frena el control de series.
- **Sacar una serie a propósito**: el push con ese cambio va a fallar en el control de series. El usuario corre la tarea a mano con "Aceptar menos series" y se actualiza la lista.
- **Token de Cloudflare inválido o vencido**: el paso de publicar falla y llega el mail. Los datos ya quedaron commiteados, así que la próxima corrida con el token arreglado publica todo.
- **Dos corridas superpuestas** (push mientras corre la diaria): la segunda espera (requisito 3), y el `pull --rebase` evita el push rechazado.
- **Repo sin actividad 60 días**: GitHub desactiva los `schedule` en repos públicos sin actividad. Los commits diarios del bot cuentan como actividad. Si los datos no cambian en 60 días, GitHub avisa por mail y se reactiva con un clic.
- **Atrasos de GitHub**: el `schedule` puede salir 10–30 minutos tarde, o saltearse en horas pico. Se acepta.
- **Página de más de 25 MB** (límite por archivo de Cloudflare Pages): hoy pesa ~1,2 MB, así que no aplica. Si crece mucho, se resuelve en la fase 2 con JSON por categoría.

## Fuera de alcance

- Renombrar `DatosArgentina.html` y el resto del proyecto a "Duelo de Datos" (pendiente de D-002, tarea aparte). Acá solo se usa el nombre `duelo-de-datos` para el proyecto de Cloudflare.
- Dominio propio (`duelodedatos.com.ar`).
- Partir los datos en JSON por categoría, Next.js, uPlot (fase 2).
- Mostrar en la página qué fuentes están desactualizadas o la fecha de última actualización.
- Avisos por Telegram, issues automáticos o cualquier aviso además del mail de GitHub.
- Previews por rama o por pull request.
- Tests automáticos del pipeline.

## Cómo se verifica

1. Local, sin red: `python pipeline/obtener_datos.py --solo-pagina` sigue andando, y `python pipeline/verificar_series.py` termina con código 0 contra el archivo recién generado.
2. Local: borrar a mano un id de `datos/series_esperadas.txt` → el script pasa (hay una serie "nueva"). Agregar un id inventado → falla y lo lista. Con `--aceptar-menos` pasa y reescribe el archivo.
3. En GitHub: correr la tarea a mano (*Run workflow*). Tiene que terminar en verde y su resumen tiene que mostrar la cantidad de series, las fuentes con problemas y el link.
4. Abrir `https://duelo-de-datos.pages.dev`: carga la página y los datos coinciden con los del último commit.
5. Correrla a mano una segunda vez enseguida: no tiene que generar un commit nuevo (si lo genera, revisar el caso borde de los pickles).
6. Al día siguiente: hay una corrida programada cerca de las 21:00 hora argentina.
7. `git log` muestra los commits del bot solo en días con cambios, y ningún archivo fuera de `datos/` modificado por el bot.
