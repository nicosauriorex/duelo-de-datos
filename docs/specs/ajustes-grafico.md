# Ajustes del gráfico y del Histórico (tanda 2)

Estado: implementada (2026-11-10)
Ideas: Ajustes pedidos al recorrer la página (2026-11-10), puntos 1, 4, 6, 9, 10 y 11.

## Objetivo
Que el gráfico se lea bien en el celular aunque tenga muchos años, que siempre diga qué se está viendo (mensual, promedio anual, un solo mes) y que Personalizar y las tarjetas de resumen se entiendan sin explicación.

## Qué ve y hace el usuario
1. Pasa el cursor (o toca) sobre la línea de promedio: ve solo "Promedio: 2,7 %", sin el valor de la serie encima.
2. En el celular abre la inflación mensual desde 2003: debajo del gráfico hay una barra con dos manijas. Acerca las manijas y ve solo los últimos tres años; arrastra el gráfico con el dedo para moverse hacia atrás.
3. Bajo el título lee "Promedio de cada año (datos mensuales)" o "Solo los meses de marzo".
4. Toca Personalizar y ve tres botones: Filtrar fecha, Elegir variable y Opciones del gráfico. Cada uno abre su ventana, que entra entera en la pantalla.
5. Debajo del gráfico ve "Último dato: 1.855.247 (jun-26)" y, al lado, las tarjetas de inicio, promedio, mediana, máximo y mínimo, cada una con "el último está X % arriba / abajo".

## Requisitos

### Línea de referencia bajo el cursor (punto 1)
1. Cuando el cursor o el dedo está sobre una línea de referencia (último, promedio, mediana, máximo, mínimo), la etiqueta muestra **solo** el nombre de esa línea y su valor. No se muestra el valor de la serie ni su punto resaltado.
2. "Sobre la línea" es estar a 6 px o menos en vertical (10 px con el dedo). Si hay dos líneas a esa distancia, gana la más cercana. Fuera de ese margen, vuelve la etiqueta normal de la serie.

### Zoom que siempre ajusta la escala (punto 4)
3. Investigar y corregir por qué a veces, al seleccionar un área, la escala vertical no se ajusta a lo seleccionado. Después de cualquier zoom, el eje vertical va del mínimo al máximo de los datos visibles (con el margen de siempre), en los dos ejes si hay eje derecho, también con frecuencia trimestral o anual, con base 100 y con rango mínimo/máximo.
4. Dejar anotada la causa encontrada en el reporte de la implementación.

### Barra de zoom en el eje X (punto 6)
5. Debajo de cada gráfico de series en el tiempo hay una barra de rango con dos manijas, del ancho del gráfico, con la silueta de la serie de fondo. Con las manijas en los extremos se ve todo el período, como hoy.
6. Mover una manija acerca o aleja. Arrastrar el tramo entre las dos manijas desplaza la ventana. Las manijas miden al menos 44 px de alto y se pueden mover con teclado (flechas).
7. Con el gráfico acercado, arrastrar de costado sobre el gráfico lo desplaza (en lugar de seleccionar un área). Con el gráfico completo, arrastrar selecciona un área para acercar, como hoy. El botón "Volver" restablece todo.
8. La barra aparece en todos los anchos. En pantalla angosta (menos de 640 px) es el modo principal de zoom.
9. Cuando en pantalla hay menos de 6 px por dato, la serie se dibuja sin puntos (solo la línea) y sin los marcadores de máximo y mínimo intermedios; el marcador del último dato se mantiene.
10. El zoom de la barra no cambia la URL ni el período elegido: es solo de vista. La escala vertical se ajusta como en el requisito 3.

### Temporalidad a la vista (punto 9)
11. Bajo el título de cada gráfico hay una línea que dice qué se está viendo:
    - Mensual: "Datos mensuales" (o "Datos trimestrales" / "semestrales" si la serie original lo es).
    - Trimestre o Año con Promedio: "Promedio de cada trimestre / año (datos mensuales)".
    - Trimestre o Año con Cierre: "Último dato de cada trimestre / año".
    - Flujos que se suman: "Suma de cada trimestre / año".
    - Con meses filtrados: "Solo los meses de marzo" (o la lista de meses).
12. El texto sale de una función de `web/lib/` para que la imagen compartible use el mismo (ver `personalizar-imagen.md`).

### Personalizar en tres botones (puntos 9 y 10)
13. Personalizar muestra tres botones: **Filtrar fecha**, **Elegir variable** y **Opciones del gráfico**.
14. **Filtrar fecha**: desde, hasta y meses del año.
15. **Elegir variable**: la variable y su "Editar", agregar otra variable y agregar otro gráfico.
16. **Opciones del gráfico**: Mes / Trimestre / Año; cómo se agregan (Promedio o Cierre, visible solo si no es Mes); Gráfico o Tabla; y las opciones que ya existen (líneas de referencia, marcadores, franjas de presidentes, rango, escala).
17. Guardar como plantilla y Ver plantillas quedan como enlaces secundarios al final de Personalizar.
18. Ninguna ventana, panel o fila de botones se sale del ancho de la pantalla a 360 px: los grupos de botones bajan de renglón. Esto vale para todas las ventanas del sitio (configuración global, Configurar variable, panel de compartir).

### Tarjetas de resumen (punto 11)
19. La primera tarjeta es fija: "Último dato", con el valor y su mes.
20. A su lado, bajo el rótulo "Comparado con el último dato", pasan las demás: Inicio del período, Promedio, Mediana, Máximo y Mínimo. Cada una muestra su valor, su mes cuando corresponde y una frase completa: "El último está 7,2 % abajo" (o "2,1 puntos arriba" si el dato es un porcentaje).
21. El color de esa frase sigue la regla del sitio (verde o rojo según `dirEfectiva`, siempre con las palabras "arriba" o "abajo").
22. Con varias variables en el gráfico, las tarjetas son de la primera y lo dicen ("Resumen de: Salario mediano").

## Datos
Sin datos nuevos ni cambios en las URLs.

## Casos borde
- Serie con menos de 24 datos: la barra de zoom no aparece.
- Gráfico expandido a pantalla completa: la barra de zoom también está.
- Dos gráficos o más: cada uno tiene su barra; no se sincronizan.
- Tabla en lugar de gráfico: sin barra de zoom; la línea de temporalidad se mantiene.
- Línea de referencia que coincide con la serie (el último dato sobre la línea "último"): gana la línea de referencia.
- "Reducir movimiento": las tarjetas de resumen no se mueven solas; se deslizan con el dedo.

## Fuera de alcance
- Sincronizar el zoom entre gráficos.
- Cambiar los cálculos del resumen.
- La imagen compartible (va en `personalizar-imagen.md`).

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. A 1280 px y a 375 px, en `/historico/?v=inflacion~~~compra~` y `/historico/?v=sipa_med~real~~compra~`:
   - Sobre la línea de promedio se ve solo el promedio.
   - Seleccionar tres áreas distintas: la escala se ajusta las tres veces; "Volver" restablece.
   - La barra de zoom acerca, desplaza y vuelve; a 375 px con todo el período no hay puntos y con tres años sí.
   - La línea de temporalidad cambia al pasar a Año (Promedio y Cierre) y al filtrar un mes.
   - Personalizar muestra los tres botones y ninguna ventana se sale a 360 px.
   - Las tarjetas de resumen dicen contra qué comparan.
3. Agente `revisor` contra esta spec.
