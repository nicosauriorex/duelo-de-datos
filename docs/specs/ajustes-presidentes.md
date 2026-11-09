# Ajustes de Presidentes, Ranking, Meses de mandato y Elecciones (bloque 5d)

Estado: implementada (2026-11-09).

## Objetivo
Ajustes a secciones que ya existen, sin datos nuevos:
- **Ranking**: mostrar cuánto cambió cada indicador también en valor absoluto, poder abrir varios presidentes a la vez y traer "Lo mejor y lo peor de cada gobierno" desde Curiosidades.
- **Meses de mandato**: que "precio teórico" y "partiendo de" se lean como una sola opción, y que la escala de la animación crezca con los valores.
- **Elecciones**: marcar el valor de hoy en las dispersiones, elegir el corte de r y sumar una proyección con todas las variables, ponderada.

## Qué ve y hace el usuario
1. En **Ranking** filtra el grupo Salarios y abre CFK 2. Después abre Milei, y los dos detalles quedan abiertos, uno debajo del otro.
2. En el detalle, la columna Cambio dice "+12 % (+$ 45.000)": el porcentaje y, entre paréntesis, la diferencia en la unidad del indicador. Para los porcentajes (pobreza, desempleo) sigue diciendo "−3,2 puntos", porque eso ya es absoluto.
3. Debajo de la tabla de indicadores del detalle aparecen **Lo mejor** y **Lo peor** del gobierno: 5 indicadores de cada lado y el link "Ver la lista completa", que despliega todos.
4. En **Curiosidades** ya no está "Lo mejor y lo peor"; una línea avisa que pasó a Ranking. Los links viejos (`?lado=…&crit=…`) abren Ranking con ese presidente desplegado.
5. En **Meses de mandato** elige el modo: las cuatro opciones van en una lista. Debajo de "Precio teórico", con sangría, aparece "Partiendo de: el valor de hoy / el mes 0 de <presidente>", y solo cuando ese modo está elegido. Los presidentes y las otras opciones (rango, meses) siguen en su propio bloque, aparte.
6. Toca **▶ Animar** con el dólar blue: el gráfico arranca con una escala de unos $ 1.500 y el eje se agranda a medida que aparecen valores más altos, hasta los $ 20.000 del final.
7. En **Elecciones**, cada dispersión tiene un punto distinto (rombo, color de acento) con la etiqueta **Hoy**, en el valor actual sobre la recta.
8. En "¿Qué dicen los datos…?" mueve el control **Relación mínima (|r|)** de 0,6 a 0,5 y entran más variables. Al lado ve dos resultados:
   - **Solo las de relación fuerte**: el rango y la mediana de hoy, con el corte elegido.
   - **Todas, ponderadas**: un solo número, con las variables pesando según r².

## Requisitos

### Ranking
1. **Varios detalles abiertos**: tocar un presidente abre o cierra solo el suyo, sin cerrar los demás. Arriba de la tabla, un botón "Cerrar todos" aparece cuando hay alguno abierto. Los abiertos van en la URL (`rka`, lista de ids), para poder compartir la vista.
2. **Variación absoluta**:
   - En la columna Cambio del detalle, en la tabla "Lo mejor y lo peor" (requisito 3) y en las tablas de Por presidente que muestran el cambio, se agrega entre paréntesis la diferencia absoluta, con la unidad y la medida del indicador. Ejemplos: "(+$ 45.000)" en pesos de hoy; "(+US$ 120)".
   - Si el indicador ya es un porcentaje o una tasa (`pct`), no se agrega nada: la diferencia en puntos ya es absoluta.
   - Si el indicador es un índice (base 100), tampoco: no tiene unidad.
   - El puntaje y el orden del Ranking no cambian.
   - El texto sale de una función de `web/lib/` (al lado de `variacionTxt` en el motor) que usan todas las tablas.
3. **Lo mejor y lo peor en el detalle**:
   - Debajo de la tabla de indicadores del presidente abierto, dos listas: **Lo mejor** (5 indicadores que más mejoraron) y **Lo peor** (5 que más empeoraron).
   - Usan el mismo cálculo que hoy usa Curiosidades, con su criterio "mejora / nivel promedio" (se toma el criterio elegido en el Ranking; con "Ambos", la mejora).
   - "Ver la lista completa" despliega todas las filas, con las mismas columnas que tiene hoy en Curiosidades (inicio, cierre, cambio, promedio, puesto por mejora y por nivel).
   - Usa los indicadores de todos los grupos, no solo los filtrados, y lo aclara en una nota.
   - El cálculo se mueve de `Curiosidades.tsx` a `web/lib/estadisticas.ts` si todavía vive en el componente.
4. En el celular (375 px), el detalle entra sin scroll horizontal de página: las tablas usan su propio contenedor desplazable, como hoy.

### Curiosidades
5. Se saca la sección "Lo mejor y lo peor de cada gobierno". Queda "Curiosidades de cada gobierno" (las tarjetas automáticas) y la línea de aviso, que pasa a decir que "Lo mejor y lo peor" también está en Ranking.
6. Links viejos de Curiosidades con `lado`, `crit` o el presidente elegido: redirigen a `/ranking/` con ese presidente en `rka` y `rkc` según `crit`, como ya se hace con los links viejos del ranking (`gr`, `crit`).

