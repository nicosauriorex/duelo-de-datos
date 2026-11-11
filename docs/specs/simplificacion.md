# Simplificación del sitio

Estado: implementada (2026-11-11)
Ideas: etapa 3 de `docs/AUDITORIA-2026-11-10.md` (A5, A6, M2, M5, M6) y los puntos de criterio de la revisión con agentes del 2026-11-11.

## Objetivo
Que el sitio hable como el público y no como el catálogo: nombres que se entienden, una sola entrada por dato, un selector sin cientos de series repetidas y secciones ordenadas por lo que más sirve para responder en redes.
No se borra ningún dato ni se rompe ningún link.

## Qué ve y hace el usuario
1. Busca "salario" y ve "Salario mediano (trabajadores registrados)", no "Salario SIPA mediana". El nombre técnico y la fuente siguen en la ficha de información.
2. Busca "inflación" y encuentra una sola entrada, "Inflación", que puede ver mensual, interanual o como promedio de 12 meses.
3. Abre el selector de variables en Precios y ve cada rubro y cada producto una sola vez. Al elegir "Carnes" aparece un desplegable "Región" para pasar de Nacional a Patagonia.
4. En el menú ve "Gráficos listos" en lugar de "Plantillas", con filtros por tema.
5. En Ranking ve primero quién quedó mejor en cada indicador; el puntaje único está más abajo, plegado.
6. En Elecciones lee arriba un aviso claro de que es un ejercicio y no un pronóstico.

## Requisitos

### A. Nombres públicos
1. Archivo nuevo `web/lib/nombres.ts` con la tabla `id → nombre público`. Se aplica una sola vez, al cargar el catálogo (junto a `normalizarMeta`): el campo `n` de la serie pasa a ser el nombre público y el original se conserva en un campo nuevo (`nTecnico`).
2. El nombre público se usa en todo el sitio: selector, títulos, tablas, tarjetas e imágenes. La ficha de información muestra además "Nombre técnico: …" cuando difiere.
3. La búsqueda encuentra la serie por el nombre público, por el técnico y por sus sinónimos.
4. Los nombres escritos a mano en `web/lib/catalogo.ts` (`INDIC`), `web/lib/temas.ts`, `web/lib/plantillas.ts` y `web/lib/oraciones.ts` se alinean con la tabla: no queda "SIPA" ni "RIPTE" a secas en ningún texto visible, salvo en la ficha.
5. Tabla inicial (el resto de las series conserva su nombre):

| id | Nombre público |
|---|---|
| `sipa_med` | Salario mediano (trabajadores registrados) |
| `sipa_prom` | Salario promedio (trabajadores registrados) |
| `ripte` | Salario promedio de empleos estables (RIPTE) |
| `smvm` | Salario mínimo |
| `jub_min` | Jubilación mínima |
| `jub_min_bono` | Jubilación mínima con bono |
| `dg_149_1_tl_indiios_octu_0_21` | Índice de salarios (todos los trabajadores) |
| `dg_149_1_sor_priado_octu_0_28` | Índice de salarios informales |
| `can_cbt_h2` | Línea de pobreza (familia de 4) |
| `can_cba_h2` | Línea de indigencia (familia de 4) |
| `can_cbt` | Línea de pobreza (por adulto) |
| `can_cba` | Línea de indigencia (por adulto) |
| `ipc_empalme` | Inflación |
| `fx_oficial` | Dólar oficial |
| `dg_143_3_no_pr_2004_a_31` | Actividad económica (EMAE) |
| `dg_3_2_ogp_d_2004_t_17` | PIB (producción total del país) |
| `dg_453_1_serie_deseada_0_0_24_58` | Producción industrial |
| `dg_33_2_isac_sin_edad_0_m_23_56` | Construcción |
| `dg_52_2_asdj_0_0_37` | Trabajo informal (asalariados sin aportes) |
| `dg_151_1_aariadotac_2012_m_26` | Empleo privado registrado |
| `pob_tasa_pobreza_personas` | Pobreza |
| `pob_tasa_indigencia_personas` | Indigencia |
| `bcra_1` | Reservas del Banco Central |
| `riesgo` | Riesgo país |
| `dg_saldo_comercial` | Saldo comercial |
| `dg_160_2_tl_cuennte_0_t_22` | Cuenta corriente |
| `mk_merv` | Merval (bolsa argentina) |
| `bcra_26` | Crédito al sector privado |
| `dg_379_9_superavit_017_23_94` | Resultado fiscal primario |
| `dg_379_9_resultado_017_18_38` | Resultado fiscal financiero |
| `bcra_cuasifiscal` | Déficit cuasifiscal del Banco Central |
| `bcra_12` | Tasa de plazo fijo |
| `dg_380_3_icc_nacionnal_0_t_12` | Confianza del consumidor |
| `dg_370_3_icg_nivel_ral_0_0_17_94` | Confianza en el gobierno |
| `soja_ratio_oficial`, `_blue`, `_mep`, `_ccl` | Soja: Rosario contra Chicago (dólar oficial / blue / MEP / CCL) |

