# Auditoría integral — 2026-11-10

Etapa de diagnóstico. No se cambió código ni datos. Se revisó el código de `web/` y `pipeline/`, se recorrió el sitio (build local del código actual, datos del 9-nov) en escritorio y a 375 px, y se verificaron las series con scripts sobre `web/public/datos/`.

Esfuerzo: **S** = menos de media sesión · **M** = una sesión · **L** = varias sesiones (necesita spec).

## Conclusión general

Hoy Primero los Datos es un buen **explorador de series** con links compartibles. Todavía no es una **herramienta para responder en redes**: el paso final del recorrido (la imagen) no existe, y el paso intermedio (entender qué dice el dato sobre la afirmación) queda a cargo del usuario.

El recorrido de la visión, paso por paso:

| Paso | Estado | Qué pasa hoy |
|---|---|---|
| 1. Ve una afirmación en X | — | — |
| 2. Entra al sitio | Parcial | La portada dice "buscá, compará", no "respondé con una imagen". Un link pegado en X no muestra vista previa. |
| 3. Encuentra el indicador | Bien con palabras sueltas | "salario", "sueldo", "pobreza" encuentran. "peores salarios" no encuentra nada. |
| 4. Entiende el dato | Parcial | Las tarjetas dan contexto ("-27 % contra su récord"). En el Histórico, en celular, el gráfico queda debajo del primer pantallazo, tapado por 12 controles. |
| 5. Genera una visualización | No existe | "Compartir" solo copia o comparte el link. |
| 6. Comparte una imagen con fuente | No existe | No hay ninguna generación de imagen en el código. |

Seis bloques seguidos del roadmap (5b a 6d) sumaron profundidad de análisis (Ranking, Elecciones, Contexto, Congreso, precios en el mundo). El bloque 7, que es el corazón de la visión, sigue sin spec. La recomendación central es **invertir ese orden**.

## Prioridad crítica

### C1. No se puede generar una imagen
- **Evidencia:** `web/lib/compartir.ts` (13 líneas) solo llama a `navigator.share({url})` o copia el link. No hay `canvas`, `toBlob` ni descarga en todo `web/`. `docs/ROADMAP.md`: bloque 7 "Sin spec".
- **Por qué es un problema:** es el entregable del producto. En X la gente no abre links; lo que circula es la imagen.
- **Solución:** botón "Compartir imagen" en cada dato. Imagen armada en el navegador (canvas, sin servidor) con: título que diga la conclusión, la cifra grande, el gráfico, período, fuente, fecha del dato y la dirección del sitio. Tres formatos (1:1, 4:5, 16:9). En celular, `navigator.share({files})` abre directo X o WhatsApp con la imagen adjunta; en escritorio, descarga y copia al portapapeles.
- **Impacto:** convierte el sitio en lo que la visión describe.
- **Esfuerzo:** L (spec del bloque 7, etapa 1).

### C2. "Editar" rompe la página en 22 series (reproducido)
- **Evidencia:** `web/components/Variables.tsx:376` y `:389`. Para series en % sin medidas (`motor.gruposMedida` devuelve `[]`, `web/lib/motor.ts:156`), `act.g` queda `undefined` y `act.g.k` lanza `TypeError: Cannot read properties of undefined (reading 'k')`. No existe `web/app/error.tsx`, así que cae toda la página con el cartel en inglés de Next.
- **Series afectadas:** inflación mensual e interanual, desocupación, tasa de empleo y de actividad, informalidad, pobreza e indigencia (4), brechas (3), soja Rosario/Chicago (4), consumo e inversión % del PIB, M2 interanual, inflación esperada (REM), tasa de la Fed.
- **Por qué es un problema:** son los datos más buscados, y la inflación es la primera tarjeta de la portada.
- **Solución:** (a) si la serie no tiene medidas, la ventana muestra "Se ve tal cual" en lugar de calcular el grupo activo; (b) agregar `app/error.tsx` en español con "Volver", para que un error futuro no deje la pantalla en negro.
- **Esfuerzo:** S.

