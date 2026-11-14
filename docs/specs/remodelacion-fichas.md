# Remodelación, etapa 3.2: fichas de indicadores

Estado: implementada en local (2026-11-13), sin commitear; falta la aprobación del usuario. Sale de `docs/AUDITORIA-DISENO-2026-11-13.md` (sección "Ficha de un dato", C1, C2 y C5), D-023 y el sistema de `docs/specs/remodelacion-sistema.md` (componentes en `web/components/sistema/`).

## Objetivo
Que la ficha de un dato (`/dato/<slug>/`, `/dato/?v=…` y la ficha dentro de cada tema) cuente su historia en capítulos cortos, cada uno con su pregunta, y que deje de mostrar dos números engañosos con las tasas: el "precio teórico" de Meses de mandato (C1) y la "variación" entre dos meses sueltos como dato principal de la tabla por presidente (C2). Ninguna URL cambia de significado: los links compartidos siguen abriendo el mismo dato.

## Qué es una "tasa" en esta spec
Una serie con `c.pct` verdadero (inflación mensual, interanual, desempleo, pobreza, tasas de interés, brecha…). "Variación mensual" es, además, `e.med === "vm"` (la tasa de cambio de un índice mes a mes: ahí se puede acumular).

## Requisitos

### R1. Cálculos puros de la ficha (`web/lib/ficha.ts`)
Funciones sin React, que la ficha y la imagen usan igual. Las cuentas cierran con los valores que se muestran (`redondeadoComo`, `r1`).
- `cabeceraFicha(m, e)`: `{ cifra, fecha, deltas, secundarias, frase, ultimoDisponible }`.
  - `cifra` y `fecha`: los de `contextoDato(m, e)`.
  - `deltas`: contra el mes (o período) anterior y contra un año atrás, con `comparaciones(m, plantillaSuelta(...))` de `lib/plantillas.ts`, como arma `deltaDe` la página de muestra (`Sistema.tsx`). Cada uno con su `contra: "vs <fecha>"`, tono y dirección.
  - `secundarias`: si `e.med === "vm"` y la misma serie tiene medida interanual, `[{ rotulo: "Interanual", valor }]` (el último dato de `{ ...e, med: "via" }`); si no, vacío.
  - `frase`: un hecho que los deltas no dicen, en este orden de preferencia: "desde" (el más alto o más bajo desde…), "record", "minimo" de `contextoDato(...).todas`. Para una serie donde más es peor (`c.dir < 0`) se prefiere la frase "el más bajo desde…" a la de la distancia al récord (C5). Nunca adjetivos (D-012).
- `mesesIguales(m, e)`: todos los valores del mismo mes calendario que el último dato (todos los octubres, si el último es octubre), del más viejo al más nuevo: `{ mes: "octubre", filas: { anio, valor, texto, actual }[], puesto, de, frase }` o `null` si la serie no es mensual (`frecuenciaOrigen(c.v) !== "M"`) o tiene menos de 10 valores de ese mes.
  - `puesto` se cuenta con los valores redondeados como se muestran: 1 + la cantidad de años con un valor mostrado menor (o mayor, ver abajo). Empates: mismo puesto.
  - **Año de referencia** (pedido del usuario, 2026-11-13): "el más bajo (o alto) desde <año>", con los valores como se muestran: el último año anterior con un valor igual o más bajo y el último con uno igual o más alto; gana el que va más atrás, y solo si queda al menos un año en el medio. Si el de hoy es el récord, no hay año (lo dice el puesto). Ese año se marca en las columnas (`ref`).
  - `frase` neutra: "Octubre de 2026: 2,3 %. Es el 12.º más bajo de 37 octubres desde 1990." Se dice "más bajo" si el puesto desde abajo es menor o igual que el puesto desde arriba, y "más alto" si no. Si es el 1.º: "Es el más bajo de los 37 octubres desde 1990."
