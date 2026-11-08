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

**Qué no cambia por ahora**: el proyecto de Cloudflare Pages (`duelo-de-datos`, por eso la URL actual es `duelo-de-datos.pages.dev`) y el repo de GitHub, hasta decidir renombrarlos o conectar el dominio propio.

**Pendiente**
- El usuario registra `primerolosdatos.com.ar` en nic.ar (y reserva los usuarios en X e Instagram).
- Después: conectar el dominio a Cloudflare Pages y actualizar las URLs del workflow y los docs.
- Decidir si se renombran el repo de GitHub y el proyecto de Pages.
