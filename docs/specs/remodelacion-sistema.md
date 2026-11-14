# Remodelación, Fase 2: sistema de diseño

Estado: implementada (2026-11-13), aprobada por el usuario y publicada (177619c). Sale de `docs/AUDITORIA-DISENO-2026-11-13.md` y D-023.

## Objetivo
Llevar "La Transmisión" de la portada a todo el sitio con un juego chico de componentes compartidos. En esta fase **no se toca ninguna página existente**: se crean los componentes y una página de muestra `/sistema/` (sin link desde el menú, fuera del sitemap y con `robots: noindex`), en la que el usuario los aprueba antes de aplicarlos en las etapas 3.1 a 3.5.

## Principios (valen para todo el sitio)
1. **Sin caja por defecto.** El contenido va sobre `--surface-0`. Lo separan el espacio y las líneas de 1 px (`--border`). Solo llevan fondo propio los objetos que se tocan (lámina, chip, fila) y lo que flota (hoja, globo, menú). Nunca una caja dentro de otra.
2. **Una respuesta por pantalla, arriba.** La primera frase dice el dato; después viene la exploración.
3. **Cuatro voces tipográficas** (tokens abajo). No se usa 11 px salvo en los ejes de los gráficos.
4. **Una sola forma de decir "cambió": `Delta`.** Sin pastillas con fondo de color.
5. **Ajustes a demanda.** Chips que resumen la vista y abren una hoja; ⓘ de 44 px para avisos y metodología al final, plegada.
6. **Movimiento solo en los datos.** Líneas que se dibujan, barras que crecen, cifras que cuentan y ejes que se acomodan, una vez cada cosa. El contenido nunca arranca invisible: sin JavaScript, con "reducir movimiento" o fuera de pantalla se ve completo y quieto.
7. **Sin sobretítulos ni rótulos encima de un título** (regla de Impeccable). Un título habla solo.
8. **Íconos dibujados en SVG** (trazo de 2 px, como `Iconos.tsx`). Nunca caracteres (?, ▲, ▶, ⓘ) como ícono.
9. **Objetivos táctiles de 44 × 44 px** como mínimo (el área sensible puede ser más grande que lo que se ve).
10. **Mobile first.** El CSS base es el del celular; `min-width` para ampliar. A 360 px nada se sale de su contenedor.

## Tokens nuevos (`:root` de `globals.css`, bloque "Sistema D-023")
Se suman a los existentes y no se borra nada.

```
--v-cifra: clamp(3rem, 15vw, 4.5rem);        /* cifra de página en el celular: 900, ancho --ancho-cifra, interlineado .9; desde 900 px usa --t-cifra (88 px, como las placas) */
--v-titular: clamp(1.75rem, 7.5vw, 2.5rem);  /* h1 de página: 900, ancho --ancho-cond, mayúsculas, interlineado .95 */
--v-capitulo: clamp(1.25rem, 5vw, 1.5rem);   /* h2 de capítulo: 800, ancho --ancho-cond, sin mayúsculas, interlineado 1.1 */
--v-texto: 1rem;                              /* texto de lectura en fichas (16 px); el resto sigue con --t-base */
--v-rotulo: .8125rem;                         /* rótulos, deltas, referencias: 600–700, ancho --ancho-semi */
--toque: 44px;
--marca-cap: 24px;                            /* largo de la raya celeste que abre un capítulo */
--d-barras: 30ms;                             /* escalonado entre barras */
```

## Componentes (`web/components/sistema/`)
Cada uno en su archivo, `"use client"` solo si hace falta. Las clases CSS llevan el prefijo del componente y **no repiten nombres existentes** (buscar en `globals.css` antes). Todo el texto en español y los números con `web/lib/formato.ts`.

### Grupo 1: lectura
- **`Delta`** (`Delta.tsx`). Props: `texto: string` (ya formateado y con signo, como "+0,3 p.p." o "−1,2 %"), `tono: "bueno" | "malo" | "neutro" | null`, `dir: 1 | -1 | 0` (sube, baja, igual), `contra?: string` (no `ref`, que React reserva) ("vs sep-26"), `tam?: "normal" | "grande"`, `etiqueta?: string` (para lectores de pantalla; si falta, se arma con texto y ref).
  - Se ve como triángulo SVG (arriba, abajo o raya) + texto en `--bueno`, `--malo` o `--text-secondary`, a 13 px, peso 700, ancho semi; `ref` en `--text-muted`, peso 500.
  - Sin fondo ni borde. "grande" = 17 px.
  - El triángulo sigue a `dir`, no al tono (si sube la inflación, triángulo hacia arriba y en rojo).
  - Clase `delta`. Si el texto empieza con "-" (guion), se reemplaza por "−" (signo menos).
