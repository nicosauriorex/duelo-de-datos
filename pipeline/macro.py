"""
Series de mercado: dólares (oficial, blue, MEP, CCL), riesgo país, tipo de cambio real multilateral y soja.

Se bajan DIARIAS y se resumen por mes en promedio, mínimo y máximo (columnas <x>, <x>_min, <x>_max).

Fuentes:
- Oficial: A3500 BCRA diario (API de estadísticas del BCRA, variable 5); días faltantes con el mayorista de argentinadatos.com.
  1 a 1 hasta dic-2001; ene-feb 2002 interpolados (el A3500 arranca en mar-2002).
- Blue: Ámbito ("dólar informal", diario desde ene-2002); Bluelytics completa días faltantes desde 2013. Antes de 2002, 1 a 1.
- MEP ("bolsa") y CCL: argentinadatos.com (MEP desde oct-2018, CCL desde ene-2013).
- Riesgo país (EMBI Argentina, pb): argentinadatos.com, desde 1999.
- TCRM: BCRA, ITCRMSerie.xlsx (diario desde 1997, base 17-12-2015=100).
- Soja Rosario: Bolsa de Comercio de Rosario, pizarra (y estimativo), $/tn, desde 1995.
- Soja Chicago: futuro CBOT primer vencimiento (ZS=F, Yahoo Finance), centavos/bushel -> US$/tn, desde sep-2000.
Cada serie diaria se cachea en datos/cache/ (si una fuente falla se usa la última copia).
"""
import io
import json
from datetime import date

import pandas as pd

from salarios import _cacheado, _get, SERIES_API

BUSHEL_SOJA_TN = 36.7437  # bushels de soja por tonelada
NOMBRES = ["fx_oficial", "fx_blue", "fx_mep", "fx_ccl", "riesgo", "tcrm", "soja_ros", "soja_chi"]


def _diaria(s: pd.Series) -> pd.Series:
    s = pd.to_numeric(s, errors="coerce").dropna()
    s.index = pd.to_datetime(s.index).normalize()
    return s.groupby(level=0).mean().sort_index()


def _argdatos(path, campo="venta"):
    d = json.loads(_get(f"https://api.argentinadatos.com/v1/{path}", timeout=120))
    return _diaria(pd.DataFrame(d).set_index("fecha")[campo])


def _a3500():
    vals = {}
    for y in range(2002, date.today().year + 1):  # de a un año (la API devuelve hasta 1000 filas)
        d = json.loads(_get(f"{SERIES_API}?ids=168.1_T_CAMBI500_D_0_0_17&limit=1000&format=json"
                            f"&start_date={y}-01-01&end_date={y}-12-31"))
        vals.update({f: v for f, v in d["data"]})
    return _diaria(pd.Series(vals))


def _serie_mensual_api(sid):
    d = json.loads(_get(f"{SERIES_API}?ids={sid}&limit=1000&format=json&start_date=1990-01-01"
                        "&collapse=month&collapse_aggregation=avg"))
    s = pd.Series({pd.Timestamp(f): v for f, v in d["data"]}, dtype="float64")
    return s.dropna()


def _ambito(ruta, desde, hasta):
    """Histórico diario de Ámbito, en tramos de 4 años."""
    out = {}
    for ini in range(desde, hasta + 1, 4):
        url = f"https://mercados.ambito.com//{ruta}/historico-general/01-01-{ini}/31-12-{min(ini + 3, hasta)}"
        filas = json.loads(_get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=120))[1:]
        for f in filas:
            out[pd.to_datetime(f[0], format="%d/%m/%Y")] = float(f[-1].replace(".", "").replace(",", "."))
    return _diaria(pd.Series(out))


def _bluelytics():
    df = pd.DataFrame(json.loads(_get("https://api.bluelytics.com.ar/v2/evolution.json")))
    df = df[df["source"] == "Blue"]
    return _diaria(df.set_index("date")["value_sell"])


def _tcrm():
    raw = pd.read_excel(io.BytesIO(_get(
        "https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/ITCRMSerie.xlsx", timeout=180)),
        sheet_name=None, header=None)
    for hoja in raw.values():
        for r in range(min(40, len(hoja))):
            fila = [str(v).strip().upper() for v in hoja.iloc[r]]
            if "ITCRM" in fila:
                datos = hoja.iloc[r + 1:, [0, fila.index("ITCRM")]].copy()
                datos.columns = ["fecha", "v"]
                datos["fecha"] = pd.to_datetime(datos["fecha"], errors="coerce")
                datos = datos.dropna()
                if len(datos) > 1000:
                    return _diaria(datos.set_index("fecha")["v"])
    raise RuntimeError("no encontré la columna ITCRM en el Excel del BCRA")


def _soja_rosario():
    url = ("https://www.cac.bcr.com.ar/es/api/prices/987/export?product=13&type=any"
           f"&date_start=1995-01-01&date_end={date.today().isoformat()}")
    x = pd.read_excel(io.BytesIO(_get(url, timeout=300)), header=None).iloc[:, [0, 2]]
    x.columns = ["fecha", "precio"]
    x["fecha"] = pd.to_datetime(x["fecha"], errors="coerce", format="mixed")
    return _diaria(x.dropna().set_index("fecha")["precio"])


