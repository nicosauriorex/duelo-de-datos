# Provincias: gasto, impuestos y ranking

Estado: fase 1 implementada (2026-11-13); fase 0 resuelta (2026-11-13): la DNAP publica en argentina.gob.ar. Fases 2 y 3: spec lista (2026-11-13), sin implementar
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

### Resultado de la fase 0 (2026-11-13): fuente encontrada
`economia.gob.ar/dnap` sigue con el certificado vencido, pero la DNAP publica todo en `argentina.gob.ar`. Base de las páginas: `https://www.argentina.gob.ar/economia/sechacienda/`; base de los archivos: `https://www.argentina.gob.ar/sites/default/files/`. Los nombres de archivo cambian con cada edición (sufijos `_0`, `_1`, `_2`...): el pipeline tiene que leer el link desde la página, no fijarlo. Una página (`coordinacion-fiscal-provincial/recursos-tributarios-de-origen-provincial-top`) devuelve 403; la misma información está en `asuntosprovinciales/direccion-de-recursos-provinciales/recursos-tributarios-de-origen-provincial-top`.

| Tema | Página (desde la base) | Archivo | Formato | Años |
|---|---|---|---|---|
| Cuentas de cada provincia (ingresos por tipo, gasto por objeto, resultado económico, primario y financiero) | `coordinacion-fiscal-provincial/ejecucion-presupuestaria-provincial/ejecuciones` | `serie_aif-apnf-2025.xlsx` (serie); un `.xls` por año (`ejec._presup._acod_<año>_-_trim._iv.xls` hasta 2004, `ejecuciones_presupuestarias_apnf_<año>_-_trim_iv.xls` después) y 2026 por trimestre | Una hoja por jurisdicción + "Consolidado"; fila "CONCEPTO" con los años en columnas; 43 renglones (I. Ingresos corrientes … X. Gastos primarios). Millones de pesos corrientes, ejecución provisoria, Administración Pública No Financiera | Serie 2005-2025; archivos sueltos desde 1983; 2026 hasta el II trimestre |
| Gasto de cada provincia por finalidad y función | `.../ejecucion-presupuestaria-provincial/gastos-por` | `serie_ff-apnf_2.xlsx`; `gfyf_*` por año | Igual: hoja por jurisdicción ("CABA", "Bs Aires"…), fila "FINALIDAD Y FUNCION", millones de pesos | 2005-2025 (sueltos desde 1983; 2026 I y II trim.) |
| Recaudación propia por impuesto | `asuntosprovinciales/direccion-de-recursos-provinciales/recursos-tributarios-de-origen-provincial-top` | `top_trim_<año>_N.xlsx` (trimestral), `informacion_mensual_<año>.xlsx` (2017 en adelante) | Hoja por trimestre; fila "Provincias" con Ingresos Brutos, Inmobiliario, Sellos, Automotores, Otros, Total. Millones de pesos. Hay provincias sin dato en el último trimestre (La Pampa en II-2026) | Mensual desde 2017; trimestral hasta II-2026 |
| Recursos de origen nacional (coparticipación y leyes especiales) | `asuntosprovinciales/ron` | `informacion_consolidada<año>_N.xlsx` (`.xls` hasta 2023) | Una hoja por mes + "CONS"; encabezado en varias filas (ley, fondo); provincias en filas. Unidad a confirmar (la hoja no la dice en la parte vista; los montos de 2025 son del orden de millones de pesos) | 2003-2026 |
| Stock de deuda de cada provincia | `coordinacion-fiscal-provincial/deuda-publica-provincial/evolucion-de-stock` | `stock_<trim>_trim_<año>.xlsx` (consolidado) y un archivo por provincia | Una hoja; provincias en filas; total sin deuda flotante y por acreedor (Gobierno Nacional, FFFIR, FFDP, bancos, deuda consolidada, bonos, organismos internacionales). Millones de pesos | Hasta el 30-06-2026 |
| Servicios de la deuda y deuda flotante | `.../deuda-publica-provincial/evolucion-de-servicios` y `evolucion-de-deuda` | `ev._de_servicios_-_consolidado_<año>_-_trim._*.xls`, `2trim_deuda_flotante_2026.xlsx` | A mirar | Servicios desde 2005 |
| Empleo público y gasto salarial | `.../ejecucion-presupuestaria-provincial/ocupacion-y` | `ocupacion_salarios_2005_2016.xlsx`, `ocupacion_salarios_2017_2025.xlsx`; `escalafon_apnf_<año>`, `institucional_apnf_<año>`; `ccoo_c_1000_hab_0.xlsx` | Hoja por año: gasto en personal (miles de $), planta ocupada, gasto medio mensual, habitantes y empleados cada mil habitantes | 2005-2025 |
| Alícuotas de Ingresos Brutos (fase 3) | `asuntosprovinciales/direccion-de-recursos-provinciales/ingresos-brutos` | `2024_ib.xlsx`, `2025_ib.xlsx` | Alícuotas teóricas por actividad y provincia, con aperturas por tamaño del contribuyente; "provisorio, en desarrollo". Hay que mirar bien la estructura | 2024 y 2025 |
| Presupuesto de cada provincia | `.../ejecucion-presupuestaria-provincial/presupuestos` | `presupuesto_provincial_-_<provincia>_N.xls` | A mirar | — |
| Otros | `.../informacion-economica-provincial/indicadores` (exportaciones, actividades relevantes, empleo, educación, población y superficie por provincia); `.../asuntosprovinciales/direccion-de-recursos-provinciales/regalias` (regalías de hidrocarburos, PDF) | | | |