- **`Capitulo`** (`Capitulo.tsx`). Un `<section>` con `h2` (`titulo`), `bajada?` (una línea, `--text-secondary`), `acciones?` (nodo a la derecha del título, por ejemplo Compartir) y `children`.
  - Arriba, una línea de 1 px a todo el ancho y, encima, una raya celeste de `--marca-cap` × 3 px pegada a la izquierda (la misma marca que la pestaña actual del menú).
  - Espacio: `--e-7` arriba y `--e-4` entre el título y el contenido.
  - `nivel?: 2 | 3`. Sin caja. Clase `capitulo`.
- **`InfoPunto`** (`InfoPunto.tsx`). Botón de 44 × 44 con un ícono "i" en círculo de 18 px (SVG). Al tocarlo, abre un globo con `children` (texto corto, enlaces).
  - Posición fija calculada como `Selector` en `ui.tsx`; abajo o arriba según el espacio y nunca fuera de pantalla.
  - Ancho máximo 320 px, fondo `--surface-1`, borde `--border`, `--sombra-2`, texto 14 px.
  - Se cierra con Escape, con un clic afuera, con su cruz de 44 px y con Atrás (`useAtras` y `useCapa` de `ui.tsx`).
  - Props: `etiqueta` (aria-label, por ejemplo "Qué es T-1") y `children`. Clase `infop`.
- **`CabeceraDato`** (`CabeceraDato.tsx`). La apertura de toda página de un dato.
  - Props: `titulo` (h1, nombre público del dato), `cifra: string`, `unidad?: string` (si no va pegada a la cifra), `fecha: string`, `deltas: DeltaProps[]` (0 a 3), `frase?: string` (un hecho calculado, sin juicio), `info?: ReactNode` (va en un `InfoPunto` al lado del título), `children?` (gráfico).
  - Celular: título en `--v-titular`; debajo, la cifra en `--v-cifra` con la fecha a su derecha, alineada abajo, en `--v-rotulo`; los deltas en una fila que baja de renglón; la frase en 16 px `--text-secondary`; después `children`.
  - Desde 900 px: dos columnas (título, cifra y frase a la izquierda; deltas apilados a la derecha, separados por una línea vertical de 1 px).
  - La cifra usa `Contador` de `Movimiento.tsx`. Sin caja. Clase `cabdato`.

### Grupo 2: controles
- **`FilaChips`** (`FilaChips.tsx`). Opciones en un solo renglón que se desliza de costado, con fundido en el borde donde hay más (`useDeslizable` de `Movimiento.tsx`, `data-mas`).
  - Props: `opciones: [valor, texto][]`, `valor: string | Set<string>`, `onElegir`, `etiqueta` (aria-label del grupo).
  - Chip: alto visible 36 px, área sensible de 44 px, `--r-2`, fondo `--surface-1`, sin borde. Elegido: `--acento` con texto `--sobre-acento`. 14 px, peso 600.
  - `aria-pressed`. Al elegir, el chip se desliza a la vista. Clase `chips`.
- **`Hoja`** (`Hoja.tsx`). Capa de ajustes.
  - Celular: sale desde abajo, hasta el 85 dvh, esquinas de arriba `--r-2`, manija de 36 × 4 px y cruz de 44 px.
  - Desde 900 px: panel a la derecha de 400 px de ancho, a todo el alto.
  - Velo `--velo`; foco atrapado adentro; Escape, Atrás (`useAtras`), cruz y clic en el velo la cierran.
  - Entra con `transform` en `--d-2` y `--curva`; con "reducir movimiento", sin animación.
  - Props: `titulo`, `abierta`, `onCerrar`, `children`, `pie?` (botones fijos abajo). Clase `hoja`.
- **`BarraVista`** (`BarraVista.tsx`). Resumen de la vista en un renglón: chips de solo lectura que dicen lo elegido ("Mensual", "2003–hoy", "Nacional") y un botón "Ajustes" con `IconoAjustes`.
  - Tocar un chip o "Ajustes" llama a `onAbrir(clave?)`. Se desliza de costado si no entra.
  - Props: `items: { clave, texto }[]`, `onAbrir`. Clase `vistabar`.
