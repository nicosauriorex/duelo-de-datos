# Ajustes de la tanda 3

Estado: implementada (2026-11-11)
Ideas: Ajustes pedidos al recorrer la página, tanda 3 (2026-11-11). Los números entre paréntesis son los del pedido del usuario.

## Objetivo
Corregir los errores que aparecieron al usar el sitio, rediseñar tres piezas que se ven mal o confunden (cabecera de los temas, tarjetas de resumen, barras de Por presidente) y completar lo que faltaba para compartir desde cualquier vista.
Lo visual manda: las explicaciones largas van plegadas o detrás de un ícono de información.

## Requisitos

### A. Portada, temas y preguntas
1. (2) En "Los datos más buscados" la tercera placa pasa a ser **Actividad económica** (EMAE, variación interanual). Las cuatro placas son fijas: inflación del último mes, salario mediano contra su récord, actividad económica y dólar blue en pesos de hoy.
2. (3) Las cuatro placas tienen el mismo formato: título, cifra, una línea de contexto en texto simple (sin recuadro resaltado) y, abajo, fecha y fuente. La fecha nunca se parte en dos renglones ("ago-26" va junto).
3. (4) Página de tema: se quita la cabecera en dos columnas. Arriba van el título, la bajada y "ver más" a todo el ancho; debajo, "Principales" con **todos** los principales (incluido el primero) en una grilla de tarjetas iguales que llena el ancho (2 a 4 por fila en computadora, 1 o 2 en celular). No queda una tarjeta suelta ni espacio vacío al costado.
4. (5) Lista "Todos los datos" del tema de precios:
   - No se lista "IPC nivel general (Nacional)" (es lo mismo que "Inflación"). Su link viejo sigue funcionando.
   - "Bienes", "Servicios", "Estacional", "Núcleo" y "Regulados" (versión Nacional) se muestran dentro de "Indicadores de inflación".
   - El grupo "IPC INDEC (índices, dic-2016 = 100)" se muestra como **"IPC por rubros"**, también en el selector de variables.
   - Los rubros se ordenan por su código (01, 02, 03…, y dentro de cada uno 01.1, 01.2…). Los precios promedio, por categoría y, dentro, por orden alfabético.
5. (7) En la página de tema, la tabla "Por presidente" tiene arriba botones con los principales del tema; al tocar uno, la tabla pasa a esa variable. Arranca en el primero. No cambia sola.
6. (8) Los cuatro "Soja: Rosario contra Chicago (dólar …)" pasan a llamarse "Brecha de la soja: Rosario contra Chicago (dólar …)".
7. (12) Buscar "servicios públicos" o "tarifas" encuentra "Regulados". En los índices del IPC por rubro, "Cómo se mide" ofrece Mensual, Interanual, Promedio de 12 meses e Índice; y un único interruptor **Nominal / Real (contra la inflación general)** que vale para cualquiera de las cuatro. Desaparece la opción suelta "Precio relativo". Los links viejos con medida `real` siguen mostrando lo mismo.
8. (10) Preguntale a los datos:
   - Al elegir el producto de "¿Cuánto … compra un …?", la ventana muestra todos los ítems ya desplegados, con separadores: Canastas (las cuatro), Precios promedio (un separador por categoría) y Dólares. Sin pasos intermedios; el buscador sigue arriba.
   - Los desplegables de las oraciones no se van de la pantalla al deslizar: quedan pegados a su botón o se cierran.
   - Las contracciones se escriben bien: "al riesgo país", "del salario" (nunca "a el" ni "de el").
   - "¿Cómo le fue a … con …?" abre el Histórico de esa variable recortado al mandato de ese presidente, con las franjas de presidentes prendidas, y un enlace "Ver la tabla por presidente".
   - "¿Cuánto vale … en …?" pasa a "¿Cómo evolucionó … en …?".

### B. Histórico e imagen
9. (6) Las tarjetas de resumen dejan de deslizarse. Pasan a ser un bloque "Resumen del período" con seis celdas fijas e iguales: Último dato, Inicio del período, Promedio, Mediana, Máximo y Mínimo. Cada una con su valor, su mes cuando aplica y, salvo la primera, la frase "el último está X arriba / abajo". En computadora van en una fila; en celular, en dos columnas. Nada se corta ni se mueve solo.
10. (11) Personalizar tiene un botón "Volver a lo de fábrica" que deja la misma variable con el período, la frecuencia, los meses y las opciones del gráfico por defecto. Solo aparece si algo cambió.
11. (13) Con la vista en Tabla:
    - La tabla tiene un botón "Copiar tabla" que copia los datos como texto tabulado (con encabezados) y agrega como última fila la dirección de la vista.
    - Compartir, en lugar de armar la imagen del gráfico sin avisar, ofrece dos opciones: "Copiar la tabla" y "Compartir como gráfico".
12. (13) En Opciones del gráfico, "Líneas" y "Marcadores" van cada uno en su renglón, con su rótulo.
13. (9) En el panel de compartir, el grupo nuevo **Frases** lista las frases que el sitio puede calcular para ese dato (más alto / más bajo desde, contra su récord, contra su mínimo, contra hace un año, contra el promedio del período, contra el inicio del período). El usuario elige hasta dos; por defecto, las dos que hoy salen solas. Las frases no se pueden editar.

