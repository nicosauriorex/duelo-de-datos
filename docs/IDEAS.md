# Ideas (backlog sin priorizar)

Notas del usuario, ordenadas por tema. No son specs: antes de implementar cualquiera se pasa por `/spec`.

## Principios (2026-11-08)
- **Mobile first**: la mayoría entra desde el celular.
- Simple para el que quiere ver un dato, configurable al detalle para el que quiere. Que la pantalla no se sature de botones: las opciones avanzadas van escondidas (ej. un botón "Configurar gráfico").
- Lo visual importa ("todo entra por los ojos"): más adelante, una propuesta de diseño distinta.

## ~~Inicio y búsqueda guiada~~ ✅ 2026-11-08
→ spec: docs/specs/inicio-y-temas.md (pendiente aparte: fotos de presidentes en la portada; subgrupos agro/minería/industria por rama necesitan series nuevas)
- Página de inicio visual (ej. los presidentes enfrentados, fotos de datos) que explique por qué existe la página y para qué sirve.
- Arranca preguntando qué tipo de dato te interesa (ej. Actividad económica), con un **(?)** que abre una explicación corta.
- Dentro del tema, primero los indicadores principales (PIB, EMAE…) y después los subgrupos (agro, minería, industria…). Tocás uno y ves todos sus datos.
- Podés cortar la búsqueda en el tema: te lleva a una **página del tema** (título, explicación y distintas formas de verlo: histórico, por presidente, contexto, etc.).
- Armar la búsqueda con una oración guiada o escrita: "quiero saber cuántos litros de cerveza se compran con un salario medio" → te muestra el gráfico.

## ~~Contexto para juzgar a un presidente~~ ✅ 2026-11-09
→ spec: docs/specs/contexto-internacional.md (también el consumo de carne, si hay fuente oficial)
- El contexto internacional influye (commodities con Néstor, pandemia con Alberto, tasas y petróleo con Milei).
- **Proyecciones vs. resultado**: qué se proyectaba a principio de año (FMI u otros) para Argentina, EE.UU., Europa, el mundo, y cuánto se desvió cada uno. Si el mundo cayó 50% contra lo proyectado y Argentina también, no es (solo) culpa del presidente. Posible sección "proyecciones cumplidas o no" y ranking de los que más se desviaron.
- **Comparar con vecinos o países parecidos**: crecer 5% no es mucho si los vecinos crecen 10%.
- Pendiente de este bloque: **consumo de carne vacuna por habitante**. La única serie oficial descargable (Ministerio de Agricultura, `AGRO_0244` en datos.gob.ar) termina en 2018, así que no se agregó; hay que ver si sale una fuente más nueva. Tampoco hay descargable la proyección de abril de 2023 en adelante, el desempleo proyectado ni la proyección para América Latina (la base "Historical WEO Forecasts" del FMI llega a abril de 2022).

## Comparación internacional (2026-11-09)
→ PBI y otras variables (base 100 desde 2000): spec docs/specs/contexto-internacional.md. Precios por categoría (nivel en dólares contra el mundo): spec docs/specs/precios-en-el-mundo.md. Queda pendiente la comparación de precios relativos en base 100.
- ~~**Precios por categoría**: cada división del IPC del INDEC (carne, ropa, servicios, etc.) contra la misma categoría en EE.UU., Europa y los países vecinos, para ver qué tan distorsionado está cada precio en Argentina. Ej.: precio de la carne en Argentina vs. el mundo.~~ ✅ 2026-11-09
- **Variables que no son precios** (PBI, empleo, etc.): traerlas también para los mismos países y poder comparar cada variable con Argentina.
  Ej.: crecimiento del PBI en **base 100 desde el 2000**, para ver cómo creció cada país.
- Se suma a "Comparar con vecinos o países parecidos" de más arriba: es la misma idea llevada a todas las variables.

## Capacidad de gobierno (2026-11-09)
→ spec: docs/specs/capacidad-de-gobierno.md (bloque 6d)
Indicadores de cuánto pudo hacer cada presidente de lo que quería, para juzgar resultados con ese contexto.
- Legisladores **propios y aliados** del presidente: diputados y senadores, por período.
- **Leyes que quiso sacar vs. leyes aprobadas**.
- Otros indicadores a evaluar (ver "Sugerencias de Claude"): decretos (DNU) usados, vetos y vetos insistidos (→ entran en la spec), quórum en sesiones clave, cambios de gabinete.
- Pendiente, fuera de la spec del 6d: cambios de gabinete, quórum en sesiones clave, años sin Presupuesto aprobado, aliados según votaciones nominales.

## Histórico: celular y gráficos
→ spec: docs/specs/historico-celular.md (implementada, commit 144fc59)
- Barra de fechas y de vista (mes/año) **fija arriba** al bajar (ej. estás en "Rosario vs Chicago" y querés cambiar a "por año" sin subir).
- Eje X legible en celular: hoy los años se pisan y el gráfico queda apretado.
- Etiquetas de último dato, promedio, mediana: más chicas en celular.
- Variaciones en **verde/rojo según si es bueno o malo** (con `dir`: que baje el riesgo país es verde).
- Botón para **expandir el gráfico** a pantalla completa y en horizontal.
- Desplegables con estilo propio (en Android se ven los nativos, feos).
- Zoom arrastrando: al tocar, el gráfico se opaca y la selección se aclara a medida que arrastrás. Para volver, un botón arriba a la derecha (hoy son dos doble clic).
- Ver como **gráfico o tabla**. Otros tipos de gráfico solo si suman (casi todo va bien en líneas).

## Histórico: medidas y opciones
Las primeras seis → spec: docs/specs/medidas-y-opciones.md (implementadas 2026-11-08, ver "Hecho")
- ~~Hasta **4 gráficos** en la misma vista, cada uno con sus filtros, y compartir la vista entera.~~ ✅ 2026-11-08
- ~~Abajo, "Otros gráficos interesantes" (dólar, soja, brecha: cosas difíciles de armar con los filtros).~~ ✅ 2026-11-08
- ~~**Plantillas**~~ ✅ 2026-11-08: gráficos ya configurados con los datos de más interés (lo que hoy está en Curiosidades), con **buscador por palabra** (ej. "asado"). Darle importancia: muchas plantillas, mejor que sobren.
  (Estas tres → spec: docs/specs/plantillas-y-vistas.md. También: compartir plantillas propias por link.)