- **`CompartirHoja`** (`CompartirHoja.tsx`). Un botón "Compartir" (`IconoCompartir`) que abre una `Hoja` con tres acciones grandes, una por renglón, con ícono y descripción:
  - Imagen (`onImagen?`: si falta, no se muestra);
  - Link (copia `href` absoluto al portapapeles y muestra "Link copiado" en un `role="status"`);
  - Texto (`texto?`: si falta, no se muestra).
  - Props: `href`, `titulo`, `onImagen?`, `texto?`. Clase `comphoja`.
- **`BarraInferior`** (`BarraInferior.tsx`). Navegación del celular (menos de 768 px): Inicio · Buscar · Histórico · Presidentes · Más, con ícono SVG arriba y texto de 12 px abajo.
  - Alto de 56 px más `env(safe-area-inset-bottom)`; fondo `--barra` y línea celeste de 2 px arriba (espejo de la barra de arriba).
  - Actual: texto `--sobre-barra` y raya celeste de 3 px arriba del ícono.
  - Props: `actual: string` (carpeta), `onBuscar`, `onMas`. "Buscar" y "Más" no navegan: llaman a sus funciones.
  - Para la muestra, `fijo?: boolean` (si es `false`, se dibuja en su lugar y no fija al pie). Clase `navinf`.
- **`MenuMas`** (`MenuMas.tsx`). Contenido de la hoja "Más": las secciones en 4 grupos (Comparar presidentes: Por presidente, Meses de mandato, Herencia, Ranking, Elecciones, Gobierno y Congreso · Argentina y el mundo: Contexto internacional · El Estado por dentro: En qué gasta la Nación, Las provincias, Universidades · Herramientas: Histórico, Semáforo de actividad, Parte del Banco Central, Gráficos listos, Fuentes).
  - Fila: nombre en 16 px peso 700 + una línea de para qué sirve (los textos de `SECCIONES_INICIO` en `Inicio.tsx`, copiados en `web/lib/secciones.ts` como única fuente) + flecha. Filas de 56 px o más, separadas por líneas.
- **Íconos nuevos** en `web/components/sistema/iconos.tsx`, con el mismo estilo que `Iconos.tsx`: Inicio, Buscar, Histórico (línea quebrada), Presidentes (banda o podio simple), Más (tres rayas), Info (círculo con i), Sube, Baja, Igual (triángulos y raya para `Delta`), Copiar, Imagen, Texto, Cerrar.

### Grupo 3: datos
- **`useAparecer`** (`useAparecer.ts`). `ref` + estado `"quieto" | "espera" | "vista"`.
  - Si el elemento está fuera de pantalla, hay `IntersectionObserver` y no hay "reducir movimiento", pasa a `"espera"` y, al entrar, a `"vista"` una sola vez. Si no, queda `"quieto"`.
  - El CSS solo esconde algo en `data-aparece="espera"`: sin JavaScript se ve todo.
- **`ListaBarras`** (`ListaBarras.tsx`). Reemplaza las copias de Gasto, Provincias, Cuentas, Universidades y Congreso (se migran en sus etapas).
  - Props: `filas: { id, nombre, valor: number | null, texto: string, sub?: string, href?: string, onClick?: () => void, tono?: "bueno" | "malo" | null, color?: string (variable CSS) }[]`, `divergente?: boolean`, `max?: number`, `resaltar?: string` (id), `etiqueta` (aria).
  - Fila: nombre a la izquierda (hasta 2 renglones, 15 px peso 600) y valor a la derecha (tabular, 15 px peso 800, ancho semi); `sub` debajo en 13 px `--text-muted`; la barra abajo, a todo el ancho, de 6 px, sobre un riel `--grid`.
  - `divergente`: el cero va en el centro, los negativos crecen hacia la izquierda y los positivos hacia la derecha, con el color del tono.
  - Las barras crecen (`scaleX` desde el cero) con `--d-dibujo` y `--curva`, escalonadas `--d-barras`, al aparecer (`useAparecer`).
  - Fila tocable si tiene `href` u `onClick` (44 px como mínimo, foco visible). Clase `lbar`.
