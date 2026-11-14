# Remodelación de UX/UI — Fase 1: auditoría y dirección

**Decidido por el usuario el 2026-11-13 (D-023)**: dirección aprobada; barra inferior en el celular; para tasas (C1/C2) **solo valor real** (sin "precio teórico"; la tabla muestra inicio, cierre y promedio). Sigue la Fase 2.

2026-11-13. Sin cambios de código. Marco: Impeccable (crítica con dos evaluaciones independientes) + recorrido propio.

## Cómo se hizo
- **Evaluación A (diseño)**: subagente aparte, recorrió 19 rutas con Playwright a 390 px y a 1280 px, con capturas por tramos, mediciones (desborde, objetivos táctiles, cajas anidadas) y lectura del código. Las capturas no están en el repo.
- **Evaluación B (detector)**: `impeccable detect` sobre `web/components` y `web/app`: 0 hallazgos estáticos. Overlay en el navegador: portada (h1 de 72 px en escritorio y palabras sueltas en el último renglón), cajas dentro de cajas en ficha, Presidentes y Gasto, y 50 textos de 11 px en Gasto. Ninguna ruta se desliza de costado a 375 px y no hay errores de consola.
- **Recorrido propio**: portada y ficha de inflación a 375 px. Leí el código del buscador (`Oraciones.tsx`), de Meses de mandato (`estadisticas.ts`, `ficha.ts`) y de Contexto. Revisé los datos de `precios_mundo.json` y del catálogo.

Puntaje de Nielsen: **21/40 (aceptable)**. El sitio es fuerte en datos, URL compartible y disciplina técnica; es débil en lenguaje (1), consistencia (1) y minimalismo (1).

## Diagnóstico en cinco líneas
1. **La identidad muere en la portada.** Placa celeste, corte y cifra gigante son propios. De Histórico para adentro todo es el mismo panel azul con borde de 1 px: hay al menos 16 variantes de "tarjeta" en `globals.css`. Lo genérico no son los radios (ya son de 2–4 px), es **la caja con borde alrededor de todo**.
2. **Todo pesa lo mismo.** El texto vive entre 11 y 17 px, con escalones de 1–2 px que no hacen jerarquía. Falta el tamaño intermedio de "cifra de página". En Histórico, la palabra "HISTÓRICO" es más grande que el nombre del dato.
3. **La configuración llega antes que la respuesta.** Por ejemplo: 9 controles antes de la primera barra en Gasto, el dato a 770 px en Provincias y la carne a 6.900 px en Contexto.
4. **Una misma idea, varias formas.** Hay 4 maneras de mostrar una variación, 3 de compartir (con 4 paneles de imagen copiados), 13 variantes de botón y la lista de barras copiada en 5 archivos.
5. **Hay dos visualizaciones que dicen algo falso o engañoso** (ver "Problemas conceptuales"). Van antes que cualquier pulido.

## Problemas conceptuales (necesitan tu decisión antes de tocarlos)

### C1. "Meses de mandato" en modo "precio teórico" con la inflación — engañoso
Fórmula (`calcularMandato`, `web/lib/estadisticas.ts:439-444`):
- **Series en nivel** (dólar, salario): `ancla × valor / valor del mes 0`. Cada presidente arranca desde el mismo número (el del mes 0 de Milei). Responde "si hubiera subido como con Macri, hoy estaría en X". Tiene sentido, pero "precio teórico" no lo explica.
- **Series en porcentaje** (inflación mensual): `valor − valor del mes 0 + ancla`. A la inflación de nov-23 (12,8 %) se le suma la diferencia de tasas de cada presidente. El resultado son líneas de Néstor, CFK y Macri entre 12 % y 22 % *mensual* durante todo el mandato. Esas tasas nunca existieron (Néstor rondaba 0,5–1 %). Lo vi en la ficha de inflación, que lo muestra por defecto.
- Además: el eje no tiene unidad; el ancla por defecto es Milei (todo se mide "con su vara"); el mes 0 es T-1, así que dic-23 es el mes 1 de Milei. La explicación está plegada y en jerga.

