# Decisiones

Una entrada por decisión de arquitectura. Formato: contexto, decisión, por qué, estado.

## D-001 · Stack para el sitio público — DECIDIDO (2026-11-07)

**Contexto**: hoy es un HTML estático de 1,2 MB generado por Python. Para usuarios, votos y comentarios hace falta login, base de datos y páginas que se vean bien al compartirse en redes.

**Decisión**

| Tema | Elegido | Descartado |
|---|---|---|
| Web | **Next.js** (React) | Astro, seguir con vanilla JS |
| Hosting | **Cloudflare** (Pages/Workers), plan gratis | Vercel Hobby, Netlify |
| Usuarios y comunidad | **Supabase** (Postgres + login anónimo + RLS), plan Free | Firebase, decidir más adelante |
| Series de datos | **JSON estáticos** generados por `pipeline/`, uno por categoría | Series en Supabase, pipeline manual |
| Automatización | **GitHub Actions, diario** | Semanal, mensual |
| Gráficos | **uPlot** (librería liviana en canvas) | SVG propios, Recharts, ECharts/Plotly |
| Repo | **GitHub público** | Privado |
| Dominio | **Subdominio gratis de Cloudflare** (`*.pages.dev`) por ahora | Comprar `.com.ar` / `.com` ya |
| Presupuesto | **USD 0/mes** | Planes pagos de Cloudflare y Supabase |
| Ingresos | **Probablemente donaciones** (tipo Cafecito); sin publicidad por ahora | — |

**Por qué**
- **Next.js**: la comunidad (posts, votos, comentarios, respuestas con dato) es la parte más interactiva del roadmap y React la resuelve mejor. Además da una URL por indicador y genera las imágenes de vista previa para Twitter/X del lado del servidor.
- **Cloudflare en vez de Vercel**: el plan gratis de Vercel prohíbe el uso comercial, y pedir pagos a los visitantes (donaciones incluidas) cuenta como comercial. Cloudflare permite uso comercial gratis y no cobra el tráfico. Se pierde comodidad: Next.js corre con el adaptador OpenNext (`@opennextjs/cloudflare`) en vez de andar sin configurar, y alguna función nueva de Next.js puede tardar en estar soportada. Se elige ahora porque mudarse más adelante cuesta más que arrancar acá.
- **Supabase**: tiene login anónimo nativo (encaja con "registrarse de forma anónima"), permisos por fila para que cada uno edite solo lo suyo, y Postgres hace fáciles los conteos de votos y rankings. Ya está conectado a Claude.
- **JSON estáticos**: las series cambian como mucho una vez por día; no hace falta base de datos para servirlas. Un JSON por categoría evita bajar 1 MB de entrada.
- **Diario**: el dólar y el BCRA cambian a diario; INDEC es mensual pero no molesta. Con repo público los minutos de Actions son gratis.
- **uPlot**: ~50 KB, muy rápida con series largas (dólar diario desde los 2000) y, al dibujar en canvas, exportar la imagen para el botón Compartir es directo. Las medidas y deflactores de `src/app.js` se portan igual, como módulos propios.
- **Repo público**: Actions sin límite y transparencia sobre de dónde salen los datos.

**Consecuencias y límites a vigilar**
- El HTML generado no se versiona (`.gitignore`): la Action arma la página y la despliega a Cloudflare directo (`wrangler`); en git solo se commitea `datos/cache/` cuando cambia.
- El token de INDEC y el de Cloudflare van como *secrets* de GitHub, nunca en el repo.
- **Límites del plan gratis de Cloudflare Workers**: unas 100.000 visitas dinámicas por día, poco tiempo de CPU por visita y tope de tamaño del código. Las páginas estáticas no cuentan. Lo que más puede chocar es generar las imágenes de vista previa para redes: probarlo temprano en la fase 2 y, si no alcanza, generarlas en el pipeline o pasar a Workers Paid (USD 5/mes).
- **Supabase Free pausa el proyecto tras 7 días sin actividad** y tiene límites chicos de base. Importa recién desde la fase 4; si molesta, Supabase Pro (USD 25/mes).
- El dominio propio queda para más adelante (probablemente `.com.ar` en NIC Argentina); cambiarlo después no rompe nada si las URLs internas son relativas.

