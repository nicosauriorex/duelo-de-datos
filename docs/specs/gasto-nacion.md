# En qué gasta la Nación (por partida y por entidad)

Estado: fase 1 implementada (2026-11-12); fase 2 implementada (2026-11-13); las fases 3 y 4, según se indica.
Decisiones de la implementación: un año está cerrado cuando la fuente publica su actualización de cierre (posterior a marzo del año siguiente), no por calendario; las barras se redondean repartiendo la diferencia por mayor resto para que sumen el total que se ve; el % ejecutado no se muestra donde lo gastado supera el crédito vigente (pasa con cada universidad: el vigente no se reparte a ese nivel); el pipeline repone tildes que la fuente no trae; incisos 6 y 7 con nombres del público ("Préstamos y compras de activos financieros", "Deuda: intereses y pagos de capital"); medida, etapa y buscador en desplegables para que el dato se vea sin deslizar.
Ideas: "Gasto e impuestos de las provincias y la Nación" y "presupuesto de cada entidad pública, por ejemplo las universidades" (IDEAS.md, 2026-11-12). Las provincias van en su propia spec (`provincias.md`).

## Objetivo
Que cualquiera pueda ver en qué gasta el Estado nacional: por finalidad (salud, educación, jubilaciones, deuda…), por organismo (ministerio → entidad → programa), por tipo de gasto (sueldos, transferencias, obras…) y por provincia, año por año, con cuánto se presupuestó y cuánto se ejecutó. Y, hasta donde los datos oficiales lo permiten, el caso de las universidades nacionales.

## Fuente (investigada y probada el 2026-11-12)
- **Repositorio de datos de Presupuesto Abierto (DGSIAF, Ministerio de Economía), sin clave**: `https://dgsiaf-repo.mecon.gob.ar/repository/pa/datasets/<AÑO>/credito-anual-<AÑO>.zip` (2018 a 2026; un CSV de 56 columnas; decimales con coma; codificación probablemente cp1252). Columnas útiles: `jurisdiccion_desc`, `entidad_desc`, `servicio_desc`, `programa_desc`, `finalidad_desc`, `funcion_desc`, `inciso_desc`, `principal_desc`, `fuente_financiamiento_desc`, `ubicacion_geografica_desc`, `unidad_ejecutora_desc`, y las etapas `credito_presupuestado`, `credito_vigente`, `credito_comprometido`, `credito_devengado`, `credito_pagado`, más `ultima_actualizacion_fecha`. Listado de archivos: `https://dgsiaf-repo.mecon.gob.ar/service/rest/v1/search?repository=pa`.
- Mensual: `.../credito-mensual-<AÑO>.zip` (2025: 15 MB comprimido, 438 MB sin comprimir). Diario: `.../credito-diario-<AÑO>.zip` (38 MB).
- Serie larga por finalidad y función con el PIB: `https://dgsiaf-repo.mecon.gob.ar/repository/pa/datasets/serie_finfun_anual.csv` (2004 a 2025).
- Empalme de clasificadores entre años: `.../mapeo-interanual-partidas-gasto-<AÑO>.zip`.
- La API de Presupuesto Abierto pide una clave que se solicita con nombre y mail: NO hace falta, el repositorio trae lo mismo.
- Cobertura: solo la Administración Nacional (administración central, organismos descentralizados y seguridad social). **No incluye empresas públicas ni fondos fiduciarios.** Las universidades no figuran como entidad: aparecen como transferencias del programa "Desarrollo de la Educación Superior", desagregadas por provincia, no por universidad.

## Pendientes de verificar ANTES de publicar una cifra (requisito 0)
1. **Unidad de los montos** (probablemente millones de pesos): confirmarla contra un total oficial conocido (gasto total devengado de la Administración Nacional de 2024 según la Cuenta de Inversión o la Oficina de Presupuesto del Congreso) y contra `serie_finfun_anual.csv`.
2. **Discrepancia en universidades**: en el archivo de 2024, las transferencias del programa "Desarrollo de la Educación Superior" suman 3.318.005 (unidades del archivo), y la Cuenta de Inversión 2024 informa $1.386.917 millones de transferencias a universidades nacionales (partida 5.6, todas las jurisdicciones). Entender la diferencia (unidad, conceptos incluidos, filas duplicadas por etapa o por fuente) antes de mostrar universidades.
3. Que los archivos de 2018 a 2023 tienen las mismas columnas que 2024 y 2025 (solo se abrieron esos dos).
Si alguna verificación no cierra, se detiene la fase y se informa al usuario.

