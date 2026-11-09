# Contexto internacional (bloque 6b)

## Objetivo
Que al juzgar a un presidente se vea también lo que no controlaba:
- qué se esperaba para cada año y qué pasó, en Argentina y en el mundo;
- cómo le fue a la Argentina contra sus vecinos y otros países;
- si el contexto soplaba a favor o en contra (precios de lo que exportamos, tasa de la Fed, Brasil y China).

Todo con datos del FMI y de fuentes oficiales, con la misma vara para todos los presidentes y sin hablar de culpas.

## Qué ve y hace el usuario
1. En la navegación aparece **Contexto**, después de Ranking. Arriba elige el **grupo de comparación**: Mundo, Emergentes, América Latina y el Caribe, o Vecinos.
2. **Lo esperado vs. lo que pasó**: para cada año, lo que el FMI proyectaba en abril para la Argentina y para el grupo, y lo que pasó al final. Abajo, una tabla por presidente: "Con Macri, la Argentina creció en promedio 1,8 puntos menos de lo esperado por año; el mundo, 0,3 menos. Diferencia: −1,5 puntos". Se puede ver crecimiento, inflación o desempleo.
3. **La Argentina y otros países**: elige el dato (crecimiento, inflación, desempleo, PIB por habitante, PIB real, deuda, resultado fiscal o cuenta corriente) y los países. El PIB real y el PIB por habitante real se pueden ver en **base 100 desde el 2000** (o el año que elija), para ver cuánto creció cada país. Ve un gráfico anual con las líneas de cada uno y una tabla por presidente con el promedio de la Argentina, el de cada país y el puesto de la Argentina entre los elegidos.
4. **Viento de cola o de frente**: gráficos de soja, maíz, trigo y petróleo en dólares de hoy, términos de intercambio, tasa de la Fed y crecimiento de Brasil y China. Una tabla por presidente marca cada uno como **a favor**, **neutro** o **en contra**, comparado con el promedio de toda la serie.
5. En **Por presidente** y en el detalle de **Ranking**, un recuadro corto **Contexto del mandato** muestra para el presidente elegido: crecimiento propio vs. el del grupo, la sorpresa contra lo proyectado y cuántos vientos fueron a favor o en contra. Un link lleva a Contexto.
6. Si hay una fuente oficial descargable, **Consumo de carne vacuna por habitante** aparece como serie nueva en Precios o en Actividad › Consumo, y entra en curiosidades y plantillas como cualquier otra.

## Requisitos

### Datos nuevos (pipeline)
1. Antes de programar, confirmar cada fuente con el agente `investigador-datos`: URL exacta, códigos, desde cuándo hay datos y frecuencia. Si una fuente no existe o no se puede bajar sin clave, se deja afuera y se anota en el resumen final.
2. Todas las descargas pasan por la caché (`_cacheado` / `_cache_df`), como el resto del pipeline: si la fuente falla, se usa la última copia de `datos/cache/`.
3. **Datos anuales por país (FMI, World Economic Outlook)**, vía la API de DataMapper (`https://www.imf.org/external/datamapper/api/v1/<indicador>/<países>`, sin clave):
   - Indicadores: crecimiento del PIB real (`NGDP_RPCH`), inflación promedio (`PCPIPCH`), desempleo (`LUR`), PIB por habitante en dólares PPA (`PPPPC`), PIB por habitante real a PPA constante (`NGDPRPPPPC`), deuda pública bruta % del PIB (`GGXWDG_NGDP`, `dir: -1`), resultado fiscal % del PIB (`GGXCNL_NGDP`, `dir: 1`), cuenta corriente % del PIB (`BCA_NGDPD`, `dir: 1`). Si algún código no existe en DataMapper, se usa el equivalente que el FMI tenga y se anota.
   - Países: Argentina, Brasil, Chile, Uruguay, Paraguay, Bolivia, Perú, Colombia, México, Ecuador, Estados Unidos, zona euro, China.
   - Grupos: Mundo, Emergentes y en desarrollo, América Latina y el Caribe, Economías avanzadas. Los códigos de los grupos se confirman en `/api/v1/countries` y `/api/v1/regions`.
   - "Vecinos" = promedio simple de Brasil, Chile, Uruguay, Paraguay y Bolivia (lo calcula la web).
   - Desde 1990. Los años que el FMI marca como proyección se guardan con esa marca.
