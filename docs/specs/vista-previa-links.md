# Vista previa de los links en redes (bloque 7c, primera parte)

Estado: implementada (2026-11-12). La imagen se dibuja a 1600 × 840 y se reduce a 1200 × 630 (la composición horizontal no entra directo en esa proporción).
Ideas: "Página propia por indicador con URL fija" y "Compartir gráficos" (IDEAS.md); bloque 7c del ROADMAP.

## Objetivo
Que al pegar un link del sitio en X, WhatsApp, Telegram o Facebook se vea una tarjeta con el dato: título con la cifra, una frase de contexto y una imagen con el gráfico. Hoy los links muestran solo el nombre del sitio, porque todo se arma en el navegador y las redes leen el HTML sin ejecutarlo.

## Cómo
Las redes solo leen el HTML estático y una imagen ya hecha. Entonces, en cada publicación (después de generar los JSON y antes de compilar):

1. **Páginas fijas por dato**: `/dato/<slug>/`, una por cada dato principal de los temas y por las cuatro placas de la portada (sin repetir). Cada página muestra la ficha del dato (D-017) de esa variable y lleva en el HTML su título, descripción e imagen.
2. **Imagen de vista previa por dato**: un PNG generado al publicar con el mismo dibujo de la imagen compartible (`web/lib/imagen.ts` y `imagen-datos.ts`), guardado en `web/public/previas/<slug>.png`.
3. **Imagen general** del sitio para la portada y las demás rutas.

## Requisitos
1. `web/lib/datos-fijos.ts`: la lista de datos fijos. Cada uno con `slug` escrito a mano (estable; no se deriva del nombre para que un cambio de nombre no rompa links), y la variable. Se arma a partir de los principales de `web/lib/temas.ts` y las placas de `Inicio.tsx`. Un slug nunca cambia de significado; si un dato se retira, su slug no se reutiliza.
2. Ruta `web/app/dato/[slug]/page.tsx` con `generateStaticParams` (solo los datos fijos cuya serie existe en `web/public/datos/catalogo.json`) y `generateMetadata`:
   - `title`: nombre público y último valor con su fecha ("Inflación: 1,9 % en sep-26").
   - `description`: una o dos frases del contexto automático (`web/lib/contexto-dato.ts`), palabras neutras, sin veredicto (D-012).
   - Open Graph y Twitter (`summary_large_image`): `og:image` absoluta (`https://primerolosdatos.com.ar/previas/<slug>.png?v=<fecha del último dato>`, para que las redes la renueven cuando sale un dato nuevo), ancho y alto, `og:url`, `og:site_name`, `og:locale` es_AR.
   - La página muestra lo mismo que `/dato/?v=…` para esa variable.
3. Script `web/scripts/generar-previas.ts` (se corre con `tsx`): lee los JSON de `web/public/datos/`, arma el motor y, por cada dato fijo, dibuja la imagen y la escribe en `web/public/previas/`. Además escribe `web/public/previas/_datos.json` con título, descripción y fecha de cada dato, que es lo que lee `generateMetadata` (así el cálculo se hace una sola vez). También genera `sitio.png` (imagen general).
   - Tamaño 1200 × 630 (el que piden las redes). Si el dibujo actual no se adapta a esa proporción, usar el formato horizontal existente y documentarlo.
   - Tema oscuro del sitio, misma tipografía (Archivo) y misma paleta que la imagen compartible. Los colores salen de una sola fuente (los tokens de `globals.css` o una paleta en `web/lib/`), no escritos a mano en el script.
   - La imagen lleva la marca y la dirección del sitio, la fuente del dato y la fecha.
   - Si un dato falla (serie sin datos), se informa y se sigue con los demás; el script termina con error solo si no pudo generar ninguna.
4. `web/app/layout.tsx`: `metadataBase` y Open Graph/Twitter por defecto con `sitio.png`. Cada ruta existente conserva su título y descripción.
5. Enlaces: `hrefDato(e)` devuelve `/dato/<slug>/` cuando la variable es exactamente la de un dato fijo; si no, `/dato/?v=…` como hoy. "Copiar link" y Compartir desde la ficha de un dato fijo dan la URL fija. `/dato/?v=…` sigue funcionando para cualquier variable.
6. Publicación: `.github/workflows/actualizar.yml` corre el script antes de compilar, en los dos modos (completo y solo el sitio). `web/public/previas/` es generado y no se versiona (`.gitignore`). `package.json` suma `"previas": "tsx scripts/generar-previas.ts"`; documentarlo en `CLAUDE.md` (comandos).
7. `web/public/robots.txt` y `sitemap.xml` (generado por el mismo script o por Next) con las rutas fijas, incluidas las de datos.

## Datos
Sin cambios en el pipeline. Los JSON de `web/public/datos/` ya existen cuando se compila.

## Casos borde
- `web/public/previas/_datos.json` no existe al compilar (alguien corre `npm run build` sin el script): las páginas se generan igual, con título y descripción genéricos y la imagen general; el build no falla.
- Serie de un dato fijo que desaparece del catálogo: no se genera su página (queda 404) y el script lo avisa.
- Texto largo en el título de la imagen: baja de renglón o se achica, sin salirse.
- Links viejos `/dato/?v=…` de un dato fijo: siguen abriendo la ficha (no se redirigen).

## Fuera de alcance
"Contestar un relato", posts automáticos, video de la animación, imagen de vista previa para links con parámetros arbitrarios (necesitaría un servidor).

## Cómo se verifica
1. `cd web && npm run previas && npm run tipos && npm run build` sin errores.
2. Mirar tres imágenes generadas (inflación, un salario, el dólar): se leen, no hay texto cortado ni fuente de reemplazo, la cifra coincide con la del sitio.
3. En `web/out/dato/<slug>/index.html`: `og:title`, `og:description`, `og:image` y `twitter:card` presentes y con la cifra.
4. En el navegador: `/dato/<slug>/` muestra la ficha; el barrido (`web/scripts/barrido-navegador.js`) sin hallazgos a 360 y 1280 px.
5. Después de publicar: `gh run watch` en verde, la imagen responde 200 en el sitio, y el link se prueba pegándolo en WhatsApp o en el validador de tarjetas de una red (lo hace el usuario).
6. Agente `revisor`.
