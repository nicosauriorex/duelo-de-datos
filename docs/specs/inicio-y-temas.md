# Inicio y búsqueda guiada

## Objetivo
Que alguien que entra por primera vez entienda en segundos qué es la página y llegue al dato que busca sin conocer los nombres técnicos. "/" deja de mandar a Histórico y pasa a ser una portada con cifras en vivo, los temas y una búsqueda guiada con oraciones para completar. Cada tema tiene su página con la explicación, los indicadores principales, todos sus datos, cómo le fue a cada presidente y sus plantillas.

## Qué ve y hace el usuario
1. Entra a primerolosdatos.com.ar. Arriba ve el nombre, una frase de para qué existe la página y **4 cifras grandes** que se actualizan solas (ej. "Inflación de octubre: 2,3 %", "Kilos de asado por salario: 132").
2. Debajo, **¿Qué querés ver?**: tarjetas de los temas (Precios e inflación, Salarios, Dólar, Actividad económica…), cada una con un **(?)** que abre una explicación corta.
3. Debajo, **Preguntale a los datos**: oraciones con huecos, por ejemplo "¿Cuánto **asado** compra un **salario mediano**?". Toca "asado", elige "yerba" en la lista, toca **Ver** y se abre el gráfico en Histórico.
4. También puede escribir libre ("alquiler", "dólar blue Macri"): aparecen plantillas y variables que coinciden; Enter abre la primera.
5. Toca el tema **Actividad económica** y llega a `/tema/actividad/`: explicación corta con "ver más", los indicadores principales (EMAE, PIB, PIB por habitante…) con valor y minigráfico, los subgrupos (Cuentas nacionales, Consumo…) que se despliegan con todas sus series, una tabla de cómo le fue a cada presidente en el EMAE y las plantillas del tema.
6. Toca una serie de un subgrupo y se abre en Histórico.
7. Más abajo en la portada: plantillas destacadas y un bloque corto "Por qué existe esta página", con link a Fuentes.

## Requisitos

### Portada (`/`)
1. "/" muestra la portada. Se sacan la redirección a `/historico/` (`web/app/page.tsx`) y la regla `/ /historico/ 302` de `web/public/_redirects`.
2. Navegación: **Inicio** pasa a ser la primera pestaña; el nombre del sitio en el encabezado lleva a "/". Las demás pestañas no cambian.
3. `metadata` propia: título "Primero los Datos — datos económicos de Argentina" y una descripción para buscadores.
4. Orden de la portada: cifras en vivo → ¿Qué querés ver? (temas) → Preguntale a los datos (oraciones y buscador) → Plantillas destacadas (6) → Por qué existe esta página.
5. A 375 px se lee sin zoom ni scroll horizontal y las cifras entran de a dos por fila.

### Cifras en vivo
6. Cuatro cifras, cada una con número grande, una línea de contexto y la fecha del dato:
   - Inflación del último mes (y la interanual en la línea de contexto).
   - Salario mediano real: dónde está contra su récord.
   - Kilos de asado que compra un salario mediano.
   - Dólar blue en pesos de hoy, con la variación contra hace un año.
7. Salen de las mismas plantillas curadas que ya existen (`web/lib/plantillas.ts`): mismo cálculo, mismo texto corto. Cada cifra es un link a su plantilla en Histórico.
8. Las variaciones usan los colores verde/rojo/gris según `dir`, como en Histórico.
9. Mientras cargan los datos se ve un espacio reservado del mismo alto (sin saltos). Si una cifra no se puede calcular, no se muestra (no se ve un "–" grande).

