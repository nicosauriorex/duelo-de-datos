# DatosArgentina

Datos económicos de Argentina en una sola página: precios, salarios, dólar, actividad, pobreza, cuentas fiscales y sector externo. Todo sale de fuentes oficiales o públicas y se actualiza solo.

## De dónde salen los datos

- **INDEC**: IPC, precios promedio, actividad, pobreza (Excel públicos y, si hay token, la API `api.indec.gob.ar`).
- **BCRA**: tipo de cambio oficial, reservas, tasas, agregados monetarios.
- **datos.gob.ar** (API Series de Tiempo): salarios SIPA de la Secretaría de Trabajo, ANSES y otras series del Estado nacional.
- **Bluelytics / ArgentinaDatos**: cotizaciones del dólar libre.

El detalle de cada serie (id, fuente, unidad, frecuencia) está en [`pipeline/catalogo.py`](pipeline/catalogo.py).
Si una fuente se cae, se usa la última copia guardada en `datos/cache/`.

## Cómo correrlo

Requiere Python 3.14.

```bash
pip install -r requirements.txt
python pipeline/obtener_datos.py
```

Baja todas las series (tarda varios minutos) y genera `DatosArgentina.html`, que se abre directo en el navegador.
Para recompilar solo la página sin bajar nada: `python pipeline/obtener_datos.py --solo-pagina`.

Opcional: con la variable de entorno `INDEC_TOKEN` (registro gratis en api.indec.gob.ar) los precios e IPC se toman de la API de INDEC en vez de los Excel.

## Estructura

- `pipeline/`: descarga y arma las series (Python + pandas).
- `src/`: la página (HTML, CSS y JS sin frameworks) que se compila con los datos.
- `datos/cache/`: respaldo de cada fuente, versionado a propósito.
- `docs/`: hoja de ruta, decisiones de arquitectura e ideas.

## Hacia dónde va

Un sitio público con páginas por indicador, gráficos para compartir en redes y una comunidad para comentar y votar datos. Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) y [`docs/DECISIONES.md`](docs/DECISIONES.md).
