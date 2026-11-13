# Estado del proyecto

Para retomar el trabajo en una sesión nueva. Actualizar al cerrar cada tanda. Última actualización: 2026-11-13.

## Dónde estamos
El sitio pasó de ser un explorador de series a una herramienta para responder en redes con una imagen (auditoría: `docs/AUDITORIA-2026-11-10.md`). Publicado en https://primerolosdatos.com.ar.

Hecho y publicado (detalle en `docs/ROADMAP.md`):
- Imagen compartible desde el Histórico y desde las secciones de presidentes, con opciones (período, líneas, presidentes, tarjetas, frases).
- Vista simple del Histórico, barra de zoom, resumen del período, copiar tabla.
- Nombres públicos de las series, inflación como una sola entrada, región como filtro, "Gráficos listos".
- Tablas con primera columna fija, barras con degradado, vista de velas, Congreso con página propia.
- Tanda 4 (2026-11-11, `docs/specs/ajustes-tanda-4.md`): el botón Atrás cierra la ventana o el menú abierto y todas las capas tienen cruz (`useAtras` en `ui.tsx`, D-016); las cuentas cierran con los valores que se ven (un solo redondeo, `r1` en `formato.ts`); el Histórico arranca en Inflación con las líneas Último y Promedio, botón "Presidentes" bajo el gráfico y "Volver" del zoom fuera del gráfico; imagen de las velas; botones "Ver" alineados; sin pie genérico en la portada.
- Tanda 5 (2026-11-12, `docs/specs/ajustes-tanda-5.md`): la ficha del dato (D-017) en `/dato/`, en los temas y en "Ver" de las preguntas; comparaciones (mes anterior, año atrás, inicio, promedio, mediana, máximo, mínimo) en la cabecera del Histórico; Personalizar como una sola ventana (panel al costado en computadora); ventanas de configuración en Por presidente y Meses de mandato; el IPC por rubros responde a la moneda y avisa cuando no aplica; placas de la portada con mes anterior y año atrás; bloque que presenta las secciones; el teclado no se abre solo.
- Vista previa en redes (2026-11-12, `docs/specs/vista-previa-links.md`, D-018): 28 páginas fijas `/dato/<slug>/` con título con la cifra e imagen generada al publicar (`npm run previas`), imagen general del sitio, `sitemap.xml` y `robots.txt`.
- Parte diario del Banco Central (2026-11-12, `docs/specs/parte-diario-bcra.md`, D-019): `/bcra/` con ocho variables diarias, variaciones, contexto, gráfico, imagen, texto para copiar y vista previa en redes; bloque en la portada.
- Semáforo de actividad (2026-11-12, `docs/specs/semaforo-actividad.md`, D-020): `/semaforo/` con 29 indicadores, interanual y mes contra mes (solo ajuste oficial), índice de difusión, ventana por indicador, imagen y vista previa en redes.
- Herencia, fase 1 (2026-11-12, `docs/specs/herencia.md`): `/herencia/` con 19 datos oficiales al recibir y al entregar cada presidente (T-1 fijo), vista "Todos los traspasos", imagen, vista previa en redes y lo que no se puede medir; series nuevas de subsidios a la energía y deuda con importadores.
- Herencia, fase 2 (2026-11-12): 42 datos oficiales de informes y planillas (Finanzas, FMI, Banco Central) cargados a mano en `datos/manual/herencia.json` con documento, página y cita (`pipeline/herencia_informes.py` los controla y copia); en la tabla con la marca "informe" y la cita al tocarlos, en "Todos los traspasos" y en la imagen.
- Herencia, fase 3 (2026-11-12, D-021): bloque "Estimaciones y cifras sin serie oficial" con las reservas netas del FMI (2019, 2023 y fin de 2025) y del Banco Central con su propia definición (dic-2023 y fin de 2025: +2.900), dos estimaciones propias al día con datos del Banco Central (`pipeline/reservas_netas.py`, supuestos con cita en `datos/manual/reservas_netas_supuestos.json`): con el método del FMI, −3.983 millones al 05-11-2026 (controles contra el FMI: −84, −397 y +1.251), y con la definición del Banco Central, que no resta el crédito del FMI, +10.857 (controles: −397 y +1.246) y la cobertura de tarifas del IIEP; datos oficiales nuevos: importaciones pendientes, puts, cobertura de la electricidad y precios acordados.
- En qué gasta la Nación, fase 1 (2026-11-12, `docs/specs/gasto-nacion.md`): `/gasto/` con el gasto de la Administración Nacional 2018-2026 de Presupuesto Abierto (`pipeline/gasto_nacion.py`, respaldos `datos/cache/gasto_nacion_*`): para qué, quién (hasta cada universidad), en qué y dónde; pesos de hoy, % del total y % del PIB; buscador, comparación entre años (desde 2004 por finalidad), imagen y vista previa.
- En qué gasta la Nación, fase 2 (2026-11-13): "Cómo viene <año>" en `/gasto/?vista=mes` con el archivo mensual de Presupuesto Abierto (`pipeline/gasto_mensual.py`, respaldos `datos/cache/gasto_mensual_*`, salida `gasto_nacion_mensual.json`): gastado en pesos de hoy de los meses completos, variación real contra los mismos meses del año anterior, % del crédito vigente gastado, barras por mes con el mes parcial aparte, lista por Para qué / Quién / En qué con orden por monto o variación, imagen. Controles contra el anual: 2025 −0,000 %, 2026 +0,10 %, vigente 0,000 %.
- Universidades (2026-11-13, fase 3 del gasto): `/universidades/` con lo que la Nación transfiere a cada universidad nacional 2018-2026 (de los respaldos del gasto), pesos de hoy y % del PIB, variación real, serie por universidad, por estudiante en 2023 y 2024 (Portal de Información Universitaria de la AGN, datos del CIN; 53 de 61 universidades), bloque de control y rendición de cuentas con citas (art. 59 bis, Cuenta de Inversión 2024, informes AGN 2023-004, 2024-222 y 2024-152), imagen y vista previa; `pipeline/universidades.py`, respaldos `datos/cache/universidades_*`. Links desde `/gasto/` y la portada.
- Provincias, fase 1 (2026-11-13, `docs/specs/provincias.md`): `/provincias/` con el gasto que la Nación declara ubicado en cada una de las 24 jurisdicciones 2018-2026: por habitante (proyección INDEC base 2010), total y % de lo ubicado, con o sin jubilaciones y asignaciones (función Seguridad social), variación real, "Sin provincia" aparte, detalle por provincia (Para qué, Quién, En qué y evolución por habitante), el gasto de todas las provincias juntas en % del PIB 1980-2023 (datos.gob.ar), imagen y vista previa. `gasto_nacion.py` guarda tres cruces más con la provincia en sus respaldos (`prov_para_que`, `prov_quien`, `prov_en_que`); `pipeline/provincias.py` (respaldos `datos/cache/provincias_*`). Links desde `/gasto/` (Dónde) y la portada.
- Provincias, fase 3 (2026-11-13): en `/provincias/?vista=cuentas`, bloque "Cuánto cobra cada provincia de Ingresos Brutos" con las alícuotas teóricas 2024 y 2025 de la DNAP (`<año>_ib.xlsx`, provisorio): 18 actividades, alícuota general de las 24, diferencia con el tope del Consenso Fiscal, aperturas por tamaño o subactividad en una ventana; parámetros `ib_act`, `ib_anio`, `ib_orden`. `provincias_dnap.py` arma `provincias_alicuotas.json` aparte de las cuentas (respaldos `datos/cache/provincias_dnap_ib_<año>.xlsx`).
- Gobierno y Congreso, carga manual (2026-11-13, D-009): `congreso_bancas.csv` (64 cortes, Diputados y Senado 1989-2026), `congreso_bloques.csv` (cada bloque con su rol) y totales y parciales en `vetos.csv` (DIP hasta 2002, Infoleg desde 2003); "¿Cómo se cuenta?" actualizado.
- Datos: canastas corregidas; respaldo del IPC cuando la API de INDEC no responde; filtro de cotizaciones sueltas; corridas a las 16:10, 17:15 y 21:00 (hora argentina, las dos primeras solo en días hábiles); publicación rápida cuando el push no toca el pipeline.