- `filasMandatosFicha(m, e, b)`: las filas y columnas para `TablaMandatos` (`FilaMandato[]`, `ColumnaMandato[]`, `visibles`, `extras`), una fila por presidente con datos (`statsMandato`), con `periodoMandato` y la nota de `datosDesde` en el período, como hoy.
  - **Tasa (C2)**: Inicio, Cierre y **Promedio** (principal, sin tono: no es una mejora ni un empeoramiento) visibles; Mediana, Mínimo y Máximo en "Sumar columnas". Si además es variación mensual, también **Acumulada** en "Sumar columnas": `(Π (1 + vᵢ/100) − 1) × 100` sobre los meses `iniI + 1 … finI` (así es igual al índice del cierre sobre el del mes 0, menos 1), mostrada con un decimal y "%". La "variación" en puntos no aparece.
  - **Serie en nivel**: Inicio, Cierre y **Variación** (principal, `variacionMostrada`, tono `claseVariacion`) visibles; Promedio, Mínimo y Máximo en "Sumar columnas". Igual que la tabla actual de la ficha.
- `relacionadasDe(e, S)`: hasta 5 links "Ver también" `{ nombre, href }` (con `hrefDato`, nombres públicos de `nombres.ts`), sin la variable misma y sin repetidos:
  1. la otra medida de la misma serie si es un dato fijo (`DATOS_FIJOS`): inflación mensual ↔ interanual, actividad nivel ↔ interanual;
  2. si la serie es `ipc_empalme`: Núcleo (`ipc_nacional_n_estaci`), Regulados (`ipc_nacional_r_estaci`) y Estacionales (`ipc_nacional_e_estaci`), en variación mensual, solo los que existen en `S`;
  3. los otros principales del tema al que pertenece la variable (`TEMAS`, `principalesDe`).
- `MODO_MANDATO_DEF` sigue siendo `"teorico"` para las series en nivel; para una tasa, la ficha usa `"valor"` (R4).

