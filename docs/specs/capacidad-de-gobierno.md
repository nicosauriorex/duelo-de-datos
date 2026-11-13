# Capacidad de gobierno (bloque 6d)

Estado: implementada (2026-11-13), salvo las leyes del Ejecutivo de 1989 a dic-2011 (sin fuente con aprobadas). Código y datos automáticos (DNU y leyes desde dic-2011) del 2026-11-09; bancas, bloques y vetos cargados a mano el 2026-11-13 (ver D-009).

## Objetivo
Mostrar cuánto respaldo tuvo cada presidente en el Congreso y cómo gobernó con él, para juzgar sus resultados con ese contexto. Son cuatro indicadores, todos con el mismo criterio para todos los presidentes desde Menem:
- **Bancas propias y aliadas** en Diputados y en el Senado.
- **Leyes del Ejecutivo**: proyectos que mandó y cuántos se aprobaron.
- **DNU** firmados.
- **Vetos** (totales y parciales) y cuántas veces el Congreso insistió.

Se muestran números crudos, sin puntaje y sin criterio nuevo en el Ranking.

## Qué ve y hace el usuario
1. En **Presidentes** aparece una sección nueva, **Gobierno y Congreso** (`#congreso`), con una fila por presidente (Menem 1 … Milei).
2. En la computadora ve una tabla con todos los indicadores. Ejemplo para Macri: "Diputados 34 % propios + aliados · Senado 21 % · Leyes del Ejecutivo: 98 de 240 (41 %) · DNU 70 (17,5 por año) · Vetos 21 (0 insistidos)" (los números son ilustrativos).
3. En el celular elige un indicador con chips (Bancas, Leyes, DNU, Vetos) y ve una barra por presidente, ordenada por mandato.
4. Toca un presidente y abre su detalle (`cgp`):
   - un gráfico de bancas año por año, propias y aliadas apiladas, en Diputados y en el Senado, con una línea en el 50 % (mayoría) y otra en el quórum;
   - los DNU y los vetos por año, en barras.
5. Abre **"¿Cómo se cuenta?"** y lee la regla de propios y aliados, qué cuenta como ley del Ejecutivo y de dónde sale cada número, con el link a la fuente.
6. En el recuadro **"Contexto del mandato"** (Por presidente y Ranking) ve una línea, por ejemplo: "En el Congreso: 34 % de Diputados y 21 % del Senado propios o aliados al empezar; 98 de 240 leyes del Ejecutivo aprobadas; 70 DNU; 21 vetos."
7. En Plantillas busca "congreso", "DNU" o "vetos" y encuentra, por ejemplo, "DNU por presidente" y "Bancas del oficialismo por presidente".

## Requisitos

### Criterios (se publican en la página tal cual)
1. **Propios**: bancas de los bloques que responden al frente o partido con el que el presidente llegó al cargo. Para Duhalde, que asumió por la Asamblea Legislativa, se toman los bloques del PJ.
2. **Aliados**: bancas de los bloques que integraban el interbloque o la coalición formal del oficialismo en cada corte (requisito 3). Se fija **a mano por corte**, con la fuente de cada asignación. No cuentan los acuerdos puntuales para una votación.
3. **Cortes de composición**: la composición se toma al **1 de marzo de cada año** (inicio de sesiones ordinarias) y en el **día que asume cada presidente**. El "al empezar" del resumen es el corte de la asunción. También se muestra el promedio de todos los cortes del mandato.
4. **Bancas en porcentaje** del total de la cámara en ese corte, porque el tamaño cambió: Diputados pasó de 254 a 257 bancas y el Senado de 48 a 72. Las bancas vacantes no se cuentan.
5. **Leyes del Ejecutivo**:
   - Enviadas = proyectos de ley con origen en el Poder Ejecutivo (mensajes del PEN) ingresados durante el mandato.
   - Aprobadas = las enviadas que se sancionaron antes de que termine el mandato.
   - Se muestra "a de e (porcentaje)". El Presupuesto se cuenta como cualquier otra ley.
6. **DNU**: decretos de necesidad y urgencia firmados en el mandato, en total y por año de mandato. Antes de la reforma de 1994 no existía la figura en la Constitución: para Menem 1 se usa el conteo de la fuente y se avisa en una nota.
7. **Vetos**: leyes vetadas en el mandato, separadas en totales y parciales. **Insistidos** = vetos que el Congreso superó con dos tercios en ambas cámaras, contados en el mandato del presidente que vetó.
8. **Por año de mandato**: DNU y vetos se muestran también divididos por los años que duró el mandato (Duhalde duró 1,4 años), para comparar mandatos de distinta duración. El mandato en curso se cuenta hasta el último dato.