## Presidentes y mandato
- ~~"Inicio del mandato" pasa a ser **Configurar inicio del mandato**: T-1, T, T+N (también negativo) y **por presidente** (todos en T, Milei en T+1).~~ ✅ 2026-11-08
- ~~Preferencias guardadas por usuario; mejor una **configuración global** de la página que afecte a todas las secciones.~~ ✅ 2026-11-08
  (Estas dos → spec: docs/specs/configuracion-global.md)
- ~~En la vista de un presidente con todas las variables: poder filtrar y elegir, por ejemplo, 5 variables de distintas categorías una debajo de otra.~~ ✅ 2026-11-08
- Meses de mandato: **animación** que va dibujando la evolución desde el inicio al final, descargable como video. (Animación hecha 2026-11-08; falta el video, bloque 7.)
  (Estas dos → spec: docs/specs/presidentes-ranking-curiosidades.md; el video va con el bloque 7.)

## Ranking de presidentes y curiosidades
→ spec: docs/specs/presidentes-ranking-curiosidades.md (el consumo de carne va con el bloque 6b)
- ~~Ranking armable de distintas formas: cuánto mejoró cada indicador en su mandato (desde T, T+1, etc.), en cuál se estaba mejor en nivel, quién tuvo la mejor/peor actividad, etc.~~ ✅ 2026-11-08
- ~~Separar Curiosidades del Ranking. Curiosidades tipo: "con este presidente el asado fue el más barato, pero se compraba menos por salario", "máxima pobreza histórica", "la ropa más barata".~~ ✅ 2026-11-08
- Sumar datos de consumo (ej. consumo de carne por habitante) si hay fuente.

## Elecciones
→ spec: docs/specs/presidentes-ranking-curiosidades.md
- ~~Porcentaje estimado de votos que sacaría el presidente en curso con los datos que tiene hasta hoy.~~ ✅ 2026-11-08

## Compartir gráficos
→ spec: docs/specs/responder-con-imagen.md (bloque 7a: botón Compartir con imagen, título, texto de contexto automático, marca del sitio) y docs/specs/imagen-presidentes.md (bloque 7b: Por presidente, Ranking y Meses de mandato). Quedan afuera: el pedido de donación, publicar en Comunidad y el video.
- ~~Todos los gráficos, indicadores y tablas tienen un botón **Compartir** que abre un panel para descargar lo que se está viendo.~~ ✅ 2026-11-10 (Histórico, Plantillas, Por presidente, Ranking y Meses de mandato; Elecciones, Curiosidades y Congreso quedan sin imagen)
- ~~Título que explique lo que se ve + subtítulo con los filtros aplicados.~~ ✅ 2026-11-10 (Histórico y Plantillas; Por presidente, Ranking y Meses de mandato: 7b, 2026-11-10)
- ~~Texto explicativo sugerido automáticamente (ej. "viene mejorando un x%"), que se puede ocultar o reemplazar por uno propio.~~ ✅ 2026-11-10 (contexto automático neutro + comentario propio aparte; el texto automático no se edita, decisión D-012)
- ~~Todo lo descargable (imagen, video) lleva **marca de agua** de la página.~~ ✅ 2026-11-10 (imagen; el video queda para 7c)
- Antes de compartir: "¿Te sirve la información? Podés ayudar donando".
- Opción de publicarlo en la pestaña **Comunidad** con título, comentario y si el dato le parece positivo, negativo o neutro.
- Pensado para compartir en Twitter/X y otras redes.

## Responder y verificar afirmaciones en redes (2026-11-08)
→ spec: docs/specs/responder-con-imagen.md (solo "imagen lista para pegar" y "mejor dato desde…"; sin sello ni cita del tuit). El resto sigue pendiente (bloque 7c).
Uso central: alguien escribe en redes "Milei fundió la economía" y otra persona responde con la página.
- **Link que lleva a la vista justa**: la respuesta apunta a un gráfico o página ya armado con los filtros del caso (ej. el mandato desde T con las variables clave).
- ~~**Imagen lista para pegar en la respuesta** (la gente no entra a los links): se genera sola, con los datos, marca de agua y el link. Formato a elegir (cuadrado 1:1, vertical 4:5, horizontal 16:9).~~ ✅ 2026-11-10 (desde Histórico y Plantillas; y desde Por presidente, Ranking y Meses de mandato, 7b)
- **Modo "Contestar un relato"** (en el inicio o sección propia): se escribe la frase ("la ley X destruyó el salario") y la página arma la info para responderla. La imagen sale así:
  - Arriba, la cita del comentario original (con usuario y red social, opcional).
  - Abajo, los datos que lo contrastan.
  - Al final, un **sello**: verdadero / falso / neutral.
- **Chequear un anuncio oficial**: se pega el tuit de un funcionario ("la economía subió tanto") y la página dice si es cierto y qué tan bueno es el dato: *"mejor dato en X meses / desde tal fecha / de toda la serie"*.
- **Cuenta de X que responde sola** (bot): detecta tweets de funcionarios o cuentas oficiales sobre un dato (ej. Caputo: "la economía creció tanto") y responde con la imagen y el link. Ver "Sugerencias de Claude" por límites y riesgos.
- **Posts automáticos de datos fijos** (empezar por acá): el BCRA publica todos los días a la tarde compras de divisas, reservas y tasas. La página publica o responde con el dato verificado y su contexto histórico ("mayores compras desde…").
- **Todo configurable**: elegir qué mostrar o no (evolución por meses de mandato, si es el mejor dato de tanto tiempo, comparación contra la proyección, etc.).

## Comunidad
- Registro anónimo.
- Posts con votos a favor y en contra (se ven las dos cantidades) y comentarios. Al publicar se marca si el dato es positivo, negativo o neutro.
  Ej.: alguien filtra el período de Milei, muestra cómo evolucionó el dólar y comenta.
