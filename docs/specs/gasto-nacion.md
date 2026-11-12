# En qué gasta la Nación (por partida y por entidad)

Estado: lista para implementar la fase 1, previa verificación de unidades (requisito 0); las fases 2 a 4, según se indica (2026-11-12)
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

## Fase 1 (lista, después del requisito 0): el gasto por año
### Pipeline
1. `pipeline/gasto_nacion.py`: baja el ZIP anual de cada año, lo lee por partes (es grande) y lo **agrega** a lo que usa el sitio; el archivo crudo no se guarda ni se versiona. Los años cerrados se agregan una sola vez y quedan como respaldo chico en `datos/cache/gasto_nacion_<AÑO>.csv` (versionado); el año en curso se vuelve a bajar como mucho una vez por día (mirar `ultima_actualizacion_fecha`).
2. Salida `web/public/datos/gasto_nacion.json` (o un archivo por año si pesa más de 1 MB): por año, el total y los árboles agregados con las cinco etapas: finalidad → función; jurisdicción → entidad → programa; inciso → partida principal; provincia (`ubicacion_geografica_desc`); fuente de financiamiento. Más el PIB y el IPC promedio del año, para mostrar pesos de hoy y % del PIB (el IPC sale del que ya usa el pipeline; el PIB, de `serie_finfun_anual.csv` o del catálogo).
3. Nombres: pasar las descripciones a mayúscula inicial y unificar variantes de un mismo organismo entre años con el mapeo interanual; un organismo que cambia de ministerio se sigue por su nombre de entidad o programa, y se dice.
4. Se corre en la corrida completa; `--solo-json` rearma desde los respaldos. Si falla, avisa y la corrida sigue (patrón de `diario.py` y `semaforo.py`).

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
Ejecución mes a mes del año en curso contra el presupuesto, con el archivo mensual (pesado: leer por partes en el pipeline y guardar solo el agregado). Permite ver qué organismos ejecutaron más o menos de lo previsto a la fecha.

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