### C3. La canasta básica por adulto está mal desde mayo de 2016 (verificado)
- **Evidencia:** `can_cba` pasa de 1.514 (abr-16) a 782 (may-16) mientras `can_cba_h2` (hogar de 4) sube de 4.680 a 4.825. La relación hogar/adulto debería ser fija en 3,09 y llega a 9,27. Lo mismo en `can_cbt`. Hoy `can_cba` marca 78.382 y debería rondar 235.000. Causa probable: `pipeline/catalogo.py:446` promedia filas distintas con el mismo código (`groupby("fecha").mean()`); falta abrir el caché para confirmarlo.
- **Por qué es un problema:** un dato falso con sello de INDEC destruye la credibilidad, que es el activo del sitio. Las oraciones y plantillas de "cuántas canastas compra un salario" toman todos los `can_*` (`web/lib/oraciones.ts:23,26`, `web/lib/plantillas.ts:104`).
- **Solución:** confirmar la causa en el caché, filtrar la fila correcta y agregar al pipeline un control automático (hogar/adulto ≈ 3,09).
- **Esfuerzo:** S–M.

## Prioridad alta

### A1. En celular, el Histórico muestra controles antes que el dato
- **Evidencia:** a 375×812 el gráfico empieza en el píxel 780. Antes hay: Volver, Guardar como plantilla, Compartir, Ver plantillas, período, Mes/Trimestre/Año, variable, Editar, "Agregar una segunda variable (eje derecho)", tarjetas de resumen, Gráfico/Tabla, Opciones, Expandir.
- **Por qué es un problema:** quien llega desde un link ve una botonera. Contradice los principios 1 y 5 de `PRODUCT.md`.
- **Solución:** "vista de respuesta" por defecto: título, cifra con su contexto, gráfico, fuente y Compartir. Todo lo demás, bajo un solo botón "Personalizar". El explorador completo queda igual para quien lo abra.
- **Esfuerzo:** M (va en la misma spec que C1).

### A2. Los links pegados en redes no muestran vista previa
- **Evidencia:** `web/app/layout.tsx:14-18` no define `openGraph` ni `twitter`. Todas las vistas del Histórico tienen el mismo título ("Histórico · Primero los Datos"), porque el estado va en el query string y el sitio es estático.
- **Solución:** una página fija por dato (`/dato/salario-real/`, idea que ya está en IDEAS.md), con título, descripción e imagen de vista previa generada en cada actualización diaria. Sirve además para buscadores.
- **Esfuerzo:** M–L.

### A3. El sitio no responde la afirmación, solo muestra la serie
- **Evidencia:** para "los peores salarios de la historia" el usuario tiene que mirar el gráfico y sacar la cuenta. Las tarjetas ya calculan "contra su récord" (`web/lib/plantillas.ts`, `distanciaRecord`), pero no hay "peor/mejor dato desde…", ni puesto en el ranking histórico, ni comparación por presidente en la misma vista.
- **Solución:** un bloque fijo de contexto en cada dato: valor actual, distancia al récord y al piso, "el más bajo/alto desde <fecha>", y cómo estaba al inicio y al cierre de cada presidente. Es cálculo puro sobre series que ya existen (etapa 1 del verificador en IDEAS.md). Ese texto es también el título de la imagen.
- **Esfuerzo:** M.

### A4. El buscador no entiende frases
- **Evidencia:** exige que todas las palabras coincidan (`web/components/Variables.tsx:142`, `web/lib/catalogo.ts`). "peores salarios" devuelve "No encontramos…".
- **Solución:** ignorar palabras vacías y adjetivos ("peores", "más alto", "historia", "gobierno"), aceptar coincidencia parcial y, si no hay resultado, mostrar los temas más cercanos en lugar de un callejón sin salida.
- **Esfuerzo:** S.

### A5. El 77 % del catálogo son precios, y más de la mitad nadie los usa
- **Evidencia:** 445 de 576 series son de Precios. 240 índices de IPC y 70 precios promedio de las cinco regiones fuera de GBA no están referenciados en ninguna plantilla, tema ni oración; solo aparecen en el selector.
- **Por qué es un problema:** el selector muestra un árbol enorme donde lo importante (salario, pobreza, dólar) pesa lo mismo que "IPC Noreste, 04.5".
- **Solución:** tratar la región como un filtro del dato ("Carne · GBA ▾") y no como series separadas en el árbol. No se borra nada: cambia cómo se presenta.
- **Esfuerzo:** M.

