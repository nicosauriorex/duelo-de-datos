# Plantillas y vistas

Estado: implementada (2026-11-08)

## Objetivo
Que encontrar un gráfico interesante sea tan fácil como escribir "asado". Una sección nueva, **Plantillas**, junta cientos de gráficos ya armados (curados a mano y generados solos) con un buscador por palabra. Histórico pasa a admitir hasta 4 gráficos en la misma vista, y cualquiera puede guardar sus vistas como plantillas propias y compartirlas por link.

## Qué ve y hace el usuario
1. En la navegación aparece **Plantillas**, después de Histórico. Entra y ve un buscador ("Buscá: asado, dólar, salario, alquiler…") y debajo tarjetas agrupadas por tema, con las **Destacadas** primero.
2. Cada tarjeta tiene título, último valor, un dato corto (ej. "Récord: 231 kg en ene-18") y un minigráfico. Los datos se bajan a medida que las tarjetas aparecen en pantalla.
3. Escribe "asado" y quedan solo las plantillas de asado: kilos por salario, asado contra la inflación, etc.
4. Toca una y se abre Histórico con esa vista armada y el título de la plantilla arriba.
5. En Histórico toca **+ Agregar gráfico** y arma un segundo gráfico abajo (por ejemplo, el dólar blue en pesos de hoy). Puede tener hasta 4. El período y Mes/Trimestre/Año de la barra fija valen para todos; las variables y Configurar gráfico son de cada uno.
6. Toca **Guardar como plantilla**, le pone "Mi tablero" y queda en **Mis plantillas** (arriba de todo en Plantillas, solo en su navegador).
7. Toca **Compartir**: en el celular se abre el menú de compartir (WhatsApp, X…); en la computadora se copia el link. Quien lo abre ve la misma vista con "Plantilla: Mi tablero" y un botón **Guardar en mis plantillas**.
8. Los datos curiosos que estaban en Curiosidades ahora son plantillas destacadas. En Curiosidades quedan "Lo mejor y lo peor de cada gobierno" y el ranking, con un aviso que lleva a Plantillas.
9. Abajo de Histórico, los gráficos de dólar, brecha y soja siguen igual, bajo el título **Otros gráficos interesantes**.

## Requisitos

### Sección Plantillas
1. Ruta nueva `/plantillas/`, con su ítem en la navegación después de Histórico y su `metadata` (título y descripción propios).
2. Buscador arriba, con el texto en la URL (`q`). Busca sin importar mayúsculas ni tildes; con varias palabras, la plantilla tiene que tener todas. Busca en título, descripción, etiquetas y en el texto de búsqueda de sus series (`textoBusqueda` de `web/lib/catalogo.ts`, que ya incluye sinónimos como "carne", "nafta", "sueldo").
3. Sin búsqueda, las tarjetas se agrupan en este orden: Mis plantillas (si hay), Destacadas, Poder de compra, Precios contra la inflación, Salarios, Dólar y mercados, Actividad, Empleo y pobreza, Sector externo, Fiscal. Con búsqueda, una sola lista, primero las curadas.
4. Con búsqueda sin resultados: "No hay plantillas con "<texto>". Probá con otra palabra o armá el gráfico en Histórico", con link a Histórico.
5. Cada grupo muestra hasta 12 tarjetas y un "Ver las N" para desplegar el resto.

### Tarjetas
6. Cada tarjeta muestra: título, último valor con su fecha, un dato corto y un minigráfico (como las de Datos curiosos, desde 2003 o desde el inicio de la serie si es posterior).
7. El dato corto: en las curadas, el texto propio de la plantilla (ej. el de cada dato curioso de hoy); en las generadas, la variación contra hace un año en verde/rojo/gris según `dir` (mismos colores que Histórico).
8. Los datos de una tarjeta se piden recién cuando la tarjeta entra en pantalla (`IntersectionObserver`), usando la carga por categoría que ya existe (`useSeccion` / `cargar`). Mientras tanto se ve el título y un espacio reservado del mismo alto (sin saltos de página).
9. Si los datos de una tarjeta no se pueden bajar, la tarjeta igual se puede abrir y muestra "Sin vista previa".
10. Toda la tarjeta es un link a Histórico con la vista de la plantilla.

