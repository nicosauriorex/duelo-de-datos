# Estado del proyecto

Para retomar el trabajo en una sesión nueva. Actualizar al cerrar cada tanda. Última actualización: 2026-11-11.

## Dónde estamos
El sitio pasó de ser un explorador de series a una herramienta para responder en redes con una imagen (auditoría: `docs/AUDITORIA-2026-11-10.md`). Publicado en https://primerolosdatos.com.ar.

Hecho y publicado (detalle en `docs/ROADMAP.md`):
- Imagen compartible desde el Histórico y desde las secciones de presidentes, con opciones (período, líneas, presidentes, tarjetas, frases).
- Vista simple del Histórico, barra de zoom, resumen del período, copiar tabla.
- Nombres públicos de las series, inflación como una sola entrada, región como filtro, "Gráficos listos".
- Tablas con primera columna fija, barras con degradado, vista de velas, Congreso con página propia.
- Datos: canastas corregidas; respaldo del IPC cuando la API de INDEC no responde; filtro de cotizaciones sueltas; corridas a las 16:10, 17:15 y 21:00 (hora argentina, las dos primeras solo en días hábiles); publicación rápida cuando el push no toca el pipeline.

## Qué sigue, en orden
1. **Tanda 4** — `docs/specs/ajustes-tanda-4.md`. Spec lista; el usuario pidió **no implementar todavía**. Empieza por un barrido por código para encontrar errores del mismo tipo que los que reportó, y después los 13 casos. Antes de implementar, confirmar con el usuario que el cambio de líneas por defecto (solo último y promedio) puede alterar links viejos sin `r=`.
2. **Vista previa de los links en redes** (bloque 7c, sin spec): página fija por dato con título e imagen propios.
3. **Parte diario del BCRA** (idea en `docs/IDEAS.md`, sin spec): compra de divisas del día, reservas, tipo de cambio minorista y tasas, como lo publica el banco a las 16:45–17:00. Necesita datos diarios; hoy todo el sitio es mensual. El usuario lo quiere para difundir el sitio en ese momento.
4. **Datos de Congreso** (bloque 6d): cargar a mano bancas, bloques y totales de vetos en `datos/manual/`.
5. **Mantenimiento del pipeline** (auditoría, etapa 4): descargas duplicadas o sin caché al inicio de `obtener_datos.py`, serie de UTDT cortada en 2005, series sin uso, helpers repetidos.

## Sin verificar (revisar antes de dar por cerrado)
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
- Quedan reglas CSS sin uso de versiones anteriores (`.chips`, `.voto-aviso`) y ramas del modo "índice" de Meses de mandato que ya no se alcanzan.

## Cómo se trabajó (y funcionó)
- El usuario recorre el sitio publicado y pasa una lista de pedidos. Se anotan en `docs/IDEAS.md`, se bajan a una spec de tanda y se implementan.
- Specs grandes: tres o cuatro subagentes en paralelo, cada uno con sus archivos; después compilar, barrido por código, verificación en el navegador y `revisor`.
- Para revisar pantallas se pueden mandar subagentes económicos a navegar, cada uno en su pestaña; sirven para textos, repeticiones y desbordes, no para juzgar colores ni proporciones.
- El usuario decide con botones cortos; cuando dice "fijate" o "buscá la forma", espera una decisión razonada, no una pregunta.
- Si se corta por límite de uso, los subagentes se retoman con un mensaje y siguen donde quedaron.