**Estado**: decidido. Se revisa si cambian ingresos, tráfico o presupuesto.

## D-002 · Nombre del sitio: Duelo de Datos — REEMPLAZADA por D-004 (2026-11-08)

**Contexto**: "DatosArgentina" describe de dónde salen los datos, pero no lo que hace distinto al sitio: la comunidad elige qué datos importan y otros les responden con otros datos, y gana el más votado.

**Decisión**: el sitio se llama **Duelo de Datos**. La bajada aclara el país, por ejemplo "Datos de Argentina, en debate". "Argentina" no va en el nombre: el contexto lo dan el dominio `.com.ar` y los títulos de cada página ("Salario real en Argentina"), que pesan más en Google que el nombre del sitio.

**Por qué**
- Dice lo que hace: un dato contra otro.
- Suena a debate y no a pelea, a diferencia de "Guerra de Datos", y encaja con un sitio con moderación.
- Al 2026-11-08 están libres `duelodedatos.com.ar`, `duelodedatos.ar` y `duelodedatos.com` (consulta RDAP a NIC Argentina y Verisign; confirmar al comprar).

**Descartados**
- **Dato Mata Relato**: `datomatarelato.com.ar` está registrado desde 2026-05 y redirige a **DatoPuro** (datopuro.com.ar), un sitio casi igual al nuestro (datos oficiales que se actualizan solos, comparados por presidente). También están ocupados `.com` y `.ar`. Además, la frase está asociada a un lado político.
- **Guerra de Datos**: demasiado agresivo.
- **Batalla de Datos**, **Contradato**: buenas opciones, con dominios libres; quedan como alternativas.

**Competencia a tener en cuenta**: DatoPuro cubre los mismos datos y el ranking por presidente, pero no tiene comunidad ni debate. La diferencia de Duelo de Datos está en la parte social.

**Pendiente**
- Comprar `duelodedatos.com.ar` (y, si se puede, `.ar` y `.com` para que nadie los use). Es un cambio respecto de D-001, que dejaba el dominio para más adelante; el costo es bajo.
- Reservar el usuario en X e Instagram (no verificado).
- ~~Renombrar en el código y en los docs~~ — hecho 2026-11-07 (`DueloDeDatos.html`, título y encabezado, README, CLAUDE.md, settings, skill). Queda a decisión del usuario renombrar el repo de GitHub (`datos-argentina` → `duelo-de-datos`) y la carpeta local.

## D-003 · Next.js como export estático en la fase 2 — DECIDIDO (2026-11-08)

**Contexto**: D-001 eligió Next.js sobre Cloudflare con OpenNext. En la fase 2 el sitio es solo lectura de JSON, sin servidor.

**Decisión**: en la fase 2 se usa `output: "export"` (HTML/JS estático) y se publica en Cloudflare Pages con `wrangler`, como hoy. El código vive en `web/`, junto a `pipeline/`. OpenNext/Workers se incorpora en la fase 4, cuando haya cuentas y comunidad.

**Por qué**: evita los límites de CPU del plan gratis y la complejidad del adaptador sin ganar nada visible; migrar de export estático a OpenNext después es un cambio de configuración, no de código de las páginas.

**Estado**: implementado y publicado (corte hecho 2026-11-08). Spec: `docs/specs/migracion-nextjs.md`.

## D-004 · Nombre del sitio: Primero los Datos — DECIDIDO (2026-11-08)

**Contexto**: D-002 había elegido "Duelo de Datos". El usuario prefirió "Primero los Datos" (`primerolosdatos`).

**Decisión**: el sitio se llama **Primero los Datos**; la bajada sigue siendo "Datos de Argentina, en debate". Dominio buscado: `primerolosdatos.com.ar`.