- Se puede responder un comentario **con otro dato** (otro gráfico), y gana el que tenga más votos.
  Ej.: "le fue re mal a la economía tal año" → le responden "pero bajó la inflación".
- Si un comentario tiene más votos que el post, es un **ratio**.
- Rankings: lo más debatido del mes y de la historia, ranking de ratios, lo más votado en contra, etc.

## Novedades, calendario y predicciones
- Sección con los datos nuevos que van entrando, para que la gente opine.
- Calendario de próximas publicaciones con fecha (INDEC tiene calendario; para el resto, el día promedio en que suele salir).
- La gente deja su predicción (ej. inflación de noviembre) y la página muestra la **mediana** (un valor absurdo no la mueve). Limitar valores imposibles (ej. 1.000.000% de inflación).

## Precios en términos de salarios
- Ver índices de precios medidos en salarios: cuántos bienes / servicios se compran con un salario, etc.
  (→ spec: docs/specs/plantillas-y-vistas.md, como plantillas "cuánto compra un salario"; los índices del IPC medidos en salarios quedan pendientes.)
- Galería pública de plantillas hechas por la gente (cuando haya cuentas).

## Bugs conocidos
- ~~Histórico: el filtro de fecha queda flotando y se superpone con el resto~~ (arreglado en la migración; ahora se pide que quede fijo arriba sin tapar nada, ver "Histórico: celular y gráficos").

## ~~Diseño visual y animación (2026-11-09)~~ ✅ 2026-11-10
→ spec: docs/specs/diseno-visual.md (bloque 5e). Implementado; resumen en "Hecho".
Dirección: **animaciones ligadas al scroll + scrollytelling + motion design**. Sobre todo en la portada, pero coherente con toda la app. Tipografías modernas y lindas. Libertad de diseño; los textos de abajo son ejemplos.
- **Portada contada al bajar**:
  1. Arranca con un mensaje fuerte. Ej.: "¿Cansado de ver comentarios en redes de gente que habla sin saber? *Primero los Datos* tiene la solución. Buscá el dato que te interesa y compará a lo largo del tiempo, con otros presidentes y con el contexto internacional."
  2. Al bajar, **los datos más buscados** como tarjetas con diseño más atractivo, que se mueven de a poco de izquierda a derecha; el usuario puede volver a una anterior.
  3. Más abajo, "¿Qué datos te interesan?" (los temas).
  4. Después "Preguntale a los datos" y las **plantillas destacadas**.
  5. Remarcar que **todo tiene fuente**.
- **Links de la portada** (¿Qué querés ver?): hoy se ven simples, azules y subrayados, y queda feo. Pasarlos a botones o tarjetas.
- **Volver atrás**: al tocar un dato en la portada se llega al Histórico, y falta una flecha "Volver" intuitiva.
- **Colores de lo bueno y lo malo**: en tema claro, que el verde más fuerte sea lo mejor y el rojo más fuerte lo peor (hoy el claro/oscuro confunde). En tema oscuro puede no tener solución limpia; si es así, dejarlo como está.
- **Renglones de más**: hay textos que se parten en dos líneas cuando entran en una (ej. la barra de arriba: Precios, Salarios, Dólar, Reservas). Revisar si es a propósito.
- **Tarjetas de resumen del Histórico** (último dato, promedio, mediana…): en una sola fila; si no entran, se deslizan de costado, y pueden moverse lento por sí solas.

## Ajustes de interfaz pedidos (2026-11-09)
→ spec 5c (Histórico, "Mis variables" y presidentes en la línea de tiempo): docs/specs/ajustes-historico.md
→ spec 5d (Presidentes, Ranking, Mandato y Elecciones): docs/specs/ajustes-presidentes.md
**Histórico**
- Con un solo gráfico, la barra de período y mes/año **ya no hace falta que quede fija** arriba (dejarla fija solo si hay varios).
- Botón **"Configurar variable"** que abre una ventana (pop-up) para elegir medida, pesos/dólares, etc. Lo mismo para la segunda variable. Ahorra mucho lugar en pantalla. Con **Aceptar**, la variable queda como texto limpio (sin todos los botones a la vista). Ahí también va el nombre de "mis variables".
- En esa ventana, separar más "reales / corrientes" de "pesos / dólares / variaciones": hoy se ve todo muy junto y parece lo mismo.
- **Leyenda del gráfico**: sacar las líneas de último, promedio y mediana. Mejor que al pasar el cursor sobre la línea se **resalte** y diga qué es (promedio, mediana…) y su valor.
- **Zoom**: al acercar una zona, la escala vertical se ajusta a esa sección y las líneas (promedio, etc.) se recalculan solo con lo visible. Al tocar "Volver", la escala queda rara y hay que hacer doble clic; que vuelva bien a la primera.
- **Precios (ej. carne)**: hoy "que suba es malo"; matizarlo, porque depende del poder de compra. Analizar también en términos de salario.
- ~~Promedio o cierre al pasar de mes a trimestre o año~~ ✅ ya estaba: botones "Promedio / Cierre" en la barra de período (revisado 2026-11-09).

**Presidentes y Ranking**
- Sumar la **variación absoluta** además del porcentaje (hoy Ranking compara solo el aumento porcentual).
- En Ranking, poder **abrir el detalle de dos presidentes a la vez** (ej. filtrar el grupo Salarios y ver Cristina y Milei desplegados juntos). Hoy abrir uno cierra el otro.
- Mover "lo mejor y lo peor de cada gobierno" de Curiosidades a **Ranking** (o a Presidentes). No es una curiosidad.
- ~~Curiosidades: sacar los datos curiosos armados a mano (ya están en Plantillas) y pasar el "ranking de presidentes" que quedó ahí a la sección Ranking.~~ ✅ ya estaba hecho (revisado 2026-11-09: Curiosidades tiene el aviso y los links viejos redirigen).

