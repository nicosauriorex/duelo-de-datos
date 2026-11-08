# Histórico en el celular

## Objetivo
Que Histórico se use cómodo en un celular (375 px): gráficos legibles, menos botones a la vista, filtros a mano al bajar y la opción de ver un gráfico en grande. Las mejoras del gráfico y de los desplegables valen para toda la página.

## Qué ve y hace el usuario
1. Entra a Histórico desde el celular. Arriba ve las variables, y apenas debajo una **barra fija** con el período y Mes / Trimestre / Año.
2. Debajo, una **fila compacta** con Último, Promedio, Mediana, Máximo y Mínimo, que se desliza de costado. Las variaciones están en verde, rojo o gris según si el cambio es bueno, malo o neutro.
3. Ve el gráfico con los años del eje sin pisarse. Arriba del gráfico tiene **Gráfico / Tabla**, **Configurar gráfico** y un botón para **expandir**.
4. Toca un punto y ve el valor. Arrastra de costado: el resto del gráfico se opaca y la selección queda clara; al soltar, acerca. Aparece **Volver** arriba a la derecha. Arrastrar hacia abajo sigue bajando la página.
5. Baja hasta "Cuánto recibe el productor: Rosario / Chicago" y cambia a "por Año" en la barra fija sin subir.
6. Expande un gráfico: ocupa toda la pantalla y en Android gira a horizontal. En iPhone ve "Girá el celular para verlo más grande" y el gráfico se adapta al girar. Sale con la X, Escape o el botón Atrás.
7. En cualquier sección, los desplegables (presidente, medida, modo…) se ven con el estilo de la página, no con el nativo de Android.

## Requisitos

### Barra fija
1. En Histórico, el período (el botón que abre el panel de fechas) y Mes / Trimestre / Año forman una barra que queda fija debajo de la navegación al bajar, en celular y en computadora.
2. La barra no tapa contenido: mide como máximo 48 px de alto a 375 px de ancho, y lo que queda debajo de ella al llegar arriba se puede leer al seguir bajando.
3. Mes / Trimestre / Año sale de las opciones del gráfico principal y pasa a la barra; sigue afectando a todos los gráficos de la página (principal, dólares, brecha, soja, Rosario/Chicago), como hoy.
4. Con el panel de fechas abierto desde la barra fija, el panel no supera el alto de la pantalla: si no entra, se desplaza por dentro.

### Tarjetas de resumen
5. A menos de 640 px, Último, Promedio, Mediana, Máximo y Mínimo se muestran como una fila de chips que se desliza de costado, de una línea de alto por variable. Cada chip: nombre corto, valor y variación. La fecha va en letra chica o en el tooltip del chip.
6. Con dos variables, cada chip muestra los dos valores, uno debajo del otro, con el punto de color de cada una.
7. A 640 px o más se mantienen las tarjetas de hoy, más chicas (valor de 18 px en vez de 22 px).
8. En celular, la leyenda de líneas del gráfico (U, P, M, ↑, ↓) muestra solo la letra y el nombre, sin el valor (el valor ya está en los chips).

### Colores de las variaciones
9. Toda variación que se muestra en Histórico (chips, tarjetas, tabla de base 100) va en verde si el cambio es bueno, rojo si es malo y gris si es neutro, según el `dir` de la serie calculada (`1`: subir es bueno; `-1`: bajar es bueno; `0` o sin dato: neutro).
10. Los colores salen de variables CSS nuevas (`--bueno`, `--malo`) definidas para tema claro y oscuro, con contraste legible en los dos.
11. Ejemplos que tienen que dar bien: salario real que sube → verde; riesgo país que baja → verde; pobreza que sube → rojo; dólar que sube → gris.

### Configurar gráfico
12. Arriba de cada gráfico de Histórico hay un botón **Configurar gráfico** que abre un panel (mismo componente `Desplegable`, empuja el contenido).
13. Gráfico principal. A la vista: variables, Gráfico / Tabla, expandir. Dentro de Configurar: Mostrar (valor o base 100), escala, eje derecho, líneas, marcadores y rango mín/máx.
14. Gráficos de dólar y soja. A la vista: qué series se muestran (Oficial, Blue, MEP…), Gráfico / Tabla, expandir. Dentro de Configurar: medida (corrientes, pesos de hoy…), promedio o mín/máx y, en soja, el dólar de Rosario.
15. Si hay opciones distintas de las de por defecto, el botón lo indica: "Configurar gráfico (2)".
16. Igual en computadora y en celular.

### Gráfico / Tabla
17. Cada gráfico de Histórico tiene **Gráfico / Tabla**. Tabla reemplaza al gráfico en el mismo lugar, con los mismos datos que se grafican (período, meses y Mes/Trimestre/Año aplicados), lo más reciente arriba.
18. La tabla reemplaza al "Ver datos en tabla" de hoy.
19. En el gráfico principal la elección queda en la URL (`t=tabla`; sin el parámetro, gráfico). En los gráficos de dólar y soja no hace falta guardarla.

### Eje X legible
20. El paso de las etiquetas del eje X (1, 2, 5, 10 o 20 años) se elige según el ancho disponible para que no se pisen: como mínimo ~40 px por etiqueta de año. Lo mismo para rangos cortos con etiquetas de mes.
21. A menos de 640 px, los años del eje van abreviados cuando hace falta (`'05`, `'10`) o completos si entran.
22. A menos de 640 px, el eje Y es más angosto (~48 px en vez de 74) con números compactos (`1,2 M`, `250 mil`), y el espacio reservado para las etiquetas al final de las líneas se achica (máximo ~70 px, cortando nombres largos con "…").
23. Sale bien a 375 px con 1 variable, con 2 variables (eje derecho) y en base 100 con 10 variables.

