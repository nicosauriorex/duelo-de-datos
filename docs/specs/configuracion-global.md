# Configuración global

## Objetivo
Que cada persona elija una vez cómo quiere ver la página y que se respete en todas las secciones: el inicio del mandato, que se puede configurar por presidente (todos en T-1, Milei en T+1), y además el dólar preferido, la medida preferida, el tema y el período por defecto. Se guarda en el navegador, sin cuentas.

## Qué ve y hace el usuario
1. En el encabezado de cualquier página hay un **⚙**. Lo toca y se abre el panel **Configuración**.
2. En **Inicio del mandato** elige "Para todos: T-1" y abajo, en la lista de presidentes, pone Milei en "T+1". Los demás quedan en "Igual que todos".
3. Elige **Dólar preferido: Blue**, **Medida preferida: Pesos reales**, **Tema: Oscuro**, **Período por defecto: desde 2011**.
4. Cierra el panel. Por presidente, Meses de mandato, Curiosidades y Elecciones ya usan T-1 para todos y T+1 para Milei. Arriba de cada una ve "Inicio: T-1 · Milei T+1 · **Configurar**", que abre el mismo panel.
5. Vuelve otro día: todo sigue igual.
6. Un amigo le manda un link armado con T (mes de asunción). Lo abre y ve lo del link, con el aviso "Estás viendo el inicio de mandato del link · **Usar el mío**". Su configuración guardada no cambia.

## Requisitos

### Panel de configuración
1. Botón ⚙ en el encabezado de todas las páginas, con `aria-label="Configuración"`. Abre un `Modal` con el título "Configuración".
2. Secciones del panel, en este orden: Inicio del mandato, Dólar preferido, Medida preferida, Período por defecto, Tema.
3. Cada cambio se aplica y se guarda al instante (no hay botón Guardar).
4. Al final, **Volver a lo de fábrica**, que restablece todo a los valores por defecto (tabla de abajo) y lo guarda.
5. A 375 px el panel entra en la pantalla y se desplaza por dentro si hace falta.

### Inicio del mandato
6. El inicio se expresa como un desplazamiento `k` respecto del mes de asunción: `T+k`, con `k` entre **-12 y +24**. Se muestra como "T-12" … "T-1", "T (mes de asunción)", "T+1" … "T+24".
7. "Para todos": un desplegable con ese rango. Por defecto **T-1** (igual que hoy).
8. Debajo, la lista de presidentes (los de `PRES_DEF`), cada uno con un desplegable: "Igual que todos" (por defecto) o un valor del rango.
9. El mes base de un presidente es `asunción + k`, sin pasar del último mes de su mandato ni de antes del primer mes con datos. Si se recorta, la tabla o el gráfico lo indica con el mes real usado (como hoy con T+n).
10. Afecta a Por presidente, Meses de mandato, Curiosidades y Elecciones. Los selectores T-1 / T / T+n de cada sección se reemplazan por la línea "Inicio: <resumen> · Configurar" (ej. "Inicio: T-1 · Milei T+1"), que abre el panel.
11. Los textos que explican la base (ej. `baseTxt`) usan el valor de cada presidente cuando hay excepciones.

### Dólar preferido
12. Oficial · Blue · MEP · CCL. Por defecto **Oficial**.
13. Se usa como cotización por defecto cuando se elige "Dólares" en el panel de medida, en la medida por defecto si la medida preferida es en dólares, en el dólar de Rosario del gráfico de soja y en la medida en dólares de Por presidente.
14. No cambia qué dólares se muestran en el gráfico "Dólares" de Histórico.

### Medida preferida
15. Pesos reales · Pesos corrientes · Dólares reales · Dólares corrientes. Por defecto **Pesos reales**.
16. Es la medida por defecto de los montos en pesos (`tipo: "ars"`) al agregar una variable o cambiarla, en todas las secciones. Las de dólares usan el dólar preferido.
17. No cambia la medida por defecto de índices, tasas, dólar ni montos en dólares, ni las medidas fijas de los indicadores de Curiosidades y Elecciones.

### Período por defecto
18. Todo · 1995 · 2003 · 2011 · 2017 · 2023 · Último año. Por defecto **2003** (igual que hoy).
19. Es el "Desde" de Histórico cuando la URL no trae `d`. El "Hasta" sigue siendo el último dato.

### Tema
20. Automático (sigue al dispositivo) · Claro · Oscuro. Por defecto **Automático**.
21. Se aplica con el atributo `data-theme` en `<html>` (el CSS ya lo soporta). Se aplica antes de pintar la página, con un script chico en el `<head>`, para que no parpadee al cargar.
22. Los gráficos se redibujan con los colores del tema al cambiarlo (hoy `Grafico` ya escucha `data-theme`).

### Guardado
23. Se guarda en `localStorage`, clave `pld:config`, como JSON con un campo `v` de versión. Toda lectura y escritura va dentro de `try/catch`.
24. Si no se puede guardar (navegación privada, almacenamiento bloqueado), la configuración funciona mientras la página está abierta y el panel muestra "No se pudo guardar en este navegador: se va a perder al cerrar".
25. Si lo guardado es inválido o de una versión vieja, se ignora lo que no se entiende y se usan los valores por defecto para eso.
26. Cambiar la configuración en una pestaña se refleja en las otras pestañas abiertas (evento `storage`).