**Propuesta**:
- Para tasas mensuales, sacar el "teórico" y mostrar dos cosas: **inflación acumulada desde el mes 0** (se multiplica 1 + tasa: "a los 24 meses los precios habían subido X %") y, como alternativa, el **valor real de cada mes**.
- Para series en nivel, conservar el cálculo, pero llamarlo "Si todos arrancaran en el mismo punto", con unidad en el eje y una frase de ejemplo visible.

### C2. Tabla "Por presidente" de una tasa — mide otra cosa
Para la inflación mensual, "Variación" es la tasa del último mes menos la del primero (Milei −10,6 p.p.). Mide la aceleración entre dos meses sueltos, no cuánta inflación hubo. Es justo el número que se usa mal en una discusión.

**Propuesta**: para tasas, columnas Acumulada en el mandato · Promedio mensual · Último mes. Coincide con tus 4 métricas, con "acumulada" bien calculada. El cambio de tasa pasa a "más columnas".

### C3. La misma variable con dos números en la portada
- Actividad: 149,9 (nivel del índice) en la lista contra −1,7 % (interanual) en la placa.
- Reservas: 49.726 (promedio mensual, catálogo) contra US$ 49.586 millones (dato diario del parte).

**Propuesta**: cada fila dice qué medida es ("−1,7 % interanual") y usa la misma medida que la placa.

### C4. "Carne: 81, más barato" sin decir contra qué
La base 100 es el grupo de comparación y figura solo en la nota al pie.

**Propuesta**: decirlo en la frase ("X % más barata que el promedio del grupo") y usar verde/rojo con signo según la ley de colores, o un tono neutro, nunca naranja/celeste como si fuera mejor/peor.

### C5. Primer contexto de la inflación: "23,3 p.p. por debajo de su récord"
Para una variable donde más es peor, la referencia natural es "la más baja desde may-24". Ya existe la función que la calcula.

### Límites de los datos (para no prometer lo que no hay)
- **Carne vs. Europa**: hay niveles de precios relativos por rubro (Banco Mundial/ICP 2017 y 2021, llevados a cada mes con el IPC y el dólar), con *Carne*, *Pan*, *Leche*, *Frutas*, *Verduras* y la *Zona euro* (promedio de Alemania, Francia, Italia y España). **No hay precio en euros por kilo.** Se puede responder "la carne está X % más barata que en la zona euro (estimado)", no "cuesta € Y el kilo".
- **Relación con el salario**: el motor ya divide series (asado del INDEC / salario), así que "kilos de asado por salario" se puede mostrar. Comparar con salarios europeos no: no hay esa serie.
- **Fichas**: `/dato/<slug>/` existe para 28 datos fijos; el resto de las 578 series abre en Histórico. El buscador tiene que saber cuál de los dos ofrecer.
- **Núcleo, regulados y estacionales** existen (nacional): sirven para "variables relacionadas" en la ficha de inflación.
- **"Leyes laborales"**: no encontré esa sección en el sitio (sí Gobierno y Congreso: bancas, leyes, decretos y vetos). Confirmame a qué te referís.

## Diagnóstico por sección (lo más importante)

