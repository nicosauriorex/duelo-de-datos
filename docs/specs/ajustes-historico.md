# Ajustes del Histórico (bloque 5c)

Estado: implementada (2026-11-09). Nota: las páginas de tema no tienen gráficos propios (solo tarjetas y links al Histórico), así que las franjas están en Histórico y en los gráficos mensuales de Contexto.

## Objetivo
Que el Histórico ocupe menos lugar y se lea mejor:
- cada variable se configura en una ventana y después queda como un nombre limpio (también en "Mis variables" de Por presidente);
- el gráfico explica sus líneas de referencia al pasar sobre ellas, en vez de con una leyenda fija;
- el zoom ajusta la escala y vuelve bien a la primera;
- los precios en pesos corrientes no se pintan de malo solo porque suben;
- se puede pintar el período de cada presidente como una franja de color.

## Qué ve y hace el usuario
1. Entra al Histórico con **Salario SIPA mediano** elegido. En lugar de la fila de botones (variable, medida, pesos/dólares) ve un renglón limpio: "● Salario SIPA mediano · pesos de hoy" y un botón **⚙ Configurar**.
2. Toca **Configurar** y se abre una ventana con todo lo de la variable, en secciones separadas:
   - **Variable**: cuál es, con el botón para cambiarla.
   - **Moneda**: pesos o dólares (y cuál dólar).
   - **Valores**: reales (pesos de hoy) o corrientes.
   - **Cómo se mide**: valor, variación mensual, interanual…
   - **En términos de**: otra variable (relación), si aplica.
   Toca **Aceptar** y vuelve al renglón limpio, con el texto actualizado.
3. Con un solo gráfico, la barra de período (desde, hasta, mes/trimestre/año) queda en su lugar al bajar, no fija arriba. Con dos o más gráficos sigue fija.
4. Debajo del gráfico ya no está la leyenda de líneas ("Ú último … P promedio … M mediana …"). Pasa el cursor sobre la línea punteada del promedio: la línea se resalta y aparece "Promedio: $ 1.234.567". En el celular, toca cerca de la línea.
5. Arrastra para acercar 2018–2020: el eje vertical se ajusta a lo que se ve, y el promedio, la mediana, el máximo y el mínimo se recalculan solo con ese tramo. Toca **Volver** y el gráfico queda exactamente como antes, a la primera.
6. Elige **Carne (asado), precio** en pesos corrientes: la variación del resumen ya no aparece en rojo, porque en pesos corrientes casi todo sube. Junto al nombre aparece **Ver en salarios**, que pasa la serie a "cuántos salarios cuesta". Ahí sí: si sube, es malo y va en rojo.
7. En **Configurar gráfico** prende **Presidentes**: detrás de las líneas aparecen franjas de color, una por mandato, con el apellido arriba. Los colores se cambian en la configuración global, donde también se pueden dejar prendidas siempre.
8. En **Por presidente → Mis variables** pasa lo mismo que en el paso 1: cada variable es un renglón limpio ("Salario SIPA promedio · pesos de hoy") con ⚙ para configurarla y ↑ ↓ para moverla. Los desplegables aparecen solo dentro de la ventana.

## Requisitos

### Ventana "Configurar variable"
1. Cada variable del Histórico (también la segunda o las demás, hasta 4 o 10 en base 100) se muestra como un renglón:
   - punto de color, nombre corto y resumen de la medida (ej. "pesos de hoy", "en US$ blue", "variación interanual");
   - si tiene relación, "en términos de <otra>";
   - botón **⚙ Configurar** y ✕ para quitar si se puede quitar.
   Tocar el nombre también abre la ventana.
