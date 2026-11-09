# Precios en el mundo (bloque 6c)

## Objetivo
Responder "¿la carne (o la ropa, o los servicios) en Argentina es más cara o más barata que afuera, en dólares?". Para cada rubro del IPC se muestra cuánto cuesta en Argentina comparado con el promedio del mundo y con otros países:
- **medido** en los años que el Banco Mundial lo midió (Programa de Comparación Internacional, ICP: 2017 y 2021, y 2024 si ya está publicado);
- **estimado** mes a mes desde la última medición, con la inflación de cada rubro y el tipo de cambio.

Lo estimado se marca siempre como tal.

## Qué ve y hace el usuario
1. En **Contexto** aparece un bloque nuevo, **Precios en el mundo**. Arriba elige el dólar para pasar los precios argentinos: **oficial** (por defecto) o **blue**.
2. Ve una tabla de rubros (Alimentos, Ropa y calzado, Vivienda y servicios, Salud, Transporte, Educación, Restaurantes, Carne, Pan y cereales…) con una barra por rubro. Ejemplo: "Ropa y calzado: Argentina 145 (mundo = 100) · estimado oct-26". Los rubros están ordenados de más caro a más barato.
3. Toca **Ropa y calzado** y ve un gráfico mensual del nivel de precios de Argentina contra el mundo (100) y contra los países elegidos (EE.UU., zona euro, Brasil, Chile…). Los puntos medidos (2017, 2021) se marcan; la línea entre medición y medición, y después de la última, es estimada.
4. Elige otros países con chips. Los que no publican precios por rubro aparecen deshabilitados, con el aviso "sin datos por rubro".
5. Cambia el dólar a **blue**: los niveles de Argentina bajan en los años con brecha. Una nota explica que con cepo el resultado depende mucho del dólar elegido.
6. Busca en Plantillas "carne Argentina mundo" y encuentra "Carne: Argentina contra el mundo, en dólares".
7. En el recuadro "Contexto del mandato" de Por presidente aparece una línea: "Rubro más caro contra el mundo al final del mandato: Ropa (145); más barato: Servicios de la vivienda (40)".

## Requisitos

### Datos nuevos (pipeline)
1. Antes de programar, confirmar cada fuente con el agente `investigador-datos` (URL, códigos, cobertura, si hace falta clave). Lo que no se pueda bajar sin clave o solo esté en PDF queda afuera y se anota en el resumen final y en la página.
2. Todas las descargas pasan por la caché (`_cacheado` / `_cache_df`); `--solo-json` sigue funcionando sin red.
3. **Niveles de precios medidos (Banco Mundial, ICP)**: índice de nivel de precios por rubro ("Price level index, World = 100") de 2017 y 2021 (y 2024 si está publicado), para Argentina, el mundo y los países de la lista. Fuente: DataBank del Banco Mundial (base ICP), por API o descarga.
4. **Inflación por rubro de cada país, mensual** (para estimar entre mediciones y hasta hoy):
   - Argentina: las divisiones del IPC nacional del INDEC que ya están en el catálogo (`ipc_nacional_01_coicop` … `_12_coicop`) y las series de productos del requisito 6.
   - EE.UU., México, Chile, Colombia y otros miembros: base de precios de la OCDE por división COICOP (`DSD_PRICES@DF_PRICES_ALL` o su sucesora COICOP 2018), vía la API SDMX de la OCDE.
   - Zona euro: HICP de Eurostat por COICOP (`prc_hicp_midx`), API pública sin clave.
   - Brasil: IPCA por grupo (IBGE, API SIDRA).
   - Uruguay, Paraguay y Bolivia: solo si sus institutos publican el IPC por división en un formato descargable. Si no, quedan afuera.
5. **Tipo de cambio mensual contra el dólar** de cada país (OCDE, FRED u organismo oficial). Para Argentina se usan `fx_oficial` y `fx_blue`, que ya están en el catálogo.
6. **Productos**: 6 a 8 rubros más finos que existan en el ICP y en el IPC de Argentina y de la mayoría de los países: carne, pan y cereales, leche-quesos-huevos, frutas y verduras, electricidad-gas, combustibles. Para Argentina se usan series del IPC del INDEC (nacional o, si no hay, GBA) agregadas con la skill `nueva-serie`. Un producto entra solo si hay datos para Argentina y al menos 2 países más.
7. Todo va en un archivo nuevo, `web/public/datos/precios_mundo.json` (formato en "Datos"), siguiendo D-008: datos multipaís fuera del catálogo mensual.

### Cálculo
8. **Medido**: el índice del ICP tal cual (mundo = 100) en cada año de medición, por rubro y país.
9. **Estimado**: desde cada medición, el nivel de cada país en dólares se mueve con su inflación del rubro y su tipo de cambio:
   `nivel(t) = nivel(medición) × [IPC_rubro(t) / IPC_rubro(medición)] / [TC(t) / TC(medición)]`
   Usa el promedio del año de la medición para IPC y TC. El "mundo" se mueve con la inflación del rubro de EE.UU. en dólares, como aproximación, y se dice en la nota.