### A6. Vocabulario de especialista
- **Evidencia:** "Salario SIPA mediana", "Inicio: T-1", "eje derecho", "Plantillas", "Fuente: IPC empalmado". La tarjeta de inflación de la portada no muestra fuente porque `Inicio.tsx:74` la oculta cuando no nombra un organismo.
- **Solución:** nombres públicos ("Salario mediano de trabajadores registrados", "Gráficos listos"), y fuente siempre con organismo: "INDEC; 2007–2016 con IPC de San Luis y CABA".
- **Esfuerzo:** S.

### A7. Tres puntos de rigor
- **Empalme del IPC sin avisar:** entre 2007 y 2016 se usan San Luis y CABA (`pipeline/salarios.py:115-120`). Es una decisión defendible, pero tiene que estar a la vista en cada gráfico e imagen que use valores reales.
- **Mandatos con datos parciales:** en Por presidente, "Menem 1" figura con −2,3 % calculado sobre 6 de 66 meses, en la misma tabla que mandatos completos.
- **Variaciones sobre valores negativos:** `web/lib/motor.ts:210` solo evita dividir por cero. En resultado fiscal y cuasifiscal (49 a 112 meses negativos) el "% de variación" no tiene sentido y se ofrece igual.
- **Esfuerzo:** S cada uno.

## Prioridad media

### M1. "Los datos más buscados" en escritorio (tu punto A)
- **Evidencia:** son 4 placas en una pista que se sale de la columna de 1.080 px; en monitores anchos sobra espacio a la derecha y la cuarta queda cortada o suelta. Además avanza sola, lo que distrae.
- **Solución:** desde 1.024 px, grilla fija de 4 dentro de la columna, sin movimiento. El carrusel queda solo en celular, deslizando con el dedo.
- **Esfuerzo:** S.

### M2. Inflación mensual e interanual como series guardadas (tus puntos B y C)
- **Evidencia verificada:** `inflacion` coincide con la variación mensual de `ipc_empalme` (diferencia máxima 0,0008 puntos) e `inflacion_ia` con la interanual (0,0015). Son copias.
- **Recomendación:**
  - `inflacion_ia`: se puede sacar ya; no tiene ninguna referencia en el sitio.
  - `inflacion`: mostrar una sola entrada "Inflación" con opciones Mensual / Interanual / Promedio de 12 meses, calculadas desde el IPC. Eso además elimina el caso que rompe "Editar". El id viejo se conserva como alias para que los links ya compartidos sigan funcionando. Tiene 7 referencias a migrar (`Inicio.tsx:31`, `Oraciones.tsx:60`, `Ranking.tsx:90`, `catalogo.ts:55`, `curiosidades.ts:53`, `plantillas.ts:60`, `temas.ts:25`).
- **Riesgo:** sacar un id rompe links viejos en silencio (`web/lib/url.ts:12`) y hace fallar `pipeline/verificar_series.py` salvo que se corra una vez con `--aceptar-menos`.
- **Esfuerzo:** M.

### M3. El resto de las series derivables no justifica el cambio todavía
- Brechas (3), soja Rosario/Chicago (4), saldo comercial, balanza energética, gasto total y PIB de 12 meses también coinciden con su derivación. Pero el motor no sabe restar, sumar ni hacer "(a/b − 1)", y todas juntas pesan 40 KB (4 % de los datos). Dejarlas como están.

### M4. IPC por rubro y precios promedio no son redundantes
- El precio promedio es el nivel en pesos de un producto (sirve para "cuántos kilos compra un salario"). El IPC por rubro es un índice agregado con ponderadores (sirve para "qué subió más"). No se derivan uno del otro. Lo que conviene es ordenarlos como dos preguntas distintas: "Precios de productos" e "Inflación por rubro".
- Duplicado real: `ipc_empalme` e `ipc_nacional_0_ipc` son la misma serie desde 2017. Mostrar una sola al público y mantener las dos por dentro (`web/lib/preciosMundo.ts:27` depende de la segunda).

