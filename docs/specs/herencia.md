# Herencia: recibido contra entregado

Estado: fases 1, 2 y 3 implementadas (2026-11-12).
Fase 2: 42 datos en `datos/manual/herencia.json` (deuda pública bruta, % del PIB y en moneda extranjera desde 2007; deuda con el FMI en DEG y acuerdo vigente desde 2003; cepo desde 2011; deuda de importadores de los informes desde 2019; BOPREAL), cada uno verificado contra su documento. `traspaso` = mes de asunción del que recibe o "hoy". Filas sin color; deuda de importadores de los informes en fila aparte (otro relevamiento). Sin cargar: cepo de 2003 y 2007, FMI anterior a 2003. El nombre y la unidad que se muestran salen de `FILAS_INFORME` (`web/lib/herencia-informes.ts`), no de cada entrada: el JSON no lleva `nombre`.
Decisiones de la implementación: un dato vale como "recibió" o "entregó" si tiene hasta 12 meses de atraso (`MAX_ATRASO` en `web/lib/herencia.ts`); precios regulados contra el nivel general en base dic-16 = 100 (sin enlace a la ficha, que usa otra escala); pasivos / base monetaria como cuenta propia (el motor no admite esa relación); las reservas de la tabla son el promedio del mes en dólares de hoy, no el saldo de un día: no coinciden con las cifras de "Cómo se verifica".
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

## Fase 3: reservas netas y lo que no era "no medible" (decidido el 2026-11-12)
Decisión del usuario: opción (b) solo para las reservas netas que publica el FMI, más una réplica propia al día con el método del FMI, rotulada como estimación; cargar como datos de informe lo que resultó tener fuente oficial, y sumar la serie privada del IIEP sobre tarifas. Investigado el 2026-11-12; cada cifra verificada contra su documento.

### Requisitos
1. **Datos oficiales nuevos** (van como la fase 2, en `datos/manual/herencia.json`, en su grupo y con la marca "informe"):
   - Importaciones pendientes de pago (Banco Central, estimación al 12-12-2023: US$ 57.800 millones, comunicado del 25-01-2024; el padrón de Comercio dio 42.600 y el exceso sobre lo habitual, 13.600: en la nota). Grupo "Deuda y sector externo".
   - Puts de los bancos (opciones de liquidez sobre títulos del Tesoro, Banco Central): $ 12,27 billones de dic-2023 al 31-12-2023 (estados contables 2023, nota 5); 0 desde el 10-06-2025 (comunicado de rescisión). Grupo "Banco Central".
   - Cobertura del costo de la electricidad (precio estacional / precio monómico del MEM, Secretaría de Energía, Res. 7/2024): 79 % en feb-2019, 57 % en nov-2023. Grupo "Precios".
   - Precios acordados (INDEC, nota del informe del IPC: % de los precios relevados en el GBA que están en programas de acuerdo): 2,56 % en nov-2023. Grupo "Precios".