### B. Inflación como una sola entrada
6. La entrada pública es `ipc_empalme`, con el nombre "Inflación". Su medida por defecto es la variación mensual; ofrece Mensual, Interanual y Promedio mensual de 12 meses, y al fondo, apagado, "Índice tal cual".
7. `inflacion` e `inflacion_ia` dejan de listarse en el selector, en la búsqueda y en "Todos los datos" de los temas. Siguen existiendo en los datos.
8. Los links viejos siguen mostrando lo mismo: `v=inflacion~…` se lee como `ipc_empalme` con medida mensual y `v=inflacion_ia~…` como `ipc_empalme` con medida interanual. El alias se resuelve al leer la URL (`web/lib/url.ts`), también en las plantillas guardadas en el navegador.
9. Todas las referencias internas a `inflacion` pasan a `ipc_empalme` con medida mensual: portada, temas, oraciones, curiosidades, plantillas, ranking e indicadores. Los números que se ven no cambian (diferencia máxima verificada: 0,0008 puntos).
10. En `/tema/precios/` la lista "Indicadores de inflación" muestra "Inflación" una sola vez.

### C. Región como filtro
11. En el selector de variables y en la búsqueda, las series de "IPC INDEC" y "Precios promedio por producto" se listan una sola vez por rubro o producto: la versión Nacional si existe y, si no, la de GBA. Las de Cuyo, Noreste, Noroeste, Pampeana y Patagonia no se listan.
12. Cuando la variable elegida tiene versiones en otras regiones, "Configurar variable" (y Personalizar → Elegir variable) muestra un grupo **Región** con las regiones disponibles. Cambiarla reemplaza la variable por la de esa región y conserva medida, período y demás opciones.
13. La región elegida se ve en el nombre de la variable ("Carnes · Patagonia").
14. Los links viejos a series regionales abren igual que antes, con su región seleccionada.
15. La correspondencia entre regiones sale de una función de `web/lib/` que agrupa por rubro o producto a partir de los metadatos (`cat` e `id`), sin listas escritas a mano.
16. El contador de series de cada categoría en el selector y en los temas refleja lo que se lista (por ejemplo, Precios deja de decir 445).

### D. Gráficos listos (antes Plantillas)
17. En el menú, los títulos y los textos visibles, "Plantillas" pasa a "Gráficos listos" y "Mis plantillas" a "Mis gráficos". La URL `/plantillas/` y los parámetros `pl` y `pn` no cambian.
18. La página tiene arriba, junto al buscador, filtros por grupo (Destacados, Poder de compra, Precios, Salarios, Dólar, Actividad, Empleo y pobreza, Sector externo, Fiscal, En el mundo, Gobierno y Congreso, Mis gráficos). Uno activo a la vez; "Todos" por defecto. El filtro elegido va en la URL (`g=`).
19. Con "Todos", cada grupo muestra hasta 6 tarjetas y un botón "Ver los N" que lo despliega. Con un filtro o una búsqueda se ven todas las que correspondan.
20. A 375 px la página con "Todos" mide menos de la mitad que hoy (hoy: unos 14.300 px).

