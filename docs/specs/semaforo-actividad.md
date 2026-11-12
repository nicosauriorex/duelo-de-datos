# Semáforo de actividad

Estado: implementada (2026-11-12) con 29 indicadores (la producción de autos se sacó: la serie disponible no coincide con ADEFA; "molienda de trigo" pasó a llamarse producción de harina de trigo), con el cambio de plan de la sección "Decisiones": interanual por defecto; mes contra mes solo con series oficiales.
Ideas: "Semáforo de actividad" (IDEAS.md, 2026-11-12), con ejemplos de Max Capital, Econviews y 1816.

## Objetivo
Una tabla que muestre de un vistazo cómo viene la actividad: unos 28 indicadores mensuales en filas, los últimos meses en columnas, cada celda con la variación pintada según subió o bajó, y abajo el **índice de difusión** (qué porcentaje de los indicadores subió ese mes). Con imagen para compartir y vista previa en redes.

## Decisiones

**Resultado del control (2026-11-12) y cambio de plan.** La estimación propia se aparta demasiado de la oficial: error medio de la variación mensual de 1,3 puntos en el EMAE, 2,7 en la industria, 3,6 en la construcción, 1,4 en minería y 0,1 en empleo, contra variaciones típicas de 1 a 2 puntos; en el último mes de la industria da −1,8 % cuando la oficial da +1,9 %. No sirve para pintar una celda de verde o rojo. Por eso:
- La medida por defecto es **Interanual**, con los 30 indicadores.
- **Mes contra mes** muestra solo las series con ajuste **oficial** (EMAE, industria, minería, construcción, empleo) y la confianza del consumidor (que no lo necesita). Las demás filas dicen "solo interanual". La estimación propia NO se muestra en el sitio (queda en el archivo, campo `sa` con `ajuste: "propia"`, para compararla si algún día se mejora el método).
- Mejorar el método (corrección por días hábiles y feriados, X-13) queda fuera de alcance.

Lo que sigue en esta sección es el plan original; donde contradiga lo de arriba, vale lo de arriba.
- **Dos medidas, a elegir**: "Mes contra mes, sin estacionalidad" (la de los ejemplos; arranque por defecto) e "Interanual" (contra el mismo mes del año anterior; no necesita ajuste).
- **Sin estacionalidad**: se usa la serie oficial desestacionalizada donde existe (EMAE, industria, construcción, minería, empleo). Para el resto, una **estimación propia** calculada en el pipeline, marcada como tal en cada fila. No se instala nada: método clásico de promedios móviles en pandas (tendencia con media móvil centrada de 12 meses, factores estacionales por mes sobre el logaritmo, normalizados). Limitaciones que la página dice en una nota plegada: no corrige feriados móviles ni días hábiles, y los últimos meses pueden cambiar al entrar un dato nuevo.
- **Control de la estimación**: el pipeline aplica el método propio a las series que también tienen versión oficial y registra el error medio de la variación mensual contra la oficial. Se informa al usuario; si el error es grande, la medida por defecto pasa a ser la interanual.
- **En términos reales**: las series en pesos (IVA, créditos y débitos, seguridad social, préstamos) se deflactan con el IPC que ya usa el pipeline. Las que están en dólares o en unidades físicas van tal cual.
- **Color**: verde = subió, rojo = bajó, siempre con el número y su signo. Es la dirección del indicador, no un juicio (D-012). Variación que se lee "0,0": sin color.
- Datos en un archivo aparte (`semaforo.json`), como el parte del BCRA (D-019): cada fila con su propia fecha de último dato.

## Indicadores (fuentes probadas el 2026-11-12)
`dgo:` = serie de la API de datos.gob.ar. "Oficial" = serie oficial sin estacionalidad.

