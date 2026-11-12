"""
Parte diario del BCRA: historia diaria de ocho variables para web/public/datos/diario_bcra.json.
Lee los CSV de datos/cache/ (los que la misma corrida acaba de actualizar, o el último respaldo en --solo-json).
Formato por serie: id, f0 (primera fecha), d (días desde f0, crecientes) y v (valores).
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
MAX_ATRASO_DIAS = 20

# clave -> (id de la API del BCRA, archivo de caché)
VARIABLES = {
    "reservas": (1, "bcra_1"),
    "compras": (78, "bcra_78"),
    "minorista": (4, "bcra_4"),
    "mayorista": (5, "d_a3500_bcra"),  # el mismo diario que baja macro.py
    "tamar": (44, "bcra_44"),
    "badlar": (7, "bcra_7"),
    "base": (15, "bcra_15"),
    "depositos": (21, "bcra_21"),
}


def _leer(archivo):
    f = CACHE / f"{archivo}.csv"
    if not f.exists():
        return pd.Series(dtype="float64")
    s = pd.read_csv(f, index_col=0, parse_dates=True).iloc[:, 0]
    s = s.dropna()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    return s.astype("float64")


def construir_json():
    ahora = datetime.now(timezone(timedelta(hours=-3)))  # hora argentina
    series = {}
    for clave, (vid, archivo) in VARIABLES.items():
        s = _leer(archivo)
        if s.empty:
            print(f"  Parte diario BCRA: la serie '{clave}' ({archivo}) está vacía")
            continue
        f0 = s.index[0].normalize()
        dias = [int((f.normalize() - f0).days) for f in s.index]
        series[clave] = {"id": vid, "f0": f0.strftime("%Y-%m-%d"), "d": dias, "v": [round(float(x), 4) for x in s.values]}
        atraso = (pd.Timestamp(ahora.date()) - s.index[-1].normalize()).days
        if atraso > MAX_ATRASO_DIAS:
            print(f"  Parte diario BCRA: '{clave}' tiene último dato del {s.index[-1]:%Y-%m-%d} ({atraso} días de atraso)")
    return {"actualizado": ahora.replace(microsecond=0).isoformat(), "series": series}