### Resultado del requisito 0 (2026-11-12): cierra
1. **Unidad: millones de pesos.** El devengado total del archivo coincide con `serie_finfun_anual.csv` (que está en pesos) en 2018-2023 y 2025 con cociente 1,0000; en 2024 el archivo da 90.197.487 millones y la serie 90.355.660 (0,18 % menos, probablemente otra foto del dato). Informe de CEPA (ene-2025, devengado e-Sidif): 89.653.693 millones para 2024.
2. **Universidades: la cifra buena es 3.285.292 millones** (inciso 5, partida principal 6, devengado, todas las jurisdicciones, 2024), igual hasta el último dígito al "TOTAL GENERAL" de la tabla de `comentario_universidades_2024.pdf`. Los $1.386.917 millones del texto de ese mismo documento no cuadran con su tabla (se parecen al crédito presupuestado inicial del programa, 1.385.289): no usarlos. El archivo **sí trae cada universidad** en `subparcial_desc` (UBA 602.898; UTN 235.292; La Plata 226.819…). `ubicacion_geografica_desc` no sirve para ubicar a cada universidad. Lo que las universidades declaran como gasto propio (1.437.082 millones) es otra fuente y no se mezcla con las transferencias.
3. **Columnas**: 2021 a 2025 tienen las 56 columnas; 2018 a 2020, 52 (les faltan `prestamo_externo_id/desc` y `codigo_bapin_id/desc`, que no se usan). Codificación utf-8 con BOM y **decimales con punto**. `ultima_actualizacion_fecha` es un texto ("Última actualización del ejercicio 2024: 01 Julio 2025."): hay que sacarle la fecha. Cada ZIP pesa unos 4 MB (CSV de 100 a 120 MB, 110 a 140 mil filas): entra entero en memoria.
4. `serie_finfun_anual.csv` trae también el PIB nominal de cada año en pesos (columna `pib`).

## Fase 1 (lista, después del requisito 0): el gasto por año
### Pipeline
1. `pipeline/gasto_nacion.py`: baja el ZIP anual de cada año, lo lee por partes (es grande) y lo **agrega** a lo que usa el sitio; el archivo crudo no se guarda ni se versiona. Los años cerrados se agregan una sola vez y quedan como respaldo chico en `datos/cache/gasto_nacion_<AÑO>.csv` (versionado); el año en curso se vuelve a bajar como mucho una vez por día (mirar `ultima_actualizacion_fecha`).
2. Salida `web/public/datos/gasto_nacion.json` (o un archivo por año si pesa más de 1 MB): por año, el total y los árboles agregados con las cinco etapas: finalidad → función; jurisdicción → entidad → programa; inciso → partida principal; provincia (`ubicacion_geografica_desc`); fuente de financiamiento. Más el PIB y el IPC promedio del año, para mostrar pesos de hoy y % del PIB (el IPC sale del que ya usa el pipeline; el PIB, de `serie_finfun_anual.csv` o del catálogo).
3. Nombres: pasar las descripciones a mayúscula inicial y unificar variantes de un mismo organismo entre años con el mapeo interanual; un organismo que cambia de ministerio se sigue por su nombre de entidad o programa, y se dice.
4. Se corre en la corrida completa; `--solo-json` rearma desde los respaldos. Si falla, avisa y la corrida sigue (patrón de `diario.py` y `semaforo.py`).

### Formato de los archivos (contrato entre pipeline y sitio)
Montos en millones de pesos corrientes, redondeados a 1 decimal. Etapas, siempre en este orden: `[presupuestado, vigente, comprometido, devengado, pagado]`.
- `web/public/datos/gasto_nacion.json` (índice, chico):
  `{ "generado": "AAAA-MM-DD", "fuente": "...", "anios": [ { "anio": 2024, "en_curso": false, "actualizado": "2025-07-01", "pib": <millones de $ o null>, "total": [5 etapas], "archivo": "gasto_nacion_2024.json" } ], "serie_larga": { "anios": [2004, ...], "pib": [...], "finalidades": [ { "n": "Servicios sociales", "v": [devengado por año], "h": [ { "n": "Salud", "v": [...] } ] } ] } }`
  (`serie_larga` sale de `serie_finfun_anual.csv`, devengado, en millones.)