### Temas
10. Nueve temas, cada uno con su slug, nombre, categorías del catálogo que junta, texto corto (de `INFO_CORTA` en `web/lib/info.ts`) y texto largo (`INFO_CAT`):

    | Slug | Nombre | Categorías (`cat[0]`) | Principales (2–4) |
    |---|---|---|---|
    | `precios` | Precios e inflación | Precios | Inflación mensual, inflación interanual, productos que más subieron contra la inflación |
    | `salarios` | Salarios y jubilaciones | Salarios | Salario SIPA mediana real, salario mínimo real, jubilación mínima con bono real, índice de salarios INDEC real |
    | `dolar` | Dólar | Dólar y tipo de cambio | Dólar blue y oficial en pesos de hoy, brecha blue |
    | `actividad` | Actividad económica | Actividad | EMAE, PIB real, PIB real por habitante, producción industrial |
    | `empleo` | Empleo y pobreza | Empleo, pobreza e ingresos | Desocupación, pobreza, indigencia, empleo privado registrado |
    | `externo` | Comercio exterior | Sector externo | Saldo comercial % PIB, cuenta corriente % PIB, exportaciones |
    | `fiscal` | Cuentas públicas | Fiscal | Resultado primario % PIB, resultado financiero % PIB |
    | `finanzas` | Dinero, tasas y mercados | Dinero y bancos (BCRA), Tasas de interés, Mercados | Reservas en dólares reales, riesgo país, tasa de plazo fijo real |
    | `opinion` | Opinión pública | Opinión pública (UTDT) | Confianza del consumidor, confianza en el gobierno |

    La definición vive en un solo lugar (`web/lib/temas.ts`). Si una serie principal no está en el catálogo, se omite.
11. En la portada, cada tema es una tarjeta con nombre, texto corto y el valor del primer indicador principal. El **(?)** abre un popup chico con el texto corto y "ver más" (texto largo), sin salir de la portada. Tocar el resto de la tarjeta lleva a la página del tema.

### Página de tema (`/tema/<slug>/`)
12. Una página estática por tema (`generateStaticParams` con los 9 slugs), con `metadata` propia (título "Actividad económica · Primero los Datos" y descripción del tema).
13. Contenido, en este orden:
    1. Título y texto corto; "ver más" despliega el texto largo.
    2. **Principales**: tarjetas con valor, fecha, variación contra hace un año (verde/rojo/gris) y minigráfico. Cada una abre Histórico con ese indicador.
    3. **Todos los datos**: los subgrupos del tema (`cat[1]`) como bloques plegados, con la cantidad de series. Al desplegar, la lista de series (nombre y unidad, con el botón de información que ya existe). Tocar una abre Histórico con esa serie y su medida por defecto. Las series sin subgrupo van en "Generales". En Precios, los subgrupos con más de 30 series se despliegan por niveles (región, rubro), igual que en el selector de variables.
    4. **Por presidente**: tabla con el primer indicador principal: presidente, inicio, cierre y variación, con el inicio del mandato de la configuración global. Link "Ver todos los indicadores por presidente" a `/presidentes/` con ese indicador elegido.
    5. **Plantillas del tema**: las tarjetas de plantillas de los grupos que corresponden al tema (mismo componente que en Plantillas), hasta 8, con "Ver todas" que lleva a `/plantillas/` con el tema buscado.
14. Las secciones 2, 4 y 5 bajan solo los datos del tema (carga por categoría que ya existe).

### Preguntale a los datos
15. Cinco oraciones con huecos. Cada hueco es un botón con el valor actual subrayado; al tocarlo se elige otro valor (con el desplegable propio o, para listas largas, el selector de variables filtrado). Un botón **Ver** abre el resultado.

    | Oración | Huecos | Abre |
    |---|---|---|
    | ¿Cuánto **[asado]** compra un **[salario mediano]**? | producto, canasta o dólar · salario SIPA mediana o promedio, salario mínimo, jubilación mínima, RIPTE | Histórico, el primero "en términos de" el segundo |
    | ¿Cómo le fue a **[la inflación]** con **[Milei]**? | indicador principal de cualquier tema · presidente | Por presidente con ese indicador y ese presidente |
    | ¿Cómo cambió **[el salario real]** desde **[2017]**? | indicador principal · año (1995 a hoy) | Histórico con ese indicador desde enero de ese año |
    | ¿Cuánto vale **[el salario mediano]** en **[dólares blue]**? | monto en pesos (salarios, canastas, productos) · pesos de hoy, dólares oficial/blue/MEP/CCL | Histórico con esa medida |
    | ¿Qué subió más: **[la carne]** o **[los alquileres]**? | dos precios (productos o rubros del IPC) | Histórico en base 100, los dos contra la inflación |