**Disponibilidad (consulta del 2026-11-08, sin confirmación en NIC Argentina)**: `primerolosdatos.com` está registrado y estacionado (`dns-parking.com`); `.com.ar`, `.ar`, `.org` y `.net` no tienen registros DNS; el usuario de GitHub `primerolosdatos` figura libre. X e Instagram no se pudieron verificar.

**Qué no cambia por ahora**: el proyecto de Cloudflare Pages (`duelo-de-datos`, por eso la URL actual es `duelo-de-datos.pages.dev`) hasta conectar el dominio propio (los proyectos de Pages no se pueden renombrar). El repo de GitHub se renombró a `primerolosdatos` (2026-11-08).

**Pendiente**
- ~~Registrar `primerolosdatos.com.ar` y conectarlo a Cloudflare Pages~~ — hecho 2026-11-08 (registrado en nic.ar, DNS en Cloudflare, dominio personalizado del proyecto `duelo-de-datos`). Las URLs del workflow y los docs ya apuntan a él.
- Reservar los usuarios en X e Instagram.

## D-005 · Preferencias en el navegador hasta que haya cuentas — DECIDIDO (2026-11-08)

**Contexto**: la configuración global (inicio de mandato por presidente, dólar y medida preferidos, período, tema) tiene que recordarse entre visitas, pero todavía no hay cuentas ni backend (bloque 8).

**Decisión**: se guarda en `localStorage` (`pld:config`, JSON versionado), leída y escrita desde un solo módulo (`web/lib/config.ts`). La URL siempre gana sobre lo guardado, así los links compartidos se ven igual para todos. Cuando haya cuentas, el mismo JSON se sincroniza con el usuario.

**Consecuencias**: no se comparte entre dispositivos; en navegación privada se pierde al cerrar. Spec: `docs/specs/configuracion-global.md`.

## D-006 · Plantillas como parámetros de Histórico
**Decisión**: una plantilla es un conjunto de parámetros de URL de Histórico (`vista`) más texto de búsqueda (`web/lib/plantillas.ts`). Las curadas salen de `web/lib/curiosidades.ts` (`defCurios`), de los indicadores y de una lista manual; las generadas, del catálogo. Las propias van en `localStorage["pld:plantillas"]` (`web/lib/misPlantillas.ts`). Cada gráfico extra de Histórico usa los mismos parámetros con el número al final (`v2`…`t4`).

**Consecuencias**: compartir es solo copiar la URL (`pl` o `pn` marcan la plantilla); las propias no viajan entre dispositivos. Las plantillas se definen con los metadatos del catálogo, sin cargar datos.


## D-007 · Temas definidos en un solo módulo y portada con datos bajo demanda
**Decisión**: los 9 temas (slug, categorías, principales, grupos de plantillas) viven en `web/lib/temas.ts`; las oraciones de "Preguntale a los datos" y sus links, en `web/lib/oraciones.ts`. La portada y las páginas de tema no bajan el catálogo completo: cada tarjeta pide solo el archivo de su indicador cuando entra en pantalla. "/" con parámetros de Histórico (links viejos) redirige a `/historico/` conservándolos; los de seguimiento (`utm_*`, `fbclid`, `gclid`) no.

**Consecuencias**: "productos que más subieron" (plantilla dinámica) no es un indicador principal de Precios porque no es una serie del catálogo. La tabla por presidente de cada tema usa `statsMandato` (igual que la sección Por presidente).

## D-008 · Datos anuales multipaís fuera del catálogo mensual — DECIDIDO (2026-11-08)
**Contexto**: el bloque 6b suma datos del FMI (crecimiento, inflación, desempleo y PIB por habitante de 13 países y 4 grupos, más las proyecciones de abril de cada año). Son anuales, de otros países y con varias ediciones, y no encajan en el catálogo, que es mensual y de series argentinas.

**Decisión**: van en un archivo aparte, `web/public/datos/contexto.json`, escrito por el pipeline con caché como el resto. Los cálculos (asignar años a presidentes, sorpresas, promedios, viento a favor o en contra) viven en `web/lib/contexto.ts`. Las series mensuales de contexto (commodities, términos de intercambio, tasa de la Fed) sí entran al catálogo, en la categoría `Contexto internacional`.

