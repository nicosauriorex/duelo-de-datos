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
- Todos los gráficos, indicadores y tablas tienen un botón **Compartir** que abre un panel para descargar lo que se está viendo.
- Título que explique lo que se ve + subtítulo con los filtros aplicados.
- Texto explicativo sugerido automáticamente (ej. "viene mejorando un x%"), que se puede ocultar o reemplazar por uno propio.
- Todo lo descargable (imagen, video) lleva **marca de agua** de la página.
- Antes de compartir: "¿Te sirve la información? Podés ayudar donando".
- Opción de publicarlo en la pestaña **Comunidad** con título, comentario y si el dato le parece positivo, negativo o neutro.
- Pensado para compartir en Twitter/X y otras redes.

## Responder y verificar afirmaciones en redes (2026-11-08)
Uso central: alguien escribe en redes "Milei fundió la economía" y otra persona responde con la página.
- **Link que lleva a la vista justa**: la respuesta apunta a un gráfico o página ya armado con los filtros del caso (ej. el mandato desde T con las variables clave).
- **Imagen lista para pegar en la respuesta** (la gente no entra a los links): se genera sola, con los datos, marca de agua y el link. Formato a elegir (cuadrado 1:1, vertical 4:5, horizontal 16:9).
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

## Diseño visual y animación (2026-11-09)
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
**Histórico**
- Con un solo gráfico, la barra de período y mes/año **ya no hace falta que quede fija** arriba (dejarla fija solo si hay varios).
- Botón **"Configurar variable"** que abre una ventana (pop-up) para elegir medida, pesos/dólares, etc. Lo mismo para la segunda variable. Ahorra mucho lugar en pantalla. Con **Aceptar**, la variable queda como texto limpio (sin todos los botones a la vista). Ahí también va el nombre de "mis variables".
- En esa ventana, separar más "reales / corrientes" de "pesos / dólares / variaciones": hoy se ve todo muy junto y parece lo mismo.
- **Leyenda del gráfico**: sacar las líneas de último, promedio y mediana. Mejor que al pasar el cursor sobre la línea se **resalte** y diga qué es (promedio, mediana…) y su valor.
- **Zoom**: al acercar una zona, la escala vertical se ajusta a esa sección y las líneas (promedio, etc.) se recalculan solo con lo visible. Al tocar "Volver", la escala queda rara y hay que hacer doble clic; que vuelva bien a la primera.
- **Precios (ej. carne)**: hoy "que suba es malo"; matizarlo, porque depende del poder de compra. Analizar también en términos de salario.
- Promedio o cierre al pasar de mes a trimestre o año: hay un parámetro de cierre en el código (`agrupar`), pero no verifiqué que esté como opción visible en la pantalla.

**Presidentes y Ranking**
- Sumar la **variación absoluta** además del porcentaje (hoy Ranking compara solo el aumento porcentual).
- En Ranking, poder **abrir el detalle de dos presidentes a la vez** (ej. filtrar el grupo Salarios y ver Cristina y Milei desplegados juntos). Hoy abrir uno cierra el otro.
- Mover "lo mejor y lo peor de cada gobierno" de Curiosidades a **Ranking** (o a Presidentes). No es una curiosidad.
- Curiosidades: sacar los datos curiosos armados a mano (ya están en Plantillas) y pasar el "ranking de presidentes" que quedó ahí a la sección Ranking.

**Meses de mandato**
- "Precio teórico" y "partiendo del mes 0 de mi ley" se leen como cosas sueltas: integrar mejor que lo segundo depende de haber elegido lo primero.
- Mantener separado "presidentes y opciones" (está bien, pero que no se mezcle).
- **Animación**: que la escala del gráfico acompañe. Ej. con dólar blue, el máximo es 20.000, pero al principio los valores son ~1.200, así que no tiene sentido arrancar con una escala de 20.000. La escala crece a medida que cambian los valores.

**Elecciones (voto estimado)**
- En los gráficos de dispersión, **pintar aparte el valor actual** (último dato) para ver dónde caería hoy según esa recta.
- Hoy el cálculo usa solo las variables con relación fuerte (|r| ≥ 0,6, al menos 3 variables y 8 elecciones; el valor absoluto ya incluye las relaciones inversas). Ese 0,6 es un corte arbitrario. Opciones pedidas: poder **elegir el corte de r**, y una **proyección ponderada con todas las variables**, donde pesen más las de mayor coeficiente (ej. el empleo público pesa más que el precio del pan). Mostrar las dos proyecciones.

**Presidentes en la línea de tiempo**
- En la mayoría de los gráficos, una opción para **pintar el período de cada presidente** como un área de color (o marcarlo). Por defecto con los colores de cada partido (Macri amarillo, Cristina celeste, Milei violeta), y que los colores se puedan cambiar desde la **configuración global**.

## Correcciones pedidas (2026-11-09)
→ spec: docs/specs/correcciones-historico.md
Son ajustes a lo ya hecho, no ideas nuevas.
- ~~**"Otros gráficos interesantes" del Histórico** (soja, Chicago, brecha, dólar): los datos ya están en el catálogo, así que ya no tiene sentido tenerlos como gráficos sueltos. Pasarlos a **variables elegibles** como cualquier otra (queda la plantilla si hace falta una vista armada) y sacar la sección.~~ ✅ 2026-11-09
- ~~**Hasta 4 gráficos en la vista, uno al lado del otro**, para comparar 4 cosas al mismo tiempo (en celular, apilados). Verificar cómo quedó con lo ya implementado.~~ ✅ 2026-11-09

## Sugerencias de Claude (a discutir)
- Comparación internacional, fuentes a investigar (con `investigador-datos`): IPC por división COICOP de EE.UU. (BLS), Eurostat (HICP por categoría) y OECD; el Banco Mundial y el FMI para PBI y otras variables. Los vecinos (Brasil, Chile, Uruguay, Paraguay, Bolivia) a veces solo tienen el IPC general desde fuentes unificadas, así que la comparación por categoría puede quedar limitada. Las divisiones COICOP no son idénticas entre países, y para comparar **niveles** de precios (no solo variaciones) hacen falta paridad de poder adquisitivo o tipo de cambio real. Mostrar siempre en base 100 o en variación para no comparar manzanas con naranjas.
- Capacidad de gobierno, fuentes: HCDN y Senado publican composición de bloques y leyes; Boletín Oficial para decretos y vetos. La parte difícil es "propios y aliados" (los bloques cambian y hay criterio de por medio): definir una regla clara y publicarla. "Leyes que quiso sacar" tampoco sale de una base: hay que definir qué cuenta (proyectos del Ejecutivo ingresados, por ejemplo) y es mejor mostrar el número crudo antes que un puntaje.
- Para que sea justo, las dos comparaciones (internacional y capacidad de gobierno) se muestran para todos los presidentes con el mismo criterio.
- Página propia por indicador con URL fija (`/dato/salario-real`): sirve para SEO y para que lo compartido tenga una vista previa linda en redes. Encaja con las "páginas de tema".
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
