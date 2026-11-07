# DatosArgentina

Página de datos económicos de Argentina (precios, salarios, dólar, actividad, pobreza, fiscal, externo) con fuentes oficiales.
Hoy: pipeline Python que baja series y genera una página HTML estática. Próximo: sitio público con usuarios, comentarios y votos (ver docs/ROADMAP.md).

Todo en español: código, comentarios, nombres de variables, commits y textos de la UI. Números en formato es-AR.

# Comandos
- Bajar todo y armar la página: `python pipeline/obtener_datos.py` (tarda, usa red)
- Solo recompilar la página tras tocar `src/` (sin red): `python pipeline/obtener_datos.py --solo-pagina`
- Python 3.14 + pandas. No hay tests todavía; la verificación es que el comando de arriba termine sin error y la página abra bien.

# Estructura que no se deduce sola
- `DatosArgentina.html` y `datos/datos.js` son GENERADOS: nunca editarlos ni leerlos enteros (pesan >1 MB). Se edita `src/` y se recompila.
- `src/index.html` tiene marcadores `/*ESTILOS*/`, `/*DATOS*/`, `/*APP*/` que reemplaza `compilar_pagina()`.
- `datos/cache/` es el respaldo de cada fuente: si una API falla se usa la última copia. Se versiona en git, no borrar.
- El formato de cada serie (`id, n, cat, tipo, u, dir...`) está documentado al principio de `pipeline/catalogo.py`.

# Cómo trabajamos
- Features nuevas: primero spec en `docs/specs/<nombre>.md` (skill `/spec`), después implementar en sesión limpia.
- Decisiones de arquitectura: registrarlas en `docs/DECISIONES.md`.
- Ideas sueltas del usuario: `docs/IDEAS.md`. No implementarlas sin que se pida.
- Detalle de modelos/agentes/flujo: `docs/COMO-TRABAJAMOS.md` (para el usuario; no hace falta leerlo en cada tarea).

# Compact instructions
Al compactar, conservar: archivos tocados, comandos de verificación y su resultado, decisiones tomadas y pendientes.
