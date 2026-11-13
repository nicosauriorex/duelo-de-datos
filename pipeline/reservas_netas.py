"""Reservas netas: estimación propia con el método del FMI (docs/specs/herencia.md, fase 3).

netas = reservas brutas (API del BCRA, variable 1) − encajes en dólares de los bancos en el BCRA (variable 1243)
        − swaps con China y el BIS − seguro de depósitos (SEDESA) − crédito neto del FMI desde el acuerdo de 2025.

Los dos primeros son series diarias (respaldos datos/cache/bcra_1.csv y bcra_1243.csv). Los demás son supuestos con cita en
datos/manual/reservas_netas_supuestos.json. No entran (no son públicos): repos y BOPREAL de menos de un año, el swap con el Tesoro
de EE.UU., futuros y forwards, y el oro a precio de programa. Es una estimación: se compara con los stocks que publicó el FMI.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
CACHE = RAIZ / "datos" / "cache"
SUPUESTOS = RAIZ / "datos" / "manual" / "reservas_netas_supuestos.json"
MAX_DIF_CONTROL = 3000   # millones de US$: más que esto contra el FMI, se avisa
MAX_ATRASO_DIAS = 20


def _leer(nombre):
    f = CACHE / f"{nombre}.csv"
    if not f.exists():
        return pd.Series(dtype="float64")
    s = pd.read_csv(f, index_col=0, parse_dates=True).iloc[:, 0].dropna()
    return s[~s.index.duplicated(keep="last")].sort_index().astype("float64")


def _bajar(con_red):
    """Encajes en dólares (variable 1243): con red se baja (respaldo en datos/cache/); las reservas brutas ya las baja catalogo.py."""
    if con_red:
        from catalogo import _bcra
        from salarios import _cacheado
        try:
            _cacheado("bcra_1243", lambda: _bcra(1243))
        except Exception as e:  # noqa: BLE001
            print(f"  Reservas netas: no se pudo bajar la variable 1243 ({e})")
    return _leer("bcra_1"), _leer("bcra_1243")


def _tramo(tramos, fecha):
    """Valor del último tramo que empieza en o antes de `fecha`."""
    v = None
    for t in tramos:
        if pd.Timestamp(t["desde"]) <= fecha:
            v = t["valor"]
    return v


def _fmi(sup, fecha):
    """Crédito neto del FMI desde el inicio del acuerdo de 2025, en millones de US$ a tipos de programa (0 antes de abril de 2025)."""
    f = sup["fmi"]
    meses = sorted(f["deg_fin_de_mes"].items())
    deg = None
    for mes, v in meses:  # el saldo de fin de mes vale para todo ese mes (los desembolsos se ven a fin de mes)
        if pd.Timestamp(mes + "-01") <= fecha:
            deg = v
    if deg is None:
        return 0.0
    return (deg - f["base_deg"]) * f["usd_por_deg"]


def _cuenta(sup, fecha, brutas, encajes):
    # cada componente redondeado como se muestra, y las netas con esos redondeados: la cuenta cierra a la vista
    b, e, sw, se, f = round(brutas), round(encajes), round(_tramo(sup["swaps"], fecha)), round(_tramo(sup["sedesa"], fecha)), round(_fmi(sup, fecha))
    # netas_bcra: la definición del Banco Central no resta el crédito del FMI (es deuda del Tesoro, no del BCRA)
    return {"fecha": fecha.strftime("%Y-%m-%d"), "netas": b - e - sw - se - f, "netas_bcra": b - e - sw - se, "brutas": b, "encajes": e, "swaps": sw, "sedesa": se, "fmi": f}


def construir_json(con_red=True):
    sup = json.loads(SUPUESTOS.read_text(encoding="utf-8"))
    brutas, encajes = _bajar(con_red)
    if brutas.empty or encajes.empty:
        raise ValueError("faltan las reservas brutas (bcra_1) o los encajes (bcra_1243) en datos/cache/")
    df = pd.concat({"b": brutas, "e": encajes}, axis=1).dropna()
    df = df[df.index >= pd.Timestamp(sup["inicio"])]
    if df.empty:
        raise ValueError("sin días con reservas y encajes desde el inicio de la estimación")

    # controles: la misma cuenta en las fechas en que el FMI publicó un stock (el día hábil anterior si esa fecha no está)
    controles = []
    for c in sup["controles"]:
        d = df[df.index <= pd.Timestamp(c["fecha"])]
        if d.empty:
            continue
        x = _cuenta(sup, d.index[-1], d["b"].iloc[-1], d["e"].iloc[-1])
        dif = x["netas"] - c["fmi"]
        controles.append({"fecha": c["fecha"], "propia": x["netas"], "fmi": c["fmi"], "dif": dif, "credito_fmi": x["fmi"], "cita": c["cita"], "url": c["url"]})
        if abs(dif) > MAX_DIF_CONTROL:
            print(f"  Reservas netas: al {c['fecha']} la estimación da {x['netas']} y el FMI {c['fmi']} (diferencia {dif}): revisar los supuestos")

    # controles de la definición del Banco Central (cuadro 1 del informe de política monetaria de dic-2025)
    controles_bcra = []
    for c in sup.get("controles_bcra", []):
        d = df[df.index <= pd.Timestamp(c["fecha"])]
        if d.empty:
            continue
        x = _cuenta(sup, d.index[-1], d["b"].iloc[-1], d["e"].iloc[-1])
        dif = x["netas_bcra"] - c["bcra"]
        controles_bcra.append({"fecha": c["fecha"], "propia": x["netas_bcra"], "bcra": c["bcra"], "dif": dif, "cita": c["cita"], "url": c["url"]})
        if abs(dif) > MAX_DIF_CONTROL:
            print(f"  Reservas netas (definición BCRA): al {c['fecha']} la estimación da {x['netas_bcra']} y el BCRA {c['bcra']} (diferencia {dif})")

    # una por mes (último día hábil con dato) y la última
    mensual = []
    for _, g in df.groupby(df.index.to_period("M")):
        x = _cuenta(sup, g.index[-1], g["b"].iloc[-1], g["e"].iloc[-1])
        mensual.append({"mes": x["fecha"][:7], "fecha": x["fecha"], "netas": x["netas"], "netas_bcra": x["netas_bcra"]})
    ultimo = _cuenta(sup, df.index[-1], df["b"].iloc[-1], df["e"].iloc[-1])

    ahora = datetime.now(timezone(timedelta(hours=-3)))
    atraso = (pd.Timestamp(ahora.date()) - df.index[-1].normalize()).days
    if atraso > MAX_ATRASO_DIAS:
        print(f"  Reservas netas: último dato del {ultimo['fecha']} ({atraso} días de atraso)")
    supuestos = [{"concepto": "swaps con China y el BIS", **t} for t in sup["swaps"]] + [{"concepto": "seguro de depósitos (SEDESA)", **t} for t in sup["sedesa"]]
    supuestos.append({"concepto": "crédito neto del FMI desde el acuerdo de 2025", "desde": "2025-04-01", "valor": None,
                      "cita": f"{sup['fmi']['base_cita']}; {sup['fmi']['usd_por_deg_cita']}; {sup['fmi']['deg_cita']}", "url": sup["fmi"]["url"]})
    return {"actualizado": ahora.replace(microsecond=0).isoformat(), "ultimo": ultimo, "mensual": mensual, "controles": controles,
            "controles_bcra": controles_bcra, "definicion_bcra": {"cita": sup.get("definicion_bcra_cita", ""), "url": sup.get("definicion_bcra_url", "")},
            "supuestos": supuestos, "no_incluye": sup["no_incluye"], "no_incluye_bcra": sup.get("no_incluye_bcra", sup["no_incluye"]),
            "fuentes": "Banco Central, API de estadísticas (variables 1 y 1243); FMI, informes de país 24/167 y 26/105 y posición de Argentina en el Fondo"}


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    j = construir_json(con_red="--bajar" in sys.argv)
    print("último:", j["ultimo"])
    for c in j["controles"]:
        print("control", c["fecha"], "propia", c["propia"], "FMI", c["fmi"], "dif", c["dif"])
    for c in j["controles_bcra"]:
        print("control BCRA", c["fecha"], "propia", c["propia"], "BCRA", c["bcra"], "dif", c["dif"])
