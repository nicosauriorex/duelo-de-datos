# Tanda 5: la ficha del dato y ajustes

Estado: implementada (2026-11-12). Desvíos aceptados: Personalizar de Por presidente y Meses de mandato es una ventana simple (sin panel lateral); la personalización de la imagen sigue plegada dentro de su ventana; en la vista de varios gráficos del Histórico quedan dos desplegables ("Período" y "Opciones del gráfico").
Ideas: Ajustes pedidos al recorrer la página, tanda 5 (2026-11-12).

## Objetivo
Que quien eligió un dato (en un tema, en una pregunta o en "Todos los datos") lo vea enseguida de las tres formas fuertes del sitio —Histórico, Por presidente y Meses de mandato— sin tener que ir a cada sección y volver a filtrar. Y corregir los detalles que el usuario encontró, buscando los del mismo tipo en todo el sitio.

## Propuesta central: la ficha del dato
Un solo componente, `FichaDato`, que recibe una variable (la misma expresión que usa la URL del Histórico) y muestra tres bloques, cada uno con su Compartir y un botón "Abrir completo" que lleva a la sección con la variable ya cargada:

1. **Histórico**: dato, contexto y gráfico (la vista simple que ya existe).
2. **Por presidente**: la tabla resumida (inicio, cierre, variación), con Tabla / Velas.
3. **Meses de mandato**: el gráfico comparando presidentes desde el mes 0.

Se usa en tres lugares, así no se arman tres pantallas distintas:
- **Página de tema**: tocar una variable principal (su tarjeta con el grafiquito) o una de "Todos los datos" la pone como variable de la ficha, que queda en la misma página. Reemplaza a la tabla "Por presidente" resumida de hoy y a su botón "Ver todos los indicadores por presidente".
- **Preguntale a los datos**: "Ver" abre la ficha con la variable de la oración. Desaparece el link "Ver la tabla por presidente" (pedido 1).
- **Ruta propia** `/dato/?v=…`, para compartir el link. Es el mismo lugar donde después va la vista previa en redes (bloque 7c): conviene diseñarlos juntos.

Por qué esta opción y no el cartel "¿a dónde querés ir?": el cartel suma un toque y obliga a elegir antes de ver nada; la ficha muestra las tres y deja elegir después. Y no trae las tres secciones enteras al tema (pesado y duplicado): trae la vista simple de cada una; lo avanzado sigue en su sección.

Personalizar dentro de la ficha: solo lo que vale para las tres (período, moneda o medida). Lo demás, en "Abrir completo".

**A decidir**
- D1. ¿Ficha del dato (recomendado) o cartel con destinos?
- D2. En el celular, los tres bloques: uno debajo del otro (recomendado: se ve todo al deslizar) o en pestañas.
- D3. ¿La ruta `/dato/` entra en esta tanda o queda para 7c? Recomendado: entra, sin la vista previa en redes.

## Reglas nuevas (valen para todo el sitio)
- **R11. Elegiste el dato una vez.** Después de elegir una variable, ninguna pantalla vuelve a pedirla: todo lo que se abre desde ahí ya la trae.
- **R12. El teclado no se abre solo.** En pantallas táctiles, abrir una ventana no pone el foco en un campo de texto; el teclado aparece al tocar el campo.
- **R13. Una opción que no cambia nada no se ofrece.** Si una moneda, medida o filtro no altera lo que se ve para esa variable, se oculta, se deshabilita o se aclara "no aplica".
- **R14. Separación entre bloques.** Un botón o enlace que sigue a una tabla o a un gráfico deja un espacio (al menos `--e-3`); nunca queda pegado.
- **R15. Configurar es una ventana.** Los controles de personalización se abren en una ventana con el fondo oscurecido, no desplegados en la página.
- Se refuerza R5 (texto que no entra): un nombre largo en un botón de dos líneas se corta con puntos suspensivos y se lee entero al tocarlo, o el botón crece; nunca queda cortado a la mitad sin aviso.

## Requisitos (casos pedidos)

### Portada
1. (R11) En "Preguntale a los datos" se saca "Ver la tabla por presidente"; "Ver" abre la ficha del dato.
2. Debajo de "Preguntale a los datos", un bloque que presenta las demás secciones (Histórico, Por presidente, Meses de mandato, Ranking, Elecciones, Contexto, Gráficos listos): una línea de para qué sirve cada una y su botón. Dicho para quien quiere buscar sus propias variables o mezclar; lo de arriba es para el resto. Sin repetir enlaces que ya están en la misma pantalla (R8).
3. "Los datos más buscados": cada placa suma el dato del mes anterior y el de un año atrás, con la variación contra cada uno (texto con signo y color según bueno/malo). Sirve para leer un dato nuevo apenas sale.

