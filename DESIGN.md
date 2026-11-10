---
name: Primero los Datos
description: Datos de Argentina, en debate. Sistema visual "La Transmisión".
colors:
  azul-noche: "#0a1230"
  azul-panel: "#121c44"
  azul-barra: "#060b20"
  celeste: "#6cc4ff"
  ambar-sol: "#ffb81c"
  blanco-frio: "#f3f6fb"
  texto-secundario: "#c3cde6"
  texto-tenue: "#94a2c6"
  borde: "#2a3870"
  borde-fuerte: "#4a5a94"
  verde-mejor: "#3ddc84"
  rojo-peor: "#ff7b7b"
  claro-fondo: "#eef3fb"
  claro-panel: "#ffffff"
  claro-celeste-texto: "#0b5cad"
  claro-verde-mejor: "#0a7a2f"
  claro-rojo-peor: "#b3261e"
typography:
  display:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(2.5rem, 13.5vw, 4.5rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 7vw, 2.75rem)"
    fontWeight: 900
    lineHeight: 1
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 75"
  body:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.03em"
    fontVariation: "'wdth' 88"
rounded:
  r-1: "2px"
  r-2: "4px"
spacing:
  e-1: "4px"
  e-2: "8px"
  e-3: "12px"
  e-4: "16px"
  e-5: "24px"
  e-6: "32px"
  e-7: "48px"
  e-8: "72px"
components:
  placa:
    backgroundColor: "{colors.celeste}"
    textColor: "{colors.azul-noche}"
    height: "320px"
    padding: "24px 24px 0"
  boton:
    backgroundColor: "{colors.azul-panel}"
    textColor: "{colors.blanco-frio}"
    rounded: "{rounded.r-2}"
    padding: "5px 10px"
  boton-primario:
    backgroundColor: "{colors.ambar-sol}"
    textColor: "{colors.azul-noche}"
    rounded: "{rounded.r-2}"
  boton-elegido:
    backgroundColor: "{colors.celeste}"
    textColor: "{colors.azul-noche}"
    rounded: "{rounded.r-2}"
  barra:
    backgroundColor: "{colors.azul-barra}"
    textColor: "{colors.blanco-frio}"
    height: "48px"
  tarjeta:
    backgroundColor: "{colors.azul-panel}"
    textColor: "{colors.blanco-frio}"
    rounded: "0px"
---

# Design System: Primero los Datos

Los tokens viven en `:root` de `web/app/globals.css` (fuente de verdad). Este archivo explica cómo usarlos. Lo escribió la implementación del bloque 5e (2026-11-09) a partir de lo construido.

## Overview

**Creative North Star: "La Transmisión"**

Cada dato sale al aire como una placa de transmisión deportiva, y los presidentes se comparan como en una tabla de posiciones. Es el lenguaje gráfico que el público argentino lee todos los días sin pensarlo: una barra tipo marcador arriba, placas de color plano con un corte en diagonal, números enormes y condensados, y debajo, filas ordenadas.

El tono es tecnológico moderno, con energía. No tiene que parecer un banco ni un ministerio. El tema oscuro (azul noche) es la cara principal; el claro usa la misma barra, las mismas placas celestes y la misma jerarquía sobre un fondo frío claro.

**Key Characteristics:**
- Celeste y ámbar sobre azul noche: los colores de la bandera, no los de un partido.
- Planos, cortes en diagonal y líneas de 2 px. Radios de 2 y 4 px. Casi sin sombras.
- Una sola familia tipográfica, Archivo, de condensada negra a normal.
- Un dato por placa a todo el ancho; listas con líneas en vez de grillas de tarjetas iguales.
- Todo número muestra su tendencia: signo, texto y línea.

## Colors

Paleta comprometida: el celeste ocupa regiones enteras (placas, bloque de fuentes, pestaña del logo), no detalles sueltos.