4. **Proyecciones históricas**: la proyección de **abril del mismo año** para crecimiento, inflación y desempleo, para Argentina, los 4 grupos y los países de la lista, desde el primer año disponible. Fuente: la base "Historical WEO Forecasts" del FMI o las ediciones viejas de la base del WEO (a confirmar en el requisito 1).
5. Los datos anuales y las proyecciones no entran en el catálogo mensual: van en un archivo nuevo, `web/public/datos/contexto.json`, escrito por `escribir_json_web` (formato en "Datos"). Decisión D-008.
6. **Series mensuales nuevas en el catálogo**, categoría nueva `Contexto internacional` (`cat[0]`), con `fuente` y `desc` para un lector común:
   - Precios internacionales de soja, maíz, trigo y petróleo Brent, en US$ por tonelada o barril (FMI Primary Commodity Prices o Banco Mundial "Pink Sheet"). `tipo: "usd"` (así se pueden ver en dólares de hoy con `cpi_usa`); `dir: 1` para soja, maíz y trigo; `dir: 0` para petróleo.
   - Términos de intercambio (INDEC; trimestral, pasado a mensual con `_trim_a_mes`). `tipo: "none"`, `dir: 1`.
   - Tasa de fondos federales de EE.UU. (FRED, `FEDFUNDS`, CSV sin clave). `tipo: "none"`, `dir: -1`.
7. **Consumo de carne vacuna por habitante**: solo si hay una serie oficial descargable (Ministerio de Agricultura u otro organismo público). Se agrega con la skill `nueva-serie` (kg por habitante por año, `tipo: "none"`, `dir: 0`) y su texto en `INFO_CAT`. Si solo hay PDFs o fuentes privadas, no se agrega y queda anotado en IDEAS.md.
8. `python pipeline/obtener_datos.py --solo-json` sigue funcionando sin red: los datos de contexto también se guardan en `datos/cache/compilado.json` o en su propio archivo de caché versionado.

### Sección Contexto (`/contexto/`)
9. Ruta nueva con su ítem en la navegación (después de Ranking) y `metadata` propia. Carga `contexto.json` y, para el bloque de viento, la categoría nueva del catálogo.
10. Selector de **grupo de comparación** arriba: Mundo (por defecto), Emergentes, América Latina y el Caribe, Vecinos. Queda en la URL (`cg`).
11. **Asignación de años a presidentes**: cada año calendario es del presidente que gobernó 6 meses o más de ese año (ej. 2003 → Néstor Kirchner; 2015 → CFK 2; 2023 → Alberto Fernández). Se explica en una nota. Los presidentes sin ningún año completo (por ejemplo, Duhalde si no llega a 6 meses en un año) se muestran con "sin años completos".
12. **Lo esperado vs. lo que pasó**:
    - Selector de dato: crecimiento (por defecto), inflación o desempleo (`cd`).
    - Gráfico anual con cuatro líneas: Argentina proyectado, Argentina real, grupo proyectado y grupo real (proyectadas punteadas), con los mandatos marcados en el eje.
    - Tabla por año: proyectado, real y sorpresa (real − proyectado) de la Argentina y del grupo, y la diferencia entre las dos sorpresas.
    - Tabla por presidente: años incluidos, sorpresa promedio de la Argentina, sorpresa promedio del grupo y diferencia. Verde, rojo o gris según si fue mejor o peor de lo esperado (en inflación y desempleo, que salga más alto es peor).
    - El texto usa siempre la forma neutra: "rindió X puntos mejor/peor de lo esperado; el grupo, Y". No se usan "culpa" ni "mérito".
    - El año en curso no entra en las sorpresas (todavía no hay dato real). Se muestra la última proyección marcada como "estimado".
13. **La Argentina y otros países**:
    - Selector de dato (`cpd`): crecimiento, inflación, desempleo, PIB por habitante (PPA), **PIB real**, **PIB por habitante real**, deuda pública, resultado fiscal y cuenta corriente (los tres últimos en % del PIB).
    - **Base 100**: para PIB real y PIB por habitante real, la opción "Ver como: Valor | Base 100 desde [año]" (`cpb`, por defecto base 100 desde **2000**; el año se elige entre 1990 y el último año cerrado). El PIB real de cada país se arma como índice encadenando su crecimiento anual (`NGDP_RPCH`); así se ve cuánto creció cada país desde ese año sin importar su tamaño. En base 100 el puesto por presidente se calcula con el crecimiento del índice durante el mandato.
    - Selector de países (chips): por defecto Vecinos (los 5) y Mundo; se pueden sumar los demás países y grupos (`cpp`).
    - Gráfico anual con una línea por país (Argentina destacada) y la tabla por presidente: promedio de la Argentina, promedio de cada país elegido y puesto de la Argentina entre los elegidos (1 = el mejor según `dir`). En PIB por habitante se muestra además la Argentina como % del promedio de los elegidos, al inicio y al final del mandato.
    - Las inflaciones muy altas (ej. Argentina 2023–2024) no deben aplastar el gráfico: escala logarítmica automática para inflación cuando el máximo supera 10 veces la mediana, con la nota correspondiente.
14. **Viento de cola o de frente**:
    - Gráficos mensuales (componente `Grafico`) de soja, maíz y trigo en dólares de hoy, petróleo en dólares de hoy, términos de intercambio y tasa de la Fed. Y anual: crecimiento de Brasil y China.
    - Tabla por presidente: para cada indicador, el promedio del mandato contra el promedio de toda la serie. Se marca **a favor** si está más de 10 % mejor (según `dir`; en la tasa de la Fed, 1 punto), **en contra** si está más de 10 % peor y **neutro** si no. Petróleo (`dir 0`) se muestra sin marca.
    - Nota: "Que el contexto haya sido favorable no dice si se aprovechó bien; que haya sido desfavorable no explica todo lo que pasó".