- `web/public/datos/gasto_nacion_<AÑO>.json`: `{ "anio": 2024, "arboles": { "para_que": Nodo, "quien": Nodo, "en_que": Nodo, "donde": Nodo, "fuente": Nodo } }` con `Nodo = { "n": nombre, "v": [5 etapas], "h"?: [Nodo, ...] }` (la raíz es el total, `n` = "Total"; hijos ordenados por devengado de mayor a menor):
  - `para_que`: finalidad → función.
  - `quien`: jurisdicción → entidad → programa; en el programa "Desarrollo de la Educación Superior", un nivel más con cada universidad (`subparcial_desc` de inciso 5, partida principal 6) y el resto del programa en "Otros gastos del programa".
  - `en_que`: inciso → partida principal.
  - `donde`: provincia (`ubicacion_geografica_desc`).
  - `fuente`: fuente de financiamiento.
  Nombres con mayúscula inicial y el resto como en el original (siglas intactas), espacios limpios. Cada nodo puede llevar `"t"`: el nombre técnico ("Inciso 1 - Gastos en personal") cuando `n` es el nombre del público.
- El sitio pasa a pesos de hoy con el IPC que ya carga (`base.json`: promedio del IPC del año contra el último mes) y a % del PIB con `pib` del índice.

### Sitio
5. Ruta `/gasto/` ("En qué gasta la Nación"). Carga su archivo aparte (como `useSemaforo`).
6. Arriba: el año (por defecto el último cerrado; el año en curso aparece marcado "en curso, datos al <fecha>"), la medida (`Seg`: pesos de hoy / % del total / % del PIB) y la etapa (devengado por defecto; "presupuestado" para comparar).
7. Cuatro formas de mirar (`Seg`): **Para qué** (finalidad y función), **Quién** (ministerio → entidad → programa), **En qué** (sueldos, bienes y servicios, transferencias, obras, intereses…), **Dónde** (por provincia; aclarando que la ubicación es la que declara cada partida y que mucho gasto figura en CABA o "nacional"). Cada una es una lista de barras ordenada de mayor a menor, con el monto, el % del total y el % ejecutado sobre el crédito vigente; al tocar una barra se abre su nivel siguiente (migas para volver). La selección va en la URL.
8. Buscador por nombre de organismo o programa ("universidad", "ANSES", "Conicet").
9. Comparar años: para la barra elegida, un gráfico chico con sus años disponibles en pesos de hoy y en % del PIB (2018 en adelante; por finalidad y función, desde 2004 con la serie larga).
10. Compartir: imagen de la vista (las diez barras principales con su monto y %), link y vista previa en redes para la página.
11. Al pie, plegado: qué incluye y qué no (sin empresas públicas ni fondos fiduciarios; sin provincias ni municipios), qué es cada etapa del gasto y la fuente con su fecha de actualización.
12. Reglas del sitio: cálculos en `web/lib/gasto.ts`; números con `formato.ts` (montos grandes en billones o millones de pesos, sin notación rara); las cuentas cierran (la suma de las partes que se ven da el total que se ve, o se muestra "otros"); nada desborda a 360 px; sin `<select>` nativo; palabras del público ("sueldos" y no "inciso 1"; el nombre técnico, al tocar); sin veredicto (D-012).

### Cómo se verifica
Requisito 0 cerrado y anotado; `--solo-json`, `npm run previas`, `tipos`, `build`; el total de un año coincide con la fuente oficial; tres organismos comparados con Presupuesto Abierto; `/gasto/` a 360 y 1280 px en las cuatro formas; barridos; `revisor`.

## Fase 2: cómo viene el año en curso
Ejecución mes a mes del año en curso contra el presupuesto y contra el mismo período del año anterior, con el archivo mensual. Permite ver qué organismos gastaron más o menos que el año pasado a la misma altura y cuánto del crédito ya usaron.

### La fuente mensual (probada el 2026-11-13)
- `.../datasets/<AÑO>/credito-mensual-<AÑO>.zip` (2026: 11,5 MB comprimido, 335 MB y 362 mil filas sin comprimir; 2025: 15 MB). Mismas 56 columnas que el anual más `impacto_presupuestario_anio` y `impacto_presupuestario_mes` (1 a 12). utf-8 con BOM (las tildes vienen bien); **decimales con coma**.
- Cómo vienen las etapas por mes: **presupuestado**, todo en enero; **vigente**, el de enero más las modificaciones de cada mes (la suma acumulada da el vigente al cierre de cada mes; 2026: 148.069 en enero → 152.475 mil millones, igual al vigente del archivo anual); **devengado** y **pagado**, lo de cada mes.
- El último mes viene **parcial**: el archivo de 2026 se actualizó el 11-11-2026 y noviembre trae solo 0,9 billones contra 12,4 de octubre. Meses completos = los anteriores al mes de `ultima_actualizacion_fecha` (todos, si la fecha es del año siguiente o del último día del mes).
- Controles conocidos: la suma de los meses de 2025 debe dar el devengado del archivo anual de 2025; la de 2026, el del anual de 2026 (son fotos del mismo día o de días cercanos).

