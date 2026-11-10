# Responder con una imagen

Estado: lista para implementar
Ideas: Compartir gráficos; Responder y verificar afirmaciones en redes (etapa 1: "mejor dato desde X" + imagen). Sale de la auditoría `docs/AUDITORIA-2026-11-10.md` (C1, A1, A3).

## Objetivo
Que alguien que vio una afirmación en redes pueda, desde el celular y en menos de un minuto, llevarse una imagen clara con el dato, su contexto y su fuente.
Son tres piezas que se necesitan entre sí: la **imagen compartible**, el **contexto automático** del dato (lo que la imagen dice en palabras) y la **vista simple** del dato (para llegar al gráfico y al botón sin pasar por los controles).

## Qué ve y hace el usuario
1. Lee en X "este gobierno tiene los peores salarios de la historia". Entra al sitio, escribe "peores salarios" y toca "Salario mediano".
2. Ve la vista simple: el nombre del dato, la cifra de hoy, una o dos frases de contexto ("27 % por debajo de su récord de jul-15. El valor más bajo desde may-24."), el gráfico y la fuente. Todo entra en la primera pantalla del celular.
3. Toca **Compartir**. Se abre un panel con la imagen ya armada.
4. Si quiere, cambia el formato (cuadrada, vertical u horizontal), activa "Comparar presidentes" o agrega un comentario propio.
5. Toca **Compartir imagen**: se abre el menú del celular con la imagen adjunta y elige X o WhatsApp. En la computadora la descarga o la copia.
6. Si quiere cambiar algo del gráfico (período, medida, otra variable), toca **Personalizar** y aparecen los controles de siempre.

## Requisitos

### Contexto automático del dato
1. Nueva función pura en `web/lib/` (archivo `contexto-dato.ts`) que recibe el motor y una expresión (`Expr`) y devuelve los datos del contexto. Sin lógica en los componentes.
2. Se calcula sobre **toda la serie mensual disponible** con la medida elegida, no sobre el período visible.
3. Devuelve, cuando se puede calcular:
   - **Último dato**: valor y mes.
   - **Contra hace un año**: variación en % (o en puntos, si el dato es un porcentaje).
   - **Distancia al récord**: cuánto por debajo del máximo de la serie y en qué mes fue; y lo mismo contra el mínimo. Si el último dato es el máximo o el mínimo: "El valor más alto (o más bajo) desde que hay datos (mes de inicio)".
   - **"El más alto / más bajo desde"**: el mes más reciente en que la serie estuvo en un valor igual o mayor (o igual o menor) al actual. Se informa solo si pasaron 12 meses o más.
4. Las frases usan palabras neutras ("más alto", "más bajo", "por debajo de su récord"). Nunca "mejor", "peor", "bueno" ni "malo". El color verde o rojo sigue la regla del sitio (`dirEfectiva`) y va siempre con signo.
5. Se muestran como máximo **dos frases**, en este orden de prioridad: máximo o mínimo de toda la serie; "el más alto / más bajo desde" (el que vaya más atrás); distancia al récord; contra hace un año.
6. No se calcula contexto (solo cifra y gráfico) cuando: hay más de una variable en el gráfico, está en base 100, la frecuencia es trimestral o anual, o la serie tiene menos de 24 meses.
7. Se reutiliza lo que ya existe (`distanciaRecord` e `interanualTxt` en `web/lib/plantillas.ts`): la portada, las plantillas y esta vista tienen que dar el mismo número.

### Vista simple del dato
8. En Histórico, cuando la vista tiene **un solo gráfico**, se ve la vista simple, en celular y en computadora. Con dos o más gráficos se ve el explorador completo, como hoy.
9. Orden de la vista simple: Volver · nombre del dato como título (el de la plantilla si la vista viene de una) · cifra grande con su mes · contexto · gráfico · unidad y fuente · botones **Compartir** (principal) y **Personalizar**.
10. A 375 × 812 px, el gráfico empieza antes del píxel 420 y el botón Compartir se ve sin deslizar o queda fijo al pie.
11. **Personalizar** despliega, en el mismo lugar y con el comportamiento de hoy: período, Mes/Trimestre/Año, la variable y su "Editar", agregar segunda variable, opciones del gráfico, Gráfico/Tabla, Guardar como plantilla, Ver plantillas y "+ Agregar gráfico".
12. El sitio recuerda en el navegador (`pld:config`) si Personalizar quedó abierto. No va a la URL.
13. Las tarjetas de resumen (último, promedio, mediana, máximo, mínimo) y Expandir quedan debajo del gráfico.
14. Ninguna URL cambia: los links de hoy abren lo mismo, ahora en vista simple.

### Panel de compartir
15. El botón **Compartir** abre un panel (ventana `Modal` existente) con: vista previa de la imagen, formato, "Comparar presidentes", comentario y acciones.
16. Formatos: **Cuadrada 1:1** (1080 × 1080, por defecto), **Vertical 4:5** (1080 × 1350) y **Horizontal 16:9** (1600 × 900). El último elegido se recuerda en `pld:config`.
17. Acciones:
    - **Compartir imagen**: `navigator.share` con el archivo PNG, el título y el link de la vista. Solo aparece si el navegador puede compartir archivos (`navigator.canShare`).
    - **Descargar**: baja el PNG con nombre `primerolosdatos-<dato>-<aaaa-mm>.png`.
    - **Copiar imagen**: al portapapeles, si el navegador lo permite.
    - **Copiar link**: lo que hace hoy `compartir()`.