**Meses de mandato**
- "Precio teórico" y "partiendo del mes 0 de mi ley" se leen como cosas sueltas: integrar mejor que lo segundo depende de haber elegido lo primero.
- Mantener separado "presidentes y opciones" (está bien, pero que no se mezcle).
- **Animación**: que la escala del gráfico acompañe. Ej. con dólar blue, el máximo es 20.000, pero al principio los valores son ~1.200, así que no tiene sentido arrancar con una escala de 20.000. La escala crece a medida que cambian los valores.

**Elecciones (voto estimado)**
- En los gráficos de dispersión, **pintar aparte el valor actual** (último dato) para ver dónde caería hoy según esa recta.
- Hoy el cálculo usa solo las variables con relación fuerte (|r| ≥ 0,6, al menos 3 variables y 8 elecciones; el valor absoluto ya incluye las relaciones inversas). Ese 0,6 es un corte arbitrario. Opciones pedidas: poder **elegir el corte de r**, y una **proyección ponderada con todas las variables**, donde pesen más las de mayor coeficiente (ej. el empleo público pesa más que el precio del pan). Mostrar las dos proyecciones.

**Presidentes en la línea de tiempo**
- En la mayoría de los gráficos, una opción para **pintar el período de cada presidente** como un área de color (o marcarlo). Por defecto con los colores de cada partido (Macri amarillo, Cristina celeste, Milei violeta), y que los colores se puedan cambiar desde la **configuración global**.

## ~~Ajustes pedidos al recorrer la página (2026-11-10)~~ ✅ 2026-11-10
→ spec A (Histórico y gráfico): docs/specs/ajustes-grafico.md · → spec B (imagen): docs/specs/personalizar-imagen.md · → spec C (tablas, presidentes y temas): docs/specs/ajustes-tablas.md
Criterio general pedido: lo que se pide para una pantalla vale para toda la página.
1. Gráfico: al pasar por una línea de último, promedio o mediana, mostrar solo ese dato (hoy el de la serie lo tapa). → A
2. Imagen compartible: elegir marcadores y líneas (último, promedio, mediana); nombres de presidentes del mismo tamaño (abreviar "Néstor K.", "Alberto F."); compartir solo un rango de fechas, con tarjetas solo de esos presidentes; elegir qué datos van en las tarjetas (recibido, entregado, variación, promedio, mediana…) y que se entienda qué es cada uno; presidentes resaltados sin tarjetas, o tarjetas generales con o sin presidentes. → B
3. Página de tema en PC: mucho espacio vacío a la derecha del título y la bajada. → C
4. Zoom: al seleccionar un área, la escala no siempre se ajusta. → A
5. "Todos los datos" de inflación ofrece el índice y además la mensual y la interanual: dejar una sola forma (lo más fácil, las variaciones ya calculadas). → C
6. Celular: gráficos de muchos años ilegibles; zoom con deslizadores en el eje X y poder mover el gráfico; sin marcadores cuando está muy apretado. → A
7. Tabla por presidente de las páginas de tema: el mandato debajo del nombre, no en otra columna (también en PC). → C
8. Celular: compartir manda la imagen y el link. ✅ probado por el usuario (2026-11-10).
9. Celular: en Personalizar, Mes/Trimestre/Año se sale de la ventana. Mostrar siempre la temporalidad y cómo se agregan los datos (al ver y al compartir). → A y B
10. Personalizar: tres botones (Filtrar fecha, Elegir variable, Opciones del gráfico); en Opciones van Mes/Trimestre/Año, cómo se agregan, Gráfico/Tabla y lo de hoy; nada se sale de la pantalla. → A
11. Tarjetas de resumen del Histórico: no se sabe contra qué es la variación; fijar el último y pasar inicio, promedio, mediana, mínimo, etc. con la variación contra el último, aclarado arriba. → A
12. Por presidente: mandato debajo del nombre; variación en $ más chica y debajo del %; abreviar nombres; períodos no más anchos que el nombre; mejor/peor por color es confuso en fondo oscuro (un rojo oscuro alarma más que uno claro): buscar otra técnica; primera columna fija al desplazarse. → C
13. Celular: el desplegable del inicio de mandato en la configuración global es el nativo de Android. → C
14. "Inicio: T-1" poco claro: oración dinámica ("Mes inicial de cada presidente: T-1, excepto Milei (T+1)") y aclarar que T = mes de asunción. → C (y B para la imagen)
15. Por presidente: la explicación del inicio y el contexto del mandato, contraídos o como ícono de información. → C
16. Un presidente, todas las variables: mucha configuración arriba; unidad debajo de la variable, columna fija, nombres con puntos suspensivos o en varias líneas. → C
17. Gobierno y Congreso: no se ven los datos (vetos). → C (faltan cargar totales y bancas; que se entienda qué hay y qué falta)
18. Es raro que Congreso sea la misma página que Por presidente. → C

## ~~Simplificación (auditoría 2026-11-10, etapa 3)~~ ✅ 2026-11-11
→ spec: docs/specs/simplificacion.md (bloque 5h)
Decisiones del usuario (2026-11-11): los nombres públicos los propone Claude y el usuario corrige; Elecciones queda en el menú con un aviso visible; el puntaje del Ranking se relega (plegado, debajo de la comparación por indicador); los precios por región pasan a ser un filtro.
- Nombres que entienda cualquiera ("Salario mediano" en lugar de "Salario SIPA mediana").
- Inflación como una sola entrada, con mensual, interanual y promedio.
- Región como filtro del dato, no como cientos de series en el selector.
- "Plantillas" pasa a "Gráficos listos", con filtros por tema.
- Detalles de lectura que marcó la revisión con agentes: rótulos U/P/M, colores de presidentes parecidos, notas al pie dentro del área deslizable, vista previa chica de la imagen.