## Qué sigue, en orden
1. **Herencia: mantenimiento** — al salir informes nuevos, actualizar las entradas "hoy" de `datos/manual/herencia.json` y, cuando el FMI publique un nivel de reservas netas (informe de la 3ª revisión, dic-2026), sumarlo como "hoy" y como control en `datos/manual/reservas_netas_supuestos.json` (también los saldos de DEG de cada mes). Faltan: cepo de 2003 y 2007, FMI de 1995 a 2002.
2. **Gasto de la Nación: lo que quedó** — fases 1 a 3 hechas; la fase 4 (empresas públicas) no tiene fuente legible. De universidades: estudiantes antes de 2023 por universidad (no hay en formato máquina), las 8 sin datos en el PIU, y entender por qué los gastos declarados por las universidades en la Cuenta de Inversión 2024 no cierran con lo transferido. Texto viejo de la fase 3: universidades; el archivo anual ya trae cada universidad (transferencias del Tesoro); falta cargar lo que solo está en PDF y la rendición de cuentas con sus citas.
3. **Provincias** — `docs/specs/provincias.md`. La fase 1 está hecha (`/provincias/`). Fase 0 resuelta el 2026-11-13: `economia.gob.ar/dnap` sigue con el certificado vencido, pero la DNAP publica todo en `argentina.gob.ar/economia/sechacienda/` (cuentas de cada provincia 2005-2025 y desde 1983 por año, gasto por finalidad, recaudación por impuesto, recursos de origen nacional, deuda, empleo público y alícuotas de Ingresos Brutos 2024-2025); unidad controlada contra el PIB (gasto total 17,4 % en 2023). Fase 2 implementada el 2026-11-13 (`/provincias/?vista=cuentas`, `pipeline/provincias_dnap.py`, `provincias_cuentas.json`; la ruta pasó a llamarse "Las provincias"). Fase 3 (alícuotas de Ingresos Brutos) implementada el 2026-11-13. Sigue: sumar 2026 por trimestre a las cuentas; las exenciones no tienen base oficial. Controles de las planillas ya hechos: suma de las 24 = consolidado, finalidades = gasto total, recaudación por impuesto = recaudación propia, coparticipación igual en dos planillas.
4. **Pendientes del semáforo**: revisar o retirar "Producción de autos" del catálogo general; ajuste estacional serio (X-13 con corrección de calendario) para completar el mes contra mes; indicadores sin fuente legible (CAME, patentamientos, Construya, escrituras, leche, petróleo), candidatos para la idea de "agentes que buscan el dato" (`docs/IDEAS.md`).
5. **Datos de Congreso** (bloque 6d): bancas, bloques y vetos cargados el 2026-11-13. Falta: leyes del Ejecutivo de Menem a CFK 1 (no hay fuente con aprobadas); cada año, después del 1 de marzo, sumar el corte nuevo de las dos cámaras (bajar las ediciones nuevas de los PDF de la DIP) y los vetos del año (decretos de Infoleg).
6. **Mantenimiento del pipeline** (auditoría, etapa 4): descargas duplicadas o sin caché al inicio de `obtener_datos.py`, serie de UTDT cortada en 2005, series sin uso, helpers repetidos.