**Consecuencias**: los datos de otros países no aparecen en Histórico ni en el selector de variables. Spec: `docs/specs/contexto-internacional.md`.

**Actualización 2026-11-09 (implementación)**: el FMI no publica `NGDPRPPPPC`, así que el PIB por habitante real se arma como índice de PIB real encadenado dividido por la población (`LP`). La base "Historical WEO Forecasts" llega hasta abril de 2022 y trae solo crecimiento e inflación (sin desempleo ni América Latina): "lo esperado vs. lo que pasó" ofrece esos dos datos y las sorpresas existen hasta 2022. Los términos de intercambio pasaron a la categoría `Contexto internacional` (`ctx_terminos`). El FMI rechaza el User-Agent de un navegador: se usa el por defecto de urllib. La caché del contexto es `datos/cache/contexto.json` más un archivo por indicador (`ctx_imf_*.json`).

**Actualización 2026-11-09 (precios en el mundo, bloque 6c)**: `web/public/datos/precios_mundo.json` sigue el mismo criterio. Diferencias con la spec, por lo que se encontró al verificar las fuentes:
- **ICP**: la API v2 por indicador del Banco Mundial no devuelve los datos del ICP; se usa `api.worldbank.org/v2/sources/90/series/<código>/country/<países>/time/all`, clasificación `PX.WL` (mundo = 100). La fuente 90 (ICP 2021) trae también 2017 revisado; si aparece "ICP 2024" el pipeline la toma sola. En el ICP no existen electricidad-gas ni combustibles por separado, y frutas y verduras son dos códigos: los productos son carne, pan y cereales, leche-quesos-huevos, frutas y verduras (5, no 6 a 8). Para Argentina se usa el IPC de GBA (el nacional no tiene productos).
- **IPC y dólar**: OCDE (EE.UU., México, Colombia, Chile; las bases COICOP 1999 y 2018 se empalman en el último mes común; la 1999 llega hasta 2024-12 para EE.UU. y 2023-12 para Chile, así que ahí no hay estimado más acá), Eurostat (zona euro; llega hasta 2025-12), IBGE (Brasil, desde 2020). Tipos de cambio: OCDE `DF_FINMARK` (FRED no respondía de forma confiable). Uruguay, Paraguay, Bolivia, Perú, Ecuador y China tienen el nivel medido pero no estimado.
- **Mundo**: se mueve con el IPC del rubro de EE.UU. y, donde ese IPC se termina o no existe, sigue con el IPC general de EE.UU. El nivel de cada país se divide por ese movimiento, así "mundo = 100" queda fijo y los niveles son relativos a él (la fórmula de la spec, sin dividir por el mundo, mezclaba niveles medidos relativos con precios que se mueven en dólares corrientes).
- **Zona euro medida** = promedio simple de Alemania, Francia, Italia y España.

## D-009 · Datos cargados a mano en `datos/manual/` — DECIDIDO (2026-11-09)
**Contexto**: el bloque 6d (capacidad de gobierno) necesita la composición del Congreso por bloque, las leyes del Ejecutivo y los vetos desde 1989. Esos datos solo están en informes PDF de Diputados, del Senado y de la Biblioteca del Congreso, sin API ni archivo descargable. Además, decidir qué bloque es "aliado" es un criterio, no un dato.

**Decisión**: se cargan a mano en CSV versionados en `datos/manual/`, con la URL de la fuente en cada fila y una columna de notas. Las asignaciones de aliados se registran bloque por bloque (`congreso_bloques.csv`) para que se puedan revisar. El pipeline los valida (corta con error si algo es inconsistente), avisa en el resumen de la corrida cuando falta cargar un año y escribe `web/public/datos/capacidad.json`. Lo que sí se pueda bajar solo (los DNU desde Infoleg, si se confirma) se baja por la caché como el resto.

**Consecuencias**: hay que actualizar esos archivos a mano una vez por año (después del 1 de marzo y al cerrar el año). A diferencia de `datos/cache/`, `datos/manual/` es la fuente original: no se regenera. Spec: `docs/specs/capacidad-de-gobierno.md`.

