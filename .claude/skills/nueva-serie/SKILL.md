---
name: nueva-serie
description: Agregar una serie de datos nueva al catálogo (bajarla, cachearla, catalogarla y verla en la página). Usar cuando el usuario pide sumar un indicador.
---

# Agregar una serie

1. **Fuente**: si no está clara, delegar al agente `investigador-datos` con el nombre del indicador. Confirmar con el usuario si la fuente no es oficial.
2. **Dónde va**: elegir la función de `pipeline/catalogo.py` según la fuente:
   - datos.gob.ar → tabla de IDs dentro de `datos_gob()`
   - BCRA → `bcra()` (usa `_bcra(var_id)`)
   - INDEC API → `_indec(...)` / `ipc_indec()` / `indec_social()`
   - Mercados diarios → `pipeline/macro.py` o `mercados()`
   - Otra → función nueva que use `_cache_df(nombre, bajar)` para tener respaldo.
3. **Catalogar** con `S(id, n, cat, tipo, u, v, dir, fuente, desc)`:
   - `id` único con prefijo de la fuente (`dg_`, `bcra_`, `mk_`...).
   - `cat`: reutilizar una ruta de categorías existente (buscar con Grep) antes de crear una nueva.
   - `tipo`: `ars` / `idx` / `usd` / `fx` / `none` (ver docstring de catalogo.py). Define qué medidas ofrece la página.
   - `dir`: 1 si subir es bueno, -1 si es malo, 0 neutro.
   - `desc`: una o dos frases para un lector común.
4. **Correr** `python pipeline/obtener_datos.py` (con red). Confirmar en la salida que el total de series subió y que no hubo error de la fuente nueva.
5. **Verificar en la página**: abrir `DueloDeDatos.html`, buscar la serie en Histórico, comprobar últimos valores contra la fuente original (dos o tres meses).
6. Reportar: id, fuente, rango de fechas, último valor y mes.