15. Todos los selectores quedan en la URL. A 375 px las tablas se desplazan de costado dentro de su recuadro, sin romper la página.

### Recuadro "Contexto del mandato"
16. En Por presidente (vista "Un presidente") y en el detalle desplegado de cada fila de Ranking, un recuadro con, para ese presidente y el grupo de comparación por defecto (Mundo):
    - Crecimiento promedio de la Argentina vs. el del grupo en sus años.
    - Sorpresa de crecimiento vs. lo proyectado, la del grupo y la diferencia.
    - Cuántos indicadores de viento fueron a favor, neutros o en contra.
    - Link "Ver el contexto completo" a `/contexto/` con ese presidente resaltado (`cpr`).
17. El cálculo vive en `web/lib/contexto.ts` (una sola fuente de verdad para la sección y el recuadro).

## Datos
`web/public/datos/contexto.json` (generado, no versionado):

```json
{
  "anios": [1990, 1991, ...],
  "entidades": { "ARG": "Argentina", "BRA": "Brasil", ..., "WEOWORLD": "Mundo", ... },
  "indicadores": { "NGDP_RPCH": {"n": "Crecimiento del PIB real", "u": "% anual", "dir": 1}, ... },
  "real": { "NGDP_RPCH": { "ARG": [valores por año, null = sin dato], ... }, ... },
  "es_proyeccion": { "NGDP_RPCH": { "ARG": primer año que es proyección } },
  "proy_abril": { "NGDP_RPCH": { "ARG": [proyección de abril para cada año], ... }, ... },
  "fuente": "FMI, World Economic Outlook (edición de <mes año>) y Historical WEO Forecasts"
}
```

Las series mensuales nuevas van al catálogo normal, en la categoría `Contexto internacional` (un `contexto_internacional.json` más, como cualquier categoría).

Decisión de arquitectura: datos anuales multipaís en un archivo aparte, fuera del catálogo mensual (D-008).

## Casos borde
- País o grupo sin dato en un año: hueco en el gráfico; en los promedios por presidente se usan los años que haya y se indica "n de m años".
- El FMI corrige datos viejos en cada edición: se usa siempre la última edición para "lo que pasó" y la de abril de cada año para "lo esperado". Se aclara en la nota.
- Proyecciones antes del primer año disponible: esos años no tienen sorpresa y no entran en los promedios.
- Milei: años completos hasta el último cerrado; el año en curso aparece como estimado.
- Vecinos con algún país sin dato ese año: promedio de los que haya.
- Si `contexto.json` no se puede bajar: la sección muestra el error y el recuadro de Por presidente no aparece (el resto de la página sigue andando).

## Fuera de alcance
- Explicar las causas de cada desvío (pandemia, guerras, sequías) con texto escrito a mano.
- Proyecciones de consultoras privadas o del REM del BCRA.
- Datos de otros países en Histórico mezclados con las series argentinas.
- Comparar precios por categoría del IPC con otros países (bloque 6c) y salarios entre países.
- Capacidad de gobierno: legisladores propios, leyes, decretos, vetos (bloque 6d).

## Cómo se verifica
1. `python pipeline/obtener_datos.py` termina sin error y genera `contexto.json` y la categoría nueva. `python pipeline/obtener_datos.py --solo-json` también, sin red.
2. Revisar a mano, contra la web del FMI, 3 valores: crecimiento de Argentina 2018 (real), proyección de abril 2018 para Argentina y crecimiento del mundo 2020.
3. `cd web && npm run tipos && npm run build` sin errores.
4. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - Contexto en la navegación; cambiar el grupo de comparación cambia las tablas.
   - Lo esperado vs. lo que pasó: 2020 con sorpresa negativa en Argentina y en el mundo; la diferencia se calcula bien (comprobar un año a mano).
   - Otros países: elegir inflación con Argentina y Vecinos se ve legible (escala log); PIB por habitante muestra el % del promedio.
   - PIB real en base 100 desde 2000: todas las líneas arrancan en 100 en 2000; comprobar a mano el valor de Argentina en 2002 (100 × (1 + crecimiento 2001) × (1 + crecimiento 2002)). Cambiar el año base a 2010 rearma el gráfico.
   - Deuda, resultado fiscal y cuenta corriente se ven para los países elegidos.
   - Viento: la soja del período de Néstor Kirchner y CFK 1 sale "a favor"; la tasa de la Fed de 2023–2024, "en contra".
   - Recuadro en Por presidente y en el detalle de Ranking, con link que resalta al presidente en Contexto.
   - Asignación de años: 2003 es de Néstor Kirchner y 2015 de CFK 2.
5. Si se agregó el consumo de carne: aparece en el selector de variables y en Histórico con su fuente.