16. Los valores iniciales de cada oración son los del ejemplo. Las oraciones se ven completas a 375 px (pueden ocupar dos líneas).
17. Caja **Buscar** debajo: busca en plantillas (título, descripción, etiquetas) y en variables del catálogo (`textoBusqueda`, con sinónimos), sin importar tildes. Muestra hasta 5 plantillas y 5 variables; Enter abre la primera. Una variable se abre en Histórico con su medida por defecto.
18. Sin resultados: "No encontramos "<texto>". Probá con otra palabra o mirá los temas".

### Por qué existe esta página
19. Un bloque corto (3–4 líneas): datos oficiales, sin opinión, para que cualquiera pueda chequear lo que se dice de la economía; todo se actualiza solo cada día. Link a Fuentes.

## Datos
No hay series nuevas. Archivos nuevos: `web/lib/temas.ts` (definición de los 9 temas), `web/app/tema/[slug]/page.tsx`, componentes de portada y de tema. Las oraciones viven en `web/lib/oraciones.ts`. Reusar `INFO_CORTA`, `INFO_CAT`, `crearPlantillas`, `tablaDesempeno` y la carga por categoría que ya existen; no duplicar cálculos.

## Casos borde
- Links viejos a "/" con parámetros (`/?v=...`) de la página vieja: si "/" trae parámetros de Histórico, se redirige a `/historico/` con esos parámetros (no se pierden links compartidos).
- Tema cuyo indicador principal no tiene datos o no se pudo bajar: la tarjeta no aparece; si no queda ninguno, la sección Principales no se muestra.
- Oración con un hueco que queda sin datos (ej. un producto discontinuado): igual abre Histórico, que muestra "Sin datos para esta selección".
- "¿Cómo le fue a [X] con [presidente]?" con un presidente sin datos de ese indicador: Por presidente lo muestra sin datos, como hoy.
- Búsqueda de una sola letra: no busca hasta 2 caracteres.
- Opinión pública y otros temas con pocas series: la página se ve igual, con menos bloques.

## Fuera de alcance
- Fotos de presidentes o un "cara a cara" en la portada.
- Subgrupos que hoy no existen en el catálogo (agro, minería, industria por rama): hacen falta series nuevas (anotado en IDEAS.md).
- Contexto internacional, proyecciones, comparación con otros países (bloque 6).
- Interpretar frases libres con IA ("¿Milei fundió la economía?"); la caja solo busca palabras.
- Cambios de diseño visual generales.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores; `web/out/tema/<slug>/index.html` existe para los 9 temas.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - "/" muestra la portada (no redirige); Inicio es la primera pestaña; el nombre del sitio lleva a "/".
   - Las 4 cifras con valores que coinciden con sus plantillas en Histórico; tocar una abre la plantilla.
   - Temas: el (?) abre el popup sin navegar; la tarjeta lleva a la página del tema.
   - Página de Actividad: principales con valores, subgrupos que se despliegan, tabla por presidente (cambiar el inicio de mandato en ⚙ cambia los valores), plantillas del tema.
   - Página de Precios: los subgrupos grandes se despliegan por niveles sin trabar el celular.
   - Las 5 oraciones: cambiar los huecos y tocar Ver abre lo que dice la tabla (comprobar una por una).
   - Buscar "alquiler", "carne", "blue": resultados de plantillas y variables; Enter abre el primero.
   - En la pestaña de red: la portada no baja todo el catálogo de datos de golpe.
3. Un link viejo `/?v=...` termina en Histórico con la misma vista.
