# Remodelación, etapa 3.1: inicio, buscador y navegación

Estado: implementada (2026-11-13), aprobada y publicada (1080330). Sale de `docs/AUDITORIA-DISENO-2026-11-13.md`, D-023 y del sistema de `docs/specs/remodelacion-sistema.md` (componentes en `web/components/sistema/`).

## Objetivo
Que la portada responda antes de pedir: el buscador encuentra la variable primero, cada número dice qué medida es, las preguntas se responden en el lugar y la navegación del celular queda al alcance del pulgar. No cambia ningún cálculo, ninguna URL ni ningún parámetro.

## Requisitos

### R1. Buscador (`web/lib/busqueda.ts`, `web/components/sistema/Buscador.tsx`)
- **Un solo orden de resultados**, sin secciones separadas que pongan los gráficos listos primero:
  1. **Datos principales** (`todosLosPrincipales` de `lib/temas.ts`) cuyo `nombre`, `corto` o sinónimos de su serie (`SINONIMOS` de `lib/nombres.ts`, o lo que usa `buscarSeries`) coincidan. Van a `hrefDato(p)`, que da la ficha `/dato/<slug>/` si es un dato fijo.
  2. **Variables** del catálogo (`buscarSeries`), sin repetir las que ya salieron como principal (misma serie y medida por defecto). Van al Histórico, como hoy.
  3. **Gráficos listos** (`filtrar` de `lib/plantillas.ts`, sin las propias).
  4. **Temas y secciones** (`TEMAS` y `SECCIONES` de `lib/secciones.ts`) cuyo nombre coincida.
- Cada grupo tiene un máximo: 3 principales, 4 variables, 3 gráficos y 2 temas o secciones. El primer resultado lleva una **cifra en vivo**: valor, fecha y `Sparkline`, con `evaluar` sobre `plantillaSuelta`. Los demás llevan una línea gris con su ruta ("Precios › Indicadores de inflación") o su grupo.
- **"inflación" da primero "Inflación mensual"** (la ficha), después "Inflación interanual" y después el resto. Lo mismo para "dólar blue", "salario", "pobreza" y "riesgo país": su dato principal va primero.
- Teclado: `role="combobox"` en el campo y `role="listbox"` en los resultados, con `aria-activedescendant`. Flechas arriba y abajo mueven, Enter abre el elegido (el primero por defecto) y Escape borra o cierra.
- **Sin escribir**, al enfocar muestra "Lo más buscado": chips con Inflación, Dólar blue, Salario, Pobreza y Riesgo país que abren su ficha.
- Sin resultados: "No encontramos «…»" y los temas como chips (como hoy, con `FilaChips` de solo links o una fila de links).
- La lógica de orden vive en `lib/busqueda.ts`, como funciones puras (sin React), para que la usen la portada y el buscador global.
- Se borra el `Buscar` viejo de `Oraciones.tsx` y su CSS queda sin uso. Se borra solo si nada más lo usa.

### R2. Buscador global (`web/components/sistema/BuscadorGlobal.tsx`)
- Una capa a pantalla completa en el celular (y centrada, de 640 px de ancho, en la computadora) con el `Buscador` y el foco en el campo. El teclado del celular se abre porque lo pidió el usuario al tocar "Buscar".
- Props: `abierto`, `onCerrar`. Escape, Atrás y la cruz la cierran (`useAtras`, `useCapa`). Elegir un resultado navega y la cierra (el clic en un link con capas abiertas ya lo resuelve `ui.tsx`).

### R3. Navegación (`web/components/Nav.tsx`, `web/app/layout.tsx`)
- **Celular (menos de 768 px)**: arriba queda solo la marca y el botón de configuración (la fila de las 5 pestañas desaparece) y abajo va la `BarraInferior` fija. "Buscar" abre el `BuscadorGlobal` y "Más" abre una `Hoja` con `MenuMas`.
  - En las páginas de Presidentes sigue la fila de subsecciones arriba (es contextual).
  - La barra inferior marca como actual Inicio en `/` y en `/tema/`, Histórico en `/historico/` y en `/dato/`, Presidentes en todo el grupo de Presidentes, y nada en las demás.
- **Computadora (768 px o más)**: igual que hoy, más un botón "Buscar" con ícono en la barra, a la izquierda de "Configurar", que abre el `BuscadorGlobal`. Con "/" se abre desde cualquier página, salvo que el foco esté en un campo.
- La barra inferior no tapa contenido: el `body` tiene el espacio abajo (ya lo hace `controles.css` con `body:has(.navinf-fijo)`). El botón flotante que exista en alguna página no puede quedar debajo de la barra inferior (revisar con grep `position: fixed` y `bottom:`).

### R4. Portada: apertura (`web/components/secciones/Inicio.tsx`)
- El titular baja a `--v-titular` en el celular (3 renglones como máximo a 390 px) y conserva su tamaño actual desde 900 px.
- El buscador nuevo (R1) es el protagonista, con "Lo más buscado" visible debajo sin enfocar: los mismos chips de R1, en una fila deslizable.
- El lema se queda.

### R5. Portada: placas
- Las pastillas `.placa-var` con fondo saturado se reemplazan por `Delta` con la variante nueva `en="placa"`:
  - texto en `--sobre-acento` (azul noche) y referencia en azul noche al 75 %;
  - el triángulo dentro de un cuadradito azul noche de 16 px, pintado de `--placa-bueno` o `--placa-malo` según el tono (la regla de DESIGN.md: "dentro de una placa, verde o rojo sobre una etiqueta azul noche").
  - La fila queda como "Mes anterior 1,9 % ▲ 0,3 p.p.".
