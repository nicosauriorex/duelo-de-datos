# Duelo de Datos

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

Baja todas las series (tarda varios minutos) y escribe los JSON de la web en `web/public/datos/`.
Para regenerar solo los JSON sin bajar nada: `python pipeline/obtener_datos.py --solo-json`.
Para armar el sitio: `cd web && npm ci && npm run build` (queda en `web/out/`).

Opcional: con la variable de entorno `INDEC_TOKEN` (registro gratis en api.indec.gob.ar) los precios e IPC se toman de la API de INDEC en vez de los Excel.

## Estructura

- `pipeline/`: descarga y arma las series (Python + pandas).
- `web/`: el sitio (Next.js + TypeScript + uPlot, export estático). Ver [`web/README.md`](web/README.md).
- `datos/cache/`: respaldo de cada fuente, versionado a propósito.
- `docs/`: hoja de ruta, decisiones de arquitectura e ideas.

## Hacia dónde va

Un sitio público con páginas por indicador, gráficos para compartir en redes y una comunidad para comentar y votar datos. Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) y [`docs/DECISIONES.md`](docs/DECISIONES.md).
