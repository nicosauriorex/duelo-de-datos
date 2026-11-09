# Correcciones del Histórico

## Objetivo
Dos ajustes a lo que ya está hecho en Histórico:
- **Sacar "Otros gráficos interesantes".** Dólares, brecha, soja y Rosario/Chicago son series del catálogo y se pueden elegir como cualquier variable, así que esos cuatro gráficos sueltos sobran.
- **Gráficos uno al lado del otro.** Hasta 4 gráficos en la computadora, para comparar cuatro cosas a la vez; en el celular siguen apilados.

## Qué ve y hace el usuario
1. Entra a Histórico y abajo ya no están los cuatro gráficos fijos de dólar y soja.
2. Quiere ver los cuatro dólares juntos: agrega Dólar oficial, Blue, MEP y CCL al mismo gráfico. Como comparten la unidad ($ por US$), van todos en el mismo eje, en valor (no hace falta pasar a base 100).
3. O entra a Plantillas, busca "dólares" y abre "Los cuatro dólares", que arma lo mismo.
4. En la computadora toca **+ Agregar gráfico** tres veces y ve una grilla de 2×2: salario real, dólar blue, inflación y pobreza a la vez. En el celular, los mismos cuatro, uno debajo del otro.

## Requisitos

### Sacar "Otros gráficos interesantes"
1. Se borra la sección "Otros gráficos interesantes" de Histórico (`Fijos`, `FijosCarga`, `FIJOS_IDS` y sus estados `fx`, `fb`, `fxm`, `fxbd`, `sm`, `sf`, `rt`).
2. Las series que usaba (`fx_*`, `brecha_*`, `soja_chi`, `soja_ros`, `soja_ratio_*`) se siguen eligiendo desde el selector de variables, como ya ocurre hoy.
3. Lo que los gráficos fijos hacían y no se podía armar con variables se cubre así:
   - **Varias series de la misma unidad en valor**: en modo valor, se pueden poner **hasta 4 variables si todas tienen la misma unidad** (con la medida aplicada), en un solo eje. Con unidades distintas sigue el límite de 2 (eje izquierdo y derecho). El botón de agregar dice "+ Agregar variable (misma unidad, n de 4)" o "+ Agregar una segunda variable (eje derecho)", según corresponda.
   - **Rango mín/máx de los dólares**: ya existe en el gráfico principal ("Rango" en Configurar gráfico) para las series que tienen mínimo y máximo diario.
   - **Soja de Rosario a un dólar elegido**: ya existe con la medida "Dólares" → cotización.
4. Plantillas curadas que reemplazan a cada gráfico fijo (en `web/lib/plantillas.ts`, grupo "Dólar y mercados" o "Sector externo"), si no existen ya:
   - "Los cuatro dólares en pesos de hoy" (oficial, blue, MEP y CCL, medida pesos reales, mismo eje).
   - "Brecha blue, MEP y CCL" (las tres brechas, mismo eje).
   - "Soja: Chicago contra Rosario" (ya existe).
   - "Soja: lo que recibe el productor, a los cuatro dólares" (los cuatro `soja_ratio_*`, mismo eje).
5. Links viejos con los parámetros de los gráficos fijos (`fx`, `fb`, `fxm`, `fxbd`, `sm`, `sf`, `rt`): se ignoran sin error y el resto de la vista carga igual.
6. En `web/app/historico/page.tsx` y textos de ayuda, se saca toda mención a "Otros gráficos interesantes" o "Dólar y soja".

### Gráficos uno al lado del otro
7. Con 2 o más gráficos y un ancho de 1024 px o más, los gráficos se ordenan en una grilla de 2 columnas: 2 gráficos = uno al lado del otro; 3 = dos arriba y uno abajo; 4 = 2×2.
8. Entre 640 y 1023 px y en celular (menos de 640 px): una columna, uno debajo del otro (como hoy).
9. En la grilla, cada gráfico tiene todo lo suyo (título, variables, Configurar gráfico, Gráfico/Tabla, expandir, chips de resumen), en versión compacta:
   - alto del gráfico de ~260 px en vez de 340;
   - fila de variables en una línea con scroll horizontal si no entra;
   - chips de resumen en una fila deslizable (como en el celular).
10. Con un solo gráfico, se ve como hoy, a todo el ancho.
11. Expandir un gráfico de la grilla lo muestra a pantalla completa como siempre.
12. El eje X de cada gráfico en la grilla usa el ancho real de su columna para elegir el paso de las etiquetas (sin años pisados).

## Datos
No hay datos nuevos. Se dejan de leer los parámetros `fx`, `fb`, `fxm`, `fxbd`, `sm`, `sf`, `rt`.

## Casos borde
- En modo valor con 3 o 4 variables de la misma unidad, el usuario cambia la medida de una y la unidad deja de coincidir: se mantienen solo las 2 primeras (la segunda pasa al eje derecho) y aparece el aviso "Con unidades distintas entran 2 variables".
- Link con 3 variables en `v` de distinta unidad en modo valor: se cargan las 2 primeras, como hoy.
- Pasar de base 100 con 6 variables a valor: si todas comparten unidad, quedan las 4 primeras; si no, las 2 primeras.
- Grilla con un gráfico vacío (recién agregado, sin variable): ocupa su lugar en la grilla con el botón de elegir variable.
- Ventana que cambia de ancho (girar la tablet, achicar la ventana): la grilla pasa de 2 columnas a 1 y los gráficos se redibujan.

## Fuera de alcance
- Período o frecuencia propios de cada gráfico (siguen compartidos).
- Más de 4 gráficos.
- Elegir el orden de los gráficos en la grilla arrastrando.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px, a 800 px y a 1280 px:
   - No queda "Otros gráficos interesantes" ni carga de sus series al entrar.
   - Agregar los cuatro dólares en modo valor: entran en un solo eje; agregar un salario después: avisa que solo entran 2 con unidades distintas.
   - Las 4 plantillas de reemplazo abren lo que dicen.
   - Un link viejo con `?fx=blue,mep&sm=usdr&rt=blue` carga sin error.
   - Con 1, 2, 3 y 4 gráficos a 1280 px: 1 a todo el ancho, 2 lado a lado, 3 en 2+1, 4 en 2×2. A 800 y 375 px, apilados.
   - En la grilla: Configurar, Gráfico/Tabla, expandir y zoom funcionan en cada gráfico; el eje X no pisa años.
