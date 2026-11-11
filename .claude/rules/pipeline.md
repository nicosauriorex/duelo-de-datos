---
paths:
  - "pipeline/**/*.py"
---

# Pipeline de datos

- Toda descarga pasa por `_cacheado` / `_cache_df` (salarios.py / catalogo.py): si la fuente falla se usa `datos/cache/`. No agregar descargas sin caché.
- Las series se arman con `catalogo.S(...)` y terminan en `catalogo.construir()`. Todo es mensual (índice desde 1990-01, freq MS); diarias se resumen en promedio/mín/máx; trimestrales con `_trim_a_mes`.
- `fuente` y `desc` de cada serie se muestran en la página: escribirlos para un lector común, citando organismo y número de serie.
- Salarios SIPA incluyen aguinaldo (SAC) en jun/dic: respetar la separación base/prorrateado de salarios.py.
- El IPC es un empalme de varias fuentes (ver docstring de salarios.py). No reemplazar por una sola serie sin decidirlo.
- Para inspeccionar un caché: `python pipeline/ver_cache.py <nombre>` (admite `--donde columna=valor`, `--desde`, `--hasta`, `--filas`). Muestra columnas, tamaño y pocas filas. No leer `datos/cache/` de otra forma ni volcar un archivo entero.
- Cada serie lleva en `fuente` el organismo o sitio de origen; `--solo-json` no toma cambios de textos ni de cálculos.
- Controles de cordura dentro del pipeline cuando hay una relación conocida (ejemplo: canasta de hogar de 4 = 3,09 adultos): si no se cumple, la corrida falla en lugar de publicar un dato malo.
