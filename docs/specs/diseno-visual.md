# Diseño visual y portada (bloque 5e)

Estado: spec lista, falta implementar.

## Objetivo
Darle a Primero los Datos una identidad propia, con un tono **tecnológico moderno**, en todo el sitio, y una portada que se cuente al bajar.

La crítica del 2026-11-09 (skill Impeccable, en modo reducido) puntuó la página en 27/40 y encontró:
- parece una plantilla genérica de panel de datos: letra del sistema, tarjetas grises todas iguales, miniaturas con colores sin significado;
- el encabezado grande se repite en todas las páginas y empuja el contenido;
- el menú tiene 10 pestañas y en el celular se corta;
- la portada no tiene jerarquía ni un mensaje de entrada;
- verde y rojo no significan siempre lo mismo.

Lo que funciona y se conserva: el contenido con contexto ("contra su récord de jul-15"), las fuentes siempre visibles, la URL que guarda todo y la grilla que se adapta.

## Qué ve y hace el usuario
1. Entra a la portada desde el celular. Ve una pantalla oscura con un mensaje fuerte en letra grande, por ejemplo: "¿Cansado de que en redes hablen sin datos? Buscá el dato, comparalo en el tiempo, entre presidentes y con el mundo." Abajo, un buscador y un indicio de que se puede bajar.
2. Baja y aparecen los **datos más buscados** en tarjetas grandes: el número cuenta hasta su valor y la línea se dibuja. Las tarjetas avanzan solas de a una hacia la izquierda; al tocar una se frenan, y puede deslizar para volver a la anterior.
3. Sigue bajando: **¿Qué datos te interesan?** (los temas), después **Preguntale a los datos** y las **plantillas destacadas**. Cada parte entra con un movimiento suave.
4. Al final, un bloque remarca que **todo tiene fuente**, con los organismos y el link a Fuentes.
5. Toca el dato del salario y llega al Histórico. Arriba hay una flecha **← Volver** que lo devuelve a la portada, en el mismo lugar.
6. En cualquier página interna ve una barra fina con el logo y el menú de 5 secciones: Inicio · Histórico · Presidentes · Contexto · Plantillas. Toca **Presidentes** y ve las subsecciones: Por presidente, Ranking, Meses de mandato, Curiosidades, Elecciones y Congreso.
7. En el tema claro, el verde más fuerte es lo mejor y el rojo más fuerte lo peor, en todo el sitio.
8. Tiene activado "reducir movimiento" en el celular: la portada se ve completa y quieta, con los números ya puestos.

## Requisitos

### Proceso (skill Impeccable)
1. La implementación usa el plugin **Impeccable** (`impeccable@impeccable`), instalado en este proyecto solo para el usuario (D-010). Antes de empezar, correr el paso de contexto de la skill (`impeccable context`), que carga `PRODUCT.md` y `DESIGN.md`. El detector automático corre solo después de cada edición de la interfaz; sus avisos se corrigen o se justifican.
2. Pasos:
   - `init` → escribir `PRODUCT.md` (qué es el sitio, para quién, tono "tecnológico moderno", restricciones de esta spec);
   - diseñar el mundo visual siguiendo `reference/new-work.md` (es un rediseño: el aspecto actual sirve como evidencia, no como base);
   - leer `reference/craft-floor.md` antes de editar la interfaz;
   - al terminar, `document` → `DESIGN.md` con los tokens finales, y `polish`.
3. Al final, una nueva crítica (`critique`, igual que la del 2026-11-09). Objetivo: **32/40 o más**, sin problemas P0 ni P1. El puntaje y los problemas que queden van al resumen final.

### Identidad visual
4. **Tono tecnológico moderno**: el tema oscuro es la cara principal del sitio, con letra sans geométrica o grotesca, acentos de color brillantes y movimiento medido.
   - El tema **claro** sigue existiendo y tiene que verse igual de cuidado.
   - El tema por defecto pasa de "automático" a **oscuro**; en la configuración global siguen las tres opciones (oscuro, claro, automático).
   - Las configuraciones ya guardadas en el navegador respetan lo que el usuario eligió.
5. **Tipografía**:
   - como máximo dos familias, con todos los caracteres del español (ñ, tildes, ¿, ¡);
   - servidas desde el propio sitio con `next/font`, sin pedidos a Google en tiempo de ejecución;
   - **cifras tabulares** (`font-variant-numeric: tabular-nums`) en todos los números de datos, para que no bailen al cambiar;
   - escala de tamaños definida en tokens: los números grandes de las tarjetas tienen su propio estilo.
   La elección de la letra la hace la implementación siguiendo Impeccable (evitar las sobreusadas que marca su guía) y se anota en `DESIGN.md`.
