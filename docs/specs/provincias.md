# Provincias: gasto, impuestos y ranking

Estado: NO lista para implementar entera. La fase 1 se puede hacer; las fases 2 y 3 están bloqueadas por falta de fuente verificada (2026-11-12)
Ideas: "Gasto e impuestos de las provincias y la Nación" (IDEAS.md, 2026-11-12). El gasto de la Nación va en `gasto-nacion.md`.

## Objetivo
Comparar las provincias: cuánto gasta cada una y en qué, cuánto recauda y con qué impuestos (por ejemplo Ingresos Brutos), cuánto recibe de la Nación, y un ranking por habitante.

## Resultado de la investigación (2026-11-12): faltan las fuentes principales
| Tema | Qué se encontró | Estado |
|---|---|---|
| Gasto de cada provincia (por finalidad y por objeto) | No se encontró una base oficial descargable por provincia. La Dirección Nacional de Asuntos Provinciales (DNAP, Ministerio de Economía) es quien la publica, pero su sitio (`economia.gob.ar/dnap`) no cargó: certificado vencido el 2026-11-12 (falló también en el navegador). `mecon.gob.ar/dnap/` solo muestra una carpeta vieja | **Bloqueado** |
| Recaudación de cada provincia por impuesto (Ingresos Brutos, Sellos, Inmobiliario, Automotor) | Misma fuente (DNAP, "recursos tributarios provinciales"): no accesible. La Comisión Arbitral (COMARB) publica solo totales nacionales de Ingresos Brutos por sistema, en PDF mensual | **Bloqueado** |
| Transferencias de la Nación a cada provincia (coparticipación y leyes especiales) | Planilla mensual de la DNAP "Recursos de origen nacional a provincias": se vio una sola edición (enero 2024) en PDF, en una copia de un sitio privado; unidad sin confirmar | **Bloqueado** (misma fuente) |
| Gasto de la Nación en cada provincia | Sí: archivos de Presupuesto Abierto, columna `ubicacion_geografica_desc`, 2018 en adelante (ver `gasto-nacion.md`). Incluye las transferencias no automáticas a provincias | **Disponible** |
| Gasto de todas las provincias juntas, por finalidad | Sí: datos.gob.ar `451.5_GPPGPP_0_0_3_41` y CSV `gasto-publico-provincial.csv` (1980-2023, anual; cambia de unidad en 1987) y su versión en % del PIB. No distingue provincia | **Disponible** (agregado) |
| Población por provincia | Sí: INDEC, `https://www.indec.gob.ar/ftp/cuadros/poblacion/c2_proyecciones_prov_2010_2040.xls` (una hoja por jurisdicción). Las proyecciones nuevas 2022-2040 y el censo 2022 no se encontraron en archivo | **Disponible** |
| Producto de cada provincia (para "% del producto") | No hay serie oficial uniforme para las 24. Solo Buenos Aires la publica en CSV | **No hay** |
| Alícuotas de Ingresos Brutos y exenciones | No hay base oficial comparada; la COMARB dice que está cargándolas. Solo leyes impositivas de cada provincia y estudios privados | **No hay** |
| Qué impuesto cobra cada jurisdicción (provincia o municipio) | Sí: `https://www.mecon.gob.ar/dnap/recursos/top/potestades_tributarias.xls` (edición 2020) | **Disponible** (viejo) |
| Empleo público por cada mil habitantes; deuda de cada provincia | Cifras en notas de prensa que citan a la DNAP; último informe oficial de deuda encontrado: diciembre de 2020 | **Bloqueado** (misma fuente) |

Conclusión: casi todo lo que se pidió depende de la DNAP. Por lo que se conoce de años anteriores, la DNAP publica planillas por provincia de ejecución presupuestaria y de recursos tributarios; **no se pudo verificar hoy** ni su dirección ni su formato.

## Fase 0 (antes de todo): conseguir la fuente
1. Reintentar `https://www.economia.gob.ar/dnap/` cuando renueven el certificado, o buscar su ubicación nueva en `argentina.gob.ar/economia`. Lo puede hacer el usuario desde su navegador (decir qué planillas hay, en qué formato y desde qué año) o una sesión con el agente `investigador-datos`.
2. Con las planillas a la vista, completar esta spec: para cada una, URL, hoja, columnas, unidad, años. Verificar la unidad contra una cifra conocida.
3. Buscar las proyecciones de población 2022-2040 de INDEC y el dato del censo 2022 por provincia.
Sin la fase 0 no se implementan las fases 2 y 3: no cargar cifras por provincia desde notas de prensa ni desde copias de terceros.

## Fase 1 (se puede hacer ya): la Nación en cada provincia
Depende de `gasto-nacion.md` (usa su mismo archivo de datos). Dentro de `/gasto/`, la vista "Dónde" se amplía a una página propia `/provincias/`:
1. Tabla de las 24 jurisdicciones con el gasto de la Nación ubicado en cada una, por año: total, por habitante (población de INDEC) y en pesos de hoy; ordenable; con su posición.
2. Al tocar una provincia: en qué gasta la Nación ahí (finalidad y función, organismo, tipo de gasto) y cómo cambió en los años disponibles.
3. Aclaración visible: es el gasto que la Nación declara ubicado en la provincia (jubilaciones, universidades, obras, transferencias no automáticas); **no** es el gasto del gobierno provincial ni incluye la coparticipación. Mucho gasto figura en CABA o sin ubicación.
4. Un bloque de contexto con el gasto del conjunto de las provincias por finalidad (serie agregada 1980-2023, en % del PIB), para tener el tamaño del gasto provincial aunque no se pueda abrir por provincia.
5. Compartir, vista previa en redes y reglas del sitio como en las demás secciones (cálculos en `web/lib/`, nada desborda a 360 px, palabras del público, sin veredicto).

## Fase 2 (bloqueada por la fase 0): las cuentas de cada provincia
Con las planillas de la DNAP: gasto de cada provincia por finalidad y por tipo; recaudación propia por impuesto; recursos de origen nacional; resultado; deuda. Todo por habitante y en pesos de hoy. Ranking por indicador, con la posición de cada provincia y sin puntaje combinado por defecto (como se hizo con el Ranking de presidentes: el combinado, si se hace, plegado y explicado).
Indicadores previstos: gasto por habitante; sueldos sobre gasto total; recaudación propia por habitante; Ingresos Brutos por habitante y como parte de la recaudación propia; dependencia de fondos nacionales (recursos nacionales sobre ingresos totales); resultado; deuda por habitante.

## Fase 3 (sin fuente): presión de Ingresos Brutos y exenciones
Comparar alícuotas por actividad y exenciones entre provincias no tiene base oficial. Opciones cuando se retome: (a) usar la recaudación de Ingresos Brutos por habitante y sobre el empleo privado registrado de cada provincia (serie que sí existe) como aproximación, diciéndolo; (b) cargar a mano las alícuotas generales de las leyes impositivas de cada provincia para unas pocas actividades testigo (comercio minorista, industria, construcción, servicios financieros), con la cita de cada ley; (c) citar un estudio privado como estimación. Decisión del usuario.

## Fuera de alcance
Municipios y tasas municipales; calificar a las provincias; "% del producto de la provincia" mientras no haya una serie uniforme.
