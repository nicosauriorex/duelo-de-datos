# Herencia: recibido contra entregado

Estado: lista para implementar la fase 1; las fases 2 y 3 necesitan lo que se indica en cada una (2026-11-12)
Ideas: "Herencia: recibido contra entregado" (IDEAS.md, 2026-11-12).

## Objetivo
Una sección dentro de Presidentes que muestre, para cada presidente, cómo estaba cada variable cuando asumió ("Recibió") y cómo la dejó ("Entregó", o "Hoy" para el que está en funciones), con los temas de los que los presidentes se suelen quejar al asumir. Sin calificar la herencia: valores, fecha y fuente (D-012).

## Qué se puede hacer con datos (investigado el 2026-11-12)
Cada tema quedó en una de tres clases. Esto ordena las fases.

| Tema pedido | Clase | Qué hay |
|---|---|---|
| Déficit fiscal (primario y financiero) | A | Series del catálogo, % del PIB |
| Déficit cuasifiscal | A | `bcra_cuasifiscal` (desde 2003; no incluye intereses de Lebac 2002-2017: decirlo) |
| Leliq, pases y Lebac (pasivos remunerados) | A | `bcra_pasivos_rem` (desde 2003/2004) |
| Brecha cambiaria | A | `brecha_blue`, `brecha_ccl`, `brecha_mep` |
| Reservas brutas | A | `bcra_1` (desde 1996) |
| Inflación, pobreza, indigencia, desocupación, salario real, cuenta corriente, riesgo país, dólar real, tipo de cambio real multilateral | A | Series del catálogo |
| Subsidios a la energía | A desde 2016 | datos.gob.ar `452.2_ENERGIAGIA_0_T_7_79` (trimestral; no está en el catálogo) |
| Precios regulados contra inflación general (atraso de tarifas, forma medible) | A desde 2017 | IPC por categorías "Regulados" contra nivel general (ya en el catálogo) |
| Deuda con importadores | A hasta 2017, B después | datos.gob.ar `313.1_DEUDA_POR_NES_0_T_28` (2001-2017); después, informes trimestrales del BCRA "Deuda externa privada" (PDF) |
| Deuda pública (bruta, % del PIB, en moneda extranjera) | B | Informes mensuales de la Secretaría de Finanzas (PDF y planilla); no hay serie en datos.gob.ar |
| Deuda con el FMI y estado de los acuerdos | B | Documentos del FMI por país (PDF): acuerdos de 2018, 2022 y 2025 |
| BOPREAL (colocado por serie) | B | Resultados de licitaciones del BCRA |
| Cepo vigente al asumir (sí/no, desde cuándo) | B | Comunicaciones del BCRA (fechas: 2011, 2015, 2019, 2025) |
| Reservas netas | C | No hay serie oficial: solo en documentos del FMI y estimaciones privadas; el swap con China y los encajes en dólares no están en la API |
| SIRA / permisos de importación pendientes | C | Sin dato oficial del stock |
| Puts de los bancos | C | Sin dato oficial del stock |
| Dividendos retenidos | C | Sin dato oficial |
| Cobertura de costos de las tarifas | C | Solo estimaciones |
| Precios congelados | C | Solo fechas de los programas |

A = serie oficial legible por programa. B = dato oficial que está en un informe: se carga a mano con su cita. C = solo estimaciones privadas o no medible.

Cobertura en el tiempo: las series del BCRA arrancan en 1996 o 2003, así que los traspasos de 1989 y 1999 quedan casi vacíos y los de 2001-2003 a medias. La sección sirve sobre todo desde 2003. Donde no hay dato se dice "sin dato", no se deja el hueco sin explicar.

## Fase 1 (lista para implementar): lo que ya es serie
### Requisitos
1. Ruta `/herencia/` ("Herencia"), en el grupo Presidentes del menú, después de "Meses de mandato" (orden: Por presidente, Meses de mandato, Herencia, Ranking, Elecciones, Congreso).
2. Arriba se elige el presidente (`Seg` o `Selector`; por defecto el que está en funciones; en la URL, parámetro `p`). La página muestra una tabla con tres columnas de datos: **Recibió** (valor y mes), **Entregó** o **Hoy** (valor y mes) y **Cambio** (con signo; color según la dirección de la serie, como en Por presidente; siempre con texto).
3. "Recibió" es el último dato disponible en o antes del último mes del antecesor (T-1); "Entregó", el último dato en o antes del último mes del mandato. Es el mismo cálculo que `statsMandato` (`web/lib/estadisticas.ts`) con inicio en T-1: reutilizarlo, sin duplicar. La configuración global de inicio de mandato NO se aplica acá (la herencia es por definición el dato al traspaso); decirlo en una nota.
4. Filas agrupadas, en este orden (las expresiones salen de `web/lib/datos-fijos.ts` cuando el dato ya es un dato fijo, para que coincidan con el resto del sitio):
   - **Banco Central**: reservas brutas (dólares de hoy); pasivos remunerados (en pesos de hoy y como % de la base monetaria); déficit cuasifiscal (acumulado de 12 meses, % del PIB si el motor lo permite; si no, en pesos de hoy).
   - **Dólar**: brecha con el blue; dólar oficial en pesos de hoy; tipo de cambio real multilateral.
   - **Cuentas públicas**: resultado primario y financiero (% del PIB); subsidios a la energía (serie nueva, desde 2016).
   - **Precios**: inflación de los últimos 12 meses; inflación del último mes; precios regulados contra el nivel general (índice relativo, desde 2017).
   - **Deuda y sector externo**: riesgo país; cuenta corriente (% del PIB); deuda con importadores (serie nueva, 2001 a 2017, con la nota de que la serie abierta termina ahí).
   - **Social**: pobreza; indigencia; desocupación; salario real.
