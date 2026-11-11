# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Público general de Argentina que discute economía en redes o en un grupo. Llega desde el celular, casi siempre por un link que alguien pegó en una discusión, y quiere chequear un dato rápido, compararlo y volver a compartirlo. No es especialista: no conoce las siglas ni las fuentes.

Uso secundario: quien se queda a explorar en la computadora (Histórico, Por presidente, Contexto) con varias series y filtros.

## Product Purpose

Primero los Datos muestra datos económicos de Argentina (precios, salarios, dólar, actividad, empleo, pobreza, dinero, fiscal y sector externo) tomados de fuentes oficiales y actualizados solos todos los días. Existe para que la economía se discuta con datos y no con sensaciones.

Funciona cuando alguien encuentra el dato que buscaba, lo entiende sin ayuda y se lleva una imagen lista para pegar en una discusión, o un link que muestra exactamente lo mismo a quien lo abra.

## Positioning

- **Comparar entre presidentes**: cada dato se puede ver por mandato, con ranking y meses de mandato contados desde el mismo punto.
- **Todo se comparte como imagen o por link**: cada dato arma una imagen con su cifra, su contexto, su gráfico y su fuente (cuadrada, vertical u horizontal); la URL guarda la vista exacta (series, medida, período, filtros).

Además, sin opinión: solo el dato, con su fuente siempre a la vista. Las imágenes no llevan veredicto y usan palabras neutras (D-012).

## Operating Context

- Entrada típica: un link en X, WhatsApp o Instagram, abierto en el celular.
- Secciones: Inicio, Histórico, Presidentes (Por presidente, Ranking, Meses de mandato, Elecciones, Congreso), Contexto internacional, Gráficos listos (antes Plantillas; la dirección sigue siendo `/plantillas/`), páginas de tema y Fuentes. Curiosidades sigue existiendo pero no está en el menú.
- Los datos se leen con contexto cotidiano: "kilos de asado por salario", "en pesos de hoy", "contra su récord de jul-15", "el valor más bajo desde may-24".
- Los nombres son los del público ("Salario mediano (trabajadores registrados)"), no los del catálogo; el nombre técnico queda en la ficha de cada dato.

## Capabilities and Constraints

- Sitio estático (Next.js con export estático), sin servidor ni cuentas por ahora. Usuarios, comentarios y votos están en el roadmap, no existen todavía.
- Los datos llegan como JSON generados por un pipeline; la portada no baja el catálogo completo (D-007).
- El estado de los filtros vive en la URL; las URLs existentes no cambian.
- Configuración del usuario en el navegador (`pld:config`): tema, dólar y medida preferidos, inicio del mandato, colores de cada presidente.
- Todo en español; números en formato es-AR.
- Ningún id de serie ni parámetro de URL cambia de significado: los links ya compartidos siguen mostrando lo mismo.

## Brand Commitments

- Nombre: **Primero los Datos**. Lema: "Datos de Argentina, en debate."
- Tono pedido por el usuario: **tecnológico moderno**, con el tema oscuro como cara principal y un tema claro igual de cuidado.
- No tiene que parecer un banco ni un ministerio: nada frío, institucional o aburrido.
- Sin opinión ni lectura partidaria de los datos. Los colores de cada presidente los elige el usuario y no se pisan.
- Verde = mejor, rojo = peor, en todo el sitio, siempre acompañado de signo o flecha.
- No hay logo profesional todavía (queda para el bloque 7); tampoco ilustraciones ni fotos.

## Evidence on Hand

- Series oficiales reales: INDEC, BCRA, Secretaría de Trabajo, Bolsa de Comercio de Rosario y otras (detalle en `/fuentes/` y `web/lib/fuentes.ts`).
- Cifras en vivo de la portada: inflación del último mes, salario mediano contra su récord, actividad económica (interanual) y dólar blue en pesos de hoy.
- No hay testimonios, cifras de uso ni menciones de prensa: no inventarlos.

## Product Principles

1. El dato primero: el número y su contexto se ven antes que cualquier adorno.
2. La fuente siempre a la vista.
3. Lo que se ve se puede compartir tal cual, como imagen o con un link.
4. Se entiende sin saber economía: nombres cortos, comparaciones cotidianas.
5. El celular es la pantalla principal.

## Accessibility & Inclusion

- Contraste AA (4,5:1 en texto) en los dos temas.
- Lo bueno o malo no se comunica solo con color.
- Se respeta "reducir movimiento": sin animaciones y con los números ya puestos.
- Todo se puede recorrer con teclado, con foco visible.