### Pipeline
1. `pipeline/gasto_mensual.py` (aparte de `gasto_nacion.py`, que se importa para reusar `limpiar`, `_clave`, `_con_tildes`, `INCISOS`, `_fecha_actualizacion`, `anio_cerrado` y `_get`). Lee el CSV **por partes** (`chunksize`, solo las columnas que usa) y agrega por mes; el crudo no se guarda.
2. Años: el año en curso (`A`, el último con al menos un mes completo; en enero, si no hay ninguno, el anterior) y `A-1`. Respaldos versionados en `datos/cache/gasto_mensual_<AÑO>.csv` (formato largo: `arbol, ids, n1, n2, n3, mes, pres, vig, dev`, montos en millones, una fila por hoja y mes) y fechas en `datos/cache/gasto_mensual_meta.json`. `A-1` cerrado (`anio_cerrado`) no se vuelve a bajar; el año en curso, a lo sumo una vez por día. Con `--solo-json`, solo respaldos.
3. Árboles: `para_que` (finalidad → función), `quien` (jurisdicción → entidad → programa, sin el nivel de universidades) y `en_que` (inciso con nombre del público y técnico en `t` → partida principal). Nombres con `limpiar` y tildes repuestas; un nodo de un año se empareja con el del otro por `_clave` del nombre limpio (si un programa cambió de nombre, queda sin año anterior y el sitio lo dice).
4. Controles (si no pasan, no se escribe el archivo, se avisa y la corrida sigue): la suma de los 12 meses de `A-1` da el devengado del archivo anual de `A-1` con menos de 0,5 % de diferencia; la de `A`, el del anual de `A` con menos de 2 %; el vigente acumulado de `A` da el vigente del anual de `A` con menos de 2 %; cada árbol suma el mismo total.
5. Salida `web/public/datos/gasto_nacion_mensual.json` (se llama desde `obtener_datos.py` igual que `gasto_nacion`, fuera del hash; si falla, la corrida sigue sin el archivo).

### Formato (contrato entre pipeline y sitio)
Montos en millones de pesos corrientes, 1 decimal.
```
{ "generado": "AAAA-MM-DD", "fuente": "...", "anio": 2026, "anio_ant": 2025,
  "actualizado": "2026-11-11", "meses_completos": 10, "mes_parcial": 11 | null,
  "total": NodoM,
  "arboles": { "para_que": NodoM, "quien": NodoM, "en_que": NodoM } }
NodoM = { "n": nombre, "t"?: técnico,
  "d":  [devengado de cada mes de A, desde enero hasta el último con datos (incluye el parcial)],
  "a":  [devengado de cada mes de A-1, 12 valores],
  "vd": [vigente al cierre de cada mes de A, mismo largo que d],
  "va": [vigente al cierre de cada mes de A-1, 12 valores],
  "p":  presupuestado inicial de A, "pa": presupuestado inicial de A-1,
  "h"?: [NodoM, ...] }   // hijos ordenados por devengado de A a la fecha, de mayor a menor
```
Un nodo que no existe en un año lleva ceros en ese año. `total` es la raíz (igual a la raíz de cada árbol).

### Sitio
6. En `/gasto/`, arriba de todo, un `Seg` de dos opciones: **"Año completo"** (lo de la fase 1, por defecto) y **"Cómo viene <A>"**. Va en la URL (`vista=mes`); los demás parámetros de la fase 1 no cambian de significado. Si el archivo mensual no está, el `Seg` no aparece y un link viejo con `vista=mes` muestra el año completo.
7. "Cómo viene <A>", de arriba abajo:
   - **Tres tarjetas** (meses completos, ene a <mes>): gastado en pesos de hoy; variación real contra el mismo período de `A-1`; % del crédito vigente ya gastado, con el de `A-1` a la misma altura ("en 2025 a esta altura: 78 %"). Sin veredicto (D-012) y sin verde/rojo: el gasto que sube no es bueno ni malo.
   - **Gráfico de barras por mes**, `A` contra `A-1`, en pesos de hoy (cada mes deflactado con el IPC de ese mes; los meses sin IPC publicado, con el último, y se dice). El mes parcial se ve aparte, más claro y marcado "parcial, al 11-11", y no entra en ninguna cuenta.
   - **Lista** con las formas Para qué / Quién / En qué (`Seg`; Dónde no va): cada fila con el nombre, lo gastado a la fecha en pesos de hoy, la variación real contra `A-1` y el % ejecutado del vigente (con el de `A-1`). Orden elegible: monto (por defecto), más subió, más bajó. Al tocar una fila se abre su nivel siguiente, con migas, igual que en la fase 1. Filas sin año anterior: "nuevo en <A>" o "sin dato de <A-1>" en lugar de la variación; una variación sobre una base de menos de 0,1 % del total del nivel abierto que además más que se duplica se muestra como "—" con la explicación en la misma fila (evita "+4.000 %"; tocar la fila ya abre el nivel siguiente). Hasta 10 filas y "Otros", y las cuentas cierran.
   - Compartir: imagen con las tres cifras y las diez filas que se ven (nueva función en `web/lib/gasto.ts`, mismo panel `PanelGasto`).
   - Nota plegada: qué es el devengado, por qué el último mes no cuenta, que el vigente cambia durante el año y que se compara con la misma cantidad de meses del año anterior; fuente y fecha.