## ~~Ajustes pedidos al recorrer la página, tanda 3 (2026-11-11)~~ ✅ 2026-11-11
→ spec: docs/specs/ajustes-tanda-3.md (bloque 5i). Pendiente aparte: el parte diario del BCRA como bloque propio (compra de divisas del día, tipo de cambio minorista), que necesita datos diarios.
**Datos al día (prioridad)**
1. La inflación quedó en ago-26 y ya salió septiembre (antes del 2026-11-10 el sitio mostraba sep-26: revisar qué fuente del IPC manda en la corrida de GitHub). Capturar los datos a la hora en que se publican: IPC de INDEC (segunda semana del mes, 16 h) y el parte diario del BCRA (16:45 a 17 h: reservas, compra de divisas, tipo de cambio minorista, TAMAR, BADLAR). Sirve para comentar y difundir el sitio en ese momento.
**Portada y temas**
2. En "Los datos más buscados", actividad económica en lugar de kilos de asado (definir si son fijas o las más vistas).
3. La placa del dólar blue tiene otro formato ("-13,3 % contra hace un año" resaltado); en la de inflación la fecha a veces se parte ("AGO" / "26").
4. Página de tema: la cabecera se ve mal (tarjeta del dato principal suelta a la derecha y una sola tarjeta en "Principales"). Rediseñar.
5. Tema de precios: "IPC nivel general (Nacional)" repite la inflación; llevar Bienes, Servicios, Estacional, Núcleo y Regulados a "Indicadores de inflación"; renombrar "IPC INDEC" a "IPC por rubros"; ordenar bien los rubros (hoy 01, 04, 06, 07, 02, 03) y los precios promedio.
7. En el tema, la tabla por presidente con las demás variables principales (elegibles o rotando sola).
**Histórico y gráfico**
6. Las tarjetas "Último dato" + "Comparado con el último dato" quedan feas (peor en celular): rediseñar.
11. En Personalizar, un botón para volver a lo de fábrica (limpiar filtros).
12. "Regulados" debería encontrarse como servicios públicos. En índices del IPC es redundante "Precio relativo (contra la inflación general)" junto a "Nominal / Real": dejar una sola forma (probable: nominal y real, con mensual, interanual, etc.).
13. Con la vista en Tabla, Compartir comparte el gráfico: preguntar (copiar tabla o pasar a gráfico). Ícono para copiar la tabla, con la URL del sitio como última fila. En Opciones del gráfico, "Líneas" y "Marcadores" quedan en el mismo renglón.
**Nombres**
8. "Soja: Rosario contra Chicago (dólar X)" → que diga "Brecha".
**Imagen compartible**
9. Poder elegir cuál de las frases automáticas va en la imagen (contra el promedio, el inicio, el récord, hace un año…).
**Preguntale a los datos**
10. Elegir producto más directo: todos los ítems desplegados con separadores (canastas, precios promedio por categoría, dólares). El desplegable del salario se va de pantalla al deslizar. "¿Cómo le fue a el riesgo país?" → "al". Esa oración debería mostrar también un gráfico del mandato, no solo la tabla. "¿Cuánto vale… en dólares blue?" → "¿Cómo evolucionó…?".
**Presidentes**
14. Tabla Por presidente: no se entiende cómo se llena la barra. Opciones: eje en cero cuando hay negativos; o de izquierda a derecha con el mejor lleno y el peor vacío; degradado rojo-amarillo-verde entre presidentes. Sumar una vista tipo vela japonesa acostada (inicio, cierre, mínimo, máximo).
15. "Un presidente, todas las variables": "Contraer todas" fuera de Personalizar y todo contraído al entrar; filtro por tipo de variable y buscador a la vista; Personalizar solo para columnas y moneda. "Mis variables" con el mismo formato que "Todas" y modo edición aparte (subir, bajar, editar, quitar; Guardar). Con un solo presidente, decir el mes exacto de inicio y de cierre en lugar de la oración general.
16. Ranking: "Puntaje combinado" desplegado, pero abajo.
17. Meses de mandato: configuración en botones (variable; cómo mostrar: variación %, precio teórico, valor; presidentes), sin "índice base 100" (igual a variación %); explicar que el precio teórico es la misma variación valorizada. **Error**: Milei muestra el mes 0 en 366,4 aunque tenga T+1. **Error**: después de animar hasta el final, achicar "Hasta" tira "Algo falló al mostrar esta página". La imagen tiene demasiado texto; opción de mostrar el último dato a ese mes de mandato.
18. Elecciones: explicaciones plegadas o con ícono de información. En los gráficos de dispersión falta a veces el dato actual (rombo) y su valor marcado en el eje Y.
19. Contexto: faltan botones de compartir; falta un gráfico de líneas con los precios por producto de Argentina contra otros países.

## ~~Ajustes pedidos al recorrer la página, tanda 4 (2026-11-11)~~ ✅ 2026-11-11
→ spec: docs/specs/ajustes-tanda-4.md (bloque 5j). Además de estos casos, se buscaron errores parecidos en todo el sitio (scripts en `web/scripts/`).
- Resumen del Histórico: la variación no cierra con los valores que se ven (último 1,9 y mediana 2,1 → dice 0,1).
- El botón "Volver" del zoom tapa el último punto cuando queda arriba a la derecha.
- Histórico: por defecto solo las líneas de último y promedio; franjas de presidentes más a la vista (botón debajo del gráfico, junto a Personalizar; Compartir abajo); que el arranque no sea el asado.
- Preguntas: el separador ("CANASTAS") queda fijo y tapa los ítems; falta una cruz; el Atrás del celular cierra la página en lugar de la ventana (pasa en muchos menús); en PC "Ver la tabla por presidente" desalinea los botones "Ver".
- Portada en celular: la tarjeta de "Los datos más buscados" se corre apenas entrás; sacar el pie genérico de fuentes (ya está "Todo tiene fuente").
- Por presidente: compartir también el gráfico de velas; en celular hay textos que se salen del menú (la recomendación al entrar a Salarios en el selector).
- Tabla por presidente de los temas: las variables en un solo renglón deslizable, con nombres largos en dos líneas.