- **`TablaMandatos`** (`TablaMandatos.tsx`).
  - Props: `filas: { id, nombre, periodo, color (variable CSS), celdas: Record<clave, { texto, valor?: number | null, tono?: "bueno" | "malo" | null }> }[]`, `columnas: { clave, titulo, principal?: boolean }[]`, `visibles: string[]` (claves por defecto), `extras?: string[]` (claves que se suman con "Más columnas"), `resaltar?: string`, `etiqueta`.
  - Celular (menos de 640 px): una fila por presidente. A la izquierda, una raya de 3 px de su color, el nombre (16 px, peso 800) y el período (13 px, muted). A la derecha, la columna `principal` en 20 px, peso 800, con su tono. Debajo, las otras visibles como "Inicio 1,9 % · Cierre 2,2 % · Promedio 3,1 %" en 13 px.
  - Desde 640 px: tabla con encabezados de 12 px en mayúsculas; la columna principal lleva una barra divergente fina detrás del número; las demás van en texto sin color.
  - "Más columnas": `FilaChips` múltiple con las `extras`.
  - Ordena al tocar un encabezado (`aria-sort`). Sin marcas "PEOR/MEJOR". Clase `tmand`.
- **`Lamina`** (`Lamina.tsx`). Miniatura de un gráfico listo como objeto.
  - Props: `titulo`, `cifra?`, `fecha?`, `v: Vals`, `desde: number`, `tono?`, `href`, `grupo?`.
  - Bloque tocable entero: fondo `--surface-1`, sin borde y esquinas rectas. El título va arriba (15 px, peso 700, hasta 2 renglones); el `Sparkline` existente ocupa 72 px de alto a todo el ancho, sin márgenes; abajo, la cifra (20 px, peso 800, condensada) con la fecha.
  - Hover y foco: una línea celeste de 2 px arriba que crece de izquierda a derecha (`scaleX`, `--d-2`).
  - En el celular van en una fila deslizable con encastre (`.laminas`, 78 % de ancho cada una); desde 640 px, grilla de 2 o 3. Clase `lamina`.

## Página de muestra `/sistema/`
`web/app/sistema/page.tsx` (`robots: { index: false }`, fuera de `sitemap.ts`) + `web/components/secciones/Sistema.tsx`. Con datos reales del sitio:
1. `CabeceraDato` de la inflación mensual: cifra y fecha del último dato, `Delta` contra el mes anterior y contra un año atrás (`comparaciones` de `lib/plantillas`), interanual, frase con un hecho calculado y el gráfico.
2. `Capitulo` "¿Cómo le fue a cada presidente?" con `TablaMandatos` de la inflación mensual: Inicio, Cierre y Promedio a la vista; Mediana, Mínimo y Máximo en extras; principal = Promedio. Sale de `statsMandato` (sin cálculo nuevo).
3. `Capitulo` con `ListaBarras` divergente (variación del salario real por presidente, de `statsMandato`) y otra simple (promedio mensual de inflación por presidente).
4. `Capitulo` "Gráficos listos" con 6 `Lamina` de los destacados.
5. `Capitulo` "Controles": `BarraVista` que abre una `Hoja` con `FilaChips`; `InfoPunto`; `CompartirHoja`.
6. `BarraInferior` dibujada dentro de un marco de celular, con su hoja "Más" funcionando.
7. Muestra de las cuatro voces tipográficas y de los `Delta` en sus tres tonos.

## Fuera de esta fase
Cambiar páginas existentes, la navegación real y los cálculos de mandatos (C1/C2): van en las etapas 3.x.

## Cómo se verifica
- `npm run tipos` y `npm run build` sin errores.
- `/sistema/` a 375, 768 y 1280 px, en tema oscuro y claro: nada se sale de su contenedor ni hay desplazamiento horizontal de la página; no hay errores de consola.
- Teclado: Tab llega a todo, el foco se ve, Escape cierra la capa de arriba; Atrás cierra la hoja, el globo y el "Más".
- Con "reducir movimiento" emulado, nada se anima y todo se ve.
- Objetivos de 44 px o más (medido con JS).
- Las cifras de la muestra coinciden con las de `/dato/inflacion-mensual/` y `/presidentes/`.
- `impeccable detect` sobre `web/components/sistema` sin hallazgos (o con su justificación).
- Agente `revisor` contra esta spec.