10. Entre dos mediciones se muestra la estimación hacia adelante desde la anterior, y en el año de la nueva medición se ve el salto a lo medido (no se reescribe el pasado). La nota explica la diferencia.
11. Con dólar **blue**, solo cambia el tipo de cambio de Argentina en el cálculo. El valor medido de 2017 y 2021 se reexpresa: `nivel_blue = nivel_oficial × TC_oficial / TC_blue` del año.
12. Todo el cálculo vive en `web/lib/preciosMundo.ts` (una sola fuente de verdad para el bloque, las plantillas y el recuadro).

### Bloque "Precios en el mundo" (en Contexto)
13. Bloque nuevo dentro de `/contexto/`, después de "La Argentina y otros países", con su ancla (`#precios-mundo`).
14. Selector de dólar: Oficial (por defecto) | Blue (`pmd`).
15. **Tabla de rubros**: rubro, nivel de Argentina (mundo = 100), barra horizontal centrada en 100 (más caro a la derecha, más barato a la izquierda) y fecha del dato, con "medido" o "estimado". Ordenada de más caro a más barato. Las 12 divisiones primero y después los productos, en una sub-tabla.
16. Tocar un rubro abre su detalle (`pmr`): gráfico mensual con Argentina, el mundo (100) y los países elegidos. Los puntos medidos se marcan con un círculo y la parte estimada va punteada. Debajo, una tabla con los valores medidos de cada país.
17. Países elegibles con chips (`pmp`); por defecto EE.UU., zona euro, Brasil y Chile. Los países sin datos por rubro se muestran deshabilitados con "sin datos por rubro".
18. Notas siempre visibles:
    - qué es el ICP y que "100 = promedio del mundo";
    - que lo estimado puede desviarse de la próxima medición;
    - que con cepo o brecha alta el nivel en dólares depende mucho del dólar elegido;
    - que no se comparan calidades ni impuestos por separado.
19. A 375 px la tabla entra sin scroll horizontal (rubro y barra; la fecha va debajo del rubro).

### Integración
20. **Plantillas**: una plantilla curada por rubro, "<Rubro>: Argentina contra el mundo, en dólares", que abre `/contexto/?pmr=<rubro>#precios-mundo`. Se pueden buscar con "carne", "ropa", "mundo", "afuera", "dólares". Se agregan al grupo "Dólar y mercados" o a uno nuevo, "En el mundo".
21. **Recuadro "Contexto del mandato"**: una línea con el rubro más caro y el más barato contra el mundo en el último mes del mandato (o el último dato, para el presidente en curso), con el dólar oficial.

## Datos
`web/public/datos/precios_mundo.json` (generado, no versionado):

```json
{
  "rubros": { "01": {"n": "Alimentos y bebidas no alcohólicas", "icp": "<código ICP>"}, "carne": {...}, ... },
  "paises": { "ARG": "Argentina", "USA": "Estados Unidos", "EA": "Zona euro", "BRA": "Brasil", ... },
  "medido": { "2017": { "01": { "ARG": 87.5, "USA": 120.1, ... } }, "2021": {...} },
  "fechas": ["2017-01", ...],
  "ipc": { "01": { "USA": [mensual, null = hueco], ... } },
  "tc": { "USA": [1, 1, ...], "BRA": [...], ... },
  "sin_datos": { "URY": "no publica el IPC por división en formato descargable" },
  "fuente": "Banco Mundial, ICP 2017 y 2021; OCDE; Eurostat; IBGE; INDEC"
}
```

El IPC por rubro y los dólares de Argentina salen del catálogo, no se duplican en este archivo.

## Casos borde
- Rubro que el ICP mide pero que algún país no publica en su IPC: ese país no tiene estimado para el rubro (solo los puntos medidos).
- Mes sin dato de IPC o de tipo de cambio de un país: hueco en la línea.
- Argentina antes de dic-2016 (sin IPC por división nacional): la estimación arranca en 2017; no hay datos previos.
- ICP 2024 publicado después de implementar: el pipeline lo toma si aparece, sin cambiar código (la lista de años sale de la fuente).
- Rubro de producto que no encaja exacto entre ICP e IPC (ej. "carne" vs. "carnes y derivados"): se usa igual, con la diferencia anotada en la descripción del rubro.
- Dólar blue antes de que exista la serie: se usa el oficial y se avisa.

## Fuera de alcance
- Comparar precios relativos (cada rubro contra la inflación de su propio país) en base 100.
- Precios de productos puntuales en góndola (marca, tamaño).
- Salarios en dólares entre países.
- Capacidad de gobierno (bloque 6d).

## Cómo se verifica
1. `python pipeline/obtener_datos.py` termina sin error y genera `precios_mundo.json`; `--solo-json` también, sin red.
2. Revisar a mano, contra el DataBank del Banco Mundial, 3 valores medidos: Argentina 2021 en Alimentos, Ropa y calzado, y el total del consumo.
3. Comprobar a mano un estimado: Argentina, Ropa, un mes de 2023, con la fórmula del requisito 9.
4. `cd web && npm run tipos && npm run build` sin errores.
5. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - Bloque en Contexto; tabla ordenada; barra centrada en 100; "medido" y "estimado" bien marcados.
   - Detalle de un rubro con Argentina, mundo y 4 países; puntos medidos marcados; parte estimada punteada.
   - Oficial vs. blue: en 2021–2023 Argentina baja con blue; las notas se ven.
   - Países sin datos deshabilitados con el aviso.
   - Plantillas: buscar "carne mundo" abre el detalle de carne.
   - Recuadro del mandato con rubro más caro y más barato.