| Sección | Lo que pasa hoy | Prioridad |
|---|---|---|
| Buscador | Al escribir "inflación" salen primero 5 gráficos listos ("La inflación mensual más alta", "Aceite de girasol contra la inflación"…) y recién en el 6.º lugar la variable. Enter abre el primer gráfico listo. Las variables van a Histórico, no a la ficha. No busca fichas ni temas. No se puede mover con flechas. | P0 |
| Portada · placas | La etiqueta "+0,3 p.p." con fondo saturado es 1,8 veces más ancha que el valor que califica. La placa mide 400 px con ~90 px de hueco. Avanza sola mientras se lee. | P1 |
| Portada · temas | Cada fila tiene dos objetivos ("›" y "?") que llevan casi al mismo lugar. El "?" es un carácter usado como ícono. Medidas distintas a las de las placas (C3). | P1 |
| Portada · Banco Central | Caja grande con lista vertical: no se distingue del resto y la variación diaria ("−1,13 contra el día anterior") va sin unidad ni color. | P1 |
| Portada · Preguntale | 5 oraciones con 5 botones "Ver"; la respuesta no aparece ahí. | P2 |
| Portada · Armá tu consulta | 14 tarjetas iguales con "Abrir": repiten el menú, y "Gráficos listos" aparece dos veces seguidas. | P2 |
| Histórico | Título de la sección más grande que el dato. En escritorio, 7 comparaciones con la misma frase. Personalizar está bien resuelto en el celular, pero con textos técnicos. | P1 |
| Ficha (inflación) | No cuenta la historia: el interanual es una línea de texto, no está el mes anterior, falta "mismo mes en otros años", la tabla por presidente mide otra cosa (C2) y el gráfico por mandato engaña (C1). El tema Precios mide 4.800 px y tiene 25 cajas. | P0 |
| Presidentes | Tabla de 9 columnas: cada celda con color, minibarra y a veces "PEOR/MEJOR". A 390 px mide 687 px y la Variación queda fuera de pantalla. Tres niveles de menú antes del contenido. | P0 |
| Herencia | La columna "Cambio" queda fuera de pantalla en el celular; "−$ 105,9 M millones". | P1 |
| Ranking / Elecciones | Segs de 6–7 opciones partidos en 3 renglones; método en línea antes del resultado; aviso en caja roja (rojo usado como alarma). | P1 |
| Contexto | Página de 11.400 px que empieza con "sorpresas" del FMI. La pregunta que vos imaginás (la carne) está a 6.900 px y sin referencia (C4). | P0 |
| Gasto | 9 controles antes del primer dato; montos en "billones" acá y en "millones" en Universidades. | P1 |
| Provincias | Seg vertical roto, recuadro de alcance en línea, dato a 770 px. | P1 |
| Semáforo / BCRA / Congreso / Gráficos listos / Fuentes | Andan, pero con cajas anidadas; 12 chips en 5 renglones en Gráficos listos; Fuentes es un muro de texto sin un solo link y con nombres internos de las APIs. | P2 |
| Todo el sitio | Objetivos táctiles de 18–32 px (ⓘ de 18, compartir de 32, botones de 31). La animación de entrada deja las secciones invisibles hasta que se ven (las capturas de página completa salen vacías). | P1 |

## Dirección de diseño propuesta: "La Transmisión", página editorial

No cambia el mundo: se lleva **adentro**. Hoy la portada es transmisión y las páginas internas son un tablero genérico. La propuesta es que todo el sitio se lea como un **especial de datos de un medio que sale al aire**: el lienzo azul noche ordenado por tipografía y líneas, placas de color plano solo donde está *el* dato, y gráficos integrados al texto, no metidos en cajas.

### Se conserva
Paleta completa (celeste, ámbar, azul noche, verde/rojo con signo), Archivo condensada/normal, el corte en diagonal como firma, la barra-marcador, el carrusel de placas, la ley de colores, los tokens de espacio y movimiento, todas las URLs y parámetros.