Control de unidad (2026-11-13): el "VII. Gastos totales" del Consolidado de `serie_aif-apnf-2025.xlsx`, en millones de pesos, sobre el PIB nominal de `gasto_nacion_finfun` da 17,3 % (2018), 17,1 % (2019), 16,7 % (2022), 17,4 % (2023), 15,5 % (2024) y 15,8 % (2025). Mismo orden que el agregado de datos.gob.ar (2023 entre 15 y 17 % del PIB): la unidad es millones de pesos corrientes. La diferencia de 2023 (algo por encima del rango) hay que explicarla al implementar (cobertura o definición del agregado).

Cerrado el mismo día: (a) la unidad de recursos de origen nacional es millones de pesos (Buenos Aires 2025: coparticipación neta 8.834.740,3 en `informacion_consolidada2025` hoja CONS = "Distribución Secundaria Neta" de `serie_aif`); (b) población: se sigue usando la proyección INDEC con base 2010 de la fase 1 (no hay archivo con base 2022); (c) alícuotas: estructura descripta en la fase 3. Controles extra hechos el 2026-11-13: en `serie_aif` la suma de las 24 hojas da el Consolidado (diferencia 0,000 % en 2005, 2015, 2023 y 2025); en `serie_ff` el total de las finalidades da el "VII. Gastos totales" de `serie_aif`; la hoja "Total" de `serie_top_1984_2025` da el "De Origen Provincial" de `serie_aif` (Buenos Aires, Córdoba, Mendoza y Formosa, 0,000 %).

## Fase 1 (se puede hacer ya): la Nación en cada provincia
Estado: implementada (2026-11-13). Desvíos: `sin_provincia` trae también "Exterior" (id 95, aparece en 2026); las barras del detalle van en pesos de hoy (el por habitante, en la cabecera y la evolución); la tabla suma la fila "Las 24 juntas". Depende de `gasto-nacion.md` (usa el mismo archivo de Presupuesto Abierto). Página propia `/provincias/` ("Cuánto gasta la Nación en cada provincia").

### Fuentes (probadas el 2026-11-13)
- **Gasto por provincia**: el crédito anual de Presupuesto Abierto que ya baja `pipeline/gasto_nacion.py`. Columnas `ubicacion_geografica_id` (código INDEC de 2 cifras: 2 = CABA, 6 = Buenos Aires, 10 Catamarca … 94 Tierra del Fuego) y `ubicacion_geografica_desc`. Además de las 24 jurisdicciones trae 96 "Interprovincial", 97 "Nacional", 98 "Binacional" y 99 "No Clasificado". 2024, devengado: 90.197.487 millones en total; CABA 19.923.286, Buenos Aires 21.125.814, Córdoba 4.158.723, Nacional 10.138.112, No Clasificado 8.139.450 (ahí van los intereses de la deuda: 7.493.290). Más del 95 % de lo ubicado en las provincias (fuera de CABA) es Servicios sociales, sobre todo seguridad social (jubilaciones, pensiones, asignaciones).
  El cruce provincia × (finalidad > función), provincia × (jurisdicción > entidad) y provincia × (inciso > partida principal) sale del mismo CSV: en 2024 son 656, 1.367 y 931 combinaciones.
