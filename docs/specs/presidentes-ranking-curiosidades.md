# Ranking, curiosidades y voto estimado (bloque 6a)

## Objetivo
Darle a la comparación entre presidentes herramientas propias, con lo que ya hay en el catálogo (sin datos nuevos):
- un **Ranking** armable en una sección propia;
- **curiosidades por presidente** que se generan solas;
- elegir las variables en la vista de un presidente;
- una **animación** en Meses de mandato;
- un **voto estimado** del oficialismo en Elecciones, mostrado como rango y con advertencias.

Todo tiene que ser parejo para todos los presidentes: la credibilidad de la página depende de eso.

El contexto internacional (proyecciones del FMI, vecinos) y el consumo de carne van en el bloque 6b. El video descargable va en el bloque 7.

## Qué ve y hace el usuario
1. En la navegación aparece **Ranking**, después de Por presidente. Ve la tabla de presidentes ordenada por puntaje y elige: qué entra (grupos de indicadores o variables sueltas), si se mide la **mejora**, el **nivel** o **ambos**. El inicio de mandato es el de ⚙. Toca un presidente y ve su puesto en cada indicador.
2. En **Curiosidades** quedan "Lo mejor y lo peor de cada gobierno" y unas **tarjetas de curiosidades** generadas solas. Ejemplo: "Con Macri el asado fue el más barato en pesos de hoy, pero el salario compraba más kilos con Néstor Kirchner". Se filtran por presidente, tema y tipo, y cada tarjeta abre el gráfico.
3. En **Por presidente → Un presidente, todas las variables**, elige **Mis variables** y arma una lista (ej. salario real, inflación, pobreza, reservas y riesgo país), una debajo de la otra, cada una con su minigráfico del mandato.
4. En **Meses de mandato** toca **▶ Animar** y las líneas de cada presidente se dibujan de a poco, desde el mes 0 hasta el final.
5. En **Elecciones** ve un recuadro nuevo: **"¿Qué dicen los datos sobre el voto al oficialismo hoy?"**. Muestra un rango ("entre 38 % y 52 %, mediana 45 %"), la lista de qué dice cada variable y un aviso claro de que no es una encuesta ni un pronóstico.

## Requisitos

### Sección Ranking (`/ranking/`)
1. Ruta nueva con su ítem en la navegación (después de Por presidente) y `metadata` propia. El "Ranking de presidentes" sale de Curiosidades. En su lugar, una línea con link a `/ranking/`.
2. **Qué entra**, con dos modos:
   - **Por grupos** (por defecto): los grupos de indicadores de hoy (`GRUPOS_IND`), que se prenden y apagan como hoy.
   - **Elegir variables**: una lista armada con el selector de variables (cada una con su medida), de 3 a 20.
3. **Criterio**: Mejora (inicio → cierre), Nivel promedio, o Ambos (promedio de los dos puntajes de cada indicador). Por defecto, Mejora.
4. El cálculo es el de hoy: puntaje de 0 a 100 por indicador según el puesto, promedio dentro de cada grupo y después entre grupos. En el modo "Elegir variables", cada variable es su propio grupo. No se duplica lógica: vive en `web/lib/estadisticas.ts` (hoy está dentro de `Curiosidades.tsx` y se mueve).
5. Usa el inicio de mandato de la configuración global (`useBase`), con la línea "Inicio: … · Configurar".
6. La tabla muestra: puesto, presidente, puntaje (verde a rojo), cantidad de indicadores evaluados, "mejor en" y "peor en" (3 cada uno). Tocar una fila despliega el detalle: cada indicador con su valor de inicio y cierre, el cambio y su puesto.
7. Se mantiene el aviso de hoy (datos que empiezan tarde, mandato en curso, contexto y herencia no incluidos) y se suma: "Cada presidente se evalúa con los mismos indicadores y el mismo criterio".
8. Todo queda en la URL: `rk` (grupos), `rkv` (variables elegidas, con `encExpr`), `rkc` (`mejora` | `nivel` | `ambos`).

### Curiosidades generadas
9. Las curiosidades se generan en `web/lib/curiosidades.ts` sobre los indicadores de `crearIndicadores` (`INDIC`) y los productos de GBA (`INDIC_PP`, precio real y kilos o unidades por salario mediano).
10. Tipos de curiosidad:
    - **Mejor nivel**: "Con {P}, {indicador} tuvo el mejor promedio de todos los mandatos ({valor})". Solo indicadores con nivel comparable entre épocas (`nivelComparable`).
    - **Peor nivel**: igual, con el peor.
    - **Récord**: "El récord histórico de {indicador} ({valor}, {mes}) fue con {P}", y lo mismo para el mínimo, indicando si es bueno o malo según `dir`.
    - **Contraste**: un producto cuyo precio real fue el más bajo con un presidente mientras el poder de compra de ese producto (por salario) fue más alto con otro. "Con {P} el {producto} fue el más barato en pesos de hoy, pero el salario compraba más con {Q}".
11. **Paridad**: cada presidente con datos suficientes tiene curiosidades buenas y malas. Por defecto se muestran mezcladas, de a una buena y una mala por presidente, del más reciente al más antiguo. Un presidente con 0 curiosidades malas o 0 buenas no se oculta: se muestra lo que haya.
12. Filtros, en la URL: presidente (todos o uno: `cqp`), tema (grupo del indicador: `cqt`), tipo (mejor, peor, récord, contraste: `cqk`).
13. Cada tarjeta: frase, valor destacado, minigráfico de la serie con el mandato resaltado y link a Histórico con esa serie y el período del mandato.
14. Se excluyen las curiosidades de presidentes con menos de 12 meses de datos del indicador.

