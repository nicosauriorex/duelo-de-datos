"""
Series de salarios de largo plazo + deflactores para el gráfico de salarios.

Salarios (pesos corrientes, mensuales):
- SIPA promedio y mediana, asalariados registrados sector privado (Sec. Trabajo, vía datos.gob.ar).
  Incluyen SAC en jun/dic: se separa en "base" (sin SAC) y "prorrateado".
- RIPTE (Sec. Trabajo): CSV de datos.gob.ar (la API de series devuelve vacío). Sin SAC.
- Salario mínimo, vital y móvil (Consejo del Salario, vía datos.gob.ar). Sin SAC.
- Haber mínimo jubilatorio (ANSES, vía datos.gob.ar). Sin SAC ni bonos.

Deflactores:
- IPC Argentina empalmado: INDEC (IPC-GBA) hasta dic-2006, IPC San Luis ene-2007 a jul-2012,
  IPC CABA ago-2012 a dic-2016, IPC Nacional INDEC desde ene-2017 (API INDEC si hay token).
- Tipo de cambio oficial: A3500 BCRA (promedio mensual); 1 peso = 1 dólar antes de 2002.
- Dólar blue: bluelytics.com.ar (promedio mensual de venta) desde 2011; antes se usa el oficial.
- IPC de EEUU: CPI-U (CUUR0000SA0), Bureau of Labor Statistics.
Cada fuente se cachea en datos/cache/ para no depender de que todas respondan siempre.
"""
import io
import json
import urllib.request
from pathlib import Path

import pandas as pd

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
CACHE.mkdir(parents=True, exist_ok=True)
SERIES_API = "https://apis.datos.gob.ar/series/api/series/"
RIPTE_CSV = ("https://infra.datos.gob.ar/catalog/sspm/dataset/158/distribution/158.1/download/"
             "remuneracion-imponible-promedio-trabajadores-estables-ripte-total-pais-pesos-serie-mensual.csv")
IDS = {
    "sipa_prom": "153.1_RNERACIDIO_2009_M_21",
    "sipa_med": "153.1_RNERACIANA_2009_M_20",
    "smvm": "57.1_SMVMM_0_M_34",
    "jub_min": "58.1_MP_0_M_24",
    "ipc_indec_var": "96.3_INGV_2008_M_20",       # % mensual, 1993-2013
    "ipc_sanluis": "197.1_NIVEL_GENERAL_2014_0_13",
    "ipc_caba": "193.1_NIVEL_GENERAL_JULI_0_13",
    "ipc_nac": "148.3_INIVELNAL_DICI_M_26",
}
FX_A3500 = "168.1_T_CAMBI500_D_0_0_17"


def _get(url, data=None, headers=None, timeout=90):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "primero-los-datos-script", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _cacheado(nombre, bajar):
    """Intenta bajar; si falla usa la última copia guardada."""
    f = CACHE / f"{nombre}.csv"
    try:
        s = bajar()
        s.to_csv(f)
        return s
    except Exception as e:  # noqa: BLE001
        if f.exists():
            print(f"  {nombre}: error al bajar ({e}); uso cache {f.name}")
            return pd.read_csv(f, index_col=0, parse_dates=True).iloc[:, 0]
        raise


def _serie_api(sid, extra=""):
    url = f"{SERIES_API}?ids={sid}&limit=1000&format=json&start_date=1990-01-01{extra}"
    d = json.loads(_get(url))
    s = pd.Series({pd.Timestamp(f): v for f, v in d["data"]}, dtype="float64")
    return s.dropna()


def _ripte():
    df = pd.read_csv(io.BytesIO(_get(RIPTE_CSV)), parse_dates=["indice_tiempo"])
    return df.set_index("indice_tiempo")["ripte"].dropna()


def _blue():
    d = json.loads(_get("https://api.bluelytics.com.ar/v2/evolution.json"))
    df = pd.DataFrame(d)
    df = df[df["source"] == "Blue"]
    df["mes"] = pd.to_datetime(df["date"]).dt.to_period("M").dt.to_timestamp()
    return df.groupby("mes")["value_sell"].mean()