A futuro, sin recomendar: el bloque 7c-3 (relatos, posts y video) está anotado en `docs/ROADMAP.md`, sección "A futuro"; no se propone hasta que el usuario lo pida.

## Sin verificar (revisar antes de dar por cerrado)
De Gobierno y Congreso, carga manual (verificado: el pipeline valida bancas contra bloques y corta con una fila rota; `--solo-json`, tipos, build; con Playwright a 360 y 1280 px la sección y el detalle de Macri sin desborde ni errores de consola; totales contra cifras conocidas: Cambiemos 105 diputados en 2018, LLA 38 en 2024 y 95 en 2026, 7 senadores de LLA en 2024, FdT 41 senadores en 2020):
- Los cortes reconstruidos del listado nominal difieren de los cuadros oficiales en 1 a 3 bancas por bloque (1996-1999 hasta 4); por eso los 1 de marzo usan el cuadro oficial cuando se puede leer.
- Roles propio/aliado: criterio propio, sin una fuente que cite cada interbloque. Discutible: el PJ como propio de Kirchner en 2003-2005, Coalición Cívica con Macri, sin aliados para Menem (UCeDé) ni para Milei (PRO).
- Vetos desde 2003 contados de Infoleg: CFK 2 da 1 solo veto en cuatro años; no se comparó con otra fuente.
- La corrida en GitHub (el push toca `datos/`, va completa).
- El tema claro y la imagen compartible de la sección no se miraron.