### R2. La ficha en capítulos (`web/components/FichaDato.tsx`)
Se reescribe con los componentes del sistema. Sin cajas con borde alrededor de los bloques (`.card`, `.ficha-bloque` con borde) y una sola vez cada cosa. Mismas props que hoy (`e, info, p, set, pd, nivel`), más `titulo?: string` y `tituloRef?` (para la ficha de los temas, R5). Orden:
1. **Ahora** — `CabeceraDato` con `cabeceraFicha`: título (nombre público con la medida, `tituloVariable`, o el `titulo` que llega), cifra, fecha ("· Último dato disponible" si corresponde), hasta 2 `Delta`, la secundaria y la frase. El ⓘ (`info`) lleva la descripción de la serie y su fuente. Debajo, los chips "Ver también" (`relacionadasDe`) como fila de links (una `FilaChips` de links o una fila deslizable con la misma clase `.chips`).
2. **¿Cómo viene?** — `Capitulo` con el gráfico de la serie (`historicoFicha`). Arriba del gráfico, `FilaChips` de período: "Desde <año>" (el de `historicoFicha`, el de hoy: va elegido por defecto), "1 año", "5 años" y "Todo". Lo elegido va en el parámetro nuevo `fper` (`1`, `5`, `todo`; sin parámetro o inválido = por defecto). La línea de temporalidad y la nota de unidad van debajo del gráfico, en gris chico. Compartir: el mismo de hoy (imagen del histórico con el período elegido, link y texto con la cifra y la fecha).
3. **¿Cómo fue <mes> en otros años?** — solo si `mesesIguales` no es null. Columnas verticales (componente nuevo `web/components/sistema/BarrasMes.tsx`, SVG propio, sin librerías): una por año, la del año actual en `--acento` y las demás en un tono apagado, con el valor del actual escrito arriba de su columna y el primer y último año debajo del eje. Si hay valores negativos, las columnas nacen de una línea de cero. Tocar o pasar el mouse por una columna muestra su año y valor (un rótulo en el lugar, sin tapar el valor del actual; con teclado, cada columna es enfocable o hay una tabla oculta para lectores de pantalla). La columna del año de referencia va en `--accion` (ámbar: ni mejor ni peor) con su año y valor arriba, sin tapar ninguna columna ni el valor del actual. Debajo, la `frase` ("Es el octubre más bajo desde 2017 (1,5 %). Entre los 33 octubres desde 1994, es el 11.º más alto."). A 360 px entra entero (columnas más finas, nunca deslizamiento de la página). Compartir: link y texto (la frase); sin imagen en esta etapa (ver "Fuera").
4. **¿Cómo le fue con cada presidente?** — `Capitulo` con `LineaInicio` (inicio de mandato de la página) y `TablaMandatos` con `filasMandatosFicha`; `resaltar = pd`. La bajada dice la medida: para una tasa "Inicio y cierre de cada mandato y el promedio de todos sus meses"; para un nivel "Del inicio al cierre de cada mandato". Una `FilaChips` "Tabla · Velas" cambia la vista (parámetro `pvista`, como hoy); las velas se ven como hoy, con sus mismos avisos. Compartir: imagen (tabla → barras, velas → velas; R3), link (con `pvista` y `pd`) y "Abrir completo" a `/presidentes/` con la variable, como hoy.
5. **Mes a mes, desde que asumió** — `Capitulo` con el gráfico de Meses de mandato (`mandatoFicha`) con la leyenda de colores. Bajada: para una tasa "El valor de cada mes, contado desde el mes 0 de cada presidente." (C1); para un nivel "Si todos arrancaran en el mismo punto: cada presidente parte del valor del mes 0 de Milei y sigue con sus propias variaciones." más la unidad. Compartir y "Abrir completo" a `/mandato/` como hoy.
6. **Gráficos listos** — si hay plantillas curadas que usan esta serie (`p.ids` incluye `e.id`), hasta 6 en `Laminas`/`Lamina` (con `evaluar`), y un link "Ver todos los gráficos listos" a `/plantillas/?q=<nombre>`. Si no hay, el capítulo no aparece.
7. **Cómo se mide** — plegado (`<details>` con la clase del sistema, cerrado por defecto) al final: descripción de la serie (`desc`), unidad, fuente, nota de inflación (`notaInflacion`), qué es el mes 0 (`baseTxt`) y la nota de cálculo de Meses de mandato. Sale de los capítulos todo texto de método que hoy está en línea.
- Títulos de capítulo con el nivel que corresponde (`nivel`: 2 en `/dato/`, 3 en los temas) y en forma de pregunta, como arriba.
- "Abrir completo" queda en todos los capítulos que lo tienen hoy, siempre en el mismo lugar (las acciones del `Capitulo`).
- Mientras carga y si falla la carga: igual que hoy.

### R3. Imagen de la tabla por presidente con una tasa (`web/lib/imagen-presidentes.ts`)
- `VistaPres` de tipo `"barras"` suma el campo opcional `metrica?: "prom"`. Con `"prom"`, cada barra es el promedio del mandato (`st.prom`, con el formato de la serie) en lugar de la variación, sin color de mejora/empeora, y el subtítulo de la imagen lo dice ("Promedio de todos los meses de cada mandato"). Sin el campo, igual que hoy (así `/presidentes/` no cambia en esta etapa).
- La ficha pasa `metrica: "prom"` cuando la serie es una tasa. Lo que se ve es lo que se comparte.

### R4. Meses de mandato con una tasa: valor real (C1) (`web/lib/estadisticas.ts`, `web/components/secciones/Mandato.tsx`)
- En `calcularMandato`, si la serie es una tasa (`c.pct`) y llega `modo === "teorico"`, se calcula como `"valor"`: el valor real de cada mes, sin ancla y sin línea de referencia. El resultado dice el modo que usó (`modo` efectivo), para que la página, la ficha y la imagen escriban lo mismo.
- En `/mandato/` con una tasa, la opción "Precio teórico" no se ofrece (quedan "Variación %" —que en una tasa es el cambio en puntos desde el mes 0, como hoy— y "Valor del período"); sin `mmo` o con `mmo=teorico` se ve "Valor del período" elegido. Un link viejo con `mmo=teorico` sobre una tasa abre el valor real, sin error.
- Series en nivel: el cálculo no cambia. Su nombre pasa a "Mismo punto de partida" en las opciones y en `TITULOS_MANDATO`, y la frase de ejemplo que hoy está debajo queda visible junto a la opción elegida, con la unidad de la serie.
- La imagen de Meses de mandato (`armarImagenPres`, tipo `"mandato"`) usa el modo efectivo: con una tasa dice la unidad de la serie y no "precio teórico".

