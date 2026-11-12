# Parte diario del Banco Central

Estado: implementada (2026-11-12). Desvíos aceptados: la compra de dólares no muestra "variación contra el día anterior" (restar dos flujos confunde): muestra la rueda anterior y los acumulados del mes y del año; base monetaria y depósitos van en billones de pesos; el dólar, con centavos; la frase de extremo se omite si es de hace menos de 14 días; el texto para copiar lleva compras, reservas y los dos dólares.
Ideas: "Posts automáticos de datos fijos (empezar por acá)" y "parte diario del BCRA" (IDEAS.md); punto pendiente de ESTADO.md.

## Objetivo
Una página que muestre, apenas el BCRA lo publica cada tarde, los datos del día (reservas, compra de divisas, dólar minorista y mayorista, tasas, base monetaria y depósitos) con su variación y su contexto histórico, lista para compartir con imagen, texto y vista previa en redes. Es el primer contenido diario del sitio (todo lo demás es mensual).

## Fuente (investigada el 2026-11-12)
API del BCRA `https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/{id}`, sin clave. El pipeline ya baja estas variables con `_bcra(id)` (diarias) y las guarda en `datos/cache/bcra_<id>.csv`; hoy solo publica el resumen mensual. No hace falta bajar nada nuevo.

| Clave | id | Qué es | Unidad | Tipo | Desde |
|---|---|---|---|---|---|
| `reservas` | 1 | Reservas internacionales brutas | millones de US$ | nivel | 1996 |
| `compras` | 78 | Compra neta de divisas del BCRA | millones de US$ por día | flujo | 2003 |
| `minorista` | 4 | Dólar minorista (promedio vendedor) | $ por US$ | nivel | 2010 |
| `mayorista` | 5 | Dólar mayorista (Com. A 3500) | $ por US$ | nivel | 2002 |
| `tamar` | 44 | Tasa TAMAR de bancos privados | % nominal anual | tasa | 2024-10 |
| `badlar` | 7 | Tasa BADLAR de bancos privados | % nominal anual | tasa | 1999 |
| `base` | 15 | Base monetaria | millones de $ | nivel | 1996 |
| `depositos` | 21 | Depósitos en efectivo en los bancos | millones de $ | nivel | 1999 |

Ojo: la API trae algunas variables con atraso. El 12-11 al mediodía el dólar tenía dato del 11-11, pero las reservas del 04-11 y las compras del 03-11. Por eso cada dato muestra SU fecha y la página no supone que todos son de hoy.

Segunda búsqueda (2026-11-12, 17 h): ninguna fuente oficial legible por un programa trae reservas, compras ni tasas más al día que la API (se probaron `Series.xlsm`, el informe monetario diario, la página de principales variables —con captcha— y datos.gob.ar). El parte muestra lo más nuevo que publica el BCRA en sus estadísticas, que llega con varios días de demora.

## Requisitos

### Pipeline
1. `pipeline/`: escribir `web/public/datos/diario_bcra.json` (generado, no versionado) con la historia diaria completa de las ocho variables:
   ```json
   { "actualizado": "2026-11-12T17:20:00-03:00",
     "series": { "reservas": { "id": 1, "f0": "1996-01-02", "d": [0, 1, 2, 5], "v": [15963.0, 15970.0, 15981.0, 16002.0] } } }
   ```
   `d` son los días transcurridos desde `f0` de cada dato (enteros crecientes); `v`, los valores en el mismo orden. Solo días con dato. El mayorista sale de la serie que ya baja `macro.py` (`d_a3500_bcra`).
2. `--solo-json` también lo genera, leyendo los CSV de `datos/cache/` (sin red y sin agrandar `compilado.json`).
3. Control de cordura: si una serie queda vacía o su último dato tiene más de 20 días, se avisa en el registro (no corta la corrida).
4. El archivo `datos/cache/bcra_<id>.csv` de cada variable sigue siendo el respaldo si la API falla.

