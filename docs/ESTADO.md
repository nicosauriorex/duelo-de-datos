# Estado del proyecto

Para retomar el trabajo en una sesión nueva. Actualizar al cerrar cada tanda. Última actualización: 2026-11-12.

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
- En qué gasta la Nación, fase 1 (2026-11-12, `docs/specs/gasto-nacion.md`): `/gasto/` con el gasto de la Administración Nacional 2018-2026 de Presupuesto Abierto (`pipeline/gasto_nacion.py`, respaldos `datos/cache/gasto_nacion_*`): para qué, quién (hasta cada universidad), en qué y dónde; pesos de hoy, % del total y % del PIB; buscador, comparación entre años (desde 2004 por finalidad), imagen y vista previa.
- Datos: canastas corregidas; respaldo del IPC cuando la API de INDEC no responde; filtro de cotizaciones sueltas; corridas a las 16:10, 17:15 y 21:00 (hora argentina, las dos primeras solo en días hábiles); publicación rápida cuando el push no toca el pipeline.

## Qué sigue, en orden
1. **Herencia, fase 3** — `docs/specs/herencia.md` (fases 1 y 2 hechas). Decisión del usuario sobre mostrar estimaciones privadas (reservas netas). Datos de informes que quedan por cargar: cepo de 2003 y 2007, FMI de 1995 a 2002; al publicarse informes nuevos, actualizar las entradas "hoy" de `datos/manual/herencia.json`.
2. **En qué gasta la Nación, fases 2 a 4** — `docs/specs/gasto-nacion.md` (fase 1 hecha). Fase 2: el año en curso mes a mes. Fase 3: universidades; el archivo anual ya trae cada universidad (transferencias del Tesoro); falta cargar lo que solo está en PDF y la rendición de cuentas con sus citas.
3. **Provincias** — `docs/specs/provincias.md`. Solo se puede hacer la fase 1 (gasto de la Nación en cada provincia, depende del punto anterior). Lo demás está bloqueado: el sitio de la DNAP (`economia.gob.ar/dnap`) tenía el certificado vencido el 2026-11-12. Fase 0: reintentar o que el usuario mire qué planillas publica.
4. **Pendientes del semáforo**: revisar o retirar "Producción de autos" del catálogo general; ajuste estacional serio (X-13 con corrección de calendario) para completar el mes contra mes; indicadores sin fuente legible (CAME, patentamientos, Construya, escrituras, leche, petróleo), candidatos para la idea de "agentes que buscan el dato" (`docs/IDEAS.md`).
5. **Relatos, posts y video** (bloque 7c-3, sin spec): "contestar un relato", publicar solo en X, video de la animación. Necesita decisiones del usuario: cuenta y clave de la API de X; si "contestar un relato" lleva sello verdadero/falso (choca con D-012).
6. **Datos de Congreso** (bloque 6d): cargar a mano bancas, bloques y totales de vetos en `datos/manual/`.
7. **Mantenimiento del pipeline** (auditoría, etapa 4): descargas duplicadas o sin caché al inicio de `obtener_datos.py`, serie de UTDT cortada en 2005, series sin uso, helpers repetidos.

## Sin verificar (revisar antes de dar por cerrado)
De la herencia, fase 2 (verificado: cada cifra contra su planilla, PDF o página del FMI; tabla a 360 px sin desborde, cita que se cierra con Atrás, "Todos los traspasos" de un dato de informe, imagen de la vista previa):
- La deuda/PIB de 2023 (154,5 %) es la que publica Finanzas; el salto se explica en la nota, pero puede llamar la atención.
- La moneda extranjera de 2007 a 2015 se mide sin los holdouts y desde 2019 con ellos (Finanzas no publica lo otro): lo dicen las notas.
- BOPREAL de "hoy" es lo colocado en total, no lo que queda por pagar.
- Las cifras de "hoy" hay que actualizarlas a mano cuando salgan informes nuevos.
- La página a 1280 px se vio solo en una captura chica; la cita no se probó en un celular real.

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
- Datos que no pasan por el motor mensual: `diario_bcra.json` (`pipeline/diario.py`, D-019) y `semaforo.json` (`pipeline/semaforo.py`, D-020). Para rebajar solo las series del semáforo: `python pipeline/semaforo.py --bajar`. Chequeos: `cd web && npx tsx scripts/chequeo-diario.ts` y `npx tsx scripts/chequeo-semaforo.ts`.
- Subagentes: Sonnet con esfuerzo medio para lo normal y Opus solo para la pieza difícil (pedido del usuario, 2026-11-12). Para fuentes de datos, el agente `investigador-datos`.
- Pendiente de herramientas: regenerar `DESIGN.md` con el documentador de Impeccable.

## Cómo se trabajó (y funcionó)
- El usuario recorre el sitio publicado y pasa una lista de pedidos. Se anotan en `docs/IDEAS.md`, se bajan a una spec de tanda y se implementan.
- Specs grandes: tres o cuatro subagentes en paralelo, cada uno con sus archivos; después compilar, barrido por código, verificación en el navegador y `revisor`.
- Para revisar pantallas se pueden mandar subagentes económicos a navegar, cada uno en su pestaña; sirven para textos, repeticiones y desbordes, no para juzgar colores ni proporciones.
- El usuario decide con botones cortos; cuando dice "fijate" o "buscá la forma", espera una decisión razonada, no una pregunta.
- Si se corta por límite de uso, los subagentes se retoman con un mensaje y siguen donde quedaron.
