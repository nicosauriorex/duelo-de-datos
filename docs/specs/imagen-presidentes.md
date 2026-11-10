# Imagen desde las secciones de presidentes

Estado: lista para implementar (después de `responder-con-imagen.md`)
Ideas: Compartir gráficos (todos los gráficos, indicadores y tablas tienen Compartir).

## Objetivo
Llevar la imagen compartible a Por presidente, Ranking y Meses de mandato, que es donde se responde "con este gobierno fue peor que con el anterior".
Reutiliza el panel de compartir y el dibujo de `web/lib/imagen.ts` de la spec anterior; acá solo se agregan cuatro composiciones nuevas.

## Qué ve y hace el usuario
1. En **Por presidente** elige "Salario mediano" y toca Compartir: sale una imagen con una barra por presidente (variación en su mandato) y el valor al inicio y al cierre.
2. En **Meses de mandato** compara a Milei, Macri y Alberto Fernández y toca Compartir: sale el gráfico con una línea por presidente, contada desde el mismo mes de mandato.
3. En **Ranking** toca Compartir: sale la tabla de puestos con el criterio usado escrito en la imagen.
4. En **Por presidente**, en la vista de un solo presidente, elige Milei y cinco variables (salario, inflación, pobreza, dólar, actividad) y toca Compartir: sale una imagen con cómo empezó y cómo está cada una, punta a punta.
5. En todos los casos elige formato, agrega un comentario si quiere y comparte, descarga o copia, igual que en Histórico.

## Requisitos

### Comunes
1. Cada sección tiene un botón **Compartir** que abre el panel de la spec anterior (mismos formatos, comentario, acciones y avisos).
2. Las imágenes usan el mismo marco: franja de marca, título, contenido, comentario, y pie con unidad, fuente, inicio de mandato usado ("Inicio: T-1"), dirección del sitio y fecha.
3. La imagen muestra exactamente lo que está en pantalla: mismas variables, presidentes, medida e inicio de mandato de la URL o de la configuración.
4. Cada presidente va con su color configurado (`colPres`) y su nombre escrito; el color nunca es la única forma de distinguirlos.
5. Un mandato con datos parciales (la serie empieza después del inicio del mandato) lleva la marca "datos desde <mes>" en la imagen. Un mandato sin datos no se dibuja y se lista al pie ("Sin datos: Menem 1, Menem 2").

### Por presidente ("Una variable, todos los presidentes")
6. Título: nombre del dato y medida. Contenido: una fila por presidente, en orden cronológico, con barra horizontal de la variación entre inicio y cierre, el porcentaje (o puntos) con signo, y los valores de inicio y cierre en chico.
7. Verde o rojo según la regla del sitio, siempre con signo. Con datos neutros (`dir` 0), un solo color.
8. Si se eligió ordenar la tabla por otra columna, la imagen respeta ese orden.
9. La vista "un presidente, varias variables" tiene su propia imagen (requisitos 17 a 22).

### Meses de mandato
10. Contenido: el gráfico de líneas por presidente tal como está en pantalla (mismos presidentes, mismo eje en meses de mandato), con el nombre al final de cada línea.
11. La imagen es fija: no incluye la animación.
12. Si está activo "precio teórico", la línea teórica se dibuja con trazo distinto y se nombra en la leyenda.

### Ranking
13. Contenido: la tabla de puestos visible (presidente, puntaje y puesto), con las barras de puntaje.
14. La imagen lleva siempre, en texto: el criterio (Mejora, Nivel promedio o Ambos), los grupos o variables incluidos (si son más de 6, la cantidad y los grupos) y la frase "Puntaje armado con los indicadores elegidos por quien comparte".
15. Si el ranking avisa que hay presidentes evaluados con pocos indicadores, ese aviso va en la imagen.
16. La tabla "lo mejor y lo peor de cada gobierno" no tiene imagen en esta etapa.

### Un presidente, varias variables
17. En Por presidente, la vista de un presidente con las variables elegidas (hasta 10) tiene su botón **Compartir**.
18. Título: "<Presidente>: de <mes de inicio> a <mes de cierre>" (o "a hoy" si el mandato sigue). Debajo, el inicio de mandato usado.
19. Contenido: una fila por variable, en el orden en que están en pantalla, con el nombre del dato y su medida, el valor al inicio, el valor al cierre, la variación punta a punta con signo (en % o en puntos) y el minigráfico del mandato.
20. Verde o rojo según la regla del sitio para cada variable (`dirEfectiva`), siempre con signo; las variables neutras van sin color.
21. No hay puntaje ni resumen del tipo "le fue bien / mal": solo las filas.
22. El pie lista las fuentes de todas las variables, sin repetir. Si alguna usa valores reales, lleva la nota del IPC. Si no entran en dos renglones, se escribe "Fuentes: INDEC, BCRA y otras; detalle en primerolosdatos.com.ar/fuentes".

## Datos
No hay datos nuevos ni campos nuevos de configuración.

## Casos borde
- Diez presidentes en formato horizontal 16:9: las filas se achican hasta un mínimo legible; si no entran, se reparten en dos columnas.
- Un solo presidente elegido en Meses de mandato: imagen con una sola línea, sin leyenda.
- Variación enorme (dólar corriente, miles de %): la barra se corta en un tope y el número se escribe completo.
- Ranking por variables elegidas con una sola variable: la imagen lo dice ("1 indicador").
- Un presidente con 10 variables en formato horizontal 16:9: dos columnas de filas; en cuadrada y vertical, una columna con filas más bajas.
- Un presidente con una variable sin datos en su mandato: la fila dice "sin datos en este mandato".
- Un presidente con una variable cuya serie empieza después de su inicio: la fila lleva "datos desde <mes>" y la variación se calcula desde ahí.
- Un presidente sin ninguna variable elegida: el botón Compartir está deshabilitado.
- Elecciones, Curiosidades y Congreso no tienen botón Compartir imagen.

## Fuera de alcance
- Video de la animación de Meses de mandato.
- Imagen desde Contexto internacional, Elecciones y Congreso.
- Cambios en cómo se calcula el Ranking o en su lugar en el menú (ver auditoría, M5).

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` y, a 375 px y a 1280 px, generar la imagen en los tres formatos desde:
   - `/presidentes/` con Salario mediano en pesos reales: 10 filas legibles, signos y colores correctos, Menem 1 marcado con "datos desde ene-95".
   - `/mandato/` con tres presidentes: tres líneas con nombre, mismo contenido que en pantalla.
   - `/presidentes/` en la vista de un presidente, con Milei y cinco variables de categorías distintas: cinco filas con inicio, cierre, variación y minigráfico; los números coinciden con la pantalla; con 10 variables no se pisa nada.
   - `/ranking/` por grupos y por variables elegidas: el criterio y la frase del requisito 14 están en la imagen.
3. Cambiar el inicio de mandato a T en la configuración: el pie de las tres imágenes dice "Inicio: T" y los números cambian igual que en pantalla.
4. Cambiar el color de un presidente en la configuración: la imagen usa el color nuevo.
5. Agente `revisor` contra esta spec.