De la herencia, fase 3 (verificado: cifras contra sus documentos, controles de la estimación, página a 360 px, ventana con Atrás, imagen de la vista previa):
- La estimación propia depende de supuestos fijos (swaps 20.000, SEDESA 2.000) tomados de un recuadro del FMI de abril de 2026; si cambian los swaps o aparecen repos de corto plazo, se aparta más. El saldo de DEG hay que cargarlo a mano cada mes.
- La estimación con la definición del Banco Central probablemente da algo más alta que la cifra que publicaría el Banco Central: no puede restar los pasivos de corto plazo que no son públicos (repos, swap con el Tesoro de EE.UU.). A fin de 2025 se pasó en 1.246 millones.
- La vista a 1280 px y el bloque en el tema claro no se miraron.

De la herencia, fase 2 (verificado: cada cifra contra su planilla, PDF o página del FMI; tabla a 360 px sin desborde, cita que se cierra con Atrás, "Todos los traspasos" de un dato de informe, imagen de la vista previa):
- La deuda/PIB de 2023 (154,5 %) es la que publica Finanzas; el salto se explica en la nota, pero puede llamar la atención.
- La moneda extranjera de 2007 a 2015 se mide sin los holdouts y desde 2019 con ellos (Finanzas no publica lo otro): lo dicen las notas.
- BOPREAL de "hoy" es lo colocado en total, no lo que queda por pagar.
- Las cifras de "hoy" hay que actualizarlas a mano cuando salgan informes nuevos.
- La página a 1280 px se vio solo en una captura chica; la cita no se probó en un celular real.

De provincias, fase 3 (verificado: bajada de las dos planillas y controles —24 columnas, 18 actividades, todo entre 0 y 15 %—; Industria manufacturera 2025 tope 1,5, Buenos Aires 1,5, Catamarca 1,5 y CABA 1 igual a la planilla —la spec decía Catamarca 1 % por error—; las tres filas de la columna 0 que pasan a aperturas son Agricultura, Ganadería y Caza y silvicultura; `--sin-red`, `--solo-json`, tipos, build; con Playwright a 360 y 1280 px sin desborde ni errores de consola, ventana de aperturas que cierra con Atrás, link con `ib_act`/`ib_anio`/`ib_orden`; revisor sin bloqueantes, sus observaciones menores corregidas):
- La corrida en GitHub del 2026-11-13 (314ef03) terminó en verde: pasaron los controles de las alícuotas (24 jurisdicciones, 18 actividades) y publicó `provincias_alicuotas.json` (24 KB, responde en el sitio). Usó el respaldo (bajado ese día): la bajada de `ingresos-brutos` desde Actions se prueba en la corrida del día siguiente.
- El bloque a 1280 px se midió pero no se miró; el tema claro no se miró.
- Sin imagen para compartir (la spec no la pide; choca con la regla "lo que se ve se puede compartir").
- Si la DNAP publica 2026 con otros nombres de actividad, salen como actividades nuevas (se emparejan por nombre).