2. **Bloque "Estimaciones y cifras sin serie oficial"** debajo de la tabla: tabla propia con el mismo formato (Recibió, Entregó/Hoy, Cambio), sin color, y una línea que explique quién estima cada una:
   - Reservas netas según el FMI: 2019-12 = 12.400 (CR 23/133: 8.800 a fin de 2022, "3.600 menos que a fin de 2019"; la suma se dice en la nota); 2023-12 = −11.200 al 7-12-2023 (CR 24/37); "hoy" = −11.700 al 31-12-2025 (CR 26/105), el último stock publicado. Sin dato de 2015 (el FMI no lo publicó).
   - Reservas netas según el Banco Central (pedido del usuario, 2026-11-13): definición propia del BCRA ("criterios jurídicos y contables"), informe de política monetaria de dic-2025, págs. 55 y 57 (cuadro 1, leído en el PDF): −11.200 al 7-12-2023 y +2.900 a fin de 2025. Sobre la tabla, una línea compara las dos definiciones en la misma fecha: la diferencia es casi igual al crédito del FMI desde abril de 2025, que el FMI resta y el Banco Central no (pág. 57).
   - Reservas netas, estimación propia con la definición del Banco Central (pedido del usuario, 2026-11-13): la misma cuenta sin restar el crédito del FMI (el BCRA no lo descuenta porque es deuda del Tesoro, informe de política monetaria de dic-2025, pág. 57). Controles contra el cuadro 1 de ese informe: 31/12/24 −2.400 y 31/12/25 +2.900 (`controles_bcra` en los supuestos). Campo `netas_bcra` en `reservas_netas.json`.
   - Reservas netas, estimación propia con el método del FMI: solo "Hoy" (la serie empieza en abr-2024). Va con su fórmula, los supuestos y la diferencia con el FMI en las fechas en que publicó (ver abajo).
   - Cobertura de costos de los servicios públicos del AMBA (IIEP, UBA-CONICET; luz, gas, agua y transporte): solo "Hoy" (57 % en oct-2026, reporte #43); la serie empieza en 2023 y no es comparable con la de la Secretaría de Energía.
3. **Estimación propia de reservas netas** (`pipeline/reservas_netas.py` → `web/public/datos/reservas_netas.json`, sin red con `--solo-json`):
   - Fórmula: reservas brutas (API BCRA variable 1) − encajes en dólares de los bancos en el BCRA (variable 1243) − swaps con el Banco Popular de China y el BIS − seguro de depósitos (SEDESA) − crédito neto del FMI desde el inicio del acuerdo de 2025.
   - Los dos primeros son series diarias (respaldo en `datos/cache/bcra_1.csv` y `bcra_1243.csv`). Los demás, supuestos con cita en `datos/manual/reservas_netas_supuestos.json`, por tramos de fechas: swaps 18.300 desde abr-2024 (CR 24/167) y unos 20.000 desde dic-2025 (CR 26/105, recuadro 7); SEDESA 1.900 (CR 24/167) y 2.000 desde 2026 (CR 26/105); FMI = (crédito del Fondo en DEG a fin de cada mes − 31.100 DEG del 31-03-2025) × 1,3654 US$ por DEG (tipos de programa del memorándum técnico, CR 26/105).
   - No entran (no son públicos): repos con bancos y BOPREAL que vencen en menos de un año, el swap con el Tesoro de EE.UU., futuros y forwards, y la valuación del oro a precio de programa. Decirlo.
   - Controles: la misma cuenta en las fechas en que el FMI publicó un stock (29-05-2024: +300; 30-12-2024: −2.400; 30-12-2025: −11.700). El JSON trae la diferencia de cada uno y la página la muestra ("en esas fechas la estimación se apartó entre X y Y millones del FMI"). Si la diferencia pasa de 3.000 millones, el pipeline avisa.
   - Formato: `{ "actualizado", "ultimo": {fecha, netas, brutas, encajes, swaps, sedesa, fmi}, "mensual": [{mes, netas}], "controles": [{fecha, propia, fmi, dif, cita}], "supuestos": [...] }`.
4. "Lo que no se puede medir" queda con los dividendos retenidos (sin dato oficial; el BOPREAL Serie 4 da solo el tope del bono), los productos con precios congelados y las reservas netas como dato oficial (remite al bloque de estimaciones).
5. Imagen: las filas de estimaciones van al final, con "(estimación)" en la unidad; las de texto, como frases (fase 2).

### Casos borde
- La estimación propia sin dato reciente (más de 20 días): "sin dato" y por qué.
- Si el FMI publica un stock nuevo (informe de la 3ª revisión, dic-2026), se agrega como "hoy" del FMI y como control.
- D-012: ni el FMI ni la estimación se califican; sin color.

### Cómo se verifica
`python pipeline/obtener_datos.py --solo-json` arma `reservas_netas.json` con los tres controles; `npm run tipos`, `npm run build`, `npm run previas`; `/herencia/` a 360 y 1280 px con el bloque de estimaciones y la cita de cada dato; `revisor`.

## Fuera de alcance
Calificar la herencia; comparar promesas con resultados; datos anteriores a 1996 que no estén en series abiertas.