## ~~Ajustes pedidos al recorrer la página, tanda 5 (2026-11-12)~~ ✅ 2026-11-12
→ spec: docs/specs/ajustes-tanda-5.md (bloque 5k). Se resolvió con la "ficha del dato" (D-017) en lugar del cartel que pregunta a dónde ir.
- Preguntale a los datos: "Ver la tabla por presidente" queda feo; sacarlo o que "Ver" ya muestre esa tabla resumida.
- ¿Qué datos te interesan? (temas): en Por presidente hay nombres que no entran en dos líneas ("Salario mediano real (trabajadores registrados)"). "Ver todos los indicadores por presidente" queda pegado a la tabla.
- Al tocar un dato de "Todos los datos": preguntar a dónde ir (Histórico, Por presidente, Meses de mandato). O mejor (preferida por el usuario): potenciar la sección trayendo Histórico, Por presidente y Meses de mandato, y que tocar cualquier variable (principal o de "Todos los datos") la aplique a los tres. Lo mismo para "Preguntale a los datos". Con Compartir y personalización. En ese caso, ver si la tabla por presidente resumida de hoy sobra.
- Menú de Presidentes: Por presidente, Meses de mandato, Ranking, Elecciones, Congreso.
- Debajo de "Preguntale a los datos": explicar y promocionar las otras secciones, con su link (para quien quiere buscar o mezclar variables).
- Los datos más buscados: sumar el mes anterior y el año pasado con sus variaciones ("datos novedosos": ver enseguida si el dato nuevo fue bueno o malo).
- Histórico, cabecera del dato: a la derecha, en el mismo estilo, las comparaciones del resumen (inicio, promedio, mediana, máximo, mínimo) más mes anterior y año anterior, tipo carrusel; en celular revisar o sacar la frase del récord.
- Histórico: Personalizar y esos botones como ventana, con el fondo oscuro o borroso.
- En celular, al abrir "agregar una variable" se abre el teclado enseguida.
- Un presidente, todas las variables: en "IPC por rubros" (índices) la moneda no cambia nada.

## Dato del día con agentes que navegan (2026-11-12)
- Para el parte del Banco Central: las fuentes legibles por un programa traen reservas y compras con unos cinco días hábiles de demora (ver `docs/specs/parte-diario-bcra.md`). Idea del usuario, para más adelante: programar agentes que naveguen y busquen el dato del día por su cuenta (comunicado y redes del BCRA, medios), a la hora en que se publica. A definir: cómo se marca un dato tomado así (no es la serie oficial), cómo se verifica y qué pasa cuando llega el dato oficial.

## ~~Semáforo de actividad (2026-11-12)~~ ✅ 2026-11-12
→ spec: docs/specs/semaforo-actividad.md. Hecho con interanual por defecto; el mes contra mes sin estacionalidad de los ejemplos quedó solo para las series con ajuste oficial (la estimación propia dio demasiado error). Pendiente como idea: sumar un ajuste estacional serio (X-13 con corrección de calendario) y los indicadores sin fuente legible (CAME, patentamientos, Construya, escrituras, leche, petróleo).
Idea del usuario, con cuatro ejemplos de consultoras (Max Capital, Econviews, una "tabla semáforo s.e." y 1816).
- Una tabla con los indicadores de actividad de alta frecuencia en filas (EMAE, industria, autos, hierro y acero, petróleo y gas, construcción, cemento, Construya, molienda de soja, faena, pesca, ventas minoristas, patentamientos de autos y motos, energía eléctrica, escrituras, IVA, crédito al sector privado, exportaciones e importaciones, comercio con Brasil, confianza del consumidor, empleo) y los últimos meses en columnas, con la variación mensual desestacionalizada pintada de verde o rojo.
- Abajo, un **índice de difusión**: qué porcentaje de los indicadores subió ese mes.
- Variantes vistas: columnas mes contra mes, trimestre contra trimestre y último dato contra el trimestre previo con un círculo de color (Econviews); agrupado por sector (actividad y empleo, consumo, comercio exterior, industria, construcción, agro, inmobiliario); una tabla interanual en términos reales y otra mensual desestacionalizada, separando indicadores "tempranos" de los "principales con demora" (1816).
- A resolver: (1) faltan muchas fuentes (ADEFA, Cámara del Acero, AFCP, Construya, CAME, patentamientos, CAMMESA, escrituras, Secretaría de Energía, agro): usar el agente `investigador-datos`; (2) la desestacionalización es propia en los ejemplos: decidir si se usa la serie oficial sin estacionalidad donde existe y la interanual donde no, o si se desestacionaliza en el pipeline; (3) cada fila con su fecha (publican con distinta demora, como el parte del BCRA).

## Gasto e impuestos de las provincias y la Nación (2026-11-12)
→ specs: docs/specs/gasto-nacion.md (Nación por partida y por entidad, con universidades; hecha, ver "Hecho") y docs/specs/provincias.md (bloqueada en parte: el sitio de la DNAP no carga).
Idea del usuario. Agregado el mismo día: ~~ver el presupuesto de cada entidad pública (por ejemplo en qué gastan las universidades) y aclarar si lo tienen sin rendir~~ ✅ 2026-11-13 (lo que se puede: ver "Hecho").
- ~~Gasto de la Nación por partida presupuestaria~~ ✅ 2026-11-12; gasto de las provincias por partida: pendiente.
- Qué provincias cobran más impuestos (por ejemplo Ingresos Brutos), contemplando exenciones.
- Un ranking de provincias. (Lo que se puede hoy, el gasto de la Nación en cada provincia por habitante: ✅ 2026-11-13, `/provincias/`, fase 1 de docs/specs/provincias.md; el ranking de las cuentas de cada provincia sigue bloqueado.)
- A resolver: fuentes (Presupuesto Abierto para la Nación; ejecución presupuestaria y recaudación provincial por tributo de la Dirección Nacional de Asuntos Provinciales; leyes impositivas de cada provincia para alícuotas y exenciones); cómo comparar (por habitante, como % del producto de la provincia, en pesos de hoy); el sitio hoy no tiene datos por provincia salvo el IPC por región: es un bloque nuevo, con su propio archivo de datos como el parte del BCRA. Comparar alícuotas con exenciones es mucho más difícil que comparar recaudación.