De provincias, fase 2 (verificado: Córdoba 2024 gasto total, Buenos Aires 2025 Ingresos Brutos y deuda de Córdoba iguales a las planillas; suma de las 24 = consolidado; caja propia = las 13 esperadas; tipos, build, previas; `/provincias/` sin parámetros igual; `?vista=cuentas` a 360 y 1280 px sin desborde ni errores de consola; detalle de Córdoba que cierra, Atrás; "Las 24 juntas" con valor en todos los indicadores; revisor en dos pasadas):
- La corrida en GitHub del 2026-11-13 (43400ca) terminó en verde: controles de cuentas y caja propia (13) pasaron, publicó `provincias_cuentas.json` (24 provincias, hasta 2025, La Pampa 2025 sin cuentas) y `/provincias/` responde. Pero usó el respaldo (bajado ese día): la bajada desde GitHub a argentina.gob.ar (que a veces devuelve 403 a pedidos automáticos) se prueba en la corrida del día siguiente.
- La imagen dentro del panel en sus tres formatos (la captura del navegador falló; se vio la previa 16:9).
- La Pampa 2025 sin cuentas y sin deuda publicadas: revisar cuando la DNAP actualice. El control finalidades = gasto total no cierra en 2024 (ediciones distintas, hasta 3,75 %).
- La población de la DNAP (empleados cada mil) difiere más de 3 % de la de INDEC en 8 provincias.

De provincias, fase 1 (verificado: controles del pipeline —24 + sin provincia = total en los 9 años, Córdoba y CABA 2024 contra la fuente, población 2024 = total país, agregado—, `--solo-json`, tipos, build, previas, `/provincias/` a 360 y 1280 px sin desborde ni errores de consola, detalle con sin jubilaciones, Escape y Atrás, link desde `/gasto/`, imagen 16:9 de la vista previa; revisor pasado y sus observaciones corregidas):
- La corrida completa en GitHub del 2026-11-13 (498b1f0) terminó en verde: los controles de los 9 años pasaron, publicó `provincias.json` y la previa; `/provincias/` responde en el sitio.
- La imagen en 1:1 y 4:5 con 24 filas; el tema claro.
- La población de 2022 en adelante es la proyección con base 2010 (el censo 2022 dio algo menos): cambia poco el por habitante, pero no es el dato del censo.
- La lista de barras y el gráfico de evolución están copiados de `/gasto/` y `/universidades/` dentro de `Provincias.tsx`: si cambian allá, hay que cambiarlos acá (o extraerlos a un componente común).
- Río Negro, Santa Cruz y La Pampa encabezan por habitante sin CABA; no se buscó qué partidas lo explican.

De universidades (verificado: cierre por año 2018-2026 contra el programa, UBA 2024 = 602.898,1 igual a la Cuenta de Inversión, estudiantes UBA y UNC 2023, `--solo-json`, tipos, build, previas, `/universidades/` a 360 y 1280 px sin desborde ni errores de consola, serie de la UBA, orden por estudiante, imagen 1080×1080 en el panel y la vista previa, links de la AGN con curl, link desde `/gasto/`; revisor pasado dos veces):
- **No cierra y no se usa**: lo que declaran las universidades en la Cuenta de Inversión 2024 (gastos 1.437.082 millones; transferencias recibidas 1.359.127) contra 3.285.292 transferidos; la UBA declara 240.745 contra 602.898. El mismo documento da 1.386.917 para la partida 5.6. Sin explicación: la página lo dice.
- UBA 2018 da 19.225,3 millones contra 19.383,7 del informe AGN 2023-004 (−0,8 %; la AGN probablemente suma otras jurisdicciones).
- Sin estudiantes en el PIU: Salta, Jujuy, Formosa, Santiago del Estero, Madres de Plaza de Mayo, Pilar, del Delta y Río Tercero. El total por estudiante del sistema usa el total de las 61.
- La Resolución 77/2025 se citó desde la spec (investigada el 2026-11-12); no se volvió a abrir.
- La corrida en GitHub del 2026-11-13 (fed1810) terminó en verde con los controles de universidades y publicó `universidades.json`. Si el PIU suma una universidad con otro nombre, avisa y queda sin estudiantes hasta agregar un alias.
- La imagen no respeta el buscador (sale la lista completa); los formatos 4:5 y 16:9 no se miraron; las capturas del navegador fallaron a 1280 px (se verificó leyendo la página).