### Vista de un presidente con variables elegidas
15. En "Un presidente, todas las variables", un selector **Todas | Mis variables**. Todas = la tabla agrupada de hoy.
16. Mis variables: lista de hasta 10 variables de cualquier categoría, agregadas con el selector de variables (con su medida), en el orden en que se agregan, con botón para quitar y para mover arriba o abajo.
17. Cada fila muestra las columnas elegidas (inicio, cierre, variación…) y un minigráfico del mandato del presidente elegido (desde el mes base hasta el cierre).
18. Si la lista está vacía, arranca con las recomendadas de Salarios, Precios, Empleo y pobreza, Dólar y Actividad (`INFO_CORTA`).
19. Queda en la URL: `pav` (variables) y `pam2=mis` (modo). Al cambiar de presidente la lista se mantiene.

### Animación en Meses de mandato
20. Botón **▶ Animar** sobre el gráfico. Al tocarlo, las líneas de todos los presidentes se dibujan juntas desde el mes 0, avanzando un mes cada ~150 ms (o lo necesario para que la animación dure entre 6 y 12 segundos).
21. Durante la animación, los ejes quedan fijos en el rango final (no se reescala en cada paso) y se ve el mes actual ("Mes 18").
22. Mientras anima, el botón pasa a ser **⏸ Pausa**; al terminar o pausar, aparecen **▶ Seguir** y **↺ Reiniciar**. Al cambiar cualquier filtro se corta la animación y se muestra el gráfico completo.
23. Con `prefers-reduced-motion`, el botón muestra el gráfico completo directamente.
24. Funciona igual con el gráfico expandido.

### Voto estimado en Elecciones
25. Un recuadro nuevo arriba de "Gráficos de dispersión": **"¿Qué dicen los datos sobre el voto al oficialismo hoy?"**.
26. Variables que entran: las mismas que la tabla de correlaciones, con las elecciones y la medida elegidas, sin el detalle regional de precios, con al menos 8 elecciones y |r| ≥ 0,6.
27. Para cada una se ajusta una recta (mínimos cuadrados, % del oficialismo contra el valor de la variable en cada elección) y se evalúa en el valor de **hoy**: el último dato disponible, medido igual que en las elecciones. El resultado se acota entre 0 % y 100 %.
28. Se muestra la **mediana**, el **rango** (mínimo y máximo) y cuántas variables entraron. Debajo, una tabla: variable, r, valor de hoy y % estimado, ordenada por |r|.
29. Se muestra al lado el último resultado real del oficialismo (elección y %), como referencia.
30. Con menos de 3 variables que cumplan: "Con las elecciones y la medida elegidas no hay suficientes variables con relación fuerte para estimar nada".
31. Aviso fijo, visible sin desplegar: "Esto **no es una encuesta ni un pronóstico**. Son cuentas simples con pocas elecciones: muestran qué pasó en el pasado cuando la economía estaba como hoy, no qué va a pasar. Una relación fuerte puede ser casualidad".
32. El cálculo vive en `web/lib/estadisticas.ts`, junto a `pearson`.

## Datos
No hay series nuevas. Parámetros nuevos: `rk`, `rkv`, `rkc` (Ranking); `cqp`, `cqt`, `cqk` (Curiosidades); `pav`, `pam2` (Por presidente). Los links viejos de Curiosidades con `gr` y `crit` del ranking abren `/ranking/` con eso elegido.

## Casos borde
- Ranking con variables elegidas que ningún presidente tiene completas: la variable se cuenta solo para los que tienen datos (como hoy) y se avisa "algunas variables no tienen datos para todos".
- Ranking por nivel con montos en pesos corrientes: como hoy, se usa la mejora para esos indicadores.
- Curiosidad de contraste sin el producto en la lista de precios por salario: no se genera.
- Milei (mandato en curso): sus curiosidades dicen "hasta {último mes}".
- Animación con un solo presidente elegido: se anima igual.
- Voto estimado con la medida "Cambio en el mandato" y un mandato que recién empieza: si el valor de hoy no se puede calcular para una variable, esa variable no entra.
- Voto estimado con el valor de hoy fuera del rango histórico de la variable: entra, pero en la tabla se marca "fuera de lo visto antes" (es una extrapolación).

## Fuera de alcance
- Proyecciones del FMI, comparación con otros países, consumo de carne (bloque 6b).
- Video o GIF de la animación y marca de agua (bloque 7).
- Modelos de voto con varias variables a la vez o encuestas.
- Fotos de presidentes.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - Ranking: en la navegación; por grupos da el mismo orden que el ranking viejo de Curiosidades con los mismos grupos y criterio; Ambos y Elegir variables cambian el orden; el detalle por presidente se despliega; cambiar el inicio en ⚙ cambia los puntajes; recargar mantiene todo.
   - Link viejo de Curiosidades con `gr` y `crit`: abre Ranking con eso.
   - Curiosidades: tarjetas de todos los presidentes con datos, buenas y malas mezcladas; filtros por presidente, tema y tipo; al menos una de contraste; las frases dicen la verdad (comparar 3 a mano con Por presidente).
   - Por presidente → Mis variables: agregar 5 de categorías distintas, reordenar, quitar, cambiar de presidente y recargar.
   - Meses de mandato: animar, pausar, seguir, reiniciar; cambiar un filtro corta la animación; ejes fijos.
   - Elecciones: el recuadro con mediana, rango, tabla y aviso visible; cambiar elecciones o medida cambia el resultado; comprobar una recta a mano con 2 o 3 puntos de un gráfico de dispersión.