### Cambia (principios)
1. **Sin caja por defecto.** El contenido va sobre el fondo, separado por espacio y líneas de 1–2 px. Los bordes quedan para lo que flota (ventanas, menús) y para objetos que se pueden tocar. Meta: de 16 variantes de tarjeta a 3 (placa, lámina de gráfico, hoja flotante).
2. **Una respuesta por pantalla, arriba.** Cada página abre con su respuesta en lenguaje llano y una cifra grande: "En 2025 la Nación gastó $ X; Y de cada 100 fueron jubilaciones" (cifras de ejemplo). Después, la exploración.
3. **Jerarquía de 4 voces**: cifra (placa 88 px / página 56–72 px), titular condensado, texto de 15–17 px, rótulo de 12–13 px. Se eliminan los escalones de 11 px salvo en ejes.
4. **Una sola forma de decir "cambió"**: el componente `Delta` (▲/▼ + valor + unidad en color de texto, 13 px, peso 600, referencia en gris: "▲ 0,3 p.p. vs sep"). Sin fondo de color. Reemplaza las pastillas, las frases repetidas y las marcas "PEOR/MEJOR" con borde.
5. **Configuración a demanda.** Una barra de chips que resume la vista ("Mensual · 2003–hoy · Sin región ⚙") y abre una hoja: abajo en el celular, al costado en la computadora. Las advertencias van detrás de ⓘ de 44 px; la metodología, plegada al final; nada de párrafos de método antes del dato.
6. **Movimiento que explica.** Las líneas se dibujan, las barras crecen desde su base de a una (30 ms entre barras), los números cuentan al cambiar de vista y los ejes se acomodan con transición de 240 ms al pasar de mensual a interanual. Todo una sola vez y respetando "reducir movimiento". **El contenido ya no arranca invisible**: lo que se anima son los gráficos y las cifras, no los bloques.

### Navegación (propuesta propia, mobile first)
En el celular, **una barra inferior para el pulgar**: Inicio · Buscar · Histórico · Presidentes · Más. "Buscar" abre un buscador a pantalla completa desde cualquier página. "Más" es una hoja con todas las secciones en 4 grupos (Comparar presidentes · Argentina y el mundo · El Estado por dentro · Herramientas). Arriba queda solo la marca, que se va al bajar.

Esto resuelve tres pedidos tuyos a la vez: llegar a Contexto y a las herramientas sin volver al inicio, buscar desde cualquier lugar y liberar los ~200 px que hoy ocupan tres niveles de menú. En la computadora sigue la barra de arriba, con el buscador en la barra.

### Componentes compartidos nuevos (Fase 2)
| Componente | Reemplaza | Dónde se usa |
|---|---|---|
| `CabeceraDato` (sobretítulo · nombre del dato como h1 · cifra · 2–3 `Delta` · frase automática · minigráfico) | Cabeceras sueltas de Histórico, ficha, temas | Histórico, ficha, temas, BCRA |
| `Delta` | `.placa-var`, `.vs-frase`, `.marca-ext`, `.tile .d` | Todo el sitio |
| `BarraVista` + `Hoja` (chips que resumen + hoja de ajustes) | Filas de seg/selectores sueltas, Personalizar | Histórico, Presidentes, Gasto, Provincias, Contexto, Ranking |
| `FilaChips` (un renglón deslizable, con fundido) | Segs de 5+ opciones que se parten | Gráficos listos, Ranking, Elecciones, Contexto |
| `ListaBarras` (horizontal, con opción divergente, crece al entrar) | 5 copias en Gasto, Provincias, Cuentas, Universidades, Congreso | Esas 5 + Ranking + Contexto |
| `TablaMandatos` (4 columnas por defecto, "Más columnas", filas apiladas en el celular) | Tablas de Presidentes, ficha, Herencia, Contexto | Esas 4 |
| `Lamina` (miniatura de gráfico como objeto: gráfico real sin ejes, cifra en la esquina, título abajo, sin borde) | `.plantilla`, `.curio` | Gráficos listos, portada, fichas, Histórico |
| `Compartir` (una hoja: Imagen · Link · Texto) | 3 patrones y 4 paneles de imagen | Todo lo que se comparte |
| `InfoPunto` (ⓘ de 44 px con globo) y `Metodologia` (plegado al final) | `.info-btn` de 18 px, `.btn-info`, avisos en línea | Todo el sitio |
| `Seccion` (sobretítulo + titular + línea de 2 px, sin caja) | `.card` como contenedor de bloque | Todo el sitio |

## Propuesta por sección