Del gasto de la Nación, fase 2 (verificado: controles contra el anual, `--solo-json`, tipos y build, `/gasto/?vista=mes` a 360 px sin desborde en Para qué y Quién con migas, a 1024 px con En qué, imagen 1:1 en el panel, cuentas de la tabla mes por mes, link viejo `/gasto/` igual, sin errores de consola; revisor pasado y sus observaciones corregidas):
- La corrida en GitHub (baja dos ZIP de 11 y 15 MB, 335 MB sin comprimir leídos por partes): memoria y tiempo en Actions.
- Los formatos 4:5 y 16:9 de la imagen; el gráfico de 11 columnas en un celular real.
- La variación real depende del IPC mensual de `base.json` (−0,9 % ene–oct 2026 contra 2025; nominal +31,7 %); no se comparó con otra fuente.
- Un programa que cambió de nombre o de ministerio entre años sale como "Nuevo en <año>" (no hay empalme por ids).
- En enero, sin meses completos del año nuevo, la vista muestra el año anterior completo contra el previo (regla del pipeline, sin probar).

Del gasto de la Nación (fase 1; verificado: totales 2023 y 2024 contra la serie oficial, UBA 2024, 14.994 vistas que cierran, página a 360 y 1280 px sin errores, buscador, imagen de la vista previa):
- La corrida en GitHub con red (bajada de los 9 años, cerca de 1 minuto) y el cambio de año: que 2026 siga "en curso" hasta que la fuente publique su cierre (a mediados de 2027).
- Tres organismos comparados a mano con el sitio de Presupuesto Abierto (la spec lo pide; se comparó solo UBA y Conicet contra el archivo).
- Los formatos 1:1 y 4:5 de la imagen dentro del panel; el gráfico de "Comparar años" en un celular real.
- Nombres: las tildes se reponen con una lista y la terminación -ción; puede quedar alguna palabra sin tilde.

De la herencia (fase 1; verificado en el navegador a 360 y 1280 px: tablas de Macri, Alberto Fernández y Milei con las cuentas cerrando, traspasos de reservas y pobreza, panel Compartir, sin errores de consola):
- Las reservas son promedio mensual en dólares de hoy: no se pueden comparar con los saldos de un día de la spec (US$ 24.141 y 22.663 millones). Si se quiere el saldo exacto del traspaso, hace falta otra serie.
- El cuasifiscal recibido por Macri da 0,0 % del PIB porque la serie no tiene los intereses de las Lebac (la fila lo dice). El "dólar oficial en pesos de hoy" conserva el color de la serie, aunque en la práctica es tan ambiguo como el tipo de cambio real: decidir.
- La imagen para compartir se vio en la vista previa generada (16:9); el panel abre, pero los formatos 1:1 y 4:5 no se miraron en esta sesión. La vista "Todos los traspasos" comparte solo el link.
- La corrida en GitHub con las dos series nuevas (se comprueba al publicar).