| Grupo | Indicador | Fuente (organismo) | Serie | Ajuste |
|---|---|---|---|---|
| General | Actividad económica (EMAE) | INDEC | dgo:143.3_NO_PR_2004_A_31 (original: 143.3_NO_PR_2004_A_21) | Oficial |
| Industria | Producción industrial | INDEC | dgo:453.1_SERIE_DESEADA_0_0_24_58 (original: 453.1_SERIE_ORIGNAL_0_0_14_46) | Oficial |
| Industria | Producción de autos | ADEFA | dgo:41.3_AA_0_A_23 | Propia |
| Industria | Producción de acero | Cámara Argentina del Acero | CSV 359.3, columna `acero_crudo` | Propia |
| Industria | Producción de hierro | Cámara Argentina del Acero | CSV 359.3, columna `hierro_primario_total` | Propia |
| Industria | Producción minera | INDEC | `serie_ipi_minero.xlsx`, hoja "Cuadro 1" (trae original y desestacionalizada) | Oficial |
| Construcción | Actividad de la construcción (ISAC) | INDEC | dgo:33.2_ISAC_SIN_EDAD_0_M_23_56 (original: 33.2_ISAC_NIVELRAL_0_M_18_63) | Oficial |
| Construcción | Ventas de cemento | AFCP | dgo:38.3_CEM_1994_M_7 | Propia |
| Energía | Producción de gas | Secretaría de Energía | dgo:41.3_GN_0_A_11 | Propia |
| Energía | Demanda de electricidad | CAMMESA | dgo:367.3_DEMANDA_TOTAL__13 | Propia |
| Energía | Venta de naftas | Secretaría de Energía | CSV 365.3 `actividad-empresas.csv`, suma de las columnas `ventas_naftas_*` | Propia |
| Agro y pesca | Faena vacuna | Sec. de Agricultura | dgo:40.3_VC_0_M_15 | Propia |
| Agro y pesca | Faena de aves | Sec. de Agricultura | dgo:40.3_AT_0_M_14 | Propia |
| Agro y pesca | Molienda de trigo | Sec. de Agricultura | dgo:41.3_H_0_A_10 | Propia |
| Agro y pesca | Molienda de soja | INDEC (rama del índice industrial) | dgo:453.2_MOLIENDA_OSAS_0_0_20_8 | Propia |
| Agro y pesca | Pesca | Sec. de Agricultura | CSV 39.3, columna `total_general` | Propia |
| Agro y pesca | Liquidación de divisas del agro | CIARA-CEC | dgo:349.2_ACUM_MENSUAL__13 | Propia |
| Consumo | Ventas en supermercados (reales) | INDEC | dgo:455.1_VENTAS_PRETES_0_M_25_98 | Propia |
| Consumo | Ventas en centros de compra (reales) | INDEC | dgo:458.1_VENTAS_TOTTES_ABRI_M_33_40 | Propia |
| Consumo | Confianza del consumidor | UTDT | dgo:380.3_ICC_NACIONNAL_0_T_12 | Sin ajuste (índice de encuesta) |
| Fiscal | Recaudación de IVA (real) | Min. de Economía | dgo:142.3_IVA_D_2001_M_7 | Propia, deflactada |
| Fiscal | Impuesto a créditos y débitos (real) | Min. de Economía | dgo:142.3_CREDI_2001_M_24 | Propia, deflactada |
| Fiscal | Aportes a la seguridad social (real) | Min. de Economía | dgo:142.3_SISTE_2001_M_24 | Propia, deflactada |
| Crédito | Préstamos personales (reales) | BCRA | dgo:91.1_DETALLE_PRLES_0_0_52 | Propia, deflactada |
| Crédito | Préstamos comerciales (reales) | BCRA | dgo:91.1_PRESTAMOS_LES_0_0_37 | Propia, deflactada |
| Comercio exterior | Exportaciones | INDEC | dgo:74.3_IET_0_M_16 | Propia |
| Comercio exterior | Importaciones | INDEC | dgo:74.3_IIT_0_M_25 | Propia |
| Comercio exterior | Exportaciones a Brasil | INDEC | dgo:77.3_IEB_0_A_24 | Propia |
| Comercio exterior | Importaciones desde Brasil | INDEC | dgo:78.3_IIB_0_A_24 | Propia |
| Empleo | Empleo privado registrado | Sec. de Trabajo | dgo:151.1_AARIADOTAC_2012_M_26 (original: 151.1_AARIADODAD_2012_M_31) | Oficial |

CSV fijos: `https://infra.datos.gob.ar/catalog/sspm/dataset/359/distribution/359.3/download/datos-historicos-de-la-industria-siderurgica-datos-mensulaes.csv`, `.../dataset/365/distribution/365.3/download/actividad-empresas.csv`, `.../dataset/39/distribution/39.3/download/captura-pesquera-por-categorias-valores-mensuales.csv`. Minería: `https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipi_minero.xlsx`.

**Sin fuente legible por un programa (quedan afuera, se listan al pie de la página)**: ventas minoristas pymes (CAME), patentamientos de autos y motos, Índice Construya, escrituras, producción de leche, producción de petróleo (la serie oficial quedó en nov-2025). Candidatos para la idea de "agentes que buscan el dato".

## Requisitos

### Pipeline
1. `pipeline/semaforo.py`: baja cada serie (reutilizando los helpers del pipeline para datos.gob.ar y el caché `_cacheado`; un CSV de respaldo por serie en `datos/cache/`, con nombre `sem_<clave>`), deflacta las que van en términos reales, calcula la serie sin estacionalidad (oficial o propia) y escribe `web/public/datos/semaforo.json`:
   ```json
   { "actualizado": "2026-11-12T17:20:00-03:00",
     "control": [ { "clave": "emae", "error_medio_pp": 0.4, "meses": 120 } ],
     "indicadores": [ { "clave": "emae", "grupo": "General", "nombre": "Actividad económica (EMAE)", "fuente": "INDEC",
        "unidad": "índice 2004=100", "ajuste": "oficial", "real": false, "id": "143.3_NO_PR_2004_A_31",
        "f0": "2004-01", "orig": [100.0, null], "sa": [100.2, null] } ] }
   ```
   `orig` y `sa` son listas mensuales desde `f0` (`null` donde no hay dato); `ajuste` es `oficial`, `propia` o `ninguno`; `id` es el id de la serie en el catálogo del sitio si ya existe (para enlazar a su ficha), o `null`.