18. El mismo panel se abre desde el ícono de compartir de las tarjetas de Plantillas (hoy copia el link) y desde cada gráfico del explorador completo.
19. Cada acción avisa el resultado con el aviso corto que ya se usa ("Imagen copiada", "No se pudo copiar").

### La imagen
20. Se dibuja en el navegador con `canvas`, sin servidor y sin librerías nuevas. La lógica de dibujo va en `web/lib/imagen.ts`; recibe datos ya calculados y no lee el DOM de la página.
21. Siempre con el aspecto oscuro de la marca (D-011), sea cual sea el tema del usuario. Los colores salen de los tokens de `web/app/globals.css`, no escritos a mano. La tipografía es Archivo; se espera a que esté cargada (`document.fonts.ready`) antes de dibujar.
22. Contenido, de arriba hacia abajo:
    - Franja de marca "PRIMERO LOS DATOS".
    - Título: el nombre del dato y su medida (o el título de la plantilla).
    - Cifra grande y su mes.
    - Contexto (las mismas frases de la vista, requisito 5).
    - Gráfico del período visible, con eje de años legible y el último punto marcado.
    - Comentario del usuario, si lo escribió (requisito 25).
    - Pie: unidad, **fuente** (el texto `fuente` de la serie; si el valor es real, además la nota del IPC que ya se muestra en Histórico), `primerolosdatos.com.ar` y la fecha en que se generó.
23. La fuente y la dirección del sitio no se pueden quitar.
24. **Comparar presidentes** (apagado por defecto; solo con una variable): pinta en el gráfico la franja de color de cada mandato y agrega una fila con cada presidente del período visible: nombre, valor al inicio y al cierre de su mandato, y la variación entre los dos (punta a punta). Así se distingue un nivel alto heredado de una mejora propia: quien recibió el salario alto y lo entregó más bajo figura con su variación negativa. Usa el inicio de mandato de la configuración (`statsMandato`, `franjasPres`) y lo aclara en el pie ("Inicio: T-1"). Un mandato sin dato al inicio o al cierre se muestra con "sin datos".
25. **Comentario propio**: opcional, hasta 120 caracteres, una sola línea propia en la imagen, entre comillas y con la etiqueta "Comentario de quien comparte". El título, la cifra y el contexto no se pueden editar.
26. No hay sello de verdadero o falso.
27. Los textos largos bajan de tamaño hasta un mínimo y después se cortan en dos renglones con puntos suspensivos. Nada se sale del lienzo ni se pisa, en los tres formatos.

## Datos
No hay series nuevas ni cambios en el pipeline.
`pld:config` suma dos campos: `personalizar` (sí/no) y `formatoImagen` (`1x1`, `4x5`, `16x9`). Un valor inválido cae al valor por defecto.

## Casos borde
- Serie en porcentaje (inflación, pobreza): diferencias en puntos porcentuales, no en %.
- Serie con valores negativos o cero (resultado fiscal): sin "% por debajo del récord"; se informa el máximo y el mínimo con su mes.
- Dato "en términos de" (kilos de asado por salario): el contexto se calcula sobre el resultado, igual que hoy en las plantillas.
- Último dato viejo (la fuente dejó de publicar): la cifra lleva su mes, y si tiene más de 6 meses se agrega "Último dato disponible".
- Dos o más variables, o base 100: imagen con título, gráfico, leyenda con el último valor de cada serie y fuentes; sin frases de contexto ni "Comparar presidentes".
- Navegador que no comparte archivos (casi todos los de computadora): no aparece "Compartir imagen"; quedan Descargar, Copiar imagen y Copiar link.
- Portapapeles bloqueado: aviso "No se pudo copiar" y el botón Descargar sigue disponible.
- El usuario cancela el menú de compartir: no se muestra ningún error.
- Los datos todavía no cargaron: el botón Compartir está deshabilitado.
- Comentario con saltos de línea o emojis: se pasa a una línea; lo que no se pueda dibujar se omite.
- Nombre de dato o fuente muy largos: regla del requisito 27.

## Fuera de alcance
- Imagen desde Por presidente, Ranking y Meses de mandato: spec `docs/specs/imagen-presidentes.md`.
- Vista previa de los links en redes y página fija por dato (`/dato/...`).
- Sello de verdadero o falso, cita del tuit original y "contestar un relato".
- Video de la animación de mandato.
- Pedido de donación y publicar en Comunidad.
- Renombrar las series o cambiar el catálogo.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` y revisar a 375 px y a 1280 px:
   - `/historico/?v=sipa_med~real~~compra~`: vista simple; el gráfico empieza antes del píxel 420 a 375 px; el contexto coincide con la placa "Salario mediano contra su récord" de la portada.
   - `/historico/?v=inflacion~~~compra~`: contexto en puntos; "Editar" dentro de Personalizar abre sin error.
   - Personalizar abre y cierra, y se recuerda al recargar.
   - Una vista con 2 gráficos muestra el explorador completo.
   - Un link viejo de plantilla (`pl=asado-kilos-salario`) abre igual que antes.
3. Panel de compartir: los tres formatos se ven enteros, sin texto pisado ni cortado, con título corto y con el más largo del catálogo. Descargar baja un PNG del tamaño indicado. Con "Comparar presidentes" aparecen las franjas y la fila de mandatos.
4. Con el tema claro activado, la imagen sale igual (oscura).
5. Comentario de 120 caracteres: entra en una línea o se corta con puntos suspensivos, y lleva su etiqueta.
6. En un celular real (o en el navegador del celular): "Compartir imagen" abre el menú del sistema con la imagen adjunta.
7. Agente `revisor` contra esta spec.