Del semáforo de actividad:
- La producción de autos quedó afuera del semáforo: la serie `41.3_AA_0_A_23` da unas 100 mil unidades por mes contra las 45 a 55 mil de ADEFA y repite valores. Esa misma serie SIGUE en el catálogo general del sitio como "Producción de autos": revisarla contra ADEFA y corregirla o retirarla.
- `PanelSemaforo` es copia de `PanelParte`: unificar en un panel de imagen genérico si aparece un tercero.
- El tema claro, la tabla en un celular real y la imagen en formato cuadrado y vertical dentro del panel. (La corrida completa en GitHub sí se comprobó el 2026-11-12: bajó las 29 series sin usar respaldos.)

Del parte del Banco Central:
- Atraso del BCRA (investigado el 2026-11-12 a las 17 h): reservas, compras, base y depósitos salen con unos cinco días hábiles de demora en TODAS las fuentes oficiales legibles por un programa (API, `Series.xlsm`, informe monetario diario); las tasas, con cuatro; el dólar, con un día. La página "Principales variables" del BCRA tiene captcha y datos.gob.ar está cortada en jun-26. No hay fuente oficial más fresca. Única mejora posible: la variable 1226 (reservas en pesos) trae un día más y dividida por el mayorista da las reservas en dólares, pero sería una estimación propia, no el dato publicado: no se hizo. Falta saber si la demora es la normal o fue de esa semana (mirar otro jueves).
- Copiar texto y copiar link al portapapeles, el modo claro y el botón Atrás en un celular real.

De la vista previa en redes:
- La tarjeta al pegar un link: el usuario confirmó el 2026-11-12 que "anda bien el link" (no dijo en qué red).
- La imagen compartible del navegador para series trimestrales o semestrales (pobreza, PIB) ahora une los puntos (regla en `armarImagen`); se vio en las vistas previas, no en el panel Compartir. Si la vista mezcla una serie mensual con una que no lo es, la no mensual sigue saliendo como puntos sueltos.

De la tanda 5 (lo demás se midió en el navegador a 360 y 1280 px):
- El desplazamiento hasta la ficha al elegir un dato en un tema; que el gráfico se achique cuando el panel de Personalizar angosta la página (≥ 900 px); el foco sin teclado en un celular real; las imágenes de Compartir desde la ficha. La pestaña de prueba no entrega animaciones ni cambios de tamaño.
- Con el panel de Personalizar abierto en computadora, el panel tapa el extremo derecho del menú (botón de configuración): revisar si molesta.

De la tanda 4 (lo demás se midió en el navegador a 360 y 1280 px):
- El carrusel de "Los datos más buscados" (espera a estar en pantalla y quieto), la pausa de la animación de Meses de mandato al tocar el gráfico y el paseo de las filas deslizables: revisados por código; el navegador de prueba no dispara `IntersectionObserver`.
- El botón Atrás en un celular real con cada tipo de ventana (se probó con `history.back()` en el navegador de escritorio).
- Que "Compartir" muestre lo mismo que la pantalla en cada vista alternativa (B7) se revisó por código, salvo las velas, que se vieron. Diferencias anotadas y no implementadas: la imagen de Meses de mandato no dibuja la banda mín/máx; la imagen de "Una variable, todos los presidentes" no respeta las columnas elegidas.

De la tanda 3:
Durante la tanda 3 las capturas del navegador fallaron: se comprobó contenido y medidas, no aspecto.
- Aspecto de: barras con degradado y velas en Por presidente, grilla de principales de los temas, placas de la portada, resumen del Histórico, colores de fábrica de los presidentes.
- Interacciones: animar Meses de mandato hasta el final y achicar "Hasta" (error reportado; arreglo razonado, no reproducido); copiar tabla; frases elegibles en la imagen; "Volver a lo de fábrica"; edición de "Mis variables"; cambio de región; vista previa de la imagen a pantalla completa; Escape con un desplegable abierto.
- Tema claro y vista en computadora de casi todo lo anterior.
- En un celular real: solo se probó (por el usuario) que compartir manda la imagen y el link.
- El respaldo del IPC desde la copia guardada no llegó a usarse en producción (la API respondió en la corrida siguiente).

