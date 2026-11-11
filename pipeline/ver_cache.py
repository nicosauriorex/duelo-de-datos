"""Mira un archivo de datos/cache/ sin volcarlo: columnas, tamaño y pocas filas.

Uso:
  python pipeline/ver_cache.py                      lista los archivos del caché (nombre y tamaño)
  python pipeline/ver_cache.py indec_canastas       columnas, tipos, cantidad de filas y las últimas 8
  python pipeline/ver_cache.py indec_canastas --donde codigo=CBA --filas 12
  python pipeline/ver_cache.py d_a3500_bcra --desde 2024-01-01 --hasta 2024-01-31

Nunca muestra más de 60 filas ni más de 200 caracteres por celda. No acepta compilado.json (es enorme).
"""
import argparse
import json
import sys
from pathlib import Path

import pandas as pd

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
MAX_FILAS = 60


def _abrir(nombre):
    candidatos = sorted(p for p in CACHE.glob(nombre + ".*") if p.is_file())
    if not candidatos:
        sys.exit(f"No hay ningún archivo '{nombre}.*' en datos/cache/. Corré el comando sin argumentos para ver la lista.")
    f = candidatos[0]
    if f.name == "compilado.json":
        sys.exit("compilado.json no se abre con esta herramienta (es enorme). Mirá web/public/datos/ en su lugar.")
    if f.suffix == ".pkl":
        return f, pd.read_pickle(f)
    if f.suffix == ".csv":
        return f, pd.read_csv(f)
    if f.suffix == ".json":
        dato = json.loads(f.read_text(encoding="utf-8"))
        if isinstance(dato, list):
            return f, pd.DataFrame(dato)
        if isinstance(dato, dict) and dato and all(not isinstance(v, (dict, list)) for v in dato.values()):
            return f, pd.Series(dato)
        return f, dato
    sys.exit(f"No sé abrir {f.name}.")


def main():
    ap = argparse.ArgumentParser(description="Mira un archivo del caché sin volcarlo.")
    ap.add_argument("nombre", nargs="?", help="nombre del archivo sin extensión (ej. indec_canastas)")
    ap.add_argument("--filas", type=int, default=8, help=f"cuántas filas mostrar (máximo {MAX_FILAS})")
    ap.add_argument("--donde", action="append", default=[], help="filtro columna=valor (se puede repetir)")
    ap.add_argument("--desde", help="fecha mínima (para series con índice de fechas)")
    ap.add_argument("--hasta", help="fecha máxima (para series con índice de fechas)")
    ap.add_argument("--inicio", action="store_true", help="mostrar las primeras filas en lugar de las últimas")
    a = ap.parse_args()

    if not a.nombre:
        for p in sorted(CACHE.iterdir()):
            if p.is_file():
                print(f"{p.stat().st_size / 1024:>10.0f} KB  {p.name}")
        return

    f, dato = _abrir(a.nombre)
    n = max(1, min(a.filas, MAX_FILAS))
    print(f"{f.name}: {f.stat().st_size / 1024:.0f} KB")
    if not isinstance(dato, (pd.DataFrame, pd.Series)):
        claves = list(dato)[:40] if isinstance(dato, dict) else []
        print(f"JSON con estructura anidada. Tipo: {type(dato).__name__}. Primeras claves: {claves}")
        return

    if isinstance(dato, pd.DataFrame):
        print(f"{len(dato)} filas. Columnas: " + ", ".join(f"{c} ({t})" for c, t in dato.dtypes.astype(str).items()))
        for cond in a.donde:
            col, _, val = cond.partition("=")
            if col not in dato.columns:
                sys.exit(f"No existe la columna '{col}'.")
            dato = dato[dato[col].astype(str) == val]
        if a.donde:
            print(f"Con el filtro: {len(dato)} filas.")
    else:
        print(f"Serie de {len(dato)} valores. Índice: {dato.index.dtype}. De {dato.index.min()} a {dato.index.max()}.")

    if a.desde or a.hasta:
        try:
            dato = dato.sort_index().loc[a.desde:a.hasta]
            print(f"Entre {a.desde or 'el inicio'} y {a.hasta or 'el final'}: {len(dato)} filas.")
        except Exception as e:  # noqa: BLE001
            sys.exit(f"No se pudo filtrar por fecha ({e}).")

    parte = dato.head(n) if a.inicio else dato.tail(n)
    with pd.option_context("display.max_columns", 40, "display.width", 250, "display.max_colwidth", 200):
        print(parte.to_string())


if __name__ == "__main__":
    main()