**Actualización 2026-11-09 (implementación del bloque 6d)**: al confirmar las fuentes:
- **DNU automáticos**: base Infoleg completa (ZIP de datos.jus.gob.ar; la URL de datos.gob.ar de la spec daba 404), filtro `tipo_norma=Decreto` y `clase_norma=DNU`, por fecha de sanción. Control: Milei 2024 = 47; Macri 65 contra 78 de Chequeado (nota en `notas.csv`).
- **Leyes del Ejecutivo automáticas desde 2011-12-10**: los datos abiertos de proyectos de Diputados empiezan en marzo de 2008, así que CFK 1 y los anteriores quedan sin dato ("—") hasta cargarlos a mano en `leyes_ejecutivo.csv`. Un valor cargado a mano manda sobre el automático.
- **Caché**: `datos/cache/capacidad_auto.json` (por origen) respalda `--solo-json`.
- **Pendiente de carga manual** (PDF de Diputados: composición 1983-2023, revista 10/10 y leyes insistidas; Senado sin fuente descargable): `congreso_bancas.csv`, `congreso_bloques.csv`, `vetos.csv`. Los CSV están creados solo con encabezados; la sección muestra "—".
- El "bancas" del celular usa Diputados.
- **Vetos (2026-11-09)**: solo se cargaron los **insistidos** (43 leyes, del PDF de leyes insistidas de Diputados, por fecha del veto; incluye las insistidas parcialmente). `vetos.csv` admite `totales` y `parciales` vacíos (se guardan como null y la página muestra solo los insistidos). Nk, CFK 1, CFK 2, Macri y Alberto Fernández figuran con 0 porque ese listado es completo. Totales y parciales: la revista 10/10 cubre hasta 2002 y no se cargó.
- **Bancas**: el PDF `Comp_Dip_1983-2023.pdf` de Diputados devolvía 503 (2026-11-09); sigue sin cargarse.