### Links y URL
27. La URL siempre gana sobre la configuración guardada: si trae un parámetro, se usa el del link.
28. Parámetros nuevos para el inicio del mandato: `t0` (para todos, entero de -12 a 24) y `t0p` (excepciones, ej. `milei:1,macri:-2`). Se agregan al link cuando la vista usa algo distinto de la configuración por defecto de fábrica, así un link compartido muestra lo mismo a cualquiera.
29. Los parámetros viejos `b` y `n` se siguen leyendo: `b=prev` → `t0=-1`, `b=asume` → `t0=0`, `b=mas&n=X` → `t0=X` (recortado a 24).
30. Si la URL trae `t0`/`t0p`/`b` y el resultado es distinto de la configuración guardada, se ve el aviso "Estás viendo el inicio de mandato del link · **Usar el mío**". "Usar el mío" saca esos parámetros de la URL. Abrir el panel y cambiar algo también los saca.
31. Para el resto (medida, dólar, período) la URL gana sin aviso: son parte de la vista que se compartió.

## Datos
Nada en el servidor. En el navegador, `localStorage["pld:config"]`:

| Campo | Tipo | Por defecto |
|---|---|---|
| `v` | número de versión | 1 |
| `t0` | entero -12..24 | -1 |
| `t0p` | objeto `{ idPresidente: entero }` | `{}` |
| `dolar` | `oficial` \| `blue` \| `mep` \| `ccl` | `oficial` |
| `medida` | `real` \| `corr` \| `usdr` \| `usd` | `real` |
| `desde` | `todo` \| `1995` \| `2003` \| `2011` \| `2017` \| `2023` \| `ultimo` | `2003` |
| `tema` | `auto` \| `claro` \| `oscuro` | `auto` |

La lectura y escritura vive en un solo lugar (`web/lib/config.ts` + un contexto de React que expone la configuración y la función para cambiarla). El cálculo del mes base por presidente queda en `web/lib/estadisticas.ts` (`baseIdx` recibe el desplazamiento del presidente).

Decisión de arquitectura: preferencias en el navegador hasta que haya cuentas (D-005).

## Casos borde
- Presidente con mandato corto (Duhalde, De la Rúa) y T+24: se usa el último mes de su mandato.
- T-12 para el primer presidente con datos: si no hay datos tan atrás, se usa el primer mes con datos.
- Meses de mandato con bases distintas por presidente: cada línea arranca en su propio mes 0; el eje sigue siendo "meses desde el inicio".
- La página carga antes de leer la configuración: no se debe ver un parpadeo de la vista por defecto a la configurada. El tema se resuelve en el `<head>`; el resto, antes de calcular la primera vista (como hoy se espera a que esté montada la URL).
- Link viejo con `b=mas&n=36`: se ve T+24 (recortado) y el aviso de link.
- Se borra el almacenamiento del navegador: vuelve a lo de fábrica sin error.
- Configuración con un presidente que ya no existe en `PRES_DEF`: se ignora esa excepción.
- Medida preferida "Dólares reales" y una variable sin dólares disponibles (índice, tasa): se usa su medida por defecto.

## Fuera de alcance
- Cuentas y sincronización entre dispositivos (bloque 8).
- Configurar otras cosas (colores, idioma, cantidad de decimales).
- Mostrar los mandatos sombreados en los gráficos de Histórico.
- Cambiar el contenido de Por presidente, Meses de mandato, Curiosidades o Elecciones más allá del selector de inicio.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - ⚙ en todas las páginas; el panel abre, se cierra con Escape y entra a 375 px.
   - Inicio: poner T para todos y Milei T+1. En Por presidente, el inicio de Milei es ene-24 y el de Macri dic-15. En Meses de mandato, la línea de Milei arranca en ene-24. Curiosidades y Elecciones usan lo mismo.
   - Recargar la página: todo sigue. Abrir otra pestaña: igual.
   - Dólar preferido Blue: en Histórico, Salario → Dólares sale al blue; la soja de Rosario sale al blue.
   - Medida preferida Dólares reales: agregar un salario lo muestra en dólares reales al dólar preferido; un índice de precios sigue en interanual.
   - Período 2011: Histórico sin parámetros arranca en ene-11.
   - Tema Oscuro con el dispositivo en claro: oscuro sin parpadeo al recargar; los gráficos con colores oscuros.
   - Volver a lo de fábrica: todo vuelve a la tabla de arriba.
3. Links:
   - Copiar un link de Por presidente con T+1 para Milei y abrirlo en una ventana privada: se ve igual.
   - Abrirlo en el navegador con otra configuración: aviso, "Usar el mío" vuelve a la propia sin perder el resto de los filtros.
   - Link viejo con `?b=asume` y otro con `?b=mas&n=6`: cargan como T y T+6.
4. Ventana privada con almacenamiento bloqueado: la configuración funciona y el panel avisa que no se guarda.