### M5. Secciones que no sirven a la visión o la ponen en riesgo
- **Elecciones (voto estimado):** proyecta votos con correlaciones sobre unas 8 elecciones. Es estadísticamente débil y se lee como pronóstico político. Sugiero sacarla del menú o marcarla como experimento.
- **Ranking 0 a 100:** un puntaje único por presidente es una opinión con forma de número, y choca con "sin opinión". Sugiero conservar la comparación indicador por indicador y quitar o relegar el puntaje.
- **Curiosidades:** quedó como aviso y redirección; se puede quitar del menú.
- **Esfuerzo:** S.

### M6. Plantillas: 82 tarjetas en una sola lista
- En celular la página mide 14.300 px (unas 18 pantallas). Agregar filtros por tema arriba y mostrar 6 por grupo con "ver más".
- **Esfuerzo:** S.

### M7. Mantenimiento del pipeline
- `obtener_datos.py:165-166` baja datos sin caché al arrancar: si esa fuente falla, se cae toda la corrida.
- La tabla `ipc_nacional` de INDEC se consulta 3 veces; Bluelytics, 2.
- Hay cuatro funciones de caché distintas y varios helpers repetidos entre módulos.
- UTDT "situación personal" está cortada en 2005 y "situación macroeconómica" no aparece: probable id equivocado.
- `soja_chi` y `ctx_soja` son la misma magnitud de dos fuentes; `bcra_4` no se usa en ningún lado.
- **Esfuerzo:** M.

## Prioridad baja
- `web/lib/oraciones.ts:29`: la exclusión del IPC general no funciona (compara con un id que no existe), así que se cuela en "¿Qué subió más?".
- Id engañoso `ipc_<región>_s_bienes` (es "Servicios"); unidad del aceite distinta entre regiones; el comentario de `salarios.py` dice 1993 y la serie arranca en jul-94.
- 18 de los 74 elementos tocables de la portada miden menos de 40 px; el diseño declara 44.
- Las bandas mínimo/máximo de series diarias pesan 206 KB (21 % de los datos); falta confirmar dónde se usan.

## Qué funciona bien y conviene conservar
- El buscador de la portada con sinónimos ("sueldo" encuentra salarios y jubilación).
- Las tarjetas con contexto ("-27 % contra su récord de jul-15"): son el germen de la imagen.
- El estado en la URL y la página de fuentes.
- Sin desborde horizontal a 375 px; botones de 40 px en el Histórico.

## Orden propuesto

1. **Arreglos** (una sesión, sin spec): C2, C3, A7, M1, A4.
2. **Spec "Responder con una imagen"** (bloque 7, etapa 1): C1 + A1 + A3, y después A2.
3. **Simplificar:** M2, A5, A6, M5, M6.
4. **Pipeline:** M7 y los puntos de prioridad baja.

## Estado de la etapa 1 (2026-11-10)

- **Hecho y verificado en el navegador:** C2 ("Editar" y página de error en español), A4 (buscador con frases y temas cuando no hay resultado), M1 (grilla de 4 en escritorio; el carrusel queda en celular), y de A7 las variaciones sobre valores negativos y el aviso del IPC usado en los valores reales.
- **Hecho, se ve en la próxima actualización completa de datos:** la fuente de la inflación y del IPC empalmado ahora nombra a INDEC y a los IPC de San Luis y CABA (`pipeline/catalogo.py`, `FUENTE_IPC`). `--solo-json` no la toma porque reutiliza los textos guardados.
- **Pendiente:** C3 (canastas): no se pudo abrir `datos/cache/indec_canastas.pkl` por permisos, así que la causa sigue sin confirmar. De A7, marcar los mandatos con datos parciales (hay que distinguir series trimestrales de series que empiezan tarde).

## Qué no se verificó
- El sitio publicado ni un teléfono real (se usó emulación a 375 px sobre el build local).
- El menú nativo de compartir del celular.
- Los archivos de `datos/cache/` (la causa exacta de C3 queda por confirmar).