- **Población**: INDEC, proyecciones 2010-2040 por provincia (base censo 2010): `https://www.indec.gob.ar/ftp/cuadros/poblacion/c2_proyecciones_prov_2010_2040.xls` (1 MB; una hoja por jurisdicción, nombre `<código>-<NOMBRE>`, p. ej. `14-CÓRDOBA`, `02-CABA`; en cada hoja, bloques de 6 años: una fila "Edad" con los años y debajo la fila "Total" con "Ambos sexos" en la primera columna de cada año). Para 2018-2026 se usa esta proyección (no hay archivo con la base del censo 2022): se dice en la página.
- **Gasto de todas las provincias juntas, en % del PIB** (Secretaría de Política Económica, "Gasto Público Consolidado", devengado anual, 1980-2023), API de series de datos.gob.ar: total `451.6_GPP_PIBPIB_0_0_7_41`; Funcionamiento del Estado `451.6_GPP_FUNCIOPIB_0_0_29_76`; Servicios sociales `451.6_GPP_SERVICPIB_0_0_26_100`; Servicios económicos `451.6_GPP_SERVICPIB_0_0_28_76`; Servicios de la deuda `451.6_GPP_SERVICPIB_0_0_31_1`. 2023: 16,13 % del PIB.

### Pipeline
1. `pipeline/gasto_nacion.py`, `_agregar_completo`: tres árboles más en el respaldo largo `gasto_nacion_<AÑO>.csv` (mismas columnas `arbol, ids, n1..n4` y las cinco etapas):
   - `prov_para_que`: `ids` = `"<ubicacion_id>|<finalidad_id>.<funcion_id>"`; n1 = provincia (desc), n2 = finalidad, n3 = función.
   - `prov_quien`: `ids` = `"<ubicacion_id>"`; n1 = provincia, n2 = jurisdicción, n3 = entidad.
   - `prov_en_que`: `ids` = `"<ubicacion_id>|<inciso_id>"`; n1 = provincia, n2 = inciso, n3 = partida principal.
   `_anio_json` y el control de totales siguen usando solo los cinco árboles de antes: `gasto_nacion_<AÑO>.json` no cambia.
   `cargar_anio`: si el respaldo existe pero no trae `prov_para_que`, con red se vuelve a bajar aunque el año esté cerrado (una vez: después ya los trae). Sin red se usa como está y la página de provincias sale sin ese año.
2. `pipeline/provincias.py` (nuevo, patrón de `universidades.py`): no baja el gasto, lee los respaldos de `gasto_nacion.py`. Baja la población (respaldo `datos/cache/provincias_poblacion.csv`: `codigo, anio, poblacion`, 2010-2040) y las cinco series del agregado (respaldo `datos/cache/provincias_agregado.csv`: `anio` y una columna por serie); como mucho una bajada por día (`datos/cache/provincias_meta.json`). Con `con_red=False` usa solo los respaldos.
3. Salidas en `web/public/datos/` (montos en millones de pesos corrientes, devengado, redondeados a 1 decimal):
   - `provincias.json` (índice):
     `{ "generado", "fuente", "fuente_poblacion", "fuente_agregado", "anios": [ {"anio", "en_curso", "actualizado", "pib", "archivo": "provincias_<AÑO>.json"} ], "provincias": [ {"id": "14", "n": "Córdoba", "pob": [por año de "anios"], "v": [devengado total por año], "ss": [devengado de la función Seguridad social, id 3.3, por año]} ], "sin_provincia": [ {"id": "97", "n": "Nacional", "v": [...]}, … 96, 98, 99 ], "total": [devengado total de la Administración Nacional por año], "agregado": {"anios": [1980…], "series": [ {"n": "Total", "v": [...]}, {"n": "Funcionamiento del Estado", …}, {"n": "Servicios sociales", …}, {"n": "Servicios económicos", …}, {"n": "Deuda", …} ]} }`
     `null` donde no hay dato. `anios`, `en_curso`, `actualizado` y `pib` iguales a `gasto_nacion.json`. Nombres cortos del público: "Ciudad de Buenos Aires", "Buenos Aires", "Tierra del Fuego", "Santiago del Estero"… (sin "Provincia de").
   - `provincias_<AÑO>.json`: `{ "anio", "provincias": { "<id>": { "para_que": Nodo, "quien": Nodo, "en_que": Nodo } } }` solo para las 24 jurisdicciones, con el mismo `Nodo` de `gasto.ts` (`{n, v: [5 etapas], t?, h?}`; raíz "Total"; hijos por devengado de mayor a menor; redondeo de abajo hacia arriba como `_cerrar`). En `en_que`, el nivel 1 con los nombres del público de `INCISOS` y el técnico en `t`. Nombres unificados entre años y con tildes como en `gasto_nacion.py` (`_titulos`, `_con_tildes`).