- Alto según el contenido (sin el hueco de ~90 px). El minigráfico ocupa el espacio que sobra hasta el pie, con un mínimo de 56 px.
- **En el celular (pantalla táctil o menos de 768 px) el carrusel no avanza solo**: se desliza con el dedo y los segmentos marcan la posición. En la computadora avanza como hoy.

### R6. Portada: "¿Qué datos te interesan?"
- Cada fila se toca entera y lleva a `/tema/<slug>/`. Se saca el botón "?" y su ventana.
- Debajo del nombre, la descripción corta del tema (`t.corto`) en una línea gris, cortada con puntos suspensivos.
- A la derecha, el dato con su medida dicha: si la serie principal del tema es la misma que la de una placa (`PLACAS`), se usa la expresión de la placa, así no aparecen dos números distintos para la misma serie (C3). Debajo de la cifra, el nombre del dato y la fecha, y un `Sparkline` chico (64 × 24).
- Desde 900 px, dos columnas.

### R7. Portada: parte del Banco Central como zócalo (`BloqueParte.tsx`)
- Deja de ser una caja con una lista vertical y pasa a ser una **franja de transmisión**: fondo `--barra`, línea celeste de 2 px arriba y a todo el ancho de la pantalla, con la etiqueta "EN VIVO · BANCO CENTRAL" condensada a la izquierda y la fecha del parte.
- Lleva 4 a 6 cifras del día en fila (dólar minorista, reservas, compras, base monetaria y tasa, las que existan en `variableDe`), cada una con su nombre corto, su valor y un `Delta` contra el día anterior (`difAnterior`/`clsAnterior`, con la unidad) o "al <fecha>" si está atrasada.
- En el celular se desliza de costado (con encastre); en la computadora entra en una fila. Toda la franja es un link a `/bcra/`.
- El bajado del archivo sigue esperando a que el bloque esté cerca de la pantalla.

### R8. Portada: "Preguntale a los datos" (`Oraciones.tsx`, `lib/oraciones.ts`)
- **Una pregunta a la vez.** Arriba, `FilaChips` con las 5 preguntas en corto ("Cuánto compra", "Con cada presidente", "Desde un año", "En dólares", "Qué subió más"). Abajo, la oración con sus huecos y, **debajo, la respuesta en el lugar**, que se actualiza al cambiar un hueco:
  - **Compra**: la cifra (cuántas unidades compra el salario, el último valor de la variable `producto/salario`) con su fecha y un `Sparkline`.
  - **Presidente**: inicio → cierre del indicador en el mandato (`statsMandato`) y, si la serie es una tasa (`c.pct`), el promedio del mandato en lugar de la variación (D-023).
  - **Desde un año**: el valor de enero de ese año → el último, con un `Delta`.
  - **En dólares o pesos de hoy**: el último valor en esa medida, con su `Sparkline`.
  - **Qué subió más**: la variación real de cada precio desde que hay datos de los dos, y cuál subió más, dicho con palabras neutras.
- Cada respuesta tiene un link "Ver completo" al destino de hoy (`href…` de `lib/oraciones.ts`, sin cambios).
- Los cálculos de las respuestas van en `lib/oraciones.ts` como funciones puras sobre el `Motor`, usando lo que ya existe (`m.calc`, `statsMandato`, `evaluar`, `variacionTxt`). Las cuentas cierran con los valores que se muestran.
- Los huecos siguen con su lista o su ventana actual, sin cambiar su lógica. Las cruces de texto ("×") pasan a `IconoCerrar`.

### R9. Portada: secciones y gráficos listos
- "Armá tu propia consulta" pasa a ser un **índice** con los 4 grupos de `lib/secciones.ts`: título del grupo y filas de nombre + una línea + flecha, sin tarjetas ni botones "Abrir", en 2 columnas desde 900 px. Va sin la entrada "Gráficos listos", porque el bloque de abajo la cubre. Título: "Todas las secciones".
- "Gráficos listos destacados" usa `Laminas`/`Lamina` (6 destacados) con un link "Ver todos los gráficos listos" a `/plantillas/`.
- `SECCIONES_INICIO` se borra de `Inicio.tsx`; la única fuente es `lib/secciones.ts`.

### R10. Portada: sin contenido invisible
- Se saca `Entrada` de la portada: ningún bloque arranca invisible. Las cifras siguen contando (`Contador`) y las barras y líneas se dibujan.
- Los títulos de los bloques usan `Capitulo` (raya celeste y línea), salvo la apertura, el zócalo y "Todo tiene fuente".

## Fuera de esta etapa
Las fichas (3.2), Histórico y Presidentes (3.3), Contexto (3.4) y las herramientas (3.5). Las páginas internas solo cambian por la navegación (R3).

## Cómo se verifica
- `npm run tipos` y `npm run build`.
- Buscador: "inflación", "dólar blue", "salario", "pobreza", "riesgo país", "asado" y "zzz", con el orden y el destino de cada uno. Las flechas, Enter y Escape funcionan.
- Portada a 360, 390, 768 y 1280 px, en tema oscuro y claro: sin desplazamiento horizontal, sin errores de consola y con objetivos de 44 px.
- Placas: en el celular no avanzan solas; en la computadora sí, y se pausan al tocarlas.
- La misma serie no aparece con dos números distintos en la portada.
- Navegación: barra inferior en el celular en `/`, `/historico/`, `/presidentes/`, `/gasto/` y `/dato/inflacion-mensual/`. Buscar y Más abren y cierran con Atrás, y tocar una sección navega. En la computadora, el botón Buscar y la tecla "/".
- Las respuestas de "Preguntale" coinciden con la página de destino de "Ver completo".
- `impeccable detect` y agente `revisor`.