6. **Tokens**: todos los colores, tamaños, espacios, radios, sombras y duraciones en variables CSS en `:root` de `web/app/globals.css`, para los dos temas, con la misma estructura de hoy (`prefers-color-scheme` y `data-theme`). No quedan colores sueltos en los componentes.
7. **Color con significado**:
   - Verde = mejor y rojo = peor, en todo el sitio (tarjetas, chips, tablas, Ranking), con la dirección efectiva de cada serie (`dirEfectiva`, del bloque 5c).
   - En el tema claro, la intensidad va de suave a fuerte según cuánto mejoró o empeoró: lo mejor en el verde más fuerte y lo peor en el rojo más fuerte.
   - En el tema oscuro, igual si se consigue buen contraste. Si no, se deja como está y se anota en `DESIGN.md`.
   - Todo cumple contraste AA (4,5:1 en texto).
   - Lo bueno o malo no se comunica solo con el color: el signo (+/−) o una flecha acompañan.
8. **Miniaturas de las tarjetas** (sparklines): un solo color de acento del tema, o el verde o rojo del requisito 7 según la tendencia. No más colores distintos por tarjeta.
9. **Colores de los gráficos**: la paleta de series (`--series-*`) se ajusta para que combine con el tema nuevo y siga distinguiéndose entre sí y en los dos temas. Los colores de cada presidente salen de la configuración global (bloque 5c) y no se pisan.

### Estructura de todas las páginas
10. **Encabezado**: el título grande con el lema y la descripción va **solo en la portada**. En las demás páginas, una barra fina fija arriba con el logo (link a Inicio), el menú y el botón de configuración. El botón de configuración lleva texto o una etiqueta visible ("Configurar") en computadora y `aria-label` en celular.
11. **Menú en 5 secciones**:
    - Inicio · Histórico · Presidentes · Contexto · Plantillas;
    - **Presidentes** agrupa Por presidente, Ranking, Meses de mandato, Curiosidades, Elecciones y Congreso (la sección del 6d, `/presidentes/#congreso`). En computadora se abre un menú desplegable; en celular, una segunda fila de pestañas debajo cuando se está en alguna de esas páginas;
    - **Fuentes** pasa al pie de página, que aparece en todas las páginas con las fuentes principales y el link.
    Las URLs no cambian (`/ranking/`, `/mandato/`, etc.). La sección actual queda marcada en el menú.
12. A 375 px las 5 secciones entran en una línea sin cortarse ni hacer scroll.
13. **Volver**: en el Histórico, en las páginas de tema y en las subsecciones de Presidentes, si se llegó desde otra página del sitio, aparece "← Volver" arriba a la izquierda. Usa el historial del navegador, así que vuelve al mismo lugar de la página anterior. Si se entró directo por un link, no aparece.
14. **Renglones partidos**: ningún texto de menú, botón, pestaña ni título de tarjeta se parte en dos renglones si entra en uno a 375 px y a 1366 px. Si no entra, se acorta con un nombre corto, no se parte.
15. **Links sueltos** ("Ver todas las plantillas", "Ver las fuentes", los de la portada): pasan a botones o tarjetas con el estilo del sistema. Los links dentro de un texto siguen siendo links.

### Portada contada al bajar
16. Orden de la portada:
    1. **Apertura**: el mensaje fuerte (el texto del paso 1 es un ejemplo y se puede pulir), el buscador de datos y un indicio de que se puede bajar. Ocupa la primera pantalla.
    2. **Los datos más buscados**: los indicadores destacados actuales en tarjetas grandes, en un carrusel horizontal.
    3. **¿Qué datos te interesan?**: los 9 temas.
    4. **Preguntale a los datos** y **plantillas destacadas**.
    5. **Todo tiene fuente**: los organismos (INDEC, BCRA, Secretaría de Trabajo, etc.) y el link a Fuentes.
17. **Carrusel de datos**:
    - avanza solo, de a una tarjeta, cada ~5 s;
    - se pausa al pasar el mouse, al tocarlo, al tener el foco del teclado y cuando no está en pantalla;
    - se puede deslizar con el dedo y tiene flechas o puntos para ir y volver;
    - con "reducir movimiento" no avanza solo.
