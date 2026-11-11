# Ajustes de tablas, presidentes y páginas de tema

Estado: implementada (2026-11-10)
Ideas: Ajustes pedidos al recorrer la página (2026-11-10), puntos 3, 5, 7, 12, 13, 14, 15, 16, 17 y 18.

## Objetivo
Que las tablas entren y se lean en el celular, que se sepa siempre quién es quién y desde cuándo se mide, y que las secciones de presidentes muestren el dato antes que la configuración.
Lo que se define para una tabla vale para todas las del sitio.

## Qué ve y hace el usuario
1. En el celular abre Por presidente: la tabla entra casi entera. Cada fila dice "Macri" y debajo, en chico, "dic-15 a nov-19". Al deslizar de costado, la columna del presidente queda fija.
2. La variación dice "−19,9 %" y debajo, más chico, "−$ 477.406". Una barrita muestra qué tan grande fue el cambio, y la fila del mayor y del menor llevan la marca "más alto" y "más bajo".
3. Arriba lee "Mes inicial de cada presidente: T-1, excepto Milei (T+1)" con un ícono de información que explica qué es T. La explicación larga ya no ocupa la pantalla.
4. En "Un presidente, varias variables" ve la tabla enseguida; la configuración está bajo un botón.
5. En el menú, Congreso abre su propia página.
6. En una página de tema en la computadora, el título queda a la izquierda y el dato principal del tema, en grande, a la derecha.

## Requisitos

### Reglas para todas las tablas del sitio
Valen para Por presidente (las dos vistas), Ranking, Meses de mandato (resumen por hitos), Elecciones, Contexto, Congreso y las tablas de las páginas de tema.

1. **Primera columna fija**: al deslizar de costado, la primera columna (presidente o variable) queda quieta, con fondo opaco y una sombra fina que la separa. En celular ocupa como máximo el 40 % del ancho.
2. **Presidente y mandato juntos**: el nombre y, debajo, en letra chica y color secundario, el período ("dic-15 a nov-19"). No hay columna "Mandato" aparte. El período nunca es más ancho que la columna del nombre: si no entra, baja de tamaño o pasa a dos renglones.
3. **Nombres cortos**: cuando el nombre no entra en una línea se usa el corto ("Néstor K.", "Alberto F."), el mismo que usa la imagen compartible (definido en `PRES_DEF`, `web/lib/estadisticas.ts`). El nombre completo queda en `title`.
4. **Variable y unidad juntas**: en tablas con una variable por fila, el nombre va en hasta dos renglones (con puntos suspensivos si no entra, completo en `title`) y la unidad debajo, en chico. No hay columna "Unidad" aparte.
5. **Variación en dos renglones**: el porcentaje (o los puntos) arriba; la diferencia absoluta ("−$ 477.406") debajo, más chica y en color secundario.
6. Ninguna tabla hace desbordar la página a 360 px: el desplazamiento horizontal ocurre dentro de la tabla.

### Mejor y peor sin depender del tono del color
7. Se dejan de usar fondos de celda con distinta intensidad de verde y rojo para indicar "cuánto".
8. En su lugar, en las columnas comparables:
   - El valor lleva un solo tono de verde o de rojo (los del sitio para "mejor" y "peor") y siempre su signo o flecha.
   - Una barra horizontal fina dentro de la celda indica la magnitud: más larga, cambio más grande. Sale del centro hacia la derecha si sube y hacia la izquierda si baja.
   - La fila con el mejor valor de la columna lleva la marca escrita "mejor" y la del peor, "peor" (según `dirEfectiva`; en datos neutros, "más alto" y "más bajo").
9. Se ve igual de claro en tema oscuro y en tema claro, con contraste AA.
10. El texto de ayuda de cada tabla se actualiza para explicar la barra y las marcas.

### Inicio del mandato, en una oración (punto 14)
11. Donde hoy dice "Inicio: T-1" va una oración armada con la configuración: "Mes inicial de cada presidente: T-1." o "Mes inicial de cada presidente: T-1, excepto Milei (T+1)." Con más de tres excepciones: "…, con excepciones" y el detalle en la ayuda.
12. Al lado, un ícono de información abre la explicación: "T = mes de asunción. T-1 = último mes del antecesor. T+1 = un mes después de asumir", más lo que hoy dice el recuadro (qué incluye cada opción) y el botón Configurar.
13. La oración sale de una función de `web/lib/estadisticas.ts` (hoy `baseResumen`) y se usa en todas las secciones y en las imágenes.

