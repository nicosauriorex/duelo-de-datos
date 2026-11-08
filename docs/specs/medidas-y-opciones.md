# Medidas y opciones más simples

## Objetivo
Que elegir cómo ver un dato no asuste. Hoy un salario tiene 13 medidas en un solo desplegable: pasan a elegirse en pasos (Pesos / Dólares / Variaciones). Además se ordenan las variaciones, se elige cómo agrupar por trimestre o año, y el selector de variables explica cada categoría en dos líneas con una variable recomendada.

## Qué ve y hace el usuario
1. Agrega "Salario SIPA promedio". En la fila de la variable ve un botón **Pesos reales ▾**.
2. Lo toca y se abre un panel: arriba **Pesos | Dólares | Variaciones**; debajo, solo las opciones de lo elegido.
   - Pesos → Reales · Corrientes.
   - Dólares → Reales · Corrientes, y debajo la cotización: Oficial · Blue · MEP · CCL.
   - Variaciones → Mensual · Interanual (últimos 12 meses) · Mensual promedio de 12 meses, y debajo: Nominal · Real (descontada la inflación).
3. Cada toque aplica al instante y el botón muestra lo elegido ("Dólares reales al blue", "Variación interanual real").
4. Abre IPC empalmado: ve directamente la **inflación interanual**. "Índice tal cual" está al final de las opciones, en gris.
5. Pasa a "por Año" y en el panel de período elige **Promedio** o **Cierre** (último mes de cada año).
6. Toca "+ Agregar variable", entra a **Salarios** y arriba ve dos líneas de qué son, un botón **Recomendado: Salario SIPA mediana** y **ver más**, que despliega la explicación larga de hoy.

## Requisitos

### Medida en pasos
1. La medida de una variable deja de ser un desplegable y pasa a ser un botón con el nombre corto de lo elegido, que abre un panel (componente `Desplegable`, empuja el contenido). Vale en todas las secciones que usan `FilaVariable` (Histórico, Por presidente, Meses de mandato).
2. El panel muestra un primer nivel de grupos y, debajo, solo las opciones del grupo activo. Al abrirlo, el grupo activo es el de la medida actual.
3. Grupos y opciones según el tipo de serie (`tipo` del catálogo):

   | Tipo | Grupos y opciones (la primera de cada fila es la de por defecto dentro del grupo) |
   |---|---|
   | `ars` (montos en pesos) | **Pesos**: Reales · Corrientes. **Dólares**: Reales · Corrientes → Oficial · Blue · MEP · CCL. **Variaciones**: Mensual · Interanual · Mensual promedio 12 meses → Nominal · Real |
   | `fx` (dólar) | **Pesos**: Reales · Corrientes · Reales netos de inflación de EE.UU. **Variaciones**: (igual que arriba) |
   | `usd` (montos en dólares) | **Dólares**: Corrientes · Reales. **Pesos**: Corrientes · Reales (al oficial) |
   | `idx` de Salarios | **Índice**: Real · Tal cual (gris, último). **Variaciones**: (igual que arriba) |
   | `idx` de Precios | **Variaciones**: (igual que arriba; Real = contra la inflación general). **Índice**: Precio relativo (contra la inflación general) · Tal cual (gris, último) |
   | `tasa` | Un solo grupo, sin títulos: TNA · TEA · Real anual · Real mensual |
   | `none` que no es % (ej. EMAE, producción industrial, índices de actividad) | **Valor**: Tal cual. **Variaciones**: Mensual · Interanual · Mensual promedio 12 meses (solo nominal) |
   | `none` en % o tasa | Sin botón: se muestra la unidad, como hoy |

4. Con un solo grupo de una sola opción no hay botón (se muestra la unidad, como hoy).
5. "Tal cual" de un índice va siempre al final de su grupo y en color apagado (`--text-muted`), con el texto "Índice tal cual (base 100)".
6. Al IPC general (`ipc_empalme` y las series de nivel general del IPC nacional) no se le ofrecen "Real" ni "Precio relativo": serían el índice contra sí mismo, una línea plana.
7. El botón y el panel funcionan con teclado: Enter o Espacio abre, Tab recorre, Escape cierra y devuelve el foco al botón.
8. A 375 px, la fila de la variable con el botón de medida ocupa como máximo dos líneas.

### Variaciones
9. Se saca "Acumulada en el año".
10. "Interanual" se muestra como "Interanual (últimos 12 meses)".
11. Nueva: **Mensual promedio de 12 meses** = promedio geométrico de las variaciones mensuales de los últimos 12 meses: `((x_t / x_{t-12})^(1/12) − 1) × 100`. Unidad: "% mensual promedio (últimos 12 meses)".
12. Nueva opción **Real** para las tres variaciones: se calcula sobre la serie deflactada por `ipc_empalme` (`x_t / IPC_t`). En índices de precios es la variación contra la inflación general. Unidad con el agregado ", real (descontada la inflación)".
13. Códigos de medida en la URL: `vm`, `via`, `vp12` (nominales) y `vm_r`, `via_r`, `vp12_r` (reales). El código viejo `vac` se interpreta como `via` (links viejos siguen andando).
14. Todo lo que hoy reconoce variaciones (por ejemplo `estadisticas.ts`, que las trata como %) reconoce los códigos nuevos.