18. **Movimiento medido**:
    - cada sección entra con un movimiento suave al aparecer (subir unos px y aparecer, menos de 400 ms);
    - los números de las tarjetas cuentan hasta su valor una sola vez;
    - las miniaturas se dibujan de izquierda a derecha.
    Nada se mueve en bucle salvo el carrusel.
19. **"Reducir movimiento"** (`prefers-reduced-motion`): se apagan todas las animaciones del sitio, los números aparecen ya puestos y el carrusel queda quieto.
20. **Rendimiento**:
    - las animaciones usan CSS (transform y opacity) e `IntersectionObserver`;
    - si hace falta una librería, pesa menos de 15 KB comprimida y se justifica en DECISIONES.md;
    - la portada no baja el catálogo completo (D-007): cada tarjeta pide su archivo cuando entra en pantalla, como hoy;
    - la animación no mueve el contenido de lugar (sin saltos de diseño al cargar).

### Tarjetas de resumen del Histórico
21. Las tarjetas de resumen (último dato, promedio, mediana, máximo, mínimo) van en **una sola fila**. Si no entran, se deslizan de costado con encastre (scroll-snap), con una sombra en el borde que indica que hay más.
22. Si no entran, se pueden mover solas lento (un desplazamiento suave de ida y vuelta). Se frenan al tocarlas o pasar el mouse y no se mueven con "reducir movimiento".

### Lo que no cambia
23. No cambian las funciones, los cálculos, la URL ni los textos de los datos: es un cambio de aspecto. Los textos de interfaz (títulos, ayudas) se pueden pulir si quedan más claros, sin cambiar lo que dicen de los datos.
24. Todo sigue en español y con números en formato es-AR.

## Datos
No hay datos nuevos. Cambios de configuración:
- `pld:config`: el tema por defecto pasa a "oscuro" para quien no tiene nada guardado. Las configuraciones guardadas no cambian.
- Archivos nuevos en la raíz: `PRODUCT.md` y `DESIGN.md` (contexto de diseño de Impeccable, versionados).

## Casos borde
- Navegador sin JavaScript o que tarda: la portada se ve completa y quieta. Las animaciones son una mejora, no una condición para ver el contenido.
- Tarjeta del carrusel cuyo dato no se pudo bajar: muestra el aviso de error de hoy y el carrusel la sigue mostrando.
- Usuario que entra a `/ranking/` directo: el menú marca **Presidentes** y la subsección Ranking; no hay "Volver".
- Texto de apertura muy largo en pantallas de 320 px: el tamaño de letra se ajusta (`clamp`) para que entre sin scroll lateral.
- Tema claro elegido en la configuración: todo el diseño nuevo funciona igual, con sus propios tokens.
- Impresión (Ctrl+P) de una página: sin animaciones, fondo claro.

## Fuera de alcance
- Cambios de funciones o cálculos en cualquier sección.
- Logo profesional o identidad de marca para redes (va con el bloque 7).
- Ilustraciones o fotos.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px, a 768 px y a 1366 px, en tema oscuro y claro:
   - **Portada**: apertura, carrusel (avanza, se pausa al tocar, se puede volver), temas, preguntas, plantillas y bloque de fuentes, en ese orden.
   - **Reducir movimiento** (emularlo en el navegador): nada se mueve y los números se ven.
   - **Menú**: 5 secciones en una línea a 375 px; Presidentes muestra sus 6 subsecciones; Fuentes en el pie.
   - **Encabezado**: grande solo en la portada.
   - **Volver**: desde una tarjeta de la portada al Histórico y de vuelta, al mismo lugar.
   - **Colores**: en tema claro, el mejor del Ranking en verde fuerte y el peor en rojo fuerte; el dólar blue y el salario con el mismo criterio en las tarjetas.
   - **Renglones**: ningún botón, pestaña ni título de tarjeta partido.
   - **Teclado**: se puede recorrer la portada con Tab, con foco visible, y el carrusel se pausa con el foco.
3. Nueva crítica con Impeccable (`critique` de la portada y del Histórico), con el detector: 32/40 o más, sin P0 ni P1, con el resultado y el historial de puntajes en el resumen. Si el usuario no autorizó subagentes para la crítica, corre en modo reducido y se avisa.
4. Revisar que no queden colores sueltos en los componentes (`grep` de `#` hexadecimales fuera de `globals.css`).