### Primary
- **Celeste** (`--acento`, #6cc4ff): placas del carrusel, bloque "Todo tiene fuente", pestaña del logo, opción elegida (`.seg`, `.btn.on`) y pestaña actual del menú. El texto encima va siempre en azul noche (`--sobre-acento`). Como color de texto o link se usa `--acento-texto` (#6cc4ff en oscuro, #0b5cad en claro).

### Secondary
- **Ámbar sol** (`--accion`, #ffb81c): solo la acción principal de la pantalla (botón de buscar) y el foco del teclado en el tema oscuro.

### Neutral
- **Azul noche** (`--surface-0`, #0a1230): fondo. **Azul panel** (`--surface-1`, #121c44): tarjetas, tablas y controles. **Azul barra** (`--barra`, #060b20): barra y pie, iguales en los dos temas.
- **Blanco frío** (`--text-primary`, #f3f6fb), **secundario** (#c3cde6), **tenue** (#94a2c6): texto. Todos pasan AA sobre fondo y panel.
- **Borde** (#2a3870) y **borde fuerte** (#4a5a94): líneas divisorias y contorno de controles.
- Tema claro: fondo #eef3fb, panel #ffffff, texto #0a1230 / #37446b / #56638a.

### Verde y rojo
- **Verde = mejor, rojo = peor**, según la dirección efectiva de cada serie. Texto: `--bueno` / `--malo`.
- Fondos de celdas en 4 pasos de suave a fuerte (`--bueno-f1..4`, `--malo-f1..4`), cada uno con su color de texto (`--sobre-bueno-N`, `--sobre-malo-N`) con contraste AA. Los aplica `tinte()` y `tinteRelativo()` de `web/components/util.ts`. En el tema oscuro también se consiguió buen contraste, así que funciona igual: el paso 4 es el más luminoso.
- Dentro de una placa celeste, el verde o rojo van como texto sobre una etiqueta azul noche (`--placa-bueno`, `--placa-malo`).

### Series de los gráficos
- `--series-1` a `--series-8`, distintas entre sí en los dos temas; `--series-1` es el celeste. Los colores de cada presidente (`--pres-*`) salen de esas variables y los puede cambiar el usuario desde la configuración: no se pisan.

### Named Rules
**La ley de colores.** Verde y rojo solo significan mejor y peor. El ámbar solo marca la acción principal. Nunca se usan como adorno.

**Nunca solo color.** Lo bueno o malo siempre lleva el signo (+/−) o el texto de la variación.

## Typography

**Display y cuerpo:** Archivo (variable, con eje de ancho), servida desde el sitio con `next/font`. Respaldo: Arial Narrow, Arial.

**Character:** una sola voz. Condensada y negra en mayúsculas para titulares y números grandes, como una placa de TV; normal para leer. Archivo es de una fundición argentina (Omnibus-Type) y no está entre las sobreusadas que marca la guía de Impeccable.

### Hierarchy
- **Display** (900, ancho 75 %, `--t-titular`, 0,92): el mensaje de la apertura. Mayúsculas.
- **Headline** (900, ancho 75 %, `--t-seccion`): títulos de sección de la portada. Mayúsculas.
- **Title** (800, ancho 75 %, `--t-2xl`): título de cada página interna. Mayúsculas.
- **Cifra de placa** (900, ancho 68 %, hasta `--t-cifra` 5,5 rem): se achica sola según el largo del número para entrar en una línea. **Cifra de tarjeta**: `--t-cifra-tarjeta`, 800, ancho 88 %.
- **Body** (400, `--t-base` 15 px, 1,5): texto. Párrafos de hasta 60–72 caracteres.
- **Label** (700, `--t-xs`, mayúsculas, ancho 88 %): encabezados de tabla, rótulos de tarjetas de resumen.

### Named Rules
**Cifras tabulares.** `font-variant-numeric: tabular-nums` está en `body`: ningún número baila al cambiar.

**Un renglón.** Menú, botones, pestañas y títulos de tarjeta no se parten: `white-space: nowrap`. Los títulos de tarjeta que no entran se cortan con puntos suspensivos y muestran el nombre completo en `title`.

## Layout

- Ancho de página `--ancho-pagina` (1080 px) con 16 px de margen. La portada es a todo el ancho y cada sección usa `.ancho` adentro.
- Espacios: `--e-1` a `--e-8` (4 a 72 px). Entre secciones de la portada, `--e-8`; más aire arriba de un título que abajo.
- Apertura de la portada: una columna en celular; desde 900 px, titular a la izquierda y buscador a la derecha, para que las placas asomen en la primera pantalla.
- Barra fija arriba. En celular el logo va en una fila que se va al bajar y las 5 secciones quedan fijas (`--nav-h` 40 px); desde 768 px todo va en una fila de 48 px.
- Presidentes agrupa seis subsecciones: menú desplegable con mouse y pantalla ancha; segunda fila de pestañas en celular y pantallas táctiles.
- Cortes de pantalla: 640 px (chips en vez de tarjetas de resumen), 768 px (barra en una fila, temas en 3 columnas), 1024 px (gráficos de a dos).
- Filas que no entran (resumen de Histórico, subsecciones) se deslizan de costado con encastre y un fundido en el borde que indica que hay más (`data-mas`).

## Elevation & Depth

Plano por defecto. La profundidad se marca con tono (fondo → panel) y con líneas. Hay sombra solo en lo que flota sobre el contenido.

### Shadow Vocabulary
- **`--sombra-1`**: el cartel del gráfico al pasar por un punto.
- **`--sombra-2`**: ventanas, menú desplegable, listas de opciones y resultados de búsqueda.

## Shapes

- Radios chicos: `--r-2` (4 px) en controles y paneles, `--r-1` (2 px) en detalles. Las tarjetas con línea superior (`.plantilla`, `.curio`, `.tile`, `.chip`) van con esquinas rectas.
- **El corte**: una esquina cortada en diagonal. `--corte` (12 px) en la pestaña del logo; `--corte-placa` (28 px) en la esquina de las placas y en el borde superior del bloque de fuentes. Es la firma del sistema: se reserva para esos tres lugares.
- Líneas de `--linea` (2 px) para abrir una lista o tabla y marcar la pestaña actual; de 1 px para separar filas.
- Íconos dibujados en `web/components/Iconos.tsx`: trazo de 2 px, sin relleno, extremos rectos.

## Components

- **Barra** (`.barra`): azul barra con línea celeste abajo; logo en pestaña celeste cortada; pestaña actual con texto blanco y raya celeste de 3 px.
- **Placa** (`.placa`): celeste, 320 px de alto, esquina cortada. Título en mayúsculas, cifra gigante, contexto, fecha y fuente al pie, y la línea de la serie en azul noche de borde a borde.
- **Carrusel** (`.carrusel`): avanza una placa cada `--d-avance` (6 s). Los segmentos de arriba se llenan como reloj de partido y sirven para ir a cada placa. Se pausa con el mouse, el foco, un toque, el botón de pausa y fuera de pantalla.
- **Botones**: `.btn` (panel con borde), `.btn.primario` (ámbar: buscar en la portada, compartir en Histórico), `.btn.on` y `.seg button[aria-pressed="true"]` (celeste = elegido), `.btn.tinta` (azul noche, sobre celeste), `.btn-icono` (36 px).
- **Tarjeta** (`.plantilla`, `.curio`, `.tile`): panel plano de esquinas rectas con línea superior de 2 px; al pasar el mouse el borde pasa a celeste.
- **Fila de tema** (`.fila-tema`): renglón con nombre condensado y el dato principal; lista con líneas, no tarjetas.
- **Miniatura** (`svg.mini`): un solo color, el acento, o verde o rojo según la tendencia.
- **Tabla**: encabezados en mayúsculas chicas con línea fuerte abajo; números condensados al 88 %.

### Movimiento
- Duraciones `--d-1` (120 ms), `--d-2` (240 ms), `--d-3` (360 ms), `--d-dibujo` (900 ms); curva `--curva`.
- Las secciones de la portada suben 16 px y aparecen una vez (`Entrada`); los números cuentan una vez (`Contador`); las miniaturas se dibujan de izquierda a derecha. Nada se mueve en bucle salvo el carrusel.
- Con `prefers-reduced-motion` no hay animaciones, los números aparecen puestos y el carrusel queda quieto. Sin JavaScript todo se ve completo.

## Do's and Don'ts

- Sí: usar los tokens de `globals.css`. No dejar colores sueltos en los componentes.
- Sí: un dato por placa; listas con líneas para lo repetido.
- Sí: acompañar el verde o rojo con signo o texto.
- No: usar ámbar, verde o rojo como decoración.
- No: sumar una segunda familia tipográfica ni símbolos de texto como íconos.
- No: sombras blandas en tarjetas, esquinas muy redondeadas, degradados ni brillos.
- No: el corte en diagonal en cualquier tarjeta; es solo del logo, las placas y el bloque de fuentes.