4. Controles (si alguno no cierra, `RuntimeError`: la corrida sigue sin `provincias*.json`, como universidades):
   - por año, las 24 provincias + las 4 sin provincia = total del año de `gasto_nacion` (devengado, tolerancia 1 millón);
   - cada provincia: raíz de `para_que` = raíz de `quien` = raíz de `en_que` = su `v` del índice (tolerancia 1 millón);
   - 2024: Córdoba 4.158.722,8 y CABA 19.923.286,3 millones;
   - población: 24 jurisdicciones, la suma de 2024 a menos de 0,5 % de la hoja "01-TOTAL DEL PAÍS" de ese año; Córdoba 2024 entre 3,8 y 4,2 millones;
   - agregado: las cuatro finalidades suman el total a menos de 0,1 punto del PIB en cada año con las cinco series; 2023 total entre 15 y 17.
5. `pipeline/obtener_datos.py`: llamada después de universidades, fuera del hash, con `try/except` y aviso (como universidades). Funciona con `--solo-json`. Docstring con fuentes, respaldos, controles y uso suelto (`--bajar`, `--sin-red`).
6. Al implementar: correr `python pipeline/gasto_nacion.py --bajar` una vez para que los respaldos de 2018-2026 traigan los árboles nuevos, y versionarlos (cada CSV crece unas 3.000 filas).

### Sitio
7. Ruta `/provincias/`, sección `web/components/secciones/Provincias.tsx`, cálculos en `web/lib/provincias.ts` (reusar de `gasto.ts`: `Nodo`, `crearDeflactor`, `armarVista`, escalas y redondeo que cierra; de `universidades.ts` lo que sirva para la variación real y la evolución), carga en `web/components/useProvincias.ts` (como `useUniversidades`: `provincias.json` al entrar, `provincias_<AÑO>.json` al abrir una provincia; el IPC de `base.json` como en `/gasto/`).
8. Arriba: año (por defecto el último cerrado; el en curso marcado con su fecha) y dos opciones en `Seg`:
   - **Medida**: "Por habitante" (pesos de hoy por persona, por defecto), "Total" (pesos de hoy), "% de lo ubicado en provincias".
   - **Qué gasto**: "Todo" (por defecto) / "Sin jubilaciones ni asignaciones" (resta la función Seguridad social; sirve para ver obras, salud, educación, transferencias).
   Todo en la URL (`anio`, `medida`, `gasto`, `prov`); ningún parámetro existente cambia de significado.