### Meses de mandato
7. El selector de modo pasa a ser una lista de opciones (radio) con las cuatro opciones. "Partiendo de" queda **dentro** de "Precio teórico", con sangría, y se ve solo con ese modo. Al cambiar de modo y volver, se recuerda lo elegido en "Partiendo de" (sigue en la URL, como hoy).
8. El texto de ayuda de arriba se acorta y se mueve junto a "Precio teórico". Para los otros modos, una línea corta propia ("Variación %: cuánto subió desde el mes 0", etc.).
9. "Presidentes" y las opciones del gráfico (rango del mes, meses desde/hasta) quedan en un bloque visualmente separado del modo, como hoy.
10. **Escala en la animación**: el eje vertical se ajusta en cada paso al mínimo y máximo de lo dibujado hasta ese mes, con un margen. Puede crecer, pero no achicarse durante la animación (para que no "salte"). Al terminar o pausar queda la escala de lo dibujado. "Seguir" continúa con la misma regla. Fuera de la animación, la escala es la de siempre (todo el período).
    - Con escala logarítmica, igual, en log.
    - Se reemplaza el uso actual de `rowsEscala` (escala fija con todos los datos) por esta regla.

### Elecciones
11. **Hoy en las dispersiones**: cada gráfico de dispersión marca el valor actual de la variable (medido igual que en las elecciones) sobre la recta de tendencia, con un rombo de otro color y la etiqueta "Hoy". Si el valor de hoy está fuera del rango de las elecciones, el eje X se amplía para que entre y el punto lleva el aviso "fuera de lo visto antes".
12. **Corte de r elegible**: control "Relación mínima (|r|)" con los valores 0,3 · 0,4 · 0,5 · 0,6 · 0,7 · 0,8 (por defecto 0,6), en la URL (`elr`). Se mantienen el mínimo de 8 elecciones y de 3 variables.
13. **Proyección ponderada**: con **todas** las variables que tengan al menos 8 elecciones (sin importar r), el voto estimado de hoy es el promedio de las estimaciones de cada recta, ponderado por **r²**:
    `estimado = Σ (r²ᵢ × estimadoᵢ) / Σ r²ᵢ`
    Se acota a 0–100 %. Se muestra como un solo número, al lado del rango de la proyección con relación fuerte.
14. Nota de la proyección ponderada, en lenguaje simple: qué es r² ("cuánto del voto acompaña a la variable"); que muchas variables miden casi lo mismo (varios salarios, por ejemplo) y eso hace que ese tema pese más; y el mismo aviso de "no es una encuesta ni un pronóstico".
15. La tabla de variables suma una columna **Peso** (r² normalizado, en %) y lista todas las variables usadas en la ponderada, con las de relación fuerte primero y resaltadas.
16. El cálculo vive en `web/lib/estadisticas.ts` (junto a la proyección actual), con el corte como parámetro en vez del 0,6 fijo.

## Datos
No hay datos nuevos. Parámetros de URL nuevos: `rka` (Ranking, presidentes abiertos) y `elr` (Elecciones, corte de r). Los de Curiosidades `lado` y `crit` pasan a redirigir.

## Casos borde
- `rka` con ids que no existen o que no están en el ranking (por ejemplo, con variables sin datos para ese presidente): se ignoran.
- Diferencia absoluta de un indicador con inicio o cierre faltante: no se muestra el paréntesis.
- Diferencia absoluta en pesos corrientes de mandatos lejanos (montos minúsculos o enormes): se muestra igual, con el formato abreviado del sitio (mil, M).
- Lo mejor o lo peor con menos de 5 indicadores: se muestran los que haya; si no hay ninguno, "Sin indicadores que hayan mejorado (o empeorado)".
- Animación que arranca con todos los valores iguales (mínimo = máximo): se usa un margen fijo para que el eje no colapse.
- Corte de r con menos de 3 variables fuertes: la proyección "solo fuertes" dice que no alcanza, y la ponderada se muestra igual si hay al menos 3 variables con 8 elecciones.
- Todas las r cerca de 0: si Σ r² < 0,1, la ponderada no se muestra ("ninguna variable acompaña al voto").
- Variable sin valor de hoy: no entra en ninguna de las dos proyecciones ni tiene rombo.

## Fuera de alcance
- Franjas de presidentes en los gráficos (hechas en 5c).
- Cambiar cómo se calcula el puntaje del Ranking o sumar un criterio de mejora absoluta.
- Regresión múltiple o modelos más complejos para el voto.
- Diseño visual general (va en 5e).

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - **Ranking**:
     - abrir CFK 2 y Milei a la vez; "Cerrar todos" los cierra; la URL con `rka` los reabre;
     - Cambio con paréntesis en salario real (pesos) y sin paréntesis en pobreza (puntos);
     - Lo mejor y Lo peor en el detalle, con "Ver la lista completa".
   - **Curiosidades**: sin "Lo mejor y lo peor". El link viejo `/curiosidades/?lado=peor&crit=nivel` abre Ranking con criterio nivel.
   - **Meses de mandato**: "Partiendo de" aparece solo dentro de Precio teórico. Animar el dólar blue: la escala arranca chica y crece sin achicarse.
   - **Elecciones**:
     - rombo "Hoy" en cada dispersión;
     - mover el corte a 0,5 suma variables;
     - la ponderada aparece al lado, con la columna Peso;
     - controlar a mano la ponderada con 3 variables de la tabla.
