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