### Sitio
5. Ruta `/bcra/` ("Parte del Banco Central"). Carga `diario_bcra.json` aparte del resto (no pasa por `DatosProvider`; mirar cómo lo hacen `useContexto` o `usePreciosMundo`).
6. Arriba: la fecha del parte (la del dato más nuevo) y una línea de qué es. Si alguna variable no tiene dato de esa fecha, lo dice junto a esa variable ("último dato: 04-nov"), sin color.
7. Una tarjeta por variable, en este orden: compras, reservas, minorista, mayorista, TAMAR, BADLAR, base monetaria, depósitos. Cada una con:
   - el valor y su fecha;
   - la variación contra el día hábil anterior con dato (en la unidad: millones de US$, pesos, puntos porcentuales) y, cuando tiene sentido, en %;
   - contra hace una semana, un mes y un año (el dato más cercano anterior a esa fecha);
   - una frase de contexto neutra, calculada: "el valor más alto / más bajo desde <fecha>" para niveles y tasas; para compras: "la mayor compra / la mayor venta desde <fecha>", el acumulado del mes y del año, y la racha ("N ruedas seguidas comprando / vendiendo");
   - un gráfico chico de los últimos 90 días con dato.
   Colores: verde/rojo solo donde hay una dirección clara y siempre con signo o texto (reservas y compras: subir es verde); dólar, tasas, base y depósitos van sin color.
8. Tocar una tarjeta abre el gráfico grande de esa variable con el período a elegir (1 mes, 3 meses, 1 año, 5 años, todo), con dato diario. Si el componente `Grafico` no admite fechas diarias sin cambios grandes, usar un gráfico propio simple para esta página y anotarlo.
9. Compartir:
   - **Imagen** del parte (los tres formatos), con el mismo estilo que las demás: marca, fecha del parte, las variables con valor, variación y gráfico chico, fuente "BCRA" y la dirección del sitio. Reutilizar el dibujo de filas con variables de `web/lib/imagen.ts` si sirve.
   - **Copiar texto**: un texto corto para pegar en redes, con las cifras del día y el link ("Parte del BCRA del 11-nov: compró US$ 96 millones (la mayor compra desde …). Reservas: US$ 50.437 millones (+120). Dólar minorista: $ 1.573. primerolosdatos.com.ar/bcra/"). Palabras neutras, sin veredicto (D-012).
   - **Copiar link**.
10. Vista previa en redes: `npm run previas` genera `previas/bcra.png` y el título y la descripción con las cifras del día; `/bcra/` lleva sus etiquetas (como los datos fijos, D-018). Entra en el `sitemap`.
11. Entradas: una placa o bloque "Parte del Banco Central" en la portada (con las dos o tres cifras principales y la fecha), una línea en el bloque de secciones de la portada y un enlace desde los temas "Dólar" y "Dinero, tasas y mercados". No va en la barra de navegación (no entra en el celular).
12. Cálculos en `web/lib/diario.ts` (variaciones, extremos "desde", rachas, acumulados), no en los componentes. Las cuentas cierran con los valores como se muestran (R1). Números con `web/lib/formato.ts`.

## Casos borde
- Día sin operaciones (compras = 0): "sin compras ni ventas"; la racha se corta.
- Feriados y fines de semana: "día anterior" es el dato anterior, no el día calendario.
- TAMAR tiene historia desde oct-2024: "hace un año" puede no existir; esa comparación no se muestra.
- `diario_bcra.json` no existe o no carga: la página lo dice y el resto del sitio sigue andando; `npm run previas` saltea la imagen del parte y avisa.
- Variable atrasada respecto de la fecha del parte: se muestra con su fecha y no entra en el texto para copiar como si fuera de hoy (va con su fecha).
- Empate en "desde": si el valor de hoy es el más alto de toda la serie, dice "el más alto de la serie (desde <primer dato>)".

## Fuera de alcance
- Publicar solo en X (necesita cuenta y clave del usuario); "contestar un relato"; video.
- Datos diarios de otras fuentes (dólar blue, riesgo país): pueden sumarse después con el mismo formato.
- Meter los datos diarios en el Histórico.

## Cómo se verifica
1. `python pipeline/obtener_datos.py --solo-json` termina sin error y deja `web/public/datos/diario_bcra.json` con las ocho series; el último valor de cada una coincide con el de `python pipeline/ver_cache.py bcra_<id>`.
2. `cd web && npm run previas && npm run tipos && npm run build` sin errores; `npx tsx scripts/barrido-cuentas.ts` sin hallazgos.
3. En el navegador, `/bcra/` a 360 y 1280 px: tarjetas, gráfico grande, Compartir (imagen en los tres formatos, texto, link); barrido sin hallazgos.
4. Comparar las cifras de dos variables con la respuesta directa de la API.
5. Después de publicar: corrida en verde y, a la tarde, que el parte muestre el dato del día (lo mira el usuario).
6. Agente `revisor`.