## Detalles conocidos y aceptados
- La grilla de principales de un tema deja una tarjeta suelta si el tema tiene 5 o 7 principales.
- El degradado de las barras se aplica en las tablas por presidente; Ranking y Contexto siguen con un tono.
- Las velas no se dibujan con montos en pesos corrientes (muestran una nota).
- Cristina: celeste en el primer mandato y azul en el segundo (dos tonos de la misma familia, a propósito).
- La vista interanual de la inflación se titula "Inflación"; "interanual" aparece en la línea de la unidad.
- Si se sigue un enlace del sitio con una ventana abierta, la página de destino se carga entera (no es una transición interna); así el historial queda sin entradas de más.
- En las imágenes, algunos títulos y fuentes traen texto del catálogo que no es del público ("PIB … (tal cual)", "datos.gob.ar, serie 3.2_OGP_D_2004_T_17", "API pobreza_eph"): pendiente de nombres; cambiar `fuente` necesita la corrida completa del pipeline.
- `web/lib/previas.ts` repite en chico la lógica de moneda de `difAbsTxt` y el recorte de fuente de `fuentesTxt`: unificar si se vuelven a tocar.
- Quedan reglas CSS sin uso de versiones anteriores (`.chips`, `.voto-aviso`) y ramas del modo "índice" de Meses de mandato que ya no se alcanzan.

## Herramientas
- `python pipeline/ver_cache.py <nombre>`: mira un archivo de `datos/cache/` sin volcarlo (columnas y pocas filas). Es la única forma permitida de leer el caché.
- Flujo elegido: spec e implementación en la misma sesión, orquestando subagentes (`CLAUDE.md`, `docs/COMO-TRABAJAMOS.md`).
- Barrido después de cada tanda: `cd web && npx tsx scripts/barrido-cuentas.ts` (las cuentas cierran) y `web/scripts/barrido-navegador.js` (desbordes, capas con cruz y Atrás, repetidos, ceros con signo; se carga en la página y se llama a `barridoPLD()`; las instrucciones están en el encabezado). Ojo: el navegador de prueba guarda en caché el HTML de cada ruta; después de compilar, pedir cada ruta con `fetch(ruta, { cache: "reload" })` antes de medir.
- Datos que no pasan por el motor mensual: `diario_bcra.json` (`pipeline/diario.py`, D-019), `semaforo.json` (`pipeline/semaforo.py`, D-020), `herencia_informes.json` (`pipeline/herencia_informes.py`, desde `datos/manual/herencia.json`) y `reservas_netas.json` (`pipeline/reservas_netas.py`, D-021; `python pipeline/reservas_netas.py --bajar` lo prueba solo y muestra los controles). Para rebajar solo las series del semáforo: `python pipeline/semaforo.py --bajar`. Chequeos: `cd web && npx tsx scripts/chequeo-diario.ts` y `npx tsx scripts/chequeo-semaforo.ts`.
- Subagentes: Sonnet con esfuerzo medio para lo normal y Opus solo para la pieza difícil (pedido del usuario, 2026-11-12). Para fuentes de datos, el agente `investigador-datos`.
- Pendiente de herramientas: regenerar `DESIGN.md` con el documentador de Impeccable.

## Cómo se trabajó (y funcionó)
- El usuario recorre el sitio publicado y pasa una lista de pedidos. Se anotan en `docs/IDEAS.md`, se bajan a una spec de tanda y se implementan.
- Specs grandes: tres o cuatro subagentes en paralelo, cada uno con sus archivos; después compilar, barrido por código, verificación en el navegador y `revisor`.
- Para revisar pantallas se pueden mandar subagentes económicos a navegar, cada uno en su pestaña; sirven para textos, repeticiones y desbordes, no para juzgar colores ni proporciones.
- El usuario decide con botones cortos; cuando dice "fijate" o "buscá la forma", espera una decisión razonada, no una pregunta.
- Si se corta por límite de uso, los subagentes se retoman con un mensaje y siguen donde quedaron.