## Correcciones pedidas (2026-11-09)
→ spec: docs/specs/correcciones-historico.md
Son ajustes a lo ya hecho, no ideas nuevas.
- ~~**"Otros gráficos interesantes" del Histórico** (soja, Chicago, brecha, dólar): los datos ya están en el catálogo, así que ya no tiene sentido tenerlos como gráficos sueltos. Pasarlos a **variables elegibles** como cualquier otra (queda la plantilla si hace falta una vista armada) y sacar la sección.~~ ✅ 2026-11-09
- ~~**Hasta 4 gráficos en la vista, uno al lado del otro**, para comparar 4 cosas al mismo tiempo (en celular, apilados). Verificar cómo quedó con lo ya implementado.~~ ✅ 2026-11-09

## Sugerencias de Claude (a discutir)
- Comparación internacional, fuentes a investigar (con `investigador-datos`): IPC por división COICOP de EE.UU. (BLS), Eurostat (HICP por categoría) y OECD; el Banco Mundial y el FMI para PBI y otras variables. Los vecinos (Brasil, Chile, Uruguay, Paraguay, Bolivia) a veces solo tienen el IPC general desde fuentes unificadas, así que la comparación por categoría puede quedar limitada. Las divisiones COICOP no son idénticas entre países, y para comparar **niveles** de precios (no solo variaciones) hacen falta paridad de poder adquisitivo o tipo de cambio real. Mostrar siempre en base 100 o en variación para no comparar manzanas con naranjas.
- Capacidad de gobierno, fuentes: HCDN y Senado publican composición de bloques y leyes; Boletín Oficial para decretos y vetos. La parte difícil es "propios y aliados" (los bloques cambian y hay criterio de por medio): definir una regla clara y publicarla. "Leyes que quiso sacar" tampoco sale de una base: hay que definir qué cuenta (proyectos del Ejecutivo ingresados, por ejemplo) y es mejor mostrar el número crudo antes que un puntaje.
- Para que sea justo, las dos comparaciones (internacional y capacidad de gobierno) se muestran para todos los presidentes con el mismo criterio.
- ~~Página propia por indicador con URL fija (`/dato/salario-real`): sirve para SEO y para que lo compartido tenga una vista previa linda en redes. Encaja con las "páginas de tema".~~ ✅ 2026-11-12 → spec: docs/specs/vista-previa-links.md
- Moderación desde el día 1 si hay comentarios públicos: reportar, ocultar con X reportes, límite de posts por usuario/día.
- Que cada post de la comunidad guarde los filtros exactos del gráfico, así cualquiera lo abre y lo puede modificar.
- Proyecciones: el FMI publica las ediciones viejas del World Economic Outlook (abril y octubre de cada año), así que se puede reconstruir "qué se esperaba" para cada año y país sin depender de recortes de diarios.
- Configuración global guardada primero en el navegador (sin cuentas); cuando haya cuentas, se sincroniza.
- Verificador, por etapas (de más fácil a más difícil):
  1. "Es el mejor dato desde X" y la imagen compartible: es cálculo puro sobre las series que ya hay, sin IA ni servidor.
  2. Plantillas de relatos frecuentes ("fundió la economía", "el salario cayó", "la inflación…") que mapean a un conjunto fijo de indicadores. Se elige el relato de una lista.
  3. Frase libre: requiere interpretar el texto (IA) y un backend. Es lo caro y lo riesgoso; dejarlo para el final.
- El sello **verdadero/falso** funciona para afirmaciones medibles ("el salario real cayó") pero no para opiniones ("fundió la economía"). Para esas, mejor "Los datos muestran…" / "No concluyente", y siempre con el criterio visible (qué indicador, qué período, contra qué se compara). La credibilidad es lo más valioso del sitio.
- Que funcione igual para cualquier presidente y para afirmaciones a favor y en contra; si se ve como herramienta de un solo lado, pierde valor como fuente.
- Con el sitio estático hay que generar las imágenes de forma estática (plantillas prearmadas) o en el cliente (canvas); las dinámicas necesitan backend. Las vistas previas de links en X (og:image) son 16:9 aprox., así que la imagen horizontal sirve también como preview del link.
- Bot en X:
  - Responder solo a cuentas, y automáticamente, choca con las reglas de X: la API de pago tiene costo, y las respuestas automáticas no pedidas a terceros se consideran spam y pueden suspender la cuenta. Verificar las condiciones vigentes antes de diseñar nada.
  - Más seguro: que **publique en su propia cuenta** datos recurrentes (el BCRA, el IPC cuando sale) y que las respuestas a tweets ajenos las dispare una persona con un clic ("Responder con esto"), o por mención (@cuenta + tweet).
  - Los datos del BCRA diarios ya tienen fuente conocida; sumar compras de divisas y reservas como series nuevas (skill `nueva-serie`, agente `investigador-datos`) es el primer paso, y sirve también para el sitio.
  - Un bot que publica solo necesita un proceso programado (el workflow de GitHub Actions de actualización diaria podría disparar el post). Verlo con la spec `actualizacion-diaria`.
- Las plantillas pueden ser la base de todo: la búsqueda guiada, la página de inicio y "otros gráficos interesantes" muestran plantillas.

## Hecho
(Ideas implementadas y verificadas; se tachan acá con su fecha. Ver CLAUDE.md.)

### En qué gasta la Nación y las universidades (bloque 12, implementado, spec gasto-nacion)
- ~~Gasto de la Nación por partida, organismo, tipo de gasto y provincia, año por año (`/gasto/`).~~ ✅ 2026-11-12
- ~~Cómo viene el año en curso, mes a mes, contra el año anterior (`/gasto/?vista=mes`).~~ ✅ 2026-11-13
- ~~Presupuesto de cada entidad pública, por ejemplo las universidades, y si lo tienen sin rendir (`/universidades/`): transferencias por universidad 2018-2026, por estudiante en 2023 y 2024, y lo que dicen los documentos oficiales sobre el control (no hay lista pública de quién rindió).~~ ✅ 2026-11-13 (sin dato: en qué gasta cada universidad, porque lo que declaran no cierra con lo transferido; empresas públicas)