2. La ventana usa el `Modal` existente (`web/components/ui.tsx`) y reúne lo que hoy está en la fila: elegir variable (abre el buscador), el selector de medida y la relación ("en términos de").
3. Dentro de la ventana, las opciones van en **grupos con título y separación visible**, para que no parezcan lo mismo. "Reales / corrientes" queda separado de "Pesos / dólares" y de "Valor / variaciones". Si un grupo no aplica a la variable (por ejemplo, un índice), no se muestra.
4. **Aceptar** aplica los cambios (un solo cambio de URL); **Cancelar**, cerrar con ✕ o la tecla Esc no cambian nada. Mientras está abierta, el gráfico no se redibuja.
5. Una variable recién agregada (sin elegir) abre directo el buscador, como hoy.
6. El renglón limpio entra en una línea a 375 px. Si el texto es largo, se corta con "…" y el nombre completo va en `title`.
7. La lógica de las medidas sigue en `web/lib/` (`motor.ts`, `config.ts`): la ventana es solo interfaz.

### "Mis variables" (Por presidente)
8. En **Un presidente, todas las variables → Mis variables**, cada variable elegida se muestra como el renglón limpio del requisito 1, con ⚙ (abre la misma ventana), ↑ ↓ para moverla y ✕ para quitarla. No quedan desplegables a la vista.
9. Se usa el mismo componente que en el Histórico (una sola ventana para los dos lugares).

### Barra de período
10. La barra de período del Histórico (`.barra-hist`) queda fija arriba solo con **2 o más gráficos**. Con uno, va en su lugar y se va con el scroll.

### Líneas de referencia (último, promedio, mediana…)
11. Se saca la leyenda de referencias de debajo del gráfico (`refleg`). Las líneas siguen y se prenden y apagan en Configurar gráfico, como hoy.
12. Al pasar el cursor a menos de ~6 px de una línea de referencia, la línea se resalta (más gruesa y opaca) y aparece una etiqueta pegada a ella con el nombre y el valor ("Mediana: 54,3 %"). Con dos variables, la etiqueta dice también de qué variable es.
13. En el celular, tocar cerca de una línea de referencia muestra la misma etiqueta; tocar en otro lado la cierra. El tooltip de los datos sigue funcionando como hoy.
14. Los marcadores (último, máximo, mínimo) ya muestran su valor y no cambian.
15. En la vista expandida (pantalla completa) vale lo mismo.

### Zoom
16. Al acercar, el eje vertical (los dos, si hay eje derecho) se ajusta al mínimo y máximo de lo visible, con un margen.
17. Promedio, mediana, máximo, mínimo y el resto de las referencias se **recalculan con el tramo visible**, y la etiqueta del requisito 12 lo aclara ("Promedio 2018–2020: …"). Las tarjetas de resumen de debajo del gráfico no cambian: son del período elegido.
18. **Volver** (y el doble clic) restablece los dos ejes y las referencias del período completo en un solo paso. Se arregla el error de hoy, en el que la escala queda rara y hace falta un doble clic.
19. Los cálculos de referencias por tramo usan las funciones de `web/lib/estadisticas.ts`, no cuentas nuevas en el componente.

### Precios: bueno o malo
20. Las series de precios (`tipo` ars con `dir = -1` en las categorías de precios) mostradas en **pesos corrientes** o en **dólares corrientes** se tratan como neutras: la variación no se pinta ni verde ni roja.
21. En **precio real**, **en salarios** o **en términos de** otra variable se mantiene `dir = -1` (subir es malo).
22. La regla vive en una función de `web/lib/` (por ejemplo `dirEfectiva(serie, medida, relacion)`) que usan las tarjetas, los chips, Por presidente y Ranking, para que el criterio sea el mismo en todo el sitio.
23. Junto a cada precio (en el renglón del requisito 1) aparece el atajo **Ver en salarios**. Pasa la variable a "en términos de" el salario de la configuración global (SIPA mediano por defecto), igual que las plantillas de "Poder de compra". Si ya está en salarios, no aparece.