9. Una línea arriba de la tabla: "De cada $100 que gastó la Nación en <año>, $X figuran en una provincia y $Y en la Ciudad de Buenos Aires; el resto, $Z, no tiene provincia (deuda, organismos nacionales)." Las tres cifras cierran a 100.
10. Tabla de las 24 jurisdicciones ordenada por la medida elegida (mayor a menor), con posición, nombre, valor de la medida, la otra cifra útil (si se ve por habitante, el total; si se ve el total, por habitante) y la variación real contra el año anterior. Primera columna fija y nada desborda a 360 px (reglas de `.claude/rules/frontend.md`). Debajo, aparte y sin posición: "Sin provincia" con sus cuatro partes y lo que suman. La Ciudad de Buenos Aires lleva una marca con la nota de que ahí figuran las sedes de los organismos.
11. Al tocar una provincia se abre su detalle (en la misma página, con cruz y Atrás como el resto del sitio: `useAtras`): en qué gasta la Nación ahí con las tres formas de `/gasto/` (Para qué, Quién, En qué) como barras que se abren al tocar, y la evolución 2018-<último año> del gasto por habitante en pesos de hoy (gráfico chico como el de universidades, el año en curso marcado). El "Qué gasto" elegido se respeta en la evolución; en las barras, "Sin jubilaciones" saca la función Seguridad social de Para qué y se aclara que en Quién y En qué se ve todo.
12. Aclaración visible arriba (no plegada): es el gasto que la Nación declara ubicado en cada provincia (jubilaciones, asignaciones, universidades, obras, transferencias no automáticas); **no** es el gasto del gobierno provincial ni incluye la coparticipación; mucho gasto figura en la Ciudad de Buenos Aires (sedes) o sin provincia.
13. Bloque de contexto "Lo que gastan las provincias juntas": el agregado en % del PIB 1980-2023 (total y las cuatro finalidades, gráfico de líneas simple con el último valor), con la aclaración de que la fuente no lo abre por provincia y que el último año es 2023.
14. Al pie, plegado: qué incluye y qué no, la población usada (proyección INDEC con base 2010) y las fuentes con su fecha.
15. Compartir: imagen (1:1, 4:5 y 16:9 como en las otras secciones) con las 24 provincias en barras según la medida y el "Qué gasto" elegidos, título con el año; link; vista previa en redes con `npm run previas` (`previas/provincias.png` y `.json`, título con la provincia de mayor gasto por habitante sin contar CABA o con el total ubicado; sin veredicto).
16. Links: desde `/gasto/` en la forma Dónde ("Ver cada provincia, por habitante"), desde la portada (`Inicio.tsx`, junto a universidades), `Nav.tsx` (nombre y Volver), `sitemap.ts`.
17. Reglas: números en formato es-AR con `formato.ts`; pesos por habitante en pesos enteros con separador de miles; las cuentas cierran; sin `<select>` nativo; palabras del público; sin veredicto (D-012).

### Cómo se verifica
- `python pipeline/obtener_datos.py --solo-json` termina con `provincias.json` y los `provincias_<AÑO>.json`, y los controles pasan; `python pipeline/provincias.py --sin-red` muestra los tamaños (índice < 100 KB; cada año < 400 KB).
- Córdoba 2024 por habitante: 4.158.722,8 millones / población 2024 de la hoja 14, a mano, igual a lo que muestra la tabla (en pesos corrientes con el IPC desactivado o con el factor anotado).
- `npm run tipos`, `npm run build`, `npm run previas`.
- En el navegador (`web-out`): `/provincias/` a 360 y 1280 px sin desborde ni errores de consola; cambiar medida y "Qué gasto"; abrir una provincia, sus tres formas y la evolución; Atrás cierra el detalle; link compartido con `?prov=14&medida=total` abre lo mismo; imagen en el panel; link desde `/gasto/` Dónde.
- Revisor contra esta spec.

## Fase 2: las cuentas de cada provincia
Estado: spec lista (2026-11-13), sin implementar. Fuente: DNAP (ver "Resultado de la fase 0"). Va en la misma página `/provincias/` como segunda vista: arriba, un `Seg` "Lo que gasta la Nación ahí" (la fase 1, por defecto) / "Las cuentas de cada provincia" (`vista=cuentas` en la URL). Sin `vista`, la página se ve igual que hoy: los links compartidos no cambian.

### Pipeline
1. `pipeline/provincias_dnap.py` (nuevo; patrón de `provincias.py`: respaldos en `datos/cache/provincias_dnap_*`, como mucho una bajada por día con `provincias_dnap_meta.json`, `con_red=False` usa solo respaldos, uso suelto `--bajar` y `--sin-red`).
   - Busca cada link en su página (regex sobre el nombre: `serie_aif-apnf-\d{4}.*\.xlsx`, `serie_ff-apnf.*\.xlsx`, `serie_top_1984_\d{4}.*\.xlsx`, `ocupacion_salarios_2005_2016.*\.xlsx`, `ocupacion_salarios_2017_\d{4}.*\.xlsx`, `stock_.*trim_\d{4}.*\.xlsx` el más reciente), nunca con el nombre fijo: los sufijos `_0`, `_1` cambian en cada edición. Links relativos (`/sites/…`) y con prefijo basura (`blank:#`) se normalizan. User-Agent de navegador genérico. Si una página no responde o el link no aparece, se usa el respaldo y se avisa.
   - Respaldos: el `.xlsx` original de cada archivo (son de 50 a 500 KB) y un CSV largo por tema ya leído (`provincia, anio, concepto, valor`).
