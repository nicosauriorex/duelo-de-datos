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
- Para inspeccionar un caché, leer solo lo necesario con pandas (`head`, columnas), nunca volcar el archivo entero.