## D-010 · Diseño con la skill Impeccable, instalada sin su programa — DECIDIDO (2026-11-09)
**Contexto**: para el bloque 5e (diseño visual) el usuario propuso usar [Impeccable](https://github.com/pbakaus/impeccable), una skill de diseño de código abierto (Apache 2.0). Además de texto, trae un lanzador que la primera vez baja y ejecuta un programa externo, y hooks que corren en cada edición.

**Decisión**: se copiaron al proyecto solo `SKILL.md` y `reference/` en `.claude/skills/impeccable/`, sin `scripts/`. La skill funciona en su modo "Launcher unavailable": lee `PRODUCT.md` y `DESIGN.md` directamente y sigue sus guías. No se baja ni se ejecuta su programa ni se activan sus hooks sin que el usuario lo pida. Detalle en `.claude/skills/impeccable/LEEME.md`.

**Consecuencias**: no hay detector automático ni comandos `live`/`generate`, y las críticas corren en "modo reducido". El contexto de diseño vive en `PRODUCT.md` y `DESIGN.md`, en la raíz, versionados. El tono elegido es "tecnológico moderno", con el tema oscuro por defecto. El menú pasa a 5 secciones (Presidentes agrupa seis subsecciones) sin cambiar las URLs. Spec: `docs/specs/diseno-visual.md`.

**Actualización 2026-11-09**: el usuario instaló el plugin completo desde la terminal (`/plugin marketplace add pbakaus/impeccable`, alcance "local": solo este proyecto y solo para él, en `.claude/settings.local.json`, sin versionar). Se borró la copia de texto de `.claude/skills/impeccable/`. Con el plugin hay detector automático, revisión después de cada edición, historial de críticas y los comandos `live` y `generate`. La crítica completa pide dos subagentes; corren solo si el usuario lo autoriza.

## D-011 · Sistema visual "La Transmisión" — DECIDIDO (2026-11-10)
**Contexto**: el bloque 5e pedía una identidad propia, de tono tecnológico moderno, siguiendo el flujo de Impeccable (sorteo de direcciones y elección del usuario).

**Decisión**: el usuario eligió "La Transmisión": gráfica de transmisión deportiva. Azul noche de fondo, placas celestes con un corte en diagonal, ámbar solo para la acción principal, verde y rojo solo para mejor y peor, y una sola familia tipográfica (Archivo, servida con `next/font`). No se sumó ninguna librería: el movimiento es CSS, `IntersectionObserver` y `requestAnimationFrame`. Los tokens están en `web/app/globals.css` y las reglas en `DESIGN.md`.

**Consecuencias y desvíos de la spec**:
- El tema se marca siempre con `data-theme` en `<html>` ("dark", "light" o "auto"); sin nada guardado queda "dark".
- Los títulos de tarjeta que no entran en un renglón se cortan con puntos suspensivos (el nombre completo va en `title`): las plantillas no tienen nombre corto.
- Las tarjetas de resumen de Histórico hacen un solo paseo de ida y vuelta al entrar en pantalla, no un bucle.
- El carrusel avanza cada 6 s (la spec decía ~5 s) y el indicio de bajar son las placas que asoman en la primera pantalla.
- La placa del salario se rotula "Salario mediano contra su récord" y la fuente de una placa solo se muestra si nombra un organismo.
- Crítica de Impeccable: 26/40 y después 29/40, sin P0 ni P1. No llegó al objetivo de 32/40. Los cinco P2 de la segunda pasada se corrigieron sin volver a puntuar. Queda pendiente mostrar la comparación entre presidentes en la portada, que pide un bloque nuevo. Historial en `.impeccable/critique/`.

## D-012 · La imagen compartible se arma en el navegador, sin veredicto — DECIDIDO (2026-11-10)
**Contexto**: la auditoría del 2026-11-10 mostró que el sitio no generaba ninguna imagen, que es lo que circula en redes. El sitio es estático (D-001), sin servidor.

**Decisión** (specs `responder-con-imagen.md` e `imagen-presidentes.md`):
- La imagen se dibuja en el navegador con `canvas`, sin servidor y sin librerías nuevas. La lógica vive en `web/lib/imagen.ts`.
- Sale siempre con el aspecto oscuro de la marca (D-011), sea cual sea el tema del usuario. Formato por defecto: cuadrada 1:1; también vertical 4:5 y horizontal 16:9.
- **Sin sello de verdadero o falso.** La imagen dice qué muestran los datos con palabras neutras ("más alto", "más bajo", "por debajo de su récord"); la conclusión la saca quien comparte.
- El título, la cifra y el contexto los calcula el sitio y no se editan. El usuario puede sumar un comentario, que sale marcado como suyo. La fuente y la dirección del sitio no se pueden quitar.
- En Histórico, con un solo gráfico, se ve primero una vista simple (dato, contexto, gráfico, fuente, Compartir); los controles quedan bajo "Personalizar".

**Consecuencias**: la vista previa de los links en redes no se resuelve con esto (necesita páginas fijas por dato generadas en cada actualización; bloque 7c). El contexto automático pasa a ser una sola función en `web/lib/` que usan la portada, las plantillas, la vista del dato y la imagen.

## D-013 · Publicación rápida cuando solo cambia el sitio — DECIDIDO (2026-11-10)
**Contexto**: cada push a `web/` corría la actualización completa (bajar todas las fuentes), unos 10 minutos, aunque los datos no cambiaran.

**Decisión**: el workflow `actualizar.yml` elige un modo al empezar. **Solo el sitio**: un push que no toca `pipeline/`, `datos/`, `requirements.txt` ni los workflows, o una corrida a mano con la opción `solo_sitio`; usa `--solo-json` (los datos ya guardados en `datos/cache/compilado.json`, sin red), compila y publica. **Completo**: la corrida programada de las 21:00, los push que tocan el pipeline y cualquier caso dudoso.

**Consecuencias**: un cambio de interfaz se publica en un par de minutos y no genera commit de datos. Un cambio en textos del pipeline (`fuente`, `desc`) o en cálculos sigue necesitando la corrida completa. Si `compilado.json` quedara viejo, el sitio se publica con esos datos hasta la corrida de las 21:00.

## D-014 · Nombres públicos, alias y regiones se resuelven en el sitio, no en el catálogo — DECIDIDO (2026-11-11)
**Contexto**: la auditoría mostró nombres de catálogo que el público no entiende ("Salario SIPA mediana"), la inflación repetida en tres series y 310 series regionales llenando el selector.

**Decisión** (spec `simplificacion.md`): el pipeline y los JSON no cambian. El sitio aplica al cargar el catálogo una tabla de nombres públicos (`web/lib/nombres.ts`; el nombre original queda en `nTecnico`), oculta las series que son otra forma de una misma (`inflacion` e `inflacion_ia` pasan a ser alias de `ipc_empalme` con medida mensual o interanual, resueltos al leer la URL) y lista cada rubro o producto una sola vez, con la región como opción (`web/lib/regiones.ts`).

**Consecuencias**: no se borra ninguna serie y los links viejos muestran lo mismo. Las categorías también tienen nombre público ("IPC por rubros"), pero el código sigue comparando contra el nombre técnico. Una serie nueva con jerga necesita su entrada en `nombres.ts` (ver skill `nueva-serie`).

## D-015 · Datos al día: corridas a la hora de publicación y respaldos — DECIDIDO (2026-11-11)
**Contexto**: el sitio mostraba la inflación de agosto cuando ya había salido septiembre: la API de INDEC no respondió en una corrida y la fuente de respaldo venía atrasada. El usuario quiere tener el dato apenas sale, para comentarlo y difundir el sitio.

**Decisión**: el workflow corre a las 16:10 y a las 17:15 en días hábiles (IPC de INDEC y parte del BCRA), además de las 21:00. Si la API de INDEC no responde, el IPC nacional se completa con la última copia guardada de esa API, siempre que coincida con datos.gob.ar en los meses comunes (`ipc_nacional_de_cache`). Las cotizaciones diarias sueltas que se apartan más de 30 % de sus vecinas se descartan antes de calcular mínimos y máximos (`_sin_datos_sueltos`). Los controles de cordura cortan la corrida antes de publicar un dato malo (canastas).

**Consecuencias**: tres corridas completas por día hábil (unos 10 minutos cada una). El parte diario del BCRA como bloque propio queda pendiente: necesita datos diarios y hoy todo el sitio es mensual.

## D-016 · El botón Atrás cierra la capa abierta, desde un solo lugar — DECIDIDO (2026-11-11)
**Contexto**: en celular, Atrás con una ventana o un menú abierto salía de la página. Había dos arreglos sueltos (selector de variables y gráfico expandido) y el resto de las capas no tenía ninguno.

**Decisión** (spec `ajustes-tanda-4.md`): un solo hook, `useAtras` en `web/components/ui.tsx`, que usan `Modal`, `Desplegable`, `Selector` y las capas propias (hueco de las oraciones, vista previa completa de la imagen, gráfico expandido). Cada capa abierta agrega una entrada al historial con la misma URL; un único `popstate` cierra la de arriba. `Modal` dibuja siempre su cruz de 44 px y `Desplegable` la suya.

**Consecuencias**: una capa nueva no maneja el historial por su cuenta: usa `Modal`/`Desplegable`/`Selector` o llama a `useAtras`. Los filtros se siguen guardando en la URL con `replaceState`; si cambian con una capa abierta, al cerrarla la URL nueva se lleva a la entrada de abajo (`llevarUrl`), para que el link no pierda el cambio. El `popstate` propio corre en captura, antes que el de Next, que si no vuelve a escribir la URL vieja. Si se cambia de ruta con una capa abierta queda una entrada de más en el historial (un Atrás sin efecto visible): aceptado.

## D-017 · La ficha del dato: una variable, tres vistas — DECIDIDO (2026-11-12)
**Contexto**: quien elegía un dato en un tema o en una pregunta caía en una sola sección y, para verlo de otra forma, tenía que ir a la otra y volver a elegirlo. El usuario propuso un cartel que preguntara a dónde ir, o traer las secciones a los temas.

**Decisión** (spec `ajustes-tanda-5.md`): un componente, `FichaDato` (`web/components/FichaDato.tsx`, cálculos en `web/lib/ficha.ts`), recibe una variable y muestra tres bloques en su forma simple —Histórico, Por presidente y Meses de mandato—, cada uno con Compartir y "Abrir completo" (lleva a la sección con la variable en la URL). Se usa en la ruta `/dato/?v=…`, en las páginas de tema (reemplaza a la tabla por presidente; la variable elegida va en `dv`, y el `pt` viejo sigue valiendo) y en "Ver" de las preguntas de una sola variable. Las preguntas con período o con dos variables siguen yendo al Histórico.

**Consecuencias**: la ficha no tiene opciones avanzadas: lo que haga falta configurar está en "Abrir completo". Los valores por defecto de cada bloque se toman de `web/lib/`, los mismos que usa la sección completa, para que den igual. `/dato/` es la base de la vista previa de links en redes (7c): faltan las páginas fijas por dato con título e imagen propios. Regla general: después de elegir una variable, ninguna pantalla vuelve a pedirla.

## D-018 · La vista previa en redes se genera al publicar — DECIDIDO (2026-11-12)
**Contexto**: las redes leen el HTML sin ejecutarlo y piden una imagen ya hecha; el sitio es estático y arma todo en el navegador, así que los links se veían sin dato ni imagen.

**Decisión** (spec `vista-previa-links.md`): una lista de datos fijos con slug escrito a mano (`web/lib/datos-fijos.ts`: los principales de los temas y las placas de la portada) tiene página propia `/dato/<slug>/`. Antes de compilar, `npm run previas` (`web/scripts/generar-previas.ts`) dibuja en Node, con `@napi-rs/canvas`, la misma imagen compartible del navegador (`web/lib/imagen.ts`) para cada dato y deja en `web/public/previas/` los PNG y `_datos.json` (título con la cifra y descripción), que `generateMetadata` lee para las etiquetas Open Graph y Twitter. La paleta sale de los tokens de `globals.css` y la tipografía de `web/scripts/fuentes/` (Archivo, OFL).

**Consecuencias**: un slug nunca cambia de significado ni se reutiliza. La imagen lleva `?v=<mes del dato>` para que las redes la renueven. Los links con parámetros (`/dato/?v=…`, Histórico con filtros) no tienen imagen propia: haría falta un servidor. El workflow corre el script en los dos modos; si faltara `_datos.json`, el sitio compila igual con la imagen general. Un cambio en `web/lib/imagen.ts` afecta a la vez a la imagen compartible y a las vistas previas.

## D-019 · Datos diarios: un archivo aparte, con la fecha de cada dato — DECIDIDO (2026-11-12)
**Contexto**: el usuario quiere el parte del Banco Central apenas sale. Todo el sitio es mensual (un eje de meses común a todas las series) y el pipeline ya bajaba las variables del BCRA día por día, pero solo publicaba el resumen del mes.

**Decisión** (spec `parte-diario-bcra.md`): los datos diarios no entran al motor ni al Histórico. `pipeline/diario.py` escribe `web/public/datos/diario_bcra.json` (por serie: fecha inicial, días transcurridos y valores) a partir de los CSV de `datos/cache/`, tanto en la corrida completa como en `--solo-json`. La página `/bcra/` lo carga aparte (`useDiario`), con sus cálculos en `web/lib/diario.ts` y un gráfico propio (`GraficoDiario`), porque `Grafico` trabaja con meses.

**Consecuencias**: la API del BCRA trae algunas variables con días de atraso (reservas y compras, sobre todo): cada dato se muestra con SU fecha y la "fecha del parte" es la del dato más nuevo. Otra fuente diaria (dólar blue, riesgo país) se suma con el mismo formato de archivo. Un dato diario no se puede cruzar con las series mensuales (pesos de hoy, por presidente) sin pasar por el resumen mensual.