def _soja_chicago():
    hasta = int(pd.Timestamp.now().timestamp())
    d = json.loads(_get(f"https://query1.finance.yahoo.com/v8/finance/chart/ZS=F?interval=1d&period1=946684800&period2={hasta}",
                        headers={"User-Agent": "Mozilla/5.0"}))["chart"]["result"][0]
    s = pd.Series(d["indicators"]["quote"][0]["close"],
                  index=pd.to_datetime(d["timestamp"], unit="s") - pd.Timedelta(hours=5), dtype="float64")
    return _diaria(s) / 100 * BUSHEL_SOJA_TN


def _mes(s: pd.Series) -> pd.DataFrame:
    g = s.groupby(s.index.to_period("M").to_timestamp())
    return pd.DataFrame({"": g.mean(), "_min": g.min(), "_max": g.max()})


def construir(indice: pd.DatetimeIndex) -> pd.DataFrame:
    """DataFrame mensual (en el índice dado) con promedio, mínimo y máximo de cada serie de mercado."""
    print("Mercados: bajando series diarias...")
    d = {
        "a3500": _cacheado("d_a3500_bcra", lambda: __import__("catalogo")._bcra(5)),  # A3500 diario completo (API BCRA)
        "a3500_mensual": _cacheado("fx_a3500", lambda: _serie_mensual_api("168.1_T_CAMBI500_D_0_0_17")),
        "mayorista": _cacheado("d_mayorista", lambda: _argdatos("cotizaciones/dolares/mayorista")),
        "blue_ambito": _cacheado("d_blue_ambito", lambda: _ambito("dolar/informal", 2002, date.today().year)),
        "blue_bluelytics": _cacheado("d_blue_bluelytics", _bluelytics),
        "mep": _cacheado("d_mep", lambda: _argdatos("cotizaciones/dolares/bolsa")),
        "ccl": _cacheado("d_ccl", lambda: _argdatos("cotizaciones/dolares/contadoconliqui")),
        "riesgo": _cacheado("d_riesgo", lambda: _argdatos("finanzas/indices/riesgo-pais", "valor")),
        "tcrm": _cacheado("d_tcrm", _tcrm),
        "soja_ros": _cacheado("d_soja_rosario", _soja_rosario),
        "soja_chi": _cacheado("d_soja_chicago", _soja_chicago),
    }
    # Días sin cotización vienen como 0 (p.ej. pizarra de Rosario "S/C"): se descartan
    d = {k: s[s > 0] for k, s in d.items()}
    for k, s in d.items():
        print(f"  {k}:{s.index.min():%Y-%m-%d} a {s.index.max():%Y-%m-%d} ({len(s)} días)")

    # Oficial diario (para mín/máx): A3500 diario (tiene años vacíos) completado con el mayorista desde 2011
    oficial = d["a3500"].combine_first(d["mayorista"])
    # Ámbito es la fuente principal (Bluelytics tiene 2011-2012 sin variación diaria); Bluelytics completa días faltantes
    blue = d["blue_ambito"].combine_first(d["blue_bluelytics"][d["blue_bluelytics"].index >= "2013-01-01"])
    fuentes = {"fx_oficial": oficial, "fx_blue": blue, "fx_mep": d["mep"], "fx_ccl": d["ccl"],
               "riesgo": d["riesgo"], "tcrm": d["tcrm"], "soja_ros": d["soja_ros"], "soja_chi": d["soja_chi"]}
    out = pd.DataFrame(index=indice)
    for k, s in fuentes.items():
        m = _mes(s).reindex(indice)
        for suf in ("", "_min", "_max"):
            out[k + suf] = m[suf]

    def tramo(dst, src, mascara):
        for suf in ("", "_min", "_max"):
            out.loc[mascara, dst + suf] = out.loc[mascara, src + suf]

    idx = out.index
    # Oficial promedio: A3500 mensual de la API (completo); después de su último mes, el promedio diario.
    # Donde no hay diarios, mín y máx = promedio.
    am = d["a3500_mensual"].reindex(idx)
    out["fx_oficial"] = am.combine_first(out["fx_oficial"])
    for suf in ("_min", "_max"):
        out["fx_oficial" + suf] = out["fx_oficial" + suf].combine_first(out["fx_oficial"])
    # Oficial: 1 a 1 en la convertibilidad; ene-feb 2002 interpolado
    for suf in ("", "_min", "_max"):
        out.loc[idx < "2002-01-01", "fx_oficial" + suf] = 1.0
    hueco = (idx >= "2002-01-01") & (idx < "2002-03-01")
    interp = out["fx_oficial"].interpolate(limit_area="inside")
    for suf in ("", "_min", "_max"):
        out.loc[hueco, "fx_oficial" + suf] = interp[hueco]
    # Blue: 1 a 1 antes de 2002
    for suf in ("", "_min", "_max"):
        out.loc[idx < "2002-01-01", "fx_blue" + suf] = 1.0
    # CCL: = oficial antes del cepo (hasta oct-2011); = blue entre nov-2011 y dic-2012
    tramo("fx_ccl", "fx_oficial", idx <= "2011-10-01")
    tramo("fx_ccl", "fx_blue", (idx > "2011-10-01") & (idx < "2013-01-01"))
    # MEP: = CCL antes de oct-2018
    tramo("fx_mep", "fx_ccl", idx < "2018-10-01")
    return out
