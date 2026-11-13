# Ajustes, tanda 6: textos internos y limpieza

Estado: implementada (2026-11-13)

Sale de "Detalles conocidos y aceptados" y "Sin verificar" de `docs/ESTADO.md` (pedido del usuario: "seguí con los puntos 2, 3 y 4"). No incluye regenerar `DESIGN.md`.

## 1. Textos internos en imágenes y vistas previas

Regla general: lo que lee el público (imágenes, vistas previas, títulos) no muestra ids de serie, nombres de API ni la palabra "tal cual". El número de serie se queda en el detalle de la serie y en `/fuentes/`, donde sirve para buscarla.

- **Fuente en el catálogo** (`pipeline/catalogo.py`): las series de datos.gob.ar sin fuente propia dicen hoy `datos.gob.ar, serie X`. Pasan a nombrar al organismo: `<organismo> vía datos.gob.ar, serie X`, con el organismo según el número de conjunto de datos (INDEC; Sec. de Trabajo (SIPA); Secretaría de Hacienda; Secretaría de Energía; ARCA; Universidad Torcuato Di Tella; Asociación de Fabricantes de Cemento Portland; Ministerio de Economía). Si un conjunto no está en la tabla, queda como hoy. Las demás fuentes no cambian.
- **Fuente en las imágenes** (`web/lib/imagen-datos.ts`, `fuenteLegible`): se sacan los agregados técnicos (`, serie X`, `(id)`, `, API xxx`, `, API de estadísticas (variable N)`, `API (variable…)`). "INDEC, API ipc_nacional" se lee "INDEC"; "BCRA, API de estadísticas (variable 1)" se lee "BCRA".
- **Una sola función de organismo**: `organismoDe` (hoy en `web/lib/previas.ts`) y el recorte de instituciones de `fuentesTxt` hacen lo mismo. Queda una sola, en `imagen-datos.ts` o un módulo común, y las dos la usan.
- **Título "(tal cual)"**: `resumenMedida` (`web/lib/motor.ts`) no agrega nada si la medida es el valor tal cual (`asis`). Un índice tal cual dice "índice", no "índice tal cual (base 100)". Los botones de medida no cambian.
- **Moneda en `previas.ts`**: se descartó unificarla con `difAbsTxt` (`motor.ts`). No es la misma regla: la vista previa exige que la unidad entera sea monetaria ("millones de $") para poner el signo delante de la cifra, y `difAbsTxt` busca el signo en cualquier parte ("$ por US$"). Unirlas cambiaría resultados.

## 2. Provincias, fase 4: lo que no se miró

En el navegador: `/provincias/?vista=cuentas&anio=2026` a 1280 px en tema claro y oscuro, y la imagen en 4:5 y 16:9.

## 3. Limpieza

- CSS sin uso en `web/app/globals.css`: `.chips` (y sus menciones en otras reglas) y `.voto-aviso`, si de verdad no los usa ningún componente.
- Ramas del modo "índice" de Meses de mandato (`web/components/secciones/Mandato.tsx` y lo que use solo esa rama en `web/lib/`) a las que ya no se llega.
- Sin cambios de aspecto ni de comportamiento.

## Cómo se verifica

- `python pipeline/obtener_datos.py --solo-json` sin errores (la fuente nueva del catálogo se ve recién con la corrida completa en GitHub).
- `npm run tipos` y `npm run build`.
- Prueba rápida de `fuenteLegible`/`organismoDe` con las fuentes reales de `catalogo.json`: ninguna contiene `serie `, `API`, `variable` ni `_` después de la limpieza.
- En el navegador: imagen de una serie de datos.gob.ar (PIB) y de una del BCRA sin ids en la fuente; título sin "(tal cual)"; Meses de mandato igual que antes; punto 2 de arriba; sin errores de consola.
- `npm run previas`: los textos de `_datos.json` igual que antes o mejores.