### E. Secciones
21. **Ranking**: la página abre con la comparación indicador por indicador (para cada indicador, el orden de los presidentes y quién quedó primero y último). El puntaje de 0 a 100 queda debajo, plegado, con el título "Puntaje combinado" y la aclaración "Depende de los indicadores elegidos; no es una medida oficial". Los links viejos del Ranking abren la misma selección.
22. En el Ranking en celular, lo que hoy es la columna angosta "Mejor en" pasa debajo del nombre del presidente, en una línea.
23. **Elecciones**: sigue en el menú. Arriba de todo, antes de cualquier número, un aviso visible: "Ejercicio estadístico, no un pronóstico. Se basa en pocas elecciones y una relación entre dos datos no prueba que uno cause el otro."
24. **Curiosidades**: sale del menú. La página sigue respondiendo y sus links viejos funcionan.

### F. Detalles de lectura
25. En el gráfico, las líneas de referencia se rotulan con palabras ("Último", "Promedio", "Mediana"; en pantalla angosta "Últ.", "Prom.", "Med."), no con las letras U, P y M. Lo mismo en Opciones del gráfico.
26. Los colores de fábrica de los presidentes se distinguen entre sí: ningún par de mandatos consecutivos ni el par Néstor Kirchner–Macri usa tonos del mismo color. Los colores que el usuario ya eligió no se pisan.
27. Las notas al pie de las tablas quedan fuera del área que se desliza de costado: se leen completas sin deslizar la tabla (Por presidente, detalle del Ranking y cualquier otra tabla con nota).
28. En el panel de compartir en celular, tocar la vista previa la muestra a pantalla completa; otro toque o Escape la cierra.
29. Con un desplegable abierto dentro de una ventana, Escape cierra solo el desplegable.

## Datos
Sin cambios en el pipeline ni en los JSON. No se elimina ninguna serie.
URLs: se agrega `g=` en `/plantillas/`. Ninguna URL existente cambia de significado.

## Casos borde
- Link viejo `v=inflacion~asis~~compra~`: abre "Inflación" en mensual, con el mismo gráfico.
- Link con `inflacion` como segunda variable o como "en términos de": se traduce igual.
- Plantilla propia guardada con `inflacion`: se lee con el alias y no se pierde.
- Producto que existe solo en GBA: sin grupo "Región".
- Rubro que existe en GBA pero no en Nacional (04.3, 09.1): se lista la versión de GBA y el grupo Región ofrece las que existan.
- Variable regional usada "en términos de" otra: la región se conserva.
- Búsqueda de "patagonia": muestra los rubros con la región Patagonia ya elegida (no cero resultados).
- Usuario con colores de presidentes personalizados: se respetan todos.
- Ranking por "Elegir variables" con una sola variable: la comparación muestra esa variable y el puntaje combinado no aparece.
- Nombre público muy largo en la imagen: aplica la regla de reducción ya existente.

## Fuera de alcance
- Quitar series del pipeline o cambiar el catálogo de datos.
- Vista previa de links en redes (bloque 7c).
- Cambiar los cálculos del Ranking o de Elecciones.
- Nuevos nombres para series fuera de la tabla del requisito 5.

## Cómo se verifica
1. `cd web && npm run tipos && npm run build` sin errores.
2. A 375 px y a 1280 px:
   - Portada, `/tema/salarios/` y `/historico/?v=sipa_med~real~~compra~`: dicen "Salario mediano (trabajadores registrados)"; la ficha muestra el nombre técnico.
   - `/historico/?v=inflacion~~~compra~` y `/historico/?v=inflacion_ia~asis~~compra~`: mismos valores que antes (1,7 % y 33,5 % con los datos de hoy), con el título "Inflación".
   - Buscar "inflación" en la portada: una sola variable "Inflación".
   - Selector → Precios: cada rubro una vez; elegir "Carnes", cambiar Región a Patagonia y volver.
   - Un link viejo a una serie regional abre con su región.
   - `/plantillas/`: título "Gráficos listos", filtros, 6 por grupo; `?g=` se conserva al recargar.
   - `/ranking/`: comparación arriba, "Puntaje combinado" plegado.
   - `/elecciones/`: aviso arriba. El menú no muestra Curiosidades; `/curiosidades/` responde.
   - Gráfico: rótulos con palabras. Meses de mandato: Kirchner y Macri se distinguen.
3. Agente `revisor` contra esta spec.
