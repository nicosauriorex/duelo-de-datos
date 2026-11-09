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

## Contexto para juzgar a un presidente
- El contexto internacional influye (commodities con Néstor, pandemia con Alberto, tasas y petróleo con Milei).
- **Proyecciones vs. resultado**: qué se proyectaba a principio de año (FMI u otros) para Argentina, EE.UU., Europa, el mundo, y cuánto se desvió cada uno. Si el mundo cayó 50% contra lo proyectado y Argentina también, no es (solo) culpa del presidente. Posible sección "proyecciones cumplidas o no" y ranking de los que más se desviaron.
- **Comparar con vecinos o países parecidos**: crecer 5% no es mucho si los vecinos crecen 10%.

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
- En la vista de un presidente con todas las variables: poder filtrar y elegir, por ejemplo, 5 variables de distintas categorías una debajo de otra.
- Meses de mandato: **animación** que va dibujando la evolución desde el inicio al final, descargable como video.

## Ranking de presidentes y curiosidades
- Ranking armable de distintas formas: cuánto mejoró cada indicador en su mandato (desde T, T+1, etc.), en cuál se estaba mejor en nivel, quién tuvo la mejor/peor actividad, etc.
- Separar Curiosidades del Ranking. Curiosidades tipo: "con este presidente el asado fue el más barato, pero se compraba menos por salario", "máxima pobreza histórica", "la ropa más barata".
- Sumar datos de consumo (ej. consumo de carne por habitante) si hay fuente.

## Elecciones
- Porcentaje estimado de votos que sacaría el presidente en curso con los datos que tiene hasta hoy.

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

## Sugerencias de Claude (a discutir)
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