def _cpi_usa():
    hoy = pd.Timestamp.today().year
    vals = {}
    cache = CACHE / "cpi_usa.csv"
    inicios = list(range(1990, hoy + 1, 10))
    if cache.exists():  # la API v1 sin clave permite ~25 consultas por día: con cache se pide solo lo reciente
        previo = pd.read_csv(cache, index_col=0, parse_dates=True).iloc[:, 0]
        vals.update(previo[previo.index < f"{hoy - 2}-01-01"].to_dict())
        inicios = [hoy - 2]
    for ini in inicios:  # hasta 10 años por consulta
        body = json.dumps({"seriesid": ["CUUR0000SA0"], "startyear": str(ini),
                           "endyear": str(min(ini + 9, hoy))}).encode()
        d = json.loads(_get("https://api.bls.gov/publicAPI/v1/timeseries/data/", body,
                            {"Content-Type": "application/json"}))
        for x in d["Results"]["series"][0]["data"]:
            if x["period"].startswith("M") and x["period"] != "M13" and x["value"] not in ("-", ""):
                vals[pd.Timestamp(int(x["year"]), int(x["period"][1:]), 1)] = float(x["value"])
    s = pd.Series(vals).sort_index()
    # Meses faltantes (p.ej. oct-2025, cierre del gobierno de EEUU): interpolación lineal
    full = pd.date_range(s.index.min(), s.index.max(), freq="MS")
    return s.reindex(full).interpolate()


def ipc_empalmado(ipc_nac_override=None):
    """Índice de precios Argentina 1993-hoy, encadenando variaciones mensuales."""
    var_indec = _cacheado("ipc_indec_var", lambda: _serie_api(IDS["ipc_indec_var"])) / 100
    sl = _cacheado("ipc_sanluis", lambda: _serie_api(IDS["ipc_sanluis"]))
    caba = _cacheado("ipc_caba", lambda: _serie_api(IDS["ipc_caba"]))
    nac = _cacheado("ipc_nac", lambda: _serie_api(IDS["ipc_nac"]))
    if ipc_nac_override is not None:
        nac = ipc_nac_override.combine_first(nac)
    tramos = [
        var_indec[var_indec.index <= "2006-12-01"],
        sl.pct_change()[(sl.index >= "2007-01-01") & (sl.index <= "2012-07-01")],
        caba.pct_change()[(caba.index >= "2012-08-01") & (caba.index <= "2016-12-01")],
        nac.pct_change()[nac.index >= "2017-01-01"],
    ]
    var = pd.concat(tramos).sort_index()
    var = var[~var.index.duplicated()].dropna()
    idx = (1 + var).cumprod()
    inicio = var.index.min() - pd.DateOffset(months=1)
    return pd.concat([pd.Series({inicio: 1.0}), idx])


def construir(prorratear_sac, ipc_nac_override=None):
    print("Salarios: bajando series...")
    s = {k: _cacheado(k, lambda k=k: _serie_api(IDS[k])) for k in ("sipa_prom", "sipa_med", "smvm", "jub_min")}
    s["ripte"] = _cacheado("ripte", _ripte)
    fx = _cacheado("fx_a3500", lambda: _serie_api(FX_A3500, "&collapse=month&collapse_aggregation=avg"))
    blue = _cacheado("fx_blue", _blue)
    cpi_us = _cacheado("cpi_usa", _cpi_usa)
    ipc_ar = ipc_empalmado(ipc_nac_override)

    df = pd.DataFrame(index=pd.date_range("1994-07-01", pd.Timestamp.today().normalize(), freq="MS"))
    for k in ("sipa_prom", "sipa_med"):
        prorr, base = prorratear_sac(s[k], devolver_base=True)
        df[f"{k}_con"], df[f"{k}_sin"] = prorr, base
    for k in ("ripte", "smvm", "jub_min"):
        df[f"{k}_sin"] = s[k]
        df[f"{k}_con"] = s[k] * 13 / 12
    df["ipc_ar"] = ipc_ar
    fx = fx.reindex(df.index)
    fx[fx.index < "2002-01-01"] = 1.0  # convertibilidad; ene-feb 2002 se interpolan (A3500 arranca en mar-2002)
    fx = fx.where(fx.index > fx.last_valid_index(), fx.interpolate(limit_area="inside"))
    df["fx_oficial"] = fx
    df["fx_blue"] = blue.reindex(df.index).combine_first(fx.where(df.index < "2011-01-01"))
    df["cpi_us"] = cpi_us
    sal_cols = [c for c in df.columns if c.endswith(("_con", "_sin"))]
    df = df.loc[df[sal_cols].notna().any(axis=1)]
    df = df.loc[: df[sal_cols].last_valid_index()]
    for c, ser in [("ipc_ar", ipc_ar), ("fx_oficial", fx), ("fx_blue", blue), ("cpi_us", cpi_us)]:
        print(f"  {c}: hasta {ser.dropna().index.max():%Y-%m}")
    return df