### Por presidente (puntos 12, 15 y 16)
14. El recuadro de explicación del inicio ya no aparece abierto: queda dentro del ícono de información del requisito 12.
15. "Contexto del mandato" aparece plegado, con su título y un resumen de una línea; se abre al tocarlo.
16. "Un presidente, varias variables": los controles (presidente, medida, buscador, expandir y contraer todo, presidentes y columnas) van bajo un botón **Personalizar**, salvo el selector de presidente, que queda a la vista. A 375 px, la primera fila de datos de la tabla se ve sin deslizar más de una pantalla.
17. Esa tabla cumple las reglas 1 y 4.

### Configuración global (punto 13)
18. El desplegable del inicio de mandato de la configuración global usa el desplegable propio del sitio (`Selector` de `web/components/ui.tsx`). No queda ningún `<select>` nativo en el sitio.

### Congreso con página propia (puntos 17 y 18)
19. "Congreso" pasa a tener su ruta: `/congreso/`. El menú de Presidentes apunta ahí y la sección deja de dibujarse al final de Por presidente.
20. Los links viejos `/presidentes/#congreso` (con sus parámetros `cgi` y los demás de la sección) llevan a `/congreso/` con los mismos parámetros.
21. La página abre mostrando el primer indicador que tenga datos cargados (hoy: Leyes o DNU), no uno vacío.
22. Cada indicador sin datos dice "Todavía sin datos cargados" en su botón o encabezado, en lugar de mostrar una tabla de guiones.
23. En Vetos, cuando solo se conocen los insistidos, la celda dice "N insistidos" y una nota aclara "Falta cargar el total de vetos; solo se conocen los que el Congreso insistió".
24. Arriba hay una línea "Qué hay cargado" que resume, en una oración, qué indicadores y qué presidentes tienen datos.

### Páginas de tema (puntos 3, 5 y 7)
25. Desde 1024 px, la cabecera va en dos columnas: a la izquierda el título, la bajada y "ver más"; a la derecha el dato principal del tema en grande (cifra, mes, variación contra hace un año y minigráfico), enlazado a su vista en Histórico. Los demás principales siguen debajo. En celular queda como hoy.
26. La tabla "Por presidente" del tema cumple las reglas 1, 2, 3 y 5.
27. En "Todos los datos" no se lista "IPC empalmado (nivel)": la inflación se ofrece como "Inflación mensual" e "Inflación interanual". El índice sigue existiendo para los cálculos y en el selector de variables del Histórico.

## Datos
Sin datos nuevos. Ruta nueva `/congreso/`. Ninguna otra URL cambia.

## Casos borde
- Presidente con datos parciales: debajo del período, "datos desde ene-95".
- Mandato en curso: "dic-23 a hoy".
- Columna donde todos los valores son iguales o hay un solo presidente con dato: sin marcas "mejor" ni "peor".
- Dato neutro (`dir` 0): barras en color neutro y marcas "más alto" / "más bajo".
- Valor enorme (dólar corriente): la barra llega al tope y el número se escribe completo.
- Tabla ordenada por otra columna: las marcas y la columna fija se mantienen.
- Tema sin dato principal calculable: la cabecera queda en una columna.
- Link viejo a `/presidentes/` sin `#congreso`: sigue abriendo Por presidente.

## Fuera de alcance
- Cargar los datos que faltan de Congreso (bancas, totales de vetos).
- Cambiar los cálculos del Ranking o de Elecciones, o su lugar en el menú.
- Renombrar las series del catálogo.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. A 375 px y a 1280 px, en tema oscuro y claro:
   - `/presidentes/`: mandato bajo el nombre, columna fija al deslizar, variación en dos renglones, barra y marcas "mejor" / "peor", explicación dentro del ícono, contexto plegado.
   - "Un presidente, varias variables": tabla visible enseguida, unidad bajo la variable.
   - `/ranking/`, `/mandato/`, `/elecciones/`, `/contexto/`: primera columna fija y sin desborde a 360 px.
   - `/tema/precios/`: cabecera en dos columnas a 1280 px; sin "IPC empalmado (nivel)" en la lista; tabla por presidente con el formato nuevo.
   - `/congreso/` abre con datos; `/presidentes/#congreso` redirige.
   - Configuración global: el desplegable del inicio de mandato es el propio.
3. Cambiar el inicio de Milei a T+1: la oración dice "…excepto Milei (T+1)" en todas las secciones.
4. Agente `revisor` contra esta spec.