8. Cálculos en `web/lib/gasto.ts` (o `gasto-mensual.ts`): deflactor mensual sobre el IPC de `base.json`; carga en `useGasto.ts`. Reglas de siempre: formato es-AR, 360 px sin desborde, sin `<select>` nativo, palabras del público.

### Cómo se verifica
`python pipeline/gasto_mensual.py` con red pasa los controles; `--solo-json` arma el archivo desde los respaldos; la suma ene-oct 2026 del archivo coincide con la del CSV crudo; `tipos` y `build`; `/gasto/?vista=mes` a 360 y 1280 px en las tres formas, con el mes parcial aparte y las cuentas cerrando; un link viejo de `/gasto/` sigue igual; `revisor`.

## Fase 3: universidades nacionales (con lo que hay)
Lo que los datos oficiales permiten hoy, y lo que no:
- **Sí**: transferencias del Tesoro al conjunto de las universidades por año (2018 en adelante) y por provincia; en pesos de hoy y % del PIB. Agregado nacional de estudiantes de universidades públicas (Ministerio de Educación, CSV 2014-2023) para un "gasto por estudiante" de todo el sistema, aclarando años y definición.
- **Solo en PDF, a cargar a mano con su cita**: la tabla por universidad de la Cuenta de Inversión 2024 ("Comentario a la ejecución presupuestaria – Universidades Nacionales", `https://www.argentina.gob.ar/sites/default/files/comentario_universidades_2024.pdf`): recursos y gastos declarados por cada universidad. Total del sistema en 2024: recursos $1.630.581 millones; gastos $1.437.082 millones, de los cuales sueldos 81,95 %, bienes y servicios 11,43 %, capital 3,62 %. Cargar en `datos/manual/universidades.json` con documento y página; revisar a mano porque la tabla sale desordenada al extraerla.
- **Rendición de cuentas: lo único que se puede decir con respaldo oficial**: la Cuenta de Inversión 2024 dice que "han dado cumplimiento la totalidad de las instituciones (61) en cuanto a la presentación de la información requerida por las pertinentes normas de cierre". Eso es presentar la información de cierre; no es una auditoría. **No existe un listado oficial público de qué universidades rindieron o no sus gastos.** La Resolución 77/2025 (Boletín Oficial, 30-04-2025) habla de 672 instituciones con rendiciones pendientes de subvenciones del ex Ministerio de Ciencia por unos $33.000 millones: no son solo universidades ni trae nombres. La página dice exactamente eso, con las citas, y no afirma más (D-012). Informes de la Auditoría General de la Nación sobre transferencias a universidades (por ejemplo el 2023-004): leerlos y citarlos antes de sumar nada.
- **No se puede** (sin datos abiertos): transferencias mes a mes por universidad, gasto por inciso de cada una fuera de 2024, estudiantes y docentes por universidad (el portal de estadísticas universitarias no respondió; reintentar), gasto por estudiante por universidad.
- Necesita: resolver la discrepancia del requisito 0 y que alguien lea los PDF (agente con lectura de PDF o el usuario).

## Fase 4: empresas públicas
La Oficina de Presupuesto del Congreso tiene un monitor de transferencias a empresas públicas, sin descarga. Sin fuente legible por un programa: queda como idea (candidata a "agentes que buscan el dato").

## Fuera de alcance
Provincias y municipios (spec aparte); recursos e impuestos nacionales (se puede sumar después con los archivos de `recurso` del mismo repositorio); juicios sobre si un gasto está bien o mal.