2. Lectura (filas por texto, no por posición; la fila de encabezado se encuentra por su texto: "CONCEPTO", "FINALIDAD Y FUNCION", "PROVINCIAS", "Jurisdicción", "JURISDICCIONES"):
   - **Cuentas** (`serie_aif`, 2005-último año cerrado): por provincia y año, los 43 renglones; se guardan con un id corto: `ing_cor`, `trib_prov` ("De Origen Provincial"), `trib_nac` ("De Origen Nacional"), `copart` (Distribución secundaria neta), `fin_edu`, `contrib_ss`, `regalias`, `transf_cor_ing`, `ing_cap`, `transf_cap_ing`, `gas_cor`, `personal`, `intereses` (Rentas de la propiedad del gasto), `prest_ss`, `transf_cor_gas`, `gas_cap`, `inversion` (Inversión real directa), `transf_cap_gas`, `inv_fin`, `ing_tot`, `gas_tot`, `res_eco`, `res_fin`, `res_pri`, `gas_pri`. Los dos "Rentas de la propiedad" y "Transferencias" (ingreso y gasto) se distinguen por el bloque en el que aparecen (I/IV o II/V).
   - **Finalidad y función** (`serie_ff`, 2005-último año): por provincia y año, finalidades y funciones con el árbol de la planilla (finalidad = renglón sin sangría; las funciones debajo).
   - **Recaudación propia por impuesto** (`serie_top_1984_<año>`, hojas Ingresos Brutos, Inmobiliario, Sellos, Automotores, Otros, Total): se usa desde 2005.
   - **Empleo** (`ocupacion_salarios_*`, hoja por año): planta ocupada, gasto en personal (miles de $ → se pasa a millones), gasto medio mensual, empleados cada mil habitantes (el de la DNAP, con su población).
   - **Deuda** (`stock_<trim>_trim_<año>`, el más reciente): stock total sin deuda flotante y por acreedor (Gobierno Nacional, FFFIR, FFDP, bancos, deuda consolidada, bonos, organismos internacionales) y su fecha (de la fila "STOCK DE DEUDA PROVINCIAL AL …").
   - Nombres: una tabla de alias de las 24 jurisdicciones al código INDEC de la fase 1 (las planillas usan "Ciudad", "CABA", "G.C.B.A.", "Bs Aires", "BUENOS AIRES", "Chubut (*)", sin tildes o con tildes mal codificadas…). Un nombre sin alias → `RuntimeError` con el nombre (no se pierde una provincia en silencio).
3. Controles (si uno falla, `RuntimeError`: la corrida sigue sin `provincias_cuentas.json`, como universidades):
   - por provincia y año: `ing_tot` = `ing_cor` + `ing_cap`; `gas_tot` = `gas_cor` + `gas_cap`; `res_fin` = `ing_tot` − `gas_tot` (tolerancia 1 millón);
   - la suma de las 24 = Consolidado en `gas_tot` e `ing_tot` (0,01 %);
   - total de finalidades = `gas_tot` por provincia y año (0,01 %);
   - hoja "Total" de la recaudación = `trib_prov` por provincia y año (0,5 %; avisa con la lista si alguna se pasa, falla si son más de 3);
   - deuda: fila TOTAL = suma de las 24 (0,01 %);
   - empleo: la población de la DNAP y la de la fase 1 a menos de 3 % por provincia en 2024 (avisa);
   - 2023: `gas_tot` consolidado entre 15 y 19 % del PIB (de `gasto_nacion`; da 17,4).
4. Salida `web/public/datos/provincias_cuentas.json` (montos en millones de pesos corrientes, 1 decimal):
   `{ "generado", "fuente", "fuentes": {"cuentas", "finalidad", "recaudacion", "empleo", "deuda"} (cada una: página, archivo y fecha de bajada), "anios": [2005…], "provincias": [ {"id": "14", "c": {"<id corto>": [por año]}, "fin": [ {"n": "Salud", "f": "Servicios sociales", "v": [por año]} ], "imp": {"ib", "inmo", "sellos", "auto", "otros": [por año]}, "emp": {"planta", "personal", "medio", "c1000": [por año]}, "deuda": {"total", "gob_nac", "fffir", "ffdp", "bancos", "consolidada", "bonos", "org_int"} } ], "deuda_fecha": "2026-06-30", "consolidado": {"c": {...}} }`
   `null` donde no hay dato. Tamaño objetivo < 400 KB. La población se toma de `provincias.json` (no se repite).
