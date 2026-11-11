# Estado del proyecto

Para retomar el trabajo en una sesión nueva. Actualizar al cerrar cada tanda. Última actualización: 2026-11-11.

## Dónde estamos
El sitio pasó de ser un explorador de series a una herramienta para responder en redes con una imagen (auditoría: `docs/AUDITORIA-2026-11-10.md`). Publicado en https://primerolosdatos.com.ar.

Hecho y publicado (detalle en `docs/ROADMAP.md`):
- Imagen compartible desde el Histórico y desde las secciones de presidentes, con opciones (período, líneas, presidentes, tarjetas, frases).
- Vista simple del Histórico, barra de zoom, resumen del período, copiar tabla.
- Nombres públicos de las series, inflación como una sola entrada, región como filtro, "Gráficos listos".
- Tablas con primera columna fija, barras con degradado, vista de velas, Congreso con página propia.
- Tanda 4 (2026-11-11, `docs/specs/ajustes-tanda-4.md`): el botón Atrás cierra la ventana o el menú abierto y todas las capas tienen cruz (`useAtras` en `ui.tsx`, D-016); las cuentas cierran con los valores que se ven (un solo redondeo, `r1` en `formato.ts`); el Histórico arranca en Inflación con las líneas Último y Promedio, botón "Presidentes" bajo el gráfico y "Volver" del zoom fuera del gráfico; imagen de las velas; botones "Ver" alineados; sin pie genérico en la portada.
- Datos: canastas corregidas; respaldo del IPC cuando la API de INDEC no responde; filtro de cotizaciones sueltas; corridas a las 16:10, 17:15 y 21:00 (hora argentina, las dos primeras solo en días hábiles); publicación rápida cuando el push no toca el pipeline.

## Qué sigue, en orden
1. **Vista previa de los links en redes** (bloque 7c, sin spec): página fija por dato con título e imagen propios.
2. **Parte diario del BCRA** (idea en `docs/IDEAS.md`, sin spec): compra de divisas del día, reservas, tipo de cambio minorista y tasas, como lo publica el banco a las 16:45–17:00. Necesita datos diarios; hoy todo el sitio es mensual. El usuario lo quiere para difundir el sitio en ese momento.
3. **Datos de Congreso** (bloque 6d): cargar a mano bancas, bloques y totales de vetos en `datos/manual/`.
4. **Mantenimiento del pipeline** (auditoría, etapa 4): descargas duplicadas o sin caché al inicio de `obtener_datos.py`, serie de UTDT cortada en 2005, series sin uso, helpers repetidos.

## Sin verificar (revisar antes de dar por cerrado)
De la tanda 4 (lo demás se midió en el navegador a 360 y 1280 px):
- El carrusel de "Los datos más buscados" (espera a estar en pantalla y quieto), la pausa de la animación de Meses de mandato al tocar el gráfico y el paseo de las filas deslizables: revisados por código; el navegador de prueba no dispara `IntersectionObserver`.
- El botón Atrás en un celular real con cada tipo de ventana (se probó con `history.back()` en el navegador de escritorio).
- Que "Compartir" muestre lo mismo que la pantalla en cada vista alternativa (B7) se revisó por código, salvo las velas, que se vieron. Diferencias anotadas y no implementadas: la imagen de Meses de mandato no dibuja la banda mín/máx; la imagen de "Una variable, todos los presidentes" no respeta las columnas elegidas.

De la tanda 3:
Durante la tanda 3 las capturas del navegador fallaron: se comprobó contenido y medidas, no aspecto.
- Aspecto de: barras con degradado y velas en Por presidente, grilla de principales de los temas, placas de la portada, resumen del Histórico, colores de fábrica de los presidentes.
- Interacciones: animar Meses de mandato hasta el final y achicar "Hasta" (error reportado; arreglo razonado, no reproducido); copiar tabla; frases elegibles en la imagen; "Volver a lo de fábrica"; edición de "Mis variables"; cambio de región; vista previa de la imagen a pantalla completa; Escape con un desplegable abierto.
- Tema claro y vista en computadora de casi todo lo anterior.
- En un celular real: solo se probó (por el usuario) que compartir manda la imagen y el link.
- El respaldo del IPC desde la copia guardada no llegó a usarse en producción (la API respondió en la corrida siguiente).

## Detalles conocidos y aceptados
- La grilla de principales de un tema deja una tarjeta suelta si el tema tiene 5 o 7 principales.
- El degradado de las barras se aplica en las tablas por presidente; Ranking y Contexto siguen con un tono.
- Las velas no se dibujan con montos en pesos corrientes (muestran una nota).
- Cristina: celeste en el primer mandato y azul en el segundo (dos tonos de la misma familia, a propósito).
- La vista interanual de la inflación se titula "Inflación"; "interanual" aparece en la línea de la unidad.
- Si se sigue un enlace del sitio con una ventana abierta, la página de destino se carga entera (no es una transición interna); así el historial queda sin entradas de más.
- Quedan reglas CSS sin uso de versiones anteriores (`.chips`, `.voto-aviso`) y ramas del modo "índice" de Meses de mandato que ya no se alcanzan.

## Herramientas
- `python pipeline/ver_cache.py <nombre>`: mira un archivo de `datos/cache/` sin volcarlo (columnas y pocas filas). Es la única forma permitida de leer el caché.
- Flujo elegido: spec e implementación en la misma sesión, orquestando subagentes (`CLAUDE.md`, `docs/COMO-TRABAJAMOS.md`).
- Barrido después de cada tanda: `cd web && npx tsx scripts/barrido-cuentas.ts` (las cuentas cierran) y `web/scripts/barrido-navegador.js` (desbordes, capas con cruz y Atrás, repetidos, ceros con signo; se carga en la página y se llama a `barridoPLD()`; las instrucciones están en el encabezado). Ojo: el navegador de prueba guarda en caché el HTML de cada ruta; después de compilar, pedir cada ruta con `fetch(ruta, { cache: "reload" })` antes de medir.
- Pendiente de herramientas: regenerar `DESIGN.md` con el documentador de Impeccable.

## Cómo se trabajó (y funcionó)
- El usuario recorre el sitio publicado y pasa una lista de pedidos. Se anotan en `docs/IDEAS.md`, se bajan a una spec de tanda y se implementan.
- Specs grandes: tres o cuatro subagentes en paralelo, cada uno con sus archivos; después compilar, barrido por código, verificación en el navegador y `revisor`.
- Para revisar pantallas se pueden mandar subagentes económicos a navegar, cada uno en su pestaña; sirven para textos, repeticiones y desbordes, no para juzgar colores ni proporciones.
- El usuario decide con botones cortos; cuando dice "fijate" o "buscá la forma", espera una decisión razonada, no una pregunta.
- Si se corta por límite de uso, los subagentes se retoman con un mensaje y siguen donde quedaron.