5. Cada fila: nombre público, unidad, y un enlace a la ficha del dato (`hrefDato`) con el presidente resaltado (`pd`). Fila sin dato en el traspaso: "sin dato (la serie empieza en <fecha>)".
6. Segunda vista (`Seg`: "Un presidente" / "Todos los traspasos"): se elige una variable y se ve una fila por traspaso (quién entregó, quién recibió, fecha y valor). Es la misma información, girada. En la URL, `vista` y `v`.
7. Compartir: imagen con el dibujo de "un presidente con varias variables" que ya existe (`web/lib/imagen-presidentes.ts`), con los rótulos "Recibió" y "Entregó"/"Hoy"; link; vista previa en redes fija para la página (imagen del presidente en funciones, generada por `npm run previas`).
8. Al pie, plegado: "Lo que no se puede medir con datos oficiales" (la lista C de arriba, con una línea de por qué) y "Lo que falta cargar" (la lista B).
9. Series nuevas en el catálogo (skill `nueva-serie`): subsidios a la energía (`452.2_ENERGIAGIA_0_T_7_79`, trimestral; pedirla sola, porque mezclada con otras la API devuelve valores anuales) y deuda con importadores (`313.1_DEUDA_POR_NES_0_T_28`). Nombres públicos en `web/lib/nombres.ts`.
10. Cálculos en `web/lib/herencia.ts`; las cuentas cierran con los valores como se muestran; nada desborda a 360 px; sin `<select>` nativo; palabras neutras ("recibió", "entregó"; nunca "herencia pesada", "bomba", "mejor", "peor").

### Casos borde
- Presidente en funciones: la segunda columna es "Hoy" con el último dato.
- Series trimestrales o semestrales (pobreza, subsidios, cuenta corriente): se usa el último dato publicado en o antes del traspaso y se muestra su fecha, que puede ser de varios meses antes.
- Duhalde y los interinos de 2001-2002: usar los mandatos tal como están en `PRES_DEF`.
- Variable con dirección ambigua (tipo de cambio real, pasivos): sin color.

### Cómo se verifica
`npm run tipos`, `npm run build`, barrido de cuentas y del navegador; comparar tres valores de un traspaso (reservas dic-2015: US$ 24.141 millones; dic-2023: US$ 22.663 millones, según la API del BCRA) con la tabla; `/herencia/` a 360 y 1280 px en las dos vistas; `revisor`.

## Fase 2 (necesita lectura de documentos): datos cargados a mano
Archivo `datos/manual/herencia.json` (versionado, como los datos de Congreso), una entrada por dato y traspaso: `{ "clave", "nombre", "unidad", "traspaso": "2015-12", "valor", "fecha_dato", "organismo", "documento", "url", "pagina", "nota" }`. El pipeline lo copia a `web/public/datos/`. La página los muestra en las mismas tablas con la marca "dato de informe" y su cita al tocarla.
- A cargar, para los traspasos de 2015, 2019 y 2023 (y antes si el documento existe): deuda pública bruta en dólares y como % del PIB, y parte en moneda extranjera (Secretaría de Finanzas); deuda con el FMI y estado del acuerdo vigente (FMI); deuda con importadores después de 2017 (BCRA, informe de deuda externa privada); BOPREAL colocado (BCRA); si había restricciones cambiarias vigentes y desde cuándo (comunicaciones del BCRA).
- Cifras ya vistas en la investigación, SIN verificar en el documento (no cargarlas sin leer la fuente): deuda comercial por importaciones de bienes US$ 40.249 millones al 31-12-2024; acuerdos con el FMI de 2018 (US$ 56.300 millones), 2022 (US$ 44.000 millones) y 2025 (US$ 20.000 millones); cepo desde 28-10-2011, levantado en dic-2015, repuesto el 1-9-2019, levantado para personas el 14-4-2025.
- Quién lo hace: un agente que pueda abrir PDF (los investigadores no pudieron leerlos: llegaron como binario) o el usuario. Cada cifra con documento, página y fecha; sin cita no se carga.

## Fase 3 (necesita una decisión del usuario): estimaciones privadas
Reservas netas, SIRA, puts, dividendos retenidos, cobertura de tarifas. No tienen dato oficial. Opciones: (a) no mostrarlas, solo explicar por qué (lo que hace la fase 1); (b) mostrarlas como "estimación de <fuente>", en un bloque aparte y sin color, cargadas a mano con su cita. Recomendación: (b) solo para las reservas netas, que tienen metodología publicada por el FMI, y siempre que la cifra salga de un documento del FMI; el resto, (a).

## Fuera de alcance
Calificar la herencia; comparar promesas con resultados; datos anteriores a 1996 que no estén en series abiertas.