### Franjas de presidentes
24. Opción **Presidentes** (franjas sí/no) en Configurar gráfico de:
    - Histórico, cada gráfico de la grilla por separado;
    - los gráficos de las páginas de tema;
    - los gráficos mensuales de Contexto.
    Parámetro de URL `pf=1` en el Histórico. Por defecto, apagadas.
25. Cada mandato de `PRES_DEF` es una franja vertical de su color, translúcida (alrededor del 12 % de opacidad), detrás de las líneas, con el nombre corto arriba si entra (si no, solo en el tooltip). Entre dos mandatos hay una línea fina.
26. Los colores por defecto son los que ya usa el sitio para cada presidente (`PRES_DEF.color`).
27. En la **configuración global** (D-005, `pld:config`):
    - "Mostrar presidentes en los gráficos" (sí/no; si es sí, prende las franjas en todos lados salvo que la URL diga lo contrario);
    - un selector de color por presidente, con "Volver a los colores de fábrica".
    Los colores elegidos se usan en las franjas y en todo lugar donde hoy se usa el color de un presidente (Meses de mandato, Ranking, etc.).
28. Las franjas respetan la configuración de inicio de mandato (T±N): la franja empieza en el mes que la configuración toma como inicio.
29. En base 100, con escala logarítmica y en la vista expandida, las franjas funcionan igual. En la tabla (vista "Tabla") no se muestran.

## Datos
No hay datos nuevos.
- Parámetro de URL nuevo: `pf`.
- Campos nuevos en `pld:config`: `franjas` (booleano) y `colPres` (mapa id → color). Hay que subir la versión de la configuración y migrar las guardadas.

## Casos borde
- Ventana abierta y el usuario toca "Atrás" del navegador: se cierra la ventana sin aplicar.
- Una variable cuya medida guardada ya no aplica (link viejo): el renglón muestra la medida por defecto, igual que hoy.
- Zoom a un tramo con un solo dato o sin datos: no se acerca (como hoy) y no se recalculan las referencias.
- Dos líneas de referencia muy cerca (promedio y mediana casi iguales): se resalta la más cercana al cursor.
- Precio en dólares blue: es corriente, así que se trata como neutro (requisito 20).
- Franja de un mandato que empieza antes del período visible: se dibuja desde el borde izquierdo, con el nombre si entra.
- Color de presidente igual al de una serie: se puede, porque la franja es translúcida. No se valida.
- Configuración guardada de una versión anterior (sin `franjas` ni `colPres`): toma los valores de fábrica sin error.

## Fuera de alcance
- Tarjetas de resumen en una fila deslizable y que se muevan solas (va en 5e, Diseño visual).
- Colores de lo bueno y lo malo en tema claro (va en 5e).
- Cambios en Ranking, Meses de mandato y Elecciones (van en 5d).
- La opción "Promedio / Cierre" al agrupar por trimestre o año: ya está visible en la barra de período.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - **Histórico**: renglón limpio; ⚙ abre la ventana con grupos separados; Aceptar aplica y Cancelar no; con 2 variables, cada una tiene su ⚙.
   - **Mis variables** en Por presidente: renglones limpios con ⚙ ↑ ↓ ✕ y sin desplegables a la vista.
   - **Barra de período**: con 1 gráfico se va con el scroll; con 2, queda fija.
   - **Referencias**: sin la leyenda de abajo; pasar sobre el promedio lo resalta con nombre y valor; en el celular, al tocar.
   - **Zoom**: acercar 2018–2020 ajusta el eje y la etiqueta del promedio dice "2018–2020"; un solo Volver deja todo como estaba.
   - **Precios**: el asado en pesos corrientes sin rojo; en precio real, en rojo si sube; "Ver en salarios" lo pasa a salarios.
   - **Franjas**: prender Presidentes en Configurar gráfico; cambiar el color de Macri en la configuración global y verlo en las franjas y en Meses de mandato; prender "siempre" y ver las franjas en una página de tema.
   - Links viejos (sin `pf`) cargan igual.