5. `obtener_datos.py`: llamada después de `provincias.py`, fuera del hash, con `try/except` y aviso. Funciona con `--solo-json`. Docstring con fuentes, respaldos, controles y uso suelto.
6. El año en curso (2026, por trimestre) queda fuera de esta fase: se compara siempre años cerrados.

### Sitio (vista "Las cuentas de cada provincia")
7. Cálculos en `web/lib/provinciasCuentas.ts` (pesos de hoy con el deflactor de `gasto.ts`; por habitante con la población de `provincias.json`, que arranca en 2010: antes de 2010 solo se muestran montos y porcentajes). Carga en `useProvincias.ts` (`provincias_cuentas.json` al abrir esta vista).
8. Arriba: año (2010 a último cerrado; por defecto el último) y un **indicador** elegido de una lista corta con su explicación en una línea (ventana o lista de botones como el resto del sitio; nada de `<select>` nativo). Indicadores (todos con su fórmula visible en el detalle):
   - Gasto por habitante (`gas_tot` / población, pesos de hoy).
   - Sueldos sobre el gasto total (`personal` / `gas_tot`, %).
   - Obra pública sobre el gasto total (`inversion` / `gas_tot`, %).
   - Recaudación propia por habitante (`trib_prov` / población, pesos de hoy).
   - Ingresos Brutos sobre la recaudación propia (`ib` / `trib_prov`, %).
   - Cuánto depende de la Nación ((`trib_nac` + `transf_cor_ing` + `transf_cap_ing`) / `ing_tot`, %; la aclaración dice que las transferencias son casi todas de la Nación).
   - Resultado financiero sobre los ingresos (`res_fin` / `ing_tot`, %) y resultado primario (`res_pri` / `ing_tot`, %).
   - Empleados públicos cada mil habitantes (el de la DNAP) y sueldo medio mensual en pesos de hoy.
   - Deuda por habitante (último stock / población del año del stock, pesos de hoy de esa fecha) y deuda sobre los ingresos del último año cerrado (%). Estos dos no dependen del año elegido: se dice la fecha.
   En la URL: `vista=cuentas`, `ind=<id>`, `anio`, `prov`.
9. Tabla de las 24 ordenada por el indicador (posición, nombre, valor, variación contra el año anterior: real si es un monto, en puntos si es un porcentaje). Fila "Las 24 juntas" (con el consolidado) aparte, sin posición. Primera columna fija; nada desborda a 360 px. **Sin puntaje combinado**; sin colores de bueno o malo en la tabla (D-012): el orden es de mayor a menor y se puede invertir.
10. Al tocar una provincia, detalle (con cruz y Atrás, `useAtras`): sus cuentas del año en una tabla corta que cierra (ingresos: propios por impuesto, de la Nación, otros; gastos: sueldos, jubilaciones provinciales, transferencias, intereses, obra pública, otros; resultado), el gasto por finalidad como barras, y la evolución 2010-último año del indicador elegido (gráfico chico como el de la fase 1).
11. Aclaraciones visibles: es la Administración Pública No Financiera de cada provincia (no municipios ni empresas provinciales); ejecución "provisoria" según la DNAP; algunas provincias tienen su propia caja de jubilaciones y otras la transfirieron a la Nación (eso cambia mucho "Gasto por habitante" y "Sueldos"): se marca en la tabla a las que tienen caja propia (lista en el código, con la cita de la DNAP o de ANSES); la Ciudad recibe coparticipación desde 2003 con un régimen distinto.
12. Compartir: imagen de las 24 en barras con el indicador y el año elegidos, mismos formatos que la fase 1; link. Vista previa en redes: `previas/provincias-cuentas.png` y `.json` con título neutro ("Las cuentas de las 24 provincias, <año>").
13. Links: desde la vista de la fase 1 (línea "¿Y lo que gasta cada provincia? Ver sus cuentas"), portada sin cambios.