### Definición de las plantillas
11. Las plantillas viven en `web/lib/plantillas.ts`. Cada una tiene: `id` (slug único), `titulo`, `desc` (una línea), `grupo`, `etiquetas` (palabras extra para buscar), `vista` (los parámetros de Histórico que la arman) y, si es curada, una función `dato` que arma el texto corto.
12. **Curadas** (unas 40, escritas a mano): todas las de Datos curiosos de hoy (`web/lib/curiosidades.ts`), los indicadores de `crearIndicadores` (salarios reales, poder de compra, inflación, dólar, actividad, empleo y pobreza, externo, fiscal) y además: brecha blue, MEP y CCL; Rosario/Chicago al oficial y al blue; soja Chicago vs. Rosario; dólares blue por salario; salario mínimo vs. canasta de pobreza; jubilación mínima real; riesgo país; reservas en dólares reales. La lista final la arma la implementación y la deja en el resumen.
13. **Generadas** a partir del catálogo (no se escriben a mano):
    - Cada producto de precios de GBA (`pp_gba_*`): "Cuánto <producto> compra un salario mediano" (en términos de `sipa_med`) y "<producto> contra la inflación" (precio real).
    - Cada rubro del IPC nacional (los de `INDIC_IPC`): "<rubro> contra la inflación".
    - Cada canasta (`can_*`): "Cuántas <canasta> compra un salario mediano".
    - Cada dólar (oficial, blue, MEP, CCL): "Cuántos dólares <x> compra un salario mediano".
14. Una generada no aparece si sus series no están en el catálogo. Si una curada y una generada muestran lo mismo, queda solo la curada.
15. Al abrir una plantilla, Histórico muestra arriba "Plantilla: <título>" y su descripción. Ese encabezado desaparece en cuanto el usuario cambia algo de la vista (pasa a ser su propia vista). El id va en la URL como `pl`.

### Hasta 4 gráficos en Histórico
16. Debajo del gráfico principal, un botón **+ Agregar gráfico** (mientras haya menos de 4). El nuevo gráfico arranca vacío, con el botón para elegir variable.
17. Cada gráfico extra tiene lo mismo que el principal: sus variables (valor hasta 2 o base 100 hasta 10), medida, Configurar gráfico, Gráfico/Tabla, expandir y la fila de chips de resumen. Y un botón **Quitar gráfico**.
18. Período, meses del año, Mes/Trimestre/Año y Promedio/Cierre son compartidos: los de la barra fija valen para todos los gráficos, también los de "Otros gráficos interesantes".
19. URL: el gráfico 1 usa los parámetros de hoy (`v`, `m`, `e`, `bd`, `ej`, `r`, `t`), así los links viejos siguen andando. Los gráficos 2 a 4 usan los mismos nombres con el número al final (`v2`, `m2`, `e2`, …, `t4`). Los parámetros compartidos (`d`, `h`, `ms`, `f`, `ag`) no cambian.
20. Cada gráfico carga sus datos por separado: si uno falla, los demás se ven.
21. A 375 px los gráficos van uno debajo del otro, sin quedar más angostos que el principal de hoy.

### Mis plantillas y compartir
22. En Histórico, dos botones arriba de los gráficos: **Guardar como plantilla** y **Compartir**.
23. Guardar como plantilla pide un nombre (hasta 60 caracteres) y guarda en el navegador: `localStorage["pld:plantillas"]`, una lista de `{ id, nombre, vista, fecha }`. Máximo 50; al llegar al máximo, avisa y no guarda. Lectura y escritura con `try/catch`; si no se puede guardar, lo dice ("No se pudo guardar en este navegador").
24. En Plantillas, el grupo **Mis plantillas** muestra las guardadas con su tarjeta normal, más **Renombrar** y **Borrar** (borrar pide confirmación).
25. Compartir usa el menú de compartir del sistema (`navigator.share`) cuando existe y, si no, copia el link al portapapeles y muestra "Link copiado". El link es la URL actual de Histórico; si la vista es una plantilla propia, agrega su nombre (`pn`).
26. Quien abre un link con `pn` ve "Plantilla: <nombre>" y el botón **Guardar en mis plantillas**, que la guarda con ese nombre (editable).
27. Las tarjetas de las plantillas también tienen un botón chico de compartir.

