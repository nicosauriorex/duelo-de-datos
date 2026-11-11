# Ajustes de la tanda 4 y barrido de errores parecidos

Estado: implementada (2026-11-11)
Ideas: Ajustes pedidos al recorrer la página, tanda 4 (2026-11-11).

## Objetivo
Corregir lo que el usuario encontró al recorrer el sitio publicado y, sobre todo, buscar y corregir los errores del mismo tipo en el resto del sitio. Cada pedido de esta tanda es un caso de una regla más general; la spec lista primero las reglas, después los casos y por último cómo se buscan los demás.

## Reglas que salen de los pedidos
Valen para todo el sitio. Cada una dice cómo se comprueba.

- **R1. Un número derivado coincide con los números que se ven.** Si la pantalla muestra 1,9 y 2,1, la diferencia que se informa es 0,2 y no 0,1. Las diferencias, variaciones y porcentajes se calculan con los valores ya redondeados como se muestran, o se muestran con los decimales necesarios para que la cuenta cierre.
- **R2. Ningún control flotante tapa un dato.** Botones como "Volver" del zoom, etiquetas y marcas no se superponen al último punto, a una etiqueta ni a un valor.
- **R3. Toda ventana se cierra con "Atrás" y tiene una cruz.** En celular, el botón Atrás del sistema cierra la ventana, el desplegable o el panel abierto y no sale de la página. Toda ventana tiene un botón de cerrar visible, de 44 px.
- **R4. Nada fijo tapa lo que se está leyendo.** Los separadores y encabezados de una lista no quedan pegados encima de los ítems al deslizar.
- **R5. Ningún texto se sale de su contenedor.** A 360 px, dentro de ventanas, menús, tarjetas y botones, los textos largos bajan de renglón o se cortan con puntos suspensivos; nunca desbordan.
- **R6. Lo que se mueve solo, espera a que lo veas.** Un carrusel o animación no empieza a contar hasta que está en pantalla y quieto, y se detiene al tocarlo o deslizar.
- **R7. Las acciones iguales van alineadas.** En una lista de filas con el mismo botón, el botón queda en la misma columna en todas; lo extra va debajo o dentro de la fila, sin correr el botón.
- **R8. Una sola vez cada cosa.** El mismo enlace o el mismo texto no aparece dos veces en la misma pantalla.
- **R9. Lo divertido y lo útil, a la vista.** Una función que cambia el gráfico de forma evidente (franjas de presidentes, velas) tiene su control junto al gráfico, no dentro de un menú.
- **R10. Lo que se ve se puede compartir.** Si una vista tiene una forma alternativa (velas, tabla), Compartir comparte esa forma.

## Requisitos (casos pedidos)

### Histórico y gráfico
1. (R1) Las frases del "Resumen del período" ("el último está X arriba / abajo") se calculan con los valores redondeados que muestra cada celda. Caso: último 1,9 %, mediana 2,1 % → "0,2 puntos abajo".
2. (R2) El botón "Volver" del zoom no tapa el último punto ni su etiqueta: va fuera del área del gráfico (en la barra de arriba del gráfico o junto a la barra de zoom).
3. Por defecto el Histórico muestra solo las líneas de **Último** y **Promedio** (sin Mediana). Los links que ya traen sus líneas no cambian.
4. (R9) "Franjas de presidentes" pasa a ser un botón propio debajo del gráfico, a la altura de Personalizar. El orden queda: gráfico, [Presidentes] [Personalizar], y debajo Compartir a todo el ancho.
5. La vista que abre `/historico/` sin parámetros deja de ser el asado: abre **Inflación** (mensual).

### Preguntas de la portada
6. (R4) En la ventana de productos, los separadores ("Canastas", "Precios promedio"…) se deslizan con la lista; no quedan fijos arriba.
7. (R3) Esa ventana y los desplegables de las oraciones tienen cruz para cerrar y se cierran con Atrás.
8. (R7) En computadora, los botones "Ver" de las cinco oraciones quedan en la misma columna. "Ver la tabla por presidente" va debajo de su oración o como segundo botón del mismo ancho, sin desalinear.

### Portada
9. (R6) El carrusel de "Los datos más buscados" en celular no avanza hasta que la tarjeta estuvo en pantalla y quieta durante el tiempo completo; al deslizar la página el contador se reinicia.
10. (R8) En la portada no se muestra el pie genérico "Fuentes principales… Ver las fuentes": ya está el bloque "Todo tiene fuente". En el resto de las páginas el pie sigue.