### Zoom y tooltip
24. En computadora: arrastrar con el mouse selecciona un rango. En pantallas táctiles: arrastrar en horizontal selecciona; arrastrar en vertical baja la página (no se bloquea el scroll).
25. Mientras se selecciona, lo que queda fuera de la selección se opaca y la selección se ve clara.
26. Al soltar, el gráfico acerca a ese rango y aparece un botón **Volver** arriba a la derecha del gráfico. Volver deja el rango completo. El doble clic sigue funcionando en computadora.
27. En pantallas táctiles, tocar un punto muestra el tooltip; tocar afuera del gráfico lo cierra.
28. El texto de ayuda debajo del gráfico dice lo que corresponde al dispositivo ("Arrastrá de costado para acercar" en táctil; "Arrastrá para acercar" en computadora).
29. Cambiar el período, la frecuencia o las variables vuelve al rango completo.

### Expandir
30. Cada gráfico de Histórico tiene un botón para expandir. Muestra el título, la leyenda y el gráfico a pantalla completa, con el gráfico ocupando todo el alto disponible.
31. Usa la API de pantalla completa del navegador cuando existe, y si no (iPhone) una capa fija que cubre toda la pantalla.
32. En celular intenta girar a horizontal (`screen.orientation.lock("landscape")`); si el navegador no lo permite y está en vertical, muestra "Girá el celular para verlo más grande" sin bloquear el gráfico. Al girar, el gráfico se redibuja al nuevo tamaño.
33. Se cierra con una X visible, Escape o el botón Atrás del celular (no sale de la página). Al cerrar vuelve a la misma posición de la página.
34. Zoom, tooltip y Volver funcionan también expandido.

### Desplegables propios
35. Un componente nuevo en `web/components/ui.tsx` reemplaza todos los `<select>` de la página (hoy en Variables, Presidentes, Curiosidades y Mandato).
36. Se ve igual en Android, iPhone y computadora, con el estilo de los botones de la página; la lista se despliega debajo, con alto máximo y scroll interno.
37. Accesible: se abre con Enter o Espacio, se navega con flechas, Enter elige, Escape cierra y devuelve el foco al botón; roles `listbox` / `option` y `aria-expanded`.
38. Los campos "Desde" y "Hasta" del panel de período (hoy `input type="month"`) pasan a dos desplegables cada uno: mes y año, respetando el primer y el último mes con datos.

## Datos
No hay datos nuevos. Parámetro nuevo en la URL de Histórico: `t` (`tabla`; ausente = gráfico). Los parámetros existentes no cambian, así los links viejos siguen andando.

## Casos borde
- Zoom con dos ejes: los dos ejes se reescalan al rango elegido (como hoy).
- Arrastre muy corto (menos de 2 períodos): no acerca, se toma como toque.
- Rango menor a un año y medio: etiquetas de mes, sin pisarse.
- Serie sin `dir` o con `dir` 0: variaciones en gris.
- Base 100: la variación de la tabla resumen usa los mismos colores.
- Expandir sin datos en el gráfico ("Sin datos para esta selección"): el botón no aparece.
- Rotar el celular con el gráfico expandido o sin expandir: el gráfico se redibuja sin quedar cortado.
- Panel de período abierto y el usuario baja: la barra sigue fija y el panel se puede cerrar con un toque afuera o Escape.
- Desplegable cerca del borde de abajo de la pantalla: la lista se ve entera (se abre para arriba o hace scroll).
- Tema oscuro: verde, rojo, opacado del zoom y capa de pantalla completa se ven bien.

## Fuera de alcance
- Elegir la medida en pasos (Pesos / Dólares / Variaciones), acumulada de 12 meses, promedio o cierre al agrupar por año, explicación corta al agregar variable: van en la próxima spec.
- Plantillas, buscador por palabra, hasta 4 gráficos, "Otros gráficos interesantes".
- Configuración global e inicio de mandato por presidente.
- Cambios de diseño en las otras secciones, salvo el reemplazo de los desplegables y lo que herede el componente `Grafico` (eje, zoom, expandir valen en todos los gráficos de la página).
- Compartir o descargar imágenes.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out` de `.claude/launch.json`) y revisar en el navegador a 375×812, a 812×375 (horizontal) y a ancho de computadora, en tema claro y oscuro:
   - Histórico: barra fija al bajar hasta Rosario/Chicago; cambiar a Año desde ahí y ver que cambian todos los gráficos.
   - Chips de resumen en una línea, deslizables; colores con salario real (verde si sube), riesgo país (verde si baja), pobreza, dólar (gris).
   - Eje X sin etiquetas pisadas con período 1995–hoy, 2003–hoy, último año y 6 meses; con 1 variable, 2 variables y base 100 con 10.
   - Configurar gráfico: abre, muestra las opciones, el contador cambia al tocar una.
   - Gráfico / Tabla en el principal (y que `t=tabla` quede en la URL y se respete al recargar) y en un gráfico de dólar.
   - Zoom: arrastre horizontal con el mouse y con emulación táctil; la página sigue bajando con arrastre vertical; Volver aparece y funciona.
   - Expandir: entra, ocupa la pantalla, se cierra con X y con Escape.
   - Desplegables nuevos en Histórico (variable), Por presidente, Meses de mandato y Curiosidades: con mouse y con teclado.
3. Abrir un link viejo con parámetros (`?v=...&f=A&r=ult,prom`) y ver que carga igual que antes.
