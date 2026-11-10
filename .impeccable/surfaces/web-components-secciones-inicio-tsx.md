---
version: 1
slug: "web-components-secciones-inicio-tsx"
primary_target: "web/components/secciones/Inicio.tsx"
related_targets: ["web/app/page.tsx","web/app/globals.css","web/app/layout.tsx"]
---

# Portada (Inicio)

Modo: Persuade. Las páginas internas (Histórico, Presidentes, Contexto, Plantillas, temas) son Operate y heredan el mundo con menos volumen.

Público: gente que discute economía en redes, desde el celular. Trabajo: encontrar un dato, entenderlo y llevarse el link. Acción principal: buscar un dato (el buscador de la apertura). Prueba: las cifras reales en vivo y las fuentes oficiales.

Restricciones: spec docs/specs/diseno-visual.md. No cambian funciones, cálculos, URLs ni textos de los datos. Tema oscuro principal y claro igual de cuidado. Sin logo, fotos ni ilustraciones.

## Direction contract

THESIS: Cada dato sale al aire como una placa de transmisión deportiva y los presidentes se comparan como en una tabla de posiciones. Rechaza la grilla de tarjetas grises iguales del panel de datos.

OWN-WORLD: fondo azul noche; celeste de la bandera en placas planas que ocupan regiones enteras, con un borde cortado en diagonal; ámbar sol solo para la acción principal; blanco frío para el texto. Verde y rojo reservados para mejor y peor. Una sola familia, Archivo, de condensada negra en títulos y numerales a normal en el texto. Barra superior tipo marcador con el nombre en una pestaña celeste cortada. Sin sombras blandas ni esquinas muy redondeadas: planos, cortes y líneas de 2 px.

STORY: entiende que acá se chequea un dato con fuente; cree porque ve cifras reales y de dónde salen; busca un dato o toca una placa y llega al Histórico.

FIRST VIEWPORT: a 390 px, barra marcador de 44 px; título en mayúsculas condensadas de ~58 px en cuatro renglones con la última frase en celeste; bajada de 17 px; buscador claro de 52 px con botón ámbar a la derecha; abajo, la primera placa celeste con corte diagonal asomando, con el numeral de la inflación a ~100 px, su contexto, la fuente y la línea dibujada al pie.

FORM: gráfica de transmisión deportiva, candidato 3 de la lista propia. seed:6f7217a739727fb5. Interacción firma: el carrusel de placas con segmentos de avance arriba, que se llenan como reloj de partido y se pausan al tocar. Movimiento: las placas entran deslizando desde el corte, los numerales cuentan y la línea se dibuja de izquierda a derecha, una vez.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
