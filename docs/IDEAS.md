# Ideas (backlog sin priorizar)

Notas del usuario, ordenadas por tema. No son specs: antes de implementar cualquiera se pasa por `/spec`.

## Principios (2026-11-08)
- **Mobile first**: la mayoría entra desde el celular.
- Simple para el que quiere ver un dato, configurable al detalle para el que quiere. Que la pantalla no se sature de botones: las opciones avanzadas van escondidas (ej. un botón "Configurar gráfico").
- Lo visual importa ("todo entra por los ojos"): más adelante, una propuesta de diseño distinta.

## Inicio y búsqueda guiada
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
- Barra de fechas y de vista (mes/año) **fija arriba** al bajar (ej. estás en "Rosario vs Chicago" y querés cambiar a "por año" sin subir).
- Eje X legible en celular: hoy los años se pisan y el gráfico queda apretado.
- Etiquetas de último dato, promedio, mediana: más chicas en celular.
- Variaciones en **verde/rojo según si es bueno o malo** (con `dir`: que baje el riesgo país es verde).
- Botón para **expandir el gráfico** a pantalla completa y en horizontal.
- Desplegables con estilo propio (en Android se ven los nativos, feos).
- Zoom arrastrando: al tocar, el gráfico se opaca y la selección se aclara a medida que arrastrás. Para volver, un botón arriba a la derecha (hoy son dos doble clic).
- Ver como **gráfico o tabla**. Otros tipos de gráfico solo si suman (casi todo va bien en líneas).

## Histórico: medidas y opciones
- Elegir la medida en pasos: **Pesos / Dólares / Variaciones**.
  - Pesos → corrientes o reales.
  - Dólares → corrientes o reales → cotización (blue, oficial, MEP, CCL).
  - Variaciones → mensual, interanual o **acumulada de los últimos 12 meses** (en lugar de la acumulada en el año, que confunde) → nominal o real.
- Al agregar una variable (ej. salario): primero una explicación corta y cuál recomienda la página; un "ver más" despliega la explicación completa.
- Índices "tal cual" (ej. IPC empalmado como índice): al fondo y en un color apagado; no son lo primero que hay que ver.
- No ofrecer comparaciones sin sentido (IPC empalmado contra la inflación).
- Al pasar de mes a año, elegir cómo agregar: promedio o último dato (cierre); quizás máximo y mínimo.
- Hasta **4 gráficos** en la misma vista, cada uno con sus filtros, y compartir la vista entera.
- Abajo, "Otros gráficos interesantes" (dólar, soja, brecha: cosas difíciles de armar con los filtros).
- **Plantillas**: gráficos ya configurados con los datos de más interés (lo que hoy está en Curiosidades), con **buscador por palabra** (ej. "asado"). Darle importancia: muchas plantillas, mejor que sobren.

## Presidentes y mandato
- "Inicio del mandato" pasa a ser **Configurar inicio del mandato**: T-1, T, T+N (también negativo) y **por presidente** (todos en T, Milei en T+1).
- Preferencias guardadas por usuario; mejor una **configuración global** de la página que afecte a todas las secciones.
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

## Bugs conocidos
- ~~Histórico: el filtro de fecha queda flotando y se superpone con el resto~~ (arreglado en la migración; ahora se pide que quede fijo arriba sin tapar nada, ver "Histórico: celular y gráficos").

## Sugerencias de Claude (a discutir)
- Página propia por indicador con URL fija (`/dato/salario-real`): sirve para SEO y para que lo compartido tenga una vista previa linda en redes. Encaja con las "páginas de tema".
- Moderación desde el día 1 si hay comentarios públicos: reportar, ocultar con X reportes, límite de posts por usuario/día.
- Que cada post de la comunidad guarde los filtros exactos del gráfico, así cualquiera lo abre y lo puede modificar.
- Proyecciones: el FMI publica las ediciones viejas del World Economic Outlook (abril y octubre de cada año), así que se puede reconstruir "qué se esperaba" para cada año y país sin depender de recortes de diarios.
- Configuración global guardada primero en el navegador (sin cuentas); cuando haya cuentas, se sincroniza.
- Las plantillas pueden ser la base de todo: la búsqueda guiada, la página de inicio y "otros gráficos interesantes" muestran plantillas.