### C. Presidentes y Ranking
14. (14) Barras de la tabla Por presidente:
    - Columnas de nivel (inicio, cierre, mínimo, máximo, promedio, mediana): barra desde la izquierda, proporcional entre el menor y el mayor valor de la columna (el peor queda con una marca mínima, el mejor con la barra completa).
    - Columna de variación: si hay valores positivos y negativos, eje en cero al medio y barras hacia cada lado; si todos tienen el mismo signo, desde la izquierda.
    - Color en degradado según el puesto: rojo el peor, amarillo los del medio, verde el mejor (según `dirEfectiva`; neutro en gris). El número lleva siempre su signo y se mantienen las marcas "mejor" y "peor".
    - La ayuda de la tabla explica la barra en una línea.
15. (14) Por presidente suma una segunda vista, elegible con un botón Tabla / Velas: un gráfico de velas acostadas, una por presidente, en la misma escala. La línea fina va del mínimo al máximo del mandato; el cuerpo, del valor de inicio al de cierre, verde si mejoró y rojo si empeoró. Cada vela lleva el nombre y los valores de inicio y cierre. La vista elegida va en la URL.
16. (15) "Un presidente, todas las variables":
    - Al entrar, todos los grupos están contraídos. "Expandir todas / Contraer todas", el buscador y un filtro por tipo de variable (los grupos actuales) quedan a la vista, fuera de Personalizar.
    - Personalizar queda solo para las columnas y la moneda.
    - "Mis variables" se ve con el mismo formato de filas que "Todas". Un botón "Editar mis variables" pasa al modo edición (subir, bajar, editar, quitar, agregar) y "Guardar" vuelve a la vista normal.
    - Con un solo presidente, en lugar de la oración general del inicio de mandato se dice el mes exacto: "Milei: de dic-23 (mes inicial) a jun-26 (último dato)". Si el último dato cambia según la variable, cada fila lo indica. Lo mismo en la imagen de esa vista.
17. (16) Ranking: "Puntaje combinado" va abajo, desplegado al entrar.

### D. Meses de mandato, Elecciones y Contexto
18. (17) Meses de mandato:
    - La configuración pasa a tres botones en una fila (Variable, Cómo mostrar, Presidentes), cada uno con su panel. El gráfico se ve sin deslizar a 375 px.
    - "Cómo mostrar" ofrece Variación %, Precio teórico y Valor del período. Se quita "Índice (mes 0 = 100)"; los links viejos con ese modo abren en Variación %. Junto a Precio teórico: "La misma curva que la variación, expresada en un precio de partida".
    - **Error**: investigar y corregir por qué un presidente con inicio en T+1 muestra el mes 0 con el valor de T (caso: Milei en T+1 y dólar oficial, mes 0 en 366,4).
    - **Error**: investigar y corregir la pantalla "Algo falló al mostrar esta página" al achicar "Hasta" después de animar el gráfico hasta el final.
    - La imagen lleva como máximo dos renglones de explicación, en letra chica. Opción nueva en el panel: "Mostrar el valor de cada presidente en el último mes visible".
19. (18) Elecciones: las explicaciones largas quedan plegadas o detrás de íconos de información; al entrar se ve el aviso, el resultado y los gráficos. En cada gráfico de dispersión el dato de hoy se dibuja siempre (rombo), y su valor estimado queda marcado en el eje vertical.
20. (19) Contexto: cada bloque con gráfico o tabla tiene su botón Compartir (comparte el link de esa vista, con sus opciones). En "Precios en el mundo" se agrega un gráfico de líneas por rubro: Argentina contra los países elegidos a lo largo del tiempo, con los datos mensuales que ya existen.

## Datos
Sin series nuevas. Parámetros nuevos en la URL: vista Tabla / Velas en Por presidente y la variable elegida en la tabla del tema. Ningún link existente cambia de significado.

## Casos borde
- Placa de actividad sin dato interanual: muestra el nivel y el mes.
- Tema con un solo principal: una tarjeta, sin botones en la tabla por presidente.
- Columna con todos los valores iguales: barras completas en gris, sin marcas.
- Velas con un presidente sin datos: se omite y se lista al pie. Presidente con datos parciales: vela con la marca "datos desde <mes>".
- Tabla con más de 2.000 filas: "Copiar tabla" copia todo igual.
- Portapapeles bloqueado: aviso "No se pudo copiar".
- Dato sin alguna de las frases (por ejemplo, sin dato de hace un año): esa frase no se ofrece.
- Link viejo a Meses de mandato con el modo índice: abre en Variación %.
- Mis variables vacías: el modo edición abre directamente.

## Fuera de alcance
- El "parte diario del BCRA" como bloque propio (compra de divisas del día, tipo de cambio minorista): necesita datos diarios; queda como idea.
- Imagen compartible de Contexto y de Elecciones.
- Que la tabla por presidente del tema cambie sola cada tantos segundos.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. A 375 px y a 1280 px, sin desbordes ni pantallas de error, recorrer: portada (cuatro placas con el mismo formato), `/tema/precios/` (grilla de principales, lista ordenada, botones de la tabla), Histórico (resumen fijo, volver a lo de fábrica, copiar tabla, frases en la imagen), `/presidentes/` (barras, velas, todas contraídas, edición de mis variables), `/ranking/`, `/mandato/` (tres botones; animar hasta el final y achicar "Hasta" sin error; Milei en T+1), `/elecciones/`, `/contexto/`.
3. Las cinco oraciones de la portada con distintas elecciones ("al riesgo país").
4. Agente `revisor` contra esta spec.