### Temas
4. (R5) En los botones de variable de la tabla por presidente, un nombre que no entra en dos líneas ("Salario mediano real (trabajadores registrados)") no queda cortado. Si se hace la ficha, estos botones pasan a ser el selector de variable de la ficha.
5. (R14) "Ver todos los indicadores por presidente" (o el botón que lo reemplace) queda separado de la tabla.
6. (R11) Tocar una variable de "Todos los datos" o una tarjeta principal la aplica a los tres bloques de la ficha.

### Menú
7. Orden del menú de Presidentes: Por presidente, Meses de mandato, Ranking, Elecciones, Congreso.

### Histórico
8. Cabecera del dato: a la derecha del dato principal (debajo, en celular), las comparaciones en el mismo estilo: mes anterior, año anterior, inicio del período, promedio, mediana, máximo y mínimo, cada una con "el último está X arriba / abajo". En celular se deslizan de costado a mano (no avanzan solas, R6).
   - La frase "X p.p. por debajo de su récord" se saca cuando el máximo ya está entre las comparaciones.
   - El bloque "Resumen del período" de abajo se saca: sería lo mismo dos veces (R8).
   - D4: "Interanual: 33,4 %" se queda como línea (es otra medida, no una comparación del mismo dato).
9. (R15) "Personalizar" abre una sola ventana con fondo oscurecido y adentro las secciones (variable, fechas, opciones del gráfico, guardar), en lugar de desplegar botones que abren otras ventanas. En computadora, panel al costado para seguir viendo el gráfico; en celular, ventana completa. Aplica igual a Personalizar de Por presidente, Meses de mandato y la imagen.
10. (R12) En celular, abrir el selector de variables no abre el teclado: el foco inicial no va al buscador (`Variables.tsx:128` y `:186`). En computadora sigue yendo.

### Presidentes
11. (R13) "Un presidente, todas las variables": en "IPC por rubros" (índices, p. ej. "IPC Bienes (Nacional)", índice dic-2016=100) cambiar la moneda no cambia nada. Definir qué se muestra para un índice: recomendado, su variación en el mandato (inflación del rubro) y, con moneda "reales", contra la inflación general; y si la moneda no aplica, decirlo en la fila.

## Barrido de errores parecidos
Se corre antes de implementar; lo que aparezca se suma. Sumar cada chequeo a `web/scripts/barrido-navegador.js`.
- **B9 (R5). Nombres largos en botones.** Con el nombre público más largo de cada categoría, medir todos los botones con `line-clamp` o alto fijo: `scrollHeight > clientHeight`.
- **B10 (R12). Foco al abrir.** Abrir cada ventana con emulación táctil y comprobar que `document.activeElement` no es un `input` ni un `textarea`. Buscar `.focus()` y `autoFocus` en `web/components`.
- **B11 (R13). Opciones sin efecto.** Para cada tipo de serie (`tipo` del catálogo: índice, porcentaje, cantidad, pesos, dólares), cambiar moneda y medida en cada sección y comparar los valores: si no cambian, la opción no debería ofrecerse. Empezar por índices y porcentajes.
- **B12 (R14). Elementos pegados.** Medir la distancia vertical entre cada tabla o gráfico y el botón o enlace que le sigue: menos de 8 px es hallazgo.
- **B13 (R11). Elegir dos veces.** Listar todos los enlaces que llevan a Histórico, Por presidente y Meses de mandato desde temas, portada, plantillas y curiosidades: ¿llevan la variable en la URL?
- **B14 (R8). Lo mismo dos veces**, después de la ficha: tabla por presidente del tema contra la ficha, resumen del Histórico contra la cabecera, enlaces de la portada contra el bloque nuevo de secciones.
- **B15 (R15). Controles desplegados en la página.** Listar cada `Desplegable` con controles de configuración y decidir si pasa a ventana.

## Datos
Sin cambios en el pipeline. Ningún parámetro de URL cambia de significado; `/dato/` es una ruta nueva.

## Casos borde
- Variable sin sentido por presidente o por mandato (serie corta, anual): el bloque dice desde cuándo hay datos o no se muestra, sin dejar un hueco.
- Variable en pesos corrientes: las velas no se dibujan (nota que ya existe).
- Dato sin mes anterior o sin año anterior (serie trimestral o nueva): se compara con el período anterior que exista y se dice cuál.
- Link viejo a la tabla por presidente de un tema: sigue abriendo esa variable, ahora en la ficha.

## Fuera de alcance
- Vista previa de los links en redes (7c) y el parte diario del BCRA.
- Traer las secciones completas (con todas sus opciones) adentro de los temas.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build`; `npx tsx scripts/barrido-cuentas.ts`.
2. Barrido del navegador (B1 a B15) a 360 y 1280 px sin hallazgos.
3. Los 11 casos, a 360 y 1280 px; el caso 10 con emulación táctil.
4. En un celular real: teclado, deslizamiento de las comparaciones, la ficha.
5. Agente `revisor`.