### Medida por defecto
15. Índices de Precios (`idx` de Precios): **Interanual nominal**.
16. `none` que no es %: Tal cual (como hoy).
17. El resto, igual que hoy.
18. Las expresiones con medida explícita (URL, indicadores de Curiosidades) no cambian.

### Agrupar por trimestre o año
19. En el panel de período de la barra fija de Histórico aparece "Al ver por trimestre o año: **Promedio** | **Cierre**". Con Mes se ve deshabilitado o no se ve.
20. Promedio = promedio de los meses (como hoy). Cierre = el último mes con dato del período.
21. Aplica a todos los gráficos de Histórico (principal, dólar y soja), como la frecuencia.
22. Los flujos se siguen sumando y los % del PIB siguen tomando el último mes, elija lo que elija.
23. Queda en la URL: `ag=cierre` (sin el parámetro, promedio).
24. El texto bajo el gráfico dice lo que corresponde ("promedio de los meses" / "último mes de cada año").
25. Con Cierre, un período incompleto toma el último mes que tenga, y la etiqueta sigue avisando "(n de 12 meses)" como hoy.

### Explicación corta y variable recomendada
26. En el selector de variables, al entrar a una categoría de primer nivel (Salarios, Precios, Dólar y tipo de cambio, Mercados, Tasas de interés, Dinero y bancos, Actividad, Empleo pobreza e ingresos, Sector externo, Fiscal, Opinión pública), arriba de la lista se ve:
    - 1 o 2 líneas de qué es la categoría, en lenguaje simple.
    - Un botón **Recomendado: <variable>** que la agrega con su medida recomendada (ej. Salario SIPA mediana en pesos reales).
    - **ver más**, que despliega la explicación larga actual (`INFO_CAT`). Plegada por defecto.
27. Los textos cortos y la recomendada de cada categoría viven en `web/lib/info.ts`, junto a `INFO_CAT`.
28. Recomendadas: las de `crearIndicadores` en `web/lib/catalogo.ts` cuando hay una para la categoría (Salarios → `sipa_med` real; Actividad → EMAE; Empleo → desocupación; Precios → `ipc_empalme` interanual; Dólar → `fx_blue` en pesos reales; Fiscal → resultado primario % del PIB; Sector externo → saldo comercial % del PIB; Dinero y bancos → reservas en dólares reales; Mercados → riesgo país). Para Tasas y Opinión pública, la serie más general de la categoría. La implementación lista las elegidas en el resumen final.
29. En subcategorías se sigue viendo la explicación de hoy, pero plegada con "ver más" si pasa de 2 líneas.

## Datos
No hay series nuevas. Cambios:
- Medidas nuevas en `web/lib/motor.ts` (`vp12`, `*_r`) y `vac` → `via`.
- Parámetro nuevo de Histórico: `ag` (`cierre`; ausente = promedio).
- Textos cortos y recomendadas por categoría en `web/lib/info.ts`.

## Casos borde
- Serie con menos de 12 meses de datos: Interanual y promedio 12 meses quedan vacíos al principio; si no hay ningún valor, "Sin datos para esta selección".
- Series trimestrales: la variación mensual sigue comparando contra el dato anterior disponible (como hoy); interanual contra 12 meses antes; promedio 12 meses igual.
- Variación real cuando falta el IPC de ese mes: vacío en ese mes.
- Al cambiar de variable, la medida vuelve a la por defecto de la nueva (como hoy).
- Variable "en términos de" otra o "% del PIB": no hay botón de medida (como hoy).
- Link viejo con `med=vac`: se ve interanual nominal, y al tocar cualquier cosa la URL guarda `via`.
- Base 100 con variaciones: se mantiene el comportamiento de hoy.
- Panel de medida abierto y se toca otra fila de variable: se cierra el primero.

## Fuera de alcance
- Variaciones en dólares (ej. variación interanual del salario en dólares).
- Máximo y mínimo como forma de agrupar (ya están con el rango mín/máx).
- Cambiar el selector de medida propio de Por presidente (`pam`) y del bloque de dólares de Histórico: siguen como están.
- Plantillas, buscador por palabra, hasta 4 gráficos, configuración global.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - Salario SIPA promedio: los tres grupos con sus opciones; Dólares → Reales → Blue da lo mismo que hoy `usdr_blue`.
   - Variación interanual real del salario: cerca de 0 cuando el salario sube igual que la inflación (comparar a ojo con el salario real).
   - IPC empalmado: se abre en interanual; no ofrece Real ni Precio relativo; "Índice tal cual" al final y en gris.
   - IPC de Prendas: Real = contra la inflación general.
   - EMAE: ahora tiene Variaciones (interanual parecida a la que publica INDEC).
   - Mensual promedio 12 meses de la inflación: comparar un mes a mano con `((IPC_t / IPC_{t-12})^(1/12) − 1) × 100`.
   - Por Año con Cierre: el valor de cada año es el de diciembre (o el último mes que haya).
   - Selector de variables: entrar a Salarios, ver el texto corto, el Recomendado (agrega SIPA mediana real) y ver más.
   - Teclado en el panel de medida.
3. Link viejo con una variable en `vac`: carga en interanual sin error.
4. Por presidente y Meses de mandato: elegir una medida con el panel nuevo y ver que el resultado es el de antes.