2. Estimación propia: solo si la serie tiene al menos 36 meses; valores no positivos se tratan sin logaritmo (método aditivo). Si no se puede, `sa` va vacío y la fila solo tiene interanual.
3. Control: aplicar el método propio a las cinco series con versión oficial y guardar en `control` el error medio absoluto, en puntos porcentuales, de la variación mensual propia contra la oficial (últimos 10 años). Imprimirlo en el registro.
4. Se corre en la corrida completa. En `--solo-json` se rearma desde los CSV de `datos/cache/` sin red. Si una serie falla, se usa su respaldo y se avisa; si el semáforo entero falla, se avisa y la corrida sigue sin el archivo (como el parte diario).
5. Series que son suma de columnas (naftas) o que vienen en un XLSX (minería): leerlas con cuidado y validar que el último dato no sea absurdo (caída o suba de más de 60 % en un mes: avisar).

### Sitio
6. Ruta `/semaforo/` ("Semáforo de actividad"). Carga `semaforo.json` aparte (como `useDiario`).
7. Tabla: una fila por indicador, agrupadas por grupo con su encabezado; columnas con los últimos 7 meses terminando en el mes del dato más nuevo. Cada celda: la variación con signo y un decimal, fondo verde o rojo con intensidad según el tamaño (escala por indicador o con tope, para que un +30 % no apague al resto), vacía si no hay dato. Primera columna fija; en celular la tabla se desliza de costado dentro de su contenedor y arranca mostrando los meses más nuevos.
8. Selector de medida (`Seg`): "Mes contra mes" (sin estacionalidad) / "Interanual". Se guarda en la URL. Con "Mes contra mes", las filas con estimación propia llevan una marca discreta ("est.") con su explicación al tocarla, y las que no tienen serie ajustada quedan vacías con la nota "solo interanual".
9. Última fila: **índice de difusión** de cada mes (porcentaje de indicadores con dato que subieron; una variación que se lee 0,0 no cuenta como suba), con cuántos indicadores entraron en la cuenta.
10. Cada fila dice su fuente y la fecha de su último dato. Tocar una fila abre una ventana con el gráfico de los últimos 5 años (original y sin estacionalidad) y, si la serie está en el catálogo, un enlace a su ficha (`hrefDato`).
11. Arriba: una línea de qué es, el mes del semáforo y un resumen en palabras neutras ("En sep-26 subieron 14 de 26 indicadores"). Abajo, plegado: cómo se calcula, qué es la estimación propia con el resultado del control, y la lista de indicadores que no se pudieron incluir y por qué.
12. Compartir: imagen del semáforo en los tres formatos (tabla con colores, difusión, fuente "varias fuentes oficiales y cámaras", marca y dirección), copiar link, y vista previa en redes (`npm run previas` genera `previas/semaforo.png` y título/descripción con el mes y la difusión). Entra en el `sitemap`.
13. Entradas: línea en el bloque de secciones de la portada y enlace desde el tema "Actividad económica". No va en la barra de navegación.
14. Cálculos en `web/lib/semaforo.ts` (variaciones, difusión, escala de color); las cuentas cierran con los valores como se muestran; números con `web/lib/formato.ts`; sin `<select>` nativo; nada desborda a 360 px.

## Casos borde
- Indicadores con distinta demora: las columnas más nuevas tienen celdas vacías; la difusión de ese mes dice con cuántos indicadores se calculó y, si son menos de la mitad, se muestra atenuada.
- Serie corta o con huecos: sin estimación propia; solo interanual.
- Valor anterior cero o negativo: variación sin calcular (celda vacía).
- `semaforo.json` no existe: la página lo dice; el resto del sitio y `npm run previas` siguen.

## Fuera de alcance
- Trimestre contra trimestre y "último dato contra el trimestre previo" (se pueden sumar después como otra medida).
- Sumar estas series al catálogo general y al Histórico (se evalúa después; por ahora solo se enlazan las que ya están).
- Indicadores sin fuente legible por un programa.

## Cómo se verifica
1. `python pipeline/obtener_datos.py --solo-json` (después de una bajada que deje los respaldos) termina sin error y deja `semaforo.json`; revisar el `control` y tres series contra la fuente.
2. `cd web && npm run previas && npm run tipos && npm run build`; barrido de cuentas sin hallazgos.
3. En el navegador, `/semaforo/` a 360 y 1280 px, las dos medidas, la ventana de una fila y Compartir; barrido sin hallazgos.
4. Comparar la variación mensual del EMAE y de la industria con la que publica INDEC.
5. Agente `revisor`.