**Inicio.**
- El titular baja a 3 renglones en el celular y el buscador pasa a ser el protagonista, con chips debajo de lo más buscado (Inflación, Dólar blue, Salario, Pobreza, Riesgo país) que abren la ficha.
- Las placas se quedan, con `Delta` en vez de pastillas, alto según el contenido y el minigráfico ocupando el hueco. En el celular se desliza con el dedo y no avanza sola; en la computadora sí.
- "¿Qué datos te interesan?" pasa a ser una lista: cada fila entera se toca, lleva el dato con su medida, un minigráfico y una línea que la describe, sin "?".
- **Banco Central** como **zócalo de transmisión**: una franja azul barra con 4–6 valores del día al estilo marcador (dólar, reservas, tasa, base), cada uno con su `Delta` y su fecha; se desliza en el celular. Es el único lugar "en vivo" de la portada y tiene que verse así.
- **Preguntale**: una oración a la vez, con las palabras para elegir; la respuesta (cifra + minigráfico) se arma debajo, en el lugar, al cambiar una palabra. Chips arriba para cambiar de pregunta y un "Ver completo" para ir a la página.
- **Armá tu propia consulta** pasa a ser **un índice editorial** en 4 grupos (las mismas 13 secciones), con filas de nombre + una línea + flecha; 2–3 columnas en la computadora. Se saca la tarjeta duplicada de Gráficos listos.
- Gráficos listos destacados, como `Lamina` en una fila deslizable.

**Buscador.**
- Un solo orden: (1) la variable o el dato que coincide por nombre público o sinónimo (`nombres.ts`), con la cifra en vivo dentro del resultado; (2) fichas relacionadas; (3) gráficos listos; (4) secciones y temas.
- Enter abre el primero.
- Se maneja con flechas (`listbox`).
- Lleva a la ficha si existe y, si no, al Histórico.
- Sin escribir, muestra los más buscados.

**Ficha de un dato (inflación como modelo).** Una historia en capítulos cortos, cada uno con su título en forma de pregunta:
1. **Ahora**: la cifra, ▲/▼ contra el mes anterior, contra un año atrás, el interanual, y una frase automática con hechos ("La más baja desde may-24"). Sin juicio (D-012).
2. **Cómo viene**: gráfico con Mensual / Interanual en el gráfico mismo y período 1 año · 5 años · Todo; los ejes se acomodan con transición.
3. **¿Fue un buen octubre?**: barras con todos los octubres desde que hay datos, el actual resaltado y su lugar en la lista ("el N.º más bajo de M").
4. **Con cada presidente**: barras de acumulada y promedio mensual por mandato, que crecen de a una; tocando un presidente se ve su recorrido mes a mes, con valores reales (C1 y C2).
5. **Relacionadas**: núcleo, regulados y estacionales como chips arriba de todo ("Ver también") y como gráficos chicos en el capítulo.
6. Gráficos listos en `Lamina`. 7. Metodología y fuente, plegadas.

**Histórico.** El nombre del dato como h1 en `CabeceraDato`; 2 comparaciones a la vista y "Más comparaciones" como tabla compacta; `BarraVista` en vez de la fila de controles; Personalizar como `Hoja` (ya está cerca). Gráficos listos en `Lamina`.

**Presidentes.**
- `TablaMandatos`: Presidente · Inicio → Cierre · Variación (o acumulada, si es tasa) con barra divergente · Promedio; lo demás en "Más columnas".
- En el celular, filas apiladas: nombre y período a la izquierda, variación grande a la derecha, inicio → cierre debajo.
- Para explorar **varias variables por presidente**: una grilla de presidentes × 6–8 variables clave, con una celda de color con signo por cada una. Se lee como tabla de posiciones y cada celda abre el dato.

