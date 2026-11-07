# Decisiones

Una entrada por decisión de arquitectura. Formato: contexto, decisión, por qué, estado.

## D-001 · Stack para el sitio público — PROPUESTA, falta confirmar

**Contexto**: hoy es un HTML estático de 1,2 MB generado por Python. Para usuarios, votos y comentarios hace falta login, base de datos y páginas que se vean bien al compartirse en redes.

**Propuesta**
- **Datos**: el pipeline Python se queda como está. Corre solo (GitHub Actions, programado) y publica las series como JSON estáticos (uno por categoría, para no bajar 1 MB de entrada).
- **Web**: Next.js (React) en Vercel. Da páginas por indicador con URL propia y genera imágenes de vista previa para Twitter/X del lado del servidor.
- **Usuarios y comunidad**: Supabase (Postgres + login). Tiene login anónimo, que encaja con "registrarse de forma anónima", y permisos por fila (RLS) para que cada uno solo edite lo suyo. Ya está conectado a Claude.
- **Gráficos**: portar la lógica de `src/app.js` (medidas, deflactores) a módulos; evaluar una librería de gráficos o mantener los SVG propios.

**Alternativa más liviana**: Astro + Supabase. Más parecido al JS actual, menos para aprender, pero menos cómodo para las partes muy interactivas (comunidad).

**Costos**: Vercel, Supabase y GitHub tienen planes gratis que alcanzan para arrancar.
