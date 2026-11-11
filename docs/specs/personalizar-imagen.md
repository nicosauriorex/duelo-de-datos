# Personalizar la imagen compartible

Estado: implementada (2026-11-10)
Ideas: Ajustes pedidos al recorrer la página (2026-11-10), puntos 2, 9 y 14.

## Objetivo
Que quien comparte pueda decidir qué muestra la imagen del dato (período, líneas, presidentes y tarjetas) sin poder cambiar los números ni la fuente.
Amplía el panel de `responder-con-imagen.md`; las decisiones de D-012 siguen vigentes.

## Qué ve y hace el usuario
1. Abre Compartir en el salario mediano. La imagen aparece como hoy.
2. En "Período" elige de dic-15 a hoy: el gráfico se recorta y las tarjetas quedan solo con Macri, Alberto Fernández y Milei.
3. En "Líneas y marcadores" prende Promedio y el marcador del último dato.
4. En "Presidentes" elige resaltarlos en el gráfico y, en "Tarjetas", elige "Por presidente" con Recibió, Entregó y Promedio.
5. O elige "Tarjetas: generales" y ve Último, Promedio, Máximo y Mínimo del período, con o sin los presidentes resaltados.
6. Comparte la imagen. La próxima vez el panel recuerda sus elecciones.

## Requisitos

### Panel
1. El panel de compartir del Histórico suma cuatro grupos, plegados bajo "Personalizar imagen" (cerrado al abrir): **Período**, **Líneas y marcadores**, **Presidentes** y **Tarjetas**.
2. La vista previa se actualiza con cada cambio. En celular la vista previa queda fija arriba mientras se recorren las opciones.
3. Las elecciones se recuerdan en `pld:config` (campo `imagen`), salvo el período, que siempre arranca en el período visible del gráfico.
4. El panel entra entero a 360 px de ancho.

### Período
5. Dos selectores de mes (desde y hasta), limitados a los meses con datos de la serie. Por defecto, el período visible del gráfico.
6. La cifra grande y el contexto de la imagen no cambian con el período: siguen siendo el último dato y su contexto sobre toda la serie. El título lleva el período elegido ("dic-15 a jun-26") cuando no es el completo.
7. Todo lo que depende del período (promedio, mediana, máximo, mínimo, tarjetas generales) se calcula solo con los meses elegidos.

### Líneas y marcadores
8. Interruptores independientes: línea de **Promedio**, línea de **Mediana**, línea del **Último dato**, marcador del **Último dato**, marcadores de **Máximo y Mínimo**.
9. Por defecto: marcador del último dato prendido, el resto apagado.
10. Cada línea lleva su nombre y su valor escritos sobre el gráfico ("Promedio 1.999.226"). Las etiquetas no se pisan entre sí ni con la serie; si no entran, se corren hacia el borde.

### Presidentes
11. Interruptor **Resaltar presidentes en el gráfico** (franjas de color con el nombre). Independiente de las tarjetas.
12. Solo aparecen los presidentes cuyo mandato cae, entero o en parte, dentro del período elegido.
13. Los nombres van todos del mismo tamaño. Si alguno no entra, se usa el nombre corto en todos los que lo tengan: "Néstor K.", "Alberto F.", "De la Rúa", "CFK 1". El nombre corto se define junto a cada presidente en `web/lib/estadisticas.ts` (`PRES_DEF`) y se usa en todo el sitio.

### Tarjetas
14. Tres opciones: **Ninguna**, **Por presidente** y **Generales**.
15. **Por presidente**: una tarjeta por cada presidente del período. El usuario elige hasta 3 datos entre: Recibió, Entregó, Variación, Promedio, Mediana, Máximo, Mínimo. Por defecto: Recibió, Entregó y Variación.
16. Cada dato lleva su rótulo escrito dentro de la tarjeta, siempre el mismo y en este orden: "Recibió" (valor al inicio del mandato), "Entregó" (valor al cierre; "Hoy" si el mandato sigue), "Variación", "Promedio", "Mediana", "Máximo", "Mínimo".
17. **Generales**: tarjetas del período elegido. El usuario elige hasta 4 entre: Último, Inicio del período, Variación del período, Promedio, Mediana, Máximo, Mínimo. Cada una con su rótulo y, cuando aplica, su mes.
18. Si un mandato cae solo en parte dentro del período, sus datos se calculan con los meses del período y la tarjeta lo dice ("desde dic-15").
19. Con más de 6 tarjetas por presidente, se reparten en dos filas; el gráfico nunca queda con menos de un tercio del alto de la imagen.

### Textos de la imagen
20. Bajo el título va la línea de temporalidad, con el mismo texto que el gráfico (`ajustes-grafico.md`, requisitos 11 y 12).
21. Cuando la imagen muestra presidentes (franjas o tarjetas), el pie reemplaza "Inicio: T-1" por la oración de inicio de mandato de `ajustes-tablas.md` (requisito 20): "Mes inicial de cada presidente: T-1, excepto Milei (T+1). T = mes de asunción."
22. Siguen sin poder editarse el título, la cifra, el contexto, la fuente y la dirección del sitio.

## Datos
`pld:config` suma el campo `imagen`: líneas y marcadores prendidos, resaltar presidentes (sí/no), tipo de tarjetas y datos elegidos de cada tipo. Valores inválidos caen a los de fábrica.

## Casos borde
- Período de un solo mes o sin datos: el botón de compartir se deshabilita y el panel dice "Elegí un período con datos".
- Período sin ningún mandato completo (por ejemplo, seis meses de 2024): tarjeta del único presidente, marcada como parcial.
- Dato en porcentaje: "Variación" en puntos.
- Serie con valores negativos: "Variación" sin porcentaje; se muestra la diferencia.
- Dos o más variables o base 100: solo están disponibles Período y marcador del último dato; los demás grupos se muestran deshabilitados con la razón.
- Formato horizontal con 7 tarjetas de 3 datos: los textos bajan hasta un mínimo legible y después las tarjetas pasan a dos filas.
- Línea de promedio y de mediana casi iguales: las etiquetas se separan en vertical.

## Fuera de alcance
- Personalizar las imágenes de Por presidente, Ranking y Meses de mandato.
- Editar título, cifra o contexto; sello de veredicto.
- Elegir colores o tema de la imagen.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. En `/historico/?v=sipa_med~real~~compra~`, a 1280 px y a 375 px, mirando la imagen a tamaño completo en los tres formatos:
   - Período dic-15 a hoy: tres presidentes; los promedios cambian respecto del período completo.
   - Promedio + Mediana + Último: tres líneas con etiqueta, sin pisarse.
   - Resaltar presidentes sin tarjetas; tarjetas generales con y sin presidentes resaltados; tarjetas por presidente con Recibió, Entregó, Promedio.
   - Todos los nombres de presidentes del mismo tamaño; "Néstor K." y "Alberto F." cuando no entran.
   - Cerrar y abrir el panel: recuerda las elecciones, no el período.
3. Con `/historico/?v=inflacion~~~compra~`: Variación en puntos.
4. Agente `revisor` contra esta spec.