### Cómo se verifica
- `python pipeline/provincias_dnap.py --bajar` baja todo y pasa los controles; `--sin-red` lo rearma igual; `python pipeline/obtener_datos.py --solo-json` termina con `provincias_cuentas.json` (< 400 KB).
- A mano: Córdoba 2024, gasto total de la hoja "Córdoba" de `serie_aif` / población 2024 = lo que muestra la tabla (con el factor de pesos de hoy anotado); Buenos Aires 2025, Ingresos Brutos de `serie_top` igual al detalle.
- `npm run tipos`, `npm run build`, `npm run previas`.
- En el navegador: `/provincias/` sin parámetros se ve igual que antes; `?vista=cuentas` a 360 y 1280 px sin desborde ni errores de consola; cambiar indicador, año e invertir el orden; abrir una provincia; Atrás cierra el detalle; link con `?vista=cuentas&ind=deuda&prov=14` abre lo mismo; imagen en el panel.
- Revisor contra esta spec.

## Fase 3: alícuotas de Ingresos Brutos
Estado: spec lista (2026-11-13), sin implementar; va después de la fase 2. Fuente: DNAP, `asuntosprovinciales/direccion-de-recursos-provinciales/ingresos-brutos`, archivos `<año>_ib.xlsx` (2024 y 2025), marcados por la DNAP "provisorio - en desarrollo".

### Estructura de la planilla (2025, mirada el 2026-11-13)
Una hoja. Fila 4: el año, "Alícuota Máxima Consenso Fiscal" y una columna por jurisdicción (Buenos Aires, CABA, Catamarca, Chaco…). Debajo, bloques por actividad: el renglón de la actividad principal en la columna 0 (Agricultura…, Pesca, Explotación minas y canteras, Industria manufacturera, Industria papelera, Electricidad gas y agua, Construcción, Comercio…) con la alícuota general; debajo, en la columna 1, aperturas: por tamaño del contribuyente ("ingresos MAYORES / MEDIOS / MENORES a un nivel determinado", "Sujeto a ciertos requisitos…") y por subactividad (Matarifes, Generación de energía…). Las celdas son números (fracción: 0,0075 = 0,75 %), texto ("exenta") o rangos en texto ("1,70% - 2,21% -2,50%"). Una celda vacía en la actividad principal con datos en las aperturas significa que esa provincia solo tiene alícuotas por apertura.

### Pipeline
1. En `provincias_dnap.py`: bajar los `<año>_ib.xlsx` que aparezcan en la página (respaldo del original) y armar `provincias_alicuotas.json`: `{ "fuente", "aviso": "Provisorio, en desarrollo (DNAP)", "anios": [2024, 2025], "actividades": [ {"n": "Industria manufacturera", "tope": [por año], "prov": {"<id>": [por año: número | texto | null]}, "aperturas": [ {"n": "Contribuyentes con ingresos MENORES…", "tope", "prov"} ] } ] }`. Los números se guardan como porcentaje con 2 decimales; el texto, tal cual (se limpia el espacio).
2. Controles: las 24 columnas reconocidas con el mismo alias de la fase 2; al menos 8 actividades principales; ningún número fuera de 0 a 15 %. Si cambia la estructura, `RuntimeError` y la página sale sin este bloque.

### Sitio
3. En la vista "Las cuentas de cada provincia", bloque "Cuánto cobra cada provincia de Ingresos Brutos": elegir actividad (lista corta) y año; tabla de las 24 con la alícuota general, la diferencia con el tope del Consenso Fiscal (en puntos) y una marca si tiene aperturas (al tocar, se ven las aperturas como texto). Arriba, el aviso de la DNAP ("provisorio") y que es la alícuota **teórica** de la ley, no lo que se paga en promedio (para eso está "Ingresos Brutos por habitante" de la fase 2).
4. Sin ranking ni colores de bueno o malo; orden por alícuota, invertible.
5. Exenciones: fuera de alcance (no hay base oficial). Se dice en el pie.

### Cómo se verifica
- Industria manufacturera 2025: tope 1,5 %, Buenos Aires 1,5 %, Catamarca 1 % (de la planilla, a mano) igual a la tabla.
- La tabla a 360 px; una celda con rango en texto se ve completa; aperturas con Atrás.

## Fuera de alcance
Municipios y tasas municipales; calificar a las provincias; "% del producto de la provincia" mientras no haya una serie uniforme.