**Contexto.**
- Abre con **una pregunta respondida**: "¿La carne es cara en la Argentina?". Barra divergente de Argentina contra cada país o grupo, centrada en "igual que el promedio", con la Zona euro destacada.
- Debajo, "Con un salario se compran X kg de asado" (relación de series del INDEC que ya existe).
- Las palabras de la pregunta se pueden cambiar: carne → pan, leche…; Europa → región, vecinos.
- Después, un índice fijo arriba con los cuatro contextos (Precios en el mundo · Crecimiento contra el mundo · Lo esperado y lo que pasó · Viento de cola), cada uno abriendo con su frase-respuesta. Las "sorpresas" del FMI, plegadas.

**Herramientas.**
- **Gasto**: arranca con la frase y la cifra del año; abajo, `ListaBarras` que se abre hacia adentro (Para qué → Quién → Programa). Suma un gráfico de **evolución 2018–2026 por finalidad** (área o barras apiladas en pesos de hoy) donde tocar una finalidad la sigue en el tiempo. Año y medida, en `BarraVista`.
- **Provincias**: frase-respuesta ("La que más recibe por habitante es X"). **Mapa de mosaico** de las 24 jurisdicciones (SVG propio, sin librerías) coloreado por gasto por habitante, junto al ranking en `ListaBarras`; tocar una provincia la abre. Evolución en el detalle.
- **Universidades, Semáforo, BCRA, Congreso, Elecciones**: el mismo sistema (frase-respuesta, `ListaBarras`/`TablaMandatos`, ⓘ en vez de avisos en caja, `FilaChips`).
- **Fuentes**: lista por organismo con link, frecuencia y fecha del último dato; los detalles técnicos, plegados.

## Dónde no coincido con el pedido (y por qué)
- **"Interpretación breve" del indicador**: sí, pero solo hechos calculados (posición histórica, dirección, racha), nunca adjetivos. "Sin opinión" es parte del producto (D-012) y una interpretación libre lo rompe.
- **Selectores visuales en vez de desplegables**: sí para hasta ~6 opciones. Para elegir una de 578 series, lo mejor sigue siendo buscar; un selector visual ahí empeora.
- **Animar todo**: no. Lo que se anima son los datos (líneas, barras, cifras, ejes). Las entradas de bloques al bajar se sacan: hoy esconden contenido y hacen sentir lenta la página.
- **Carrusel que avanza solo**: lo dejaría solo en la computadora. En el celular compite con la lectura (se mueve mientras alguien lee el valor).

## Plan de etapas
| Fase/etapa | Qué incluye | Se valida con |
|---|---|---|
| **2 · Sistema** | Tokens de jerarquía (4 voces), `Delta`, `Seccion`, `InfoPunto`, `FilaChips`, `Hoja`/`BarraVista`, `Lamina`, `ListaBarras`, `TablaMandatos`, `Compartir`; movimiento; barra inferior. Página de muestra `/sistema/` (no indexada) con cada componente en los dos temas, a 375 y 1280 px. | Te muestro la página de muestra antes de aplicar nada. |
| **3.1 · Inicio y buscador** | Todo lo de arriba de Inicio y Buscador. | 375/768/1280, dos temas, teclado, reducir movimiento. |
| **3.2 · Fichas** | Ficha en capítulos; C1 y C2 (si los aprobás). | Cuentas contra la tabla actual, imágenes compartibles. |
| **3.3 · Histórico y Presidentes** | Cabecera, comparaciones, BarraVista, TablaMandatos, grilla de presidentes × variables. | Links viejos con todos sus parámetros. |
| **3.4 · Contexto** | Pregunta-respuesta, índice, plegados. | Que cada cifra salga de `precios_mundo.json`. |
| **3.5 · Herramientas** | Gasto, Provincias (mosaico), Universidades, Semáforo, BCRA, Congreso, Elecciones, Gráficos listos, Fuentes. | Barrido de todas las rutas. |

Cada etapa sigue el flujo de CLAUDE.md: spec en `docs/specs/remodelacion-<etapa>.md`, subagentes por archivos, build, navegador a 375 y 1280 px, `revisor`, `impeccable detect`, y te la presento. **No paso a la siguiente sin tu aprobación.**