### Presidentes y temas
11. (R10) En Por presidente, con la vista Velas, Compartir arma la imagen de las velas (misma información que la pantalla, en los tres formatos).
12. (R5) En el selector de variables, el texto y el botón de "Recomendado" de cada categoría no se salen de la ventana a 360 px.
13. En la tabla "Por presidente" de las páginas de tema, los botones para elegir la variable van en un solo renglón que se desliza de costado; un nombre largo usa dos líneas dentro de su botón, sin cortar el deslizamiento.

## Barrido de errores parecidos
Antes de implementar los casos, se corre este barrido y todo lo que aparezca se suma a la tanda. Cada punto se hace por código (medición en el navegador o grep), no a ojo, y se guarda como script reutilizable en `web/scripts/` para poder repetirlo después de cada tanda.

- **B1 (R1). Cuentas que no cierran.** Para cada lugar que muestra dos valores y su diferencia (resumen del Histórico, tarjetas de la portada y de los temas, tablas por presidente, tarjetas de la imagen, Ranking, Contexto), comparar la diferencia mostrada con la que sale de los valores redondeados. Hacerlo sobre todas las series principales y todas las medidas. Buscar también "-0,0" y variaciones que digan "arriba" con signo negativo.
- **B2 (R3). Atrás y cruz.** Listar todas las ventanas, paneles y desplegables (`Modal`, `Desplegable`, `Selector`, `ListaHueco`, `ListaProductos`, vista previa a pantalla completa, gráfico expandido, configuración global). Para cada uno: abrir, disparar "Atrás" y comprobar que se cierra y que la página no cambió; comprobar que tiene botón de cerrar de 44 px.
- **B3 (R5). Texto que desborda.** Con cada ventana y menú abiertos a 360 px, medir todos los elementos cuyo contenido es más ancho que su caja (`scrollWidth > clientWidth`) o que se salen del contenedor. Abrir cada categoría del selector de variables, cada grupo de Personalizar, cada panel de Meses de mandato y la configuración global.
- **B4 (R2 y R4). Cosas que tapan.** En cada gráfico (Histórico con y sin zoom, expandido, Meses de mandato, Contexto, Elecciones), medir si algún botón o etiqueta se superpone con el último punto o con otra etiqueta. En cada lista con encabezados, buscar `position: sticky` y comprobar que no cubre ítems.
- **B5 (R7 y R8). Alineación y repetidos.** En cada lista de filas con botones, comparar la posición horizontal del botón principal entre filas. En cada página, buscar enlaces con el mismo destino y textos repetidos.
- **B6 (R6). Movimiento.** Listar todo lo que avanza solo (carrusel, animación de Meses de mandato, contadores de cifras) y comprobar cuándo arranca y qué lo pausa.
- **B7 (R10). Compartir lo que se ve.** Para cada vista con forma alternativa (Tabla, Velas, base 100, varias variables, cada modo de Meses de mandato), comparar lo que arma Compartir con lo que está en pantalla.
- **B8. Valores por defecto.** Listar qué abre cada sección sin parámetros y si ese arranque es el dato más pedido de la sección.

## Datos
Sin cambios en el pipeline. Ninguna URL existente cambia de significado: los links con parámetros siguen abriendo lo mismo; solo cambian los valores por defecto (requisitos 3 y 5).

## Casos borde
- Link viejo al Histórico sin `r=` (líneas): pasa a mostrar Último y Promedio. Es el único cambio visible en links existentes y es intencional. Confirmado por el usuario (2026-11-11): los links viejos sin `r=` no le importan.
- Diferencia exactamente cero después de redondear: "el último es igual".
- Ventana abierta sobre otra ventana: Atrás cierra solo la de arriba.
- Página abierta directamente (sin historial previo) con una ventana abierta: Atrás cierra la ventana y no sale del sitio.
- Carrusel con "reducir movimiento": sigue sin moverse solo.

## Fuera de alcance
- El parte diario del BCRA y la vista previa de links en redes (bloque 7c).
- Cambios de datos o de cálculos.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Los scripts del barrido (B1 a B8) corren sin hallazgos, o cada hallazgo queda corregido o anotado con su razón.
3. A 360 px y a 1280 px, los 13 casos de arriba.
4. En un celular real: el botón Atrás con cada tipo de ventana abierta.
5. Agente `revisor` contra esta spec.