### Curiosidades y "Otros gráficos interesantes"
28. Se saca la sección "Datos curiosos" de Curiosidades. En su lugar, una línea: "Los datos curiosos ahora están en **Plantillas**", con link a `/plantillas/`.
29. Las tarjetas de datos curiosos pasan a ser plantillas curadas del grupo Destacadas, con su mismo texto (récords, mínimos, etc.).
30. En Histórico, el título "Dólar y soja: varias series a la vez" pasa a ser **Otros gráficos interesantes**. Los cuatro gráficos siguen igual.
31. En Histórico, junto a los botones de arriba, un link **Ver plantillas** a `/plantillas/`.

## Datos
No hay series nuevas. Cambios:
- `web/lib/plantillas.ts`: definición de las curadas y la función que genera las automáticas a partir del catálogo.
- `localStorage["pld:plantillas"]` (ver requisito 23).
- Parámetros nuevos: en Histórico, `v2`…`t4` (gráficos 2 a 4), `pl` (id de plantilla) y `pn` (nombre de plantilla propia); en Plantillas, `q`.

## Casos borde
- Link con `pl` de una plantilla que ya no existe: se ve la vista de la URL sin el encabezado.
- Link con `v3` pero sin `v2`: los gráficos se compactan (el 3 pasa a ser el 2).
- Quitar el gráfico 2 cuando hay 3: el 3 pasa a ser el 2 y la URL se reescribe.
- Plantilla propia con una variable que ya no está en el catálogo: se abre igual, sin esa variable, como hoy con un link viejo.
- Dos plantillas propias con el mismo nombre: se permite; se distinguen por fecha.
- Navegación privada: Mis plantillas funciona mientras la pestaña está abierta y avisa que no se guarda.
- `navigator.share` cancelado por el usuario: no muestra error.
- Búsqueda de una sola letra: no filtra hasta 2 caracteres.
- Muchas tarjetas en el celular: solo se bajan los datos de las que se ven; al volver atrás desde Histórico, la lista recuerda la búsqueda (está en la URL).

## Fuera de alcance
- Galería pública de plantillas de otros usuarios, votos o comentarios sobre plantillas (bloque 8, necesita cuentas).
- Exportar o importar plantillas en un archivo.
- Una página propia por plantilla para buscadores (SEO, vista previa en redes): se verá con el bloque 7 (compartir).
- Imagen descargable del gráfico (bloque 7).
- Separar ranking de presidentes de Curiosidades y las curiosidades por presidente (bloque 6).
- Medir índices del IPC en salarios (hoy "en términos de" solo admite precios en pesos).
- Período independiente por gráfico.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - Plantillas en la navegación; grupos en el orden pedido; Destacadas con los ex datos curiosos y su mismo texto.
   - Buscar "asado", "carne" (sinónimo), "dolar" (sin tilde), "nafta", "sueldo blue": resultados con sentido; "xyz": mensaje de vacío.
   - En la pestaña de red del navegador: al entrar solo se piden los datos de las tarjetas visibles; al bajar se piden más.
   - Abrir una plantilla curada y una generada: Histórico muestra la vista y el encabezado; al cambiar algo, el encabezado se va.
   - Histórico con 4 gráficos: cada uno con sus variables y su Configurar; cambiar a Año en la barra fija cambia todos; recargar mantiene los 4; quitar el 2 compacta.
   - Guardar como plantilla, verla en Mis plantillas, renombrar, borrar.
   - Compartir: en computadora copia el link; abrirlo en otra ventana muestra "Plantilla: <nombre>" y Guardar en mis plantillas.
   - Curiosidades sin Datos curiosos y con el link a Plantillas.
3. Links viejos de Histórico (con `v`, `f`, `r`…) cargan igual que antes.