### R5. Dónde va la ficha (`Dato.tsx`, `Tema.tsx`, `CabeceraDato.tsx`)
- `CabeceraDato` suma `nivel?: 1 | 2` (el del título; por defecto 1) y `tituloRef?`/`tituloId?` para enfocar el título.
- `/dato/` (`Dato.tsx`): se saca el `<h1 className="titulo-tema">`; el h1 es el de `CabeceraDato`.
- Temas (`Tema.tsx`): se saca el `<h2 className="ficha-nombre">`; la ficha recibe `titulo={nombreFicha}`, `nivel={3}` y el ref del título (h2 de `CabeceraDato`), así el desplazamiento y el foco al elegir un dato siguen andando.
- Las vistas previas de los links (`npm run previas`, `lib/previas.ts`) no cambian.

### R6. CSS (`web/app/globals.css`)
- Clases nuevas con prefijo `fi-` y `bmes-` (buscar antes con grep que no existan). Se borra el CSS de la ficha vieja que quede sin uso (`.ficha-bloque`, `.ficha-cab`, `.ficha-titulo`, `.ficha-acciones`, `.ficha-cifra`, `.ficha-nombre`…), solo si nada más lo usa.
- Tokens del sistema (voces `--v-*`, colores, espacios); sin colores fijos.

## Fuera de esta etapa
- La tabla de `/presidentes/` y su imagen siguen como hoy (C2 en esa página va en la etapa 3.3, con `TablaMandatos`).
- Animaciones de las barras que crecen de a una y "tocar un presidente para ver su recorrido": quedan para la 3.3.
- Imagen para compartir del capítulo de los meses iguales (lleva un tipo nuevo de imagen): queda anotado.
- El cambio de Mensual/Interanual dentro del gráfico: se resuelve con "Ver también" (cada medida tiene su propia ficha y su propio link).

## Cómo se verifica
- `npm run tipos`, `npm run build` y `npm run previas`.
- Cuentas contra la tabla actual: en `/dato/inflacion-mensual/`, Inicio, Cierre y Promedio de cada presidente iguales a los de `/sistema/` y a `/presidentes/?pv=…` (Inicio y Cierre); Acumulada de Milei igual al índice del IPC del cierre sobre el del mes 0, menos 1 (calculado aparte con `m.calc({ id: "ipc_empalme", med: "corr" })`); en `/dato/salario-mediano-real/`, Variación igual a la de hoy.
- Meses iguales: el puesto y la cantidad contados a mano con los valores de la serie para inflación mensual; salario mediano real (nivel); una serie trimestral (pobreza o PIB) no muestra el capítulo.
- Meses de mandato: con la inflación mensual las líneas muestran el valor real (Néstor alrededor de 0,5–1 % al principio del mandato); `/mandato/?mv=<inflación>&mmo=teorico` abre "Valor del período" sin error; con el dólar blue real sigue el "Mismo punto de partida" con el mismo número de antes.
- Imágenes: por presidente con la inflación (barras de promedio) y con el salario (variación), velas y meses de mandato desde la ficha.
- `/dato/inflacion-mensual/`, `/dato/salario-mediano-real/`, `/dato/pobreza/` (o el slug trimestral que exista) y `/tema/precios/` con un dato elegido, a 360, 390 y 1280 px, tema oscuro y claro: sin desplazamiento horizontal, sin errores de consola, objetivos de 44 px, un solo h1.
- Links viejos: `/dato/?v=…&pd=macri&pvista=velas`, `/dato/inflacion-mensual/?pvista=velas`, `fper` inválido.
- `impeccable detect` y agente `revisor`.