### Herencia: recibido contra entregado (bloque 11, implementado, spec herencia)
- ~~Sección dentro de Presidentes que compare lo que cada presidente recibió con lo que entregó: series oficiales (fase 1), datos de informes con su cita (fase 2), reservas netas del FMI y estimación propia, cobertura de tarifas, puts, importaciones pendientes y precios acordados (fase 3).~~ ✅ 2026-11-12 (sin dato: dividendos retenidos; cepo de 2003 y 2007)
  Pedido original:
  - ~~Idea del usuario: una sección dentro de Presidentes que compare lo que cada presidente recibió con lo que entregó, con los datos de los que los presidentes se suelen quejar. Sin spec; no implementar sin que se pida.~~
  - ~~Lista pedida: deuda con importadores, SIRA, déficit fiscal y cuasifiscal, brecha cambiaria, reservas netas negativas, precios congelados, tarifas atrasadas, Leliq y pases (pasivos remunerados), puts de los bancos, dividendos retenidos, acuerdo con el FMI incumplido.~~
  - ~~Lo que ya hay en el sitio: resultado fiscal, cuasifiscal y pasivos remunerados (BCRA), brecha, reservas brutas. Es el mismo cálculo que "Por presidente" (valor al inicio y al cierre del mandato) con otro armado.~~
  - ~~Lo que falta y es difícil: reservas netas (no hay serie oficial; depende de la metodología), deuda comercial con importadores y SIRA, puts, dividendos retenidos (estimaciones de informes, no series), tarifas y precios atrasados (hay que definir cómo se mide el atraso), cumplimiento del acuerdo con el FMI (es un hecho, no una serie). Varios habría que cargarlos a mano con su fuente, como los datos de Congreso, y decir cuáles son estimaciones.~~
  - ~~Cuidado con D-012: mostrar recibido y entregado con su fuente, sin calificar la herencia.~~

### Responder con una imagen (bloque 7a, implementado, spec responder-con-imagen)
- ~~Imagen para compartir (1:1, 4:5, 16:9) con el dato, su contexto automático, el gráfico, la fuente y la marca; "Comparar presidentes"; comentario propio; vista simple del Histórico.~~ ✅ 2026-11-10 (las ideas "Compartir gráficos" y "Responder y verificar afirmaciones" siguen abiertas en lo que toca a 7b y 7c)

### Imagen desde las secciones de presidentes (bloque 7b, implementado, spec imagen-presidentes)
- ~~Compartir con imagen desde Por presidente (una variable entre presidentes y un presidente con varias variables), Meses de mandato y Ranking.~~ ✅ 2026-11-10

### Diseño visual y animación (implementado, spec diseno-visual)
- ~~Portada contada al bajar, tipografía nueva, links como botones, flecha Volver, verde/rojo según bueno/malo, renglones sin partir y tarjetas de resumen deslizables.~~ ✅ 2026-11-10

### Inicio y búsqueda guiada (implementado, spec inicio-y-temas)
- ~~Portada con cifras en vivo, temas con (?), página por tema (principales → subgrupos) y oraciones guiadas.~~ ✅ 2026-11-08

### Histórico: medidas y opciones (implementado, spec medidas-y-opciones)
- ~~Elegir la medida en pasos: **Pesos / Dólares / Variaciones**.~~ ✅ 2026-11-08
  - Pesos → corrientes o reales.
  - Dólares → corrientes o reales → cotización (blue, oficial, MEP, CCL).
  - Variaciones → mensual, interanual o **acumulada de los últimos 12 meses** (en lugar de la acumulada en el año, que confunde) → nominal o real.
- Al agregar una variable (ej. salario): primero una explicación corta y cuál recomienda la página; un "ver más" despliega la explicación completa.
- Índices "tal cual" (ej. IPC empalmado como índice): al fondo y en un color apagado; no son lo primero que hay que ver.
- No ofrecer comparaciones sin sentido (IPC empalmado contra la inflación).
- Al pasar de mes a año, elegir cómo agregar: promedio o último dato (cierre); quizás máximo y mínimo.
(Las seis ideas anteriores: medida en pasos, explicación corta + recomendada, índices tal cual al fondo, sin comparaciones sin sentido, Promedio/Cierre.) ✅ 2026-11-08

### Configuración global (implementado, spec configuracion-global)
- ~~Configurar inicio del mandato (T-1, T, T+N, por presidente).~~ ✅ 2026-11-08
- ~~Configuración global guardada en el navegador.~~ ✅ 2026-11-08

### Plantillas y vistas (implementado, spec plantillas-y-vistas)
- ~~Hasta 4 gráficos por vista, Otros gráficos interesantes, Plantillas con buscador, plantillas propias y compartir por link.~~ ✅ 2026-11-08

### Ranking, curiosidades y voto estimado (implementado, spec presidentes-ranking-curiosidades)
- ~~Ranking armable, curiosidades generadas, variables elegidas por presidente, animación del mandato y voto estimado.~~ ✅ 2026-11-08

### Correcciones del Histórico (implementado 2026-11-09, spec correcciones-historico)
- ~~Sacar "Otros gráficos interesantes"~~ ✅ 2026-11-09 (hasta 4 variables de la misma unidad en un eje; 3 plantillas nuevas)
- ~~Hasta 4 gráficos uno al lado del otro~~ ✅ 2026-11-09 (grilla de 2 columnas desde 1024 px)

### Contexto internacional (implementado 2026-11-09, spec contexto-internacional)
- ~~Contexto para juzgar a un presidente: proyecciones del FMI vs. resultado, vecinos y viento de cola o de frente~~ ✅ 2026-11-09 (sección Contexto y recuadro "Contexto del mandato")
- ~~Comparación internacional: PBI y otras variables del FMI, base 100 desde 2000~~ ✅ 2026-11-09 (el consumo de carne quedó pendiente, ver arriba)

### Precios en el mundo (implementado 2026-11-09, spec precios-en-el-mundo)
- ~~Precios por categoría contra el mundo y otros países (ICP del Banco Mundial + estimación mes a mes).~~ ✅ 2026-11-09

### Ajustes del Histórico (implementado 2026-11-09, spec ajustes-historico)
- ~~Ventana "Configurar variable", referencias con hover, zoom que recalcula, precios corrientes neutros y franjas de presidentes con colores en la configuración global~~ ✅ 2026-11-09