### Datos (pipeline)
9. Antes de programar, confirmar cada fuente con el agente `investigador-datos`. Lo que haya en formato descargable se baja solo; lo que esté solo en PDF se carga a mano (requisito 10).
10. **Tabla a mano**: archivos CSV **versionados** en `datos/manual/` (decisión D-009), con una columna `fuente` (URL) en cada fila:
    - `congreso_bancas.csv`: `fecha_corte, camara, presidente, propios, aliados, total, fuente, nota`.
    - `congreso_bloques.csv`: `fecha_corte, camara, bloque, bancas, rol (propio|aliado|otro), fuente`. Es el detalle de la tabla anterior, para poder revisar cada asignación.
    - `leyes_ejecutivo.csv`: `presidente, enviadas, aprobadas, fuente, nota`.
    - `vetos.csv`: `presidente, anio, totales, parciales, insistidos, fuente`.
    - `dnu.csv`: `presidente, anio, cantidad, fuente`, solo si no se pueden bajar automáticamente (requisito 12).
11. Fuentes para armar la tabla, a confirmar en el requisito 9:
    - Bancas: informes de composición de la Dirección de Información Parlamentaria de Diputados ([composición 1983-2023](https://www2.hcdn.gob.ar/export/hcdn/secparl/dgral_info_parlamentaria/dip/archivos/Comp_Dip_1983-2023.pdf)) y del Senado. Desde 2017 se puede usar el [portal de datos abiertos de Diputados](https://datos.hcdn.gob.ar) si tiene bloques por fecha.
    - Leyes del Ejecutivo: base TRAMI de la Biblioteca del Congreso y el informe de [proyectos presentados desde 1983](https://www3.hcdn.gob.ar/dependencias/secparl/dgral_info_parlamentaria/dip/archivos/CantProyPresDesde1983.pdf).
    - Vetos e insistencias: informe de [leyes insistidas](https://www3.hcdn.gob.ar/dependencias/secparl/dgral_info_parlamentaria/dip/leyes-insistidas/leyes_insistidas_final.pdf) de Diputados y los decretos de veto en Infoleg.
    - DNU: [base Infoleg de normativa nacional](https://datos.gob.ar/dataset/justicia-base-infoleg-normativa-nacional), si la versión completa trae el tipo de decreto. Si no, conteo de SAIJ por año, cargado a mano.
    - Los conteos de terceros (Chequeado, Éforo) sirven solo para controlar: si difieren más de un 10 % de lo cargado, se anota la diferencia en la columna `nota`.
12. **DNU automático si se puede**: si la base completa de Infoleg trae el tipo de norma, el pipeline la baja por la caché (`_cacheado`), filtra los DNU y los cuenta por año y presidente. `dnu.csv` queda solo como respaldo.
13. El pipeline valida la tabla a mano y corta con un error claro (archivo y fila) si encuentra:
    - presidente desconocido (debe ser un id de `PRES_DEF`);
    - propios + aliados mayores que el total;
    - aprobadas mayores que enviadas;
    - fila sin `fuente`.
14. **Aviso de actualización**: si el último corte de bancas es anterior al 1 de marzo del año en curso, o faltan los vetos o los DNU del año anterior, el resumen de la corrida lo dice ("Capacidad de gobierno: falta cargar …"). No es un error.
15. Salida: `web/public/datos/capacidad.json` (formato en "Datos"), generado también con `--solo-json`.

### Cálculo
16. Todo el cálculo vive en `web/lib/capacidad.ts`: porcentajes, promedios del mandato, por año de mandato y el texto del recuadro. La sección, el recuadro y las plantillas lo usan; no hay cuentas en los componentes.
17. Los mandatos y sus fechas salen de `PRES_DEF` (`web/lib/estadisticas.ts`), igual que en el resto del sitio. La configuración de inicio de mandato (T±N, D-005) **no** se aplica a estos conteos: un DNU es de quien lo firmó. Se aclara en "¿Cómo se cuenta?".

### Sección "Gobierno y Congreso" (en Presidentes)
18. Sección nueva en `/presidentes/`, después de "Un presidente, todas las variables", con ancla `#congreso`.
19. **Tabla, de 640 px para arriba**: una fila por presidente y estas columnas:
    - Diputados (% al empezar y promedio);
    - Senado (% al empezar y promedio);
    - leyes del Ejecutivo (a de e, %);
    - DNU (total y por año);
    - vetos (totales + parciales, por año, insistidos).
    Se ordena al tocar el encabezado, como la tabla de "Una variable, todos los presidentes".
20. **Celular (menos de 640 px)**: chips de indicador (`cgi`: bancas | leyes | dnu | vetos), una barra horizontal por presidente con el valor al costado y sin scroll horizontal a 375 px.
21. **Detalle de un presidente** (`cgp`):
    - gráfico de barras apiladas propios/aliados por corte, una para cada cámara, con líneas en 50 % (mayoría) y en el quórum (mitad más uno);
    - barras de DNU y vetos por año;
    - tabla de bloques del corte de asunción, sacada de `congreso_bloques.csv`, con su rol.
22. Bloque desplegable **"¿Cómo se cuenta?"** con los criterios 1 a 8, en lenguaje simple, y las fuentes con links.
23. Celdas sin dato: "—" con tooltip "sin dato cargado". El mandato en curso lleva la marca "en curso, hasta <mes-año>".

### Integración
24. **Recuadro "Contexto del mandato"**: una línea nueva con bancas al empezar (las dos cámaras), leyes del Ejecutivo aprobadas, DNU y vetos, y el link "Ver gobierno y Congreso" → `/presidentes/?cgp=<id>#congreso`. Si no hay datos del presidente, no se muestra la línea.
25. **Plantillas** (curadas, grupo nuevo "Gobierno y Congreso"):
    - "Bancas del oficialismo por presidente" → `cgi=bancas`;
    - "Leyes del Ejecutivo aprobadas por presidente" → `cgi=leyes`;
    - "DNU por presidente" → `cgi=dnu`;
    - "Vetos por presidente" → `cgi=vetos`.
    Etiquetas: congreso, diputados, senado, bancas, mayoría, leyes, decretos, DNU, vetos, oficialismo.
26. **Fuentes**: la página de Fuentes lista las nuevas con el aviso "datos cargados a mano a partir de informes oficiales; última carga: <fecha>".
27. Parámetros nuevos en `web/lib/url.ts`: `cgi`, `cgp`. Valores inválidos se ignoran.

## Datos
`web/public/datos/capacidad.json` (generado, no versionado):

```json
{
  "bancas": [
    { "fecha": "2015-12-10", "camara": "dip", "pres": "macri", "propios": 41, "aliados": 45, "total": 257 }
  ],
  "bloques": { "2015-12-10|dip": [ { "b": "PRO", "n": 41, "rol": "propio" } ] },
  "leyes": { "macri": { "enviadas": 240, "aprobadas": 98 } },
  "dnu": { "macri": { "2016": 25, "2017": 18 } },
  "vetos": { "macri": { "2016": { "t": 3, "p": 2, "i": 0 } } },
  "ultima_carga": "2026-11-09",
  "fuentes": { "bancas": ["https://…"], "leyes": ["…"], "dnu": ["…"], "vetos": ["…"] },
  "notas": { "menem1": "DNU anteriores a la reforma de 1994: …" }
}
```

Los archivos de `datos/manual/` se versionan y se editan a mano; el JSON no.

## Casos borde
- **Presidente con un mandato muy corto** (Duhalde) o en curso (Milei): los "por año" usan la duración real; el en curso se marca.
- **Cambio de presidente fuera del 10 de diciembre** (De la Rúa a Duhalde, Duhalde a Kirchner): los DNU, vetos y leyes se asignan por fecha de firma o ingreso, no por año.
- **Interinatos de pocos días** (Puerta, Rodríguez Saá, Caamaño, dic-2001): no son presidentes de `PRES_DEF`; lo que firmaron queda afuera y se aclara en la nota.
- **Bloque que cambia de rol a mitad de año** (un aliado que rompe): cuenta como aliado hasta el corte siguiente. La nota de la fila lo menciona.
- **Senado antes de 2001** (elección indirecta y 48 o 72 bancas según el año): se usa el total de ese corte.
- **Ley vetada en un mandato e insistida en el siguiente**: la insistencia cuenta para el que vetó.
- **Fuentes que no coinciden** (por ejemplo, conteos de DNU de Menem entre 195 y 574 según la fuente): se usa la fuente oficial elegida, se cita y se avisa en la nota.
- **Falta un indicador para un presidente**: "—" en la tabla, sin barra en el celular y sin esa parte en el recuadro.

## Fuera de alcance
- Criterio de Ranking o puntaje de "capacidad".
- Aliados según votaciones nominales.
- Gabinete (cambios de ministros), quórum de sesiones clave y años sin Presupuesto aprobado: quedan anotados en IDEAS.md para más adelante.
- Leyes de origen parlamentario, iniciativa por diputado o bloque.
- Presidentes anteriores a 1989.

## Cómo se verifica
1. `python pipeline/obtener_datos.py` termina sin error y genera `capacidad.json`; `--solo-json` también, sin red.
2. Romper a propósito una fila de `datos/manual/congreso_bancas.csv` (por ejemplo, propios mayores que el total): el pipeline corta con un mensaje que nombra el archivo y la fila. Volver a dejarla bien.
3. Controlar a mano contra la fuente oficial:
   - bancas propias de Macri en Diputados al 10-dic-2015;
   - vetos totales de Menem 1;
   - DNU de Milei en 2024.
   Anotar las diferencias con Chequeado o Éforo si las hay.
4. `cd web && npm run tipos && npm run build` sin errores.
5. Servir `web/out` (configuración `web-out`) y revisar a 375 px y en computadora:
   - la sección en Presidentes, con la tabla ordenable en computadora y los chips con barras en el celular, sin scroll horizontal;
   - el detalle de Macri y de Milei, con las barras apiladas, la línea del 50 % y la marca "en curso" en Milei;
   - "¿Cómo se cuenta?" con los criterios y los links;
   - la línea del recuadro "Contexto del mandato" en Por presidente y en Ranking;
   - las 4 plantillas desde el buscador ("DNU", "vetos", "congreso");
   - un link con `?cgi=xxx&cgp=nadie` carga sin error.
