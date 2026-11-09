"""
Contexto internacional (bloque 6b, decisión D-008).

1) Datos anuales por país y grupo del FMI (World Economic Outlook), vía la API de DataMapper:
   https://www.imf.org/external/datamapper/api/v1/<indicador>   (sin clave; devuelve todos los países, se filtra acá)
   Hay que usar el User-Agent por defecto de urllib: con uno de navegador el CDN del FMI responde 403.
2) Proyecciones de abril de cada año (crecimiento e inflación), de la base "Historical WEO Forecasts":
   https://www.imf.org/external/pubs/ft/weo/data/weohistorical.xlsx  (hojas ngdp_rpch y pcpi_pch; columna S<año> = primavera/abril).
   El archivo llega hasta la edición de abril de 2022 y no trae desempleo ni América Latina: ver `proy_abril` en el JSON.
3) Series mensuales para el catálogo (categoría "Contexto internacional"):
   - Precios de soja, maíz, trigo y petróleo Brent: Banco Mundial (Pink Sheet) vía FRED (PSOYBUSDM, PMAIZMTUSDM, PWHEAMTUSDM, POILBREUSDM).
   - Tasa de fondos federales: FRED, FEDFUNDS.
   - Términos de intercambio: INDEC vía datos.gob.ar, 82.2_ITI_2004_T_27 (trimestral, pasado a mensual).

Todo se cachea en datos/cache/ (si la fuente falla se usa la última copia). El JSON final de la web
(contexto.json) también queda en datos/cache/contexto.json para que --solo-json funcione sin red.
"""
import io
import json
import re
import urllib.request
from datetime import date

import pandas as pd

import catalogo
from salarios import CACHE, _cacheado

DATAMAPPER = "https://www.imf.org/external/datamapper/api/v1/"
HISTORICO = "https://www.imf.org/external/pubs/ft/weo/data/weohistorical.xlsx"
FRED = "https://fred.stlouisfed.org/graph/fredgraph.csv?id="
DESDE = 1990

# código del FMI -> nombre en la web
ENTIDADES = {
    "ARG": "Argentina", "BRA": "Brasil", "CHL": "Chile", "URY": "Uruguay", "PRY": "Paraguay", "BOL": "Bolivia", "PER": "Perú",
    "COL": "Colombia", "MEX": "México", "ECU": "Ecuador", "USA": "Estados Unidos", "CHN": "China", "EURO": "Zona euro",
    "WEOWORLD": "Mundo", "OEMDC": "Emergentes y en desarrollo", "WE": "América Latina y el Caribe", "ADVEC": "Economías avanzadas",
}
# indicador -> (nombre, unidad, dir). LP (población) se usa para armar el PIB por habitante real.
INDICADORES = {
    "NGDP_RPCH": ("Crecimiento del PIB real", "% anual", 1),
    "PCPIPCH": ("Inflación promedio", "% anual", -1),
    "LUR": ("Desempleo", "% de la fuerza laboral", -1),
    "PPPPC": ("PIB por habitante (PPA, corriente)", "US$ internacionales", 1),
    "LP": ("Población", "millones de personas", 0),
    "GGXWDG_NGDP": ("Deuda pública bruta", "% del PIB", -1),
    "GGXCNL_NGDP": ("Resultado fiscal", "% del PIB", 1),
    "BCA_NGDPD": ("Cuenta corriente", "% del PIB", 1),
}
MESES = {"January": "enero", "February": "febrero", "March": "marzo", "April": "abril", "May": "mayo", "June": "junio", "July": "julio",
         "August": "agosto", "September": "septiembre", "October": "octubre", "November": "noviembre", "December": "diciembre"}
# hoja de Historical WEO Forecasts -> indicador de DataMapper
HOJAS_HIST = {"ngdp_rpch": "NGDP_RPCH", "pcpi_pch": "PCPIPCH"}
# código WEO de los grupos en la base histórica (no traen ISO)
COD_WEO = {1: "WEOWORLD", 110: "ADVEC", 163: "EURO", 200: "OEMDC"}


def _bajar(url, timeout=180):
    """Descarga con el User-Agent por defecto de urllib (el FMI rechaza el de un navegador y el nuestro)."""
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def _cache_json(nombre, bajar):
    """Como _cacheado, para un dict que se guarda como JSON."""
    f = CACHE / f"{nombre}.json"
    try:
        d = bajar()
        f.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        return d
    except Exception as e:  # noqa: BLE001
        if f.exists():
            print(f"  {nombre}: error al bajar ({e}); uso cache {f.name}")
            return json.loads(f.read_text(encoding="utf-8"))
        print(f"  {nombre}: no disponible ({e})")
        return None


def _datamapper(codigo):
    """{entidad: {año: valor}} del indicador, solo con las entidades de la lista, y la edición del WEO (texto)."""
    def bajar():
        v = json.loads(_bajar(DATAMAPPER + codigo))["values"][codigo]
        return {e: v[e] for e in ENTIDADES if e in v}
    return _cache_json(f"ctx_imf_{codigo}", bajar)


def _edicion():
    """Año y nombre de la edición del WEO que usa DataMapper (ej. 'October 2026')."""
    def bajar():
        ind = json.loads(_bajar(DATAMAPPER + "indicators"))["indicators"]["NGDP_RPCH"]
        m = re.search(r"\((\w+) (\d{4})\)", ind.get("source", ""))
        return {"mes": m.group(1), "anio": int(m.group(2))}
    return _cache_json("ctx_imf_edicion", bajar) or {"mes": "", "anio": date.today().year}


def _proyecciones_abril():
    """{indicador: {entidad: {año: proyección de abril de ese año}}} desde Historical WEO Forecasts."""
    def bajar():
        hojas = pd.read_excel(io.BytesIO(_bajar(HISTORICO, timeout=300)), sheet_name=list(HOJAS_HIST))
        out = {}
        for hoja, codigo in HOJAS_HIST.items():
            df = hojas[hoja]
            df["ent"] = df["ISOAlpha_3Code"].where(df["ISOAlpha_3Code"].notna(), df["WEO_Country_Code"].map(COD_WEO))
            df = df[df["ent"].isin(ENTIDADES)]
            res = {}
            for ent, g in df.groupby("ent"):
                vals = {}
                for _, fila in g.iterrows():
                    y = int(fila["year"])
                    col = f"S{y}{hoja}"  # vintage de primavera (abril) del mismo año
                    if y >= DESDE and col in g.columns:
                        x = pd.to_numeric(fila[col], errors="coerce")
                        if pd.notna(x):
                            vals[str(y)] = round(float(x), 4)
                res[ent] = vals
            out[codigo] = res
        return out
    return _cache_json("ctx_imf_proy_abril", bajar)


def construir_json():
    """Arma el dict de contexto.json. Si ninguna fuente anda y no hay copia, devuelve None."""
    print("Contexto internacional: bajando datos del FMI...")
    ed = _edicion()
    crudo = {c: _datamapper(c) for c in INDICADORES}
    if not crudo.get("NGDP_RPCH"):
        previo = CACHE / "contexto.json"
        if previo.exists():
            print("  FMI no disponible; uso contexto.json de datos/cache/")
            return json.loads(previo.read_text(encoding="utf-8"))
        return None
    proy = _proyecciones_abril() or {}
    ult = max(int(y) for e in crudo["NGDP_RPCH"].values() for y in e)
    anios = list(range(DESDE, ult + 1))
    real, es_proy, pabril = {}, {}, {}
    for c, datos in crudo.items():
        if not datos:
            continue
        real[c], es_proy[c] = {}, {}
        for ent, v in datos.items():
            real[c][ent] = [None if v.get(str(y)) is None else round(float(v[str(y)]), 4) for y in anios]
            # El FMI no marca las proyecciones: son los años desde el de la edición (si la serie llega hasta ahí).
            if any(int(y) >= ed["anio"] for y in v):
                es_proy[c][ent] = ed["anio"]
    for c, datos in proy.items():
        pabril[c] = {ent: [v.get(str(y)) for y in anios] for ent, v in datos.items()}
    nombres = {"mes": ed["mes"], "anio": ed["anio"]}
    ult_ab = max((int(y) for c in proy.values() for e in c.values() for y in e), default=None)
    mes = MESES.get(nombres["mes"], nombres["mes"]).lower()
    fuente = (f"FMI, World Economic Outlook (edición de {mes} de {nombres['anio']}) y Historical WEO Forecasts"
              + (f" (proyecciones de abril hasta {ult_ab})" if ult_ab else ""))
    datos = {
        "anios": anios, "entidades": ENTIDADES,
        "indicadores": {c: {"n": n, "u": u, "dir": d} for c, (n, u, d) in INDICADORES.items() if c in real},
        "real": real, "es_proyeccion": es_proy, "proy_abril": pabril, "fuente": fuente,
    }
    (CACHE / "contexto.json").write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  {len(real)} indicadores, {len(ENTIDADES)} entidades, años {anios[0]}-{anios[-1]}; proyecciones de abril: {sorted(pabril)}")
    return datos


def cargar_cache():
    f = CACHE / "contexto.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else None


# ---------------------------------------------------------------- series mensuales del catálogo
def _fred(codigo):
    def bajar():
        df = pd.read_csv(io.BytesIO(_bajar(FRED + codigo, timeout=240)), parse_dates=["observation_date"])
        s = pd.to_numeric(df[codigo], errors="coerce")
        s.index = df["observation_date"]
        return s.dropna()
    return _cacheado(f"ctx_fred_{codigo}", bajar)


def series_mensuales(idx):
    """Series de la categoría 'Contexto internacional' (mensuales, desde 1990 donde la fuente llegue)."""
    CAT = ["Contexto internacional"]
    PINK = "Banco Mundial (Pink Sheet) vía FRED"
    out = []
    for codigo, sid, n, u, dr, desc in [
        ("PSOYBUSDM", "ctx_soja", "Soja (Banco Mundial)", "US$ por tonelada", 1, "Precio internacional de la soja, promedio mensual."),
        ("PMAIZMTUSDM", "ctx_maiz", "Maíz (Banco Mundial)", "US$ por tonelada", 1, "Precio internacional del maíz, promedio mensual."),
        ("PWHEAMTUSDM", "ctx_trigo", "Trigo (Banco Mundial)", "US$ por tonelada", 1, "Precio internacional del trigo, promedio mensual."),
        ("POILBREUSDM", "ctx_petroleo", "Petróleo Brent (Banco Mundial)", "US$ por barril", 0, "Precio internacional del petróleo Brent, promedio mensual."),
    ]:
        try:
            s = _fred(codigo)
        except Exception as e:  # noqa: BLE001
            print(f"  FRED {codigo}: no disponible ({e})")
            continue
        out.append(catalogo.S(sid, n, CAT, "usd", u, catalogo._mes(s, idx), dr, f"{PINK}, serie {codigo}",
                              desc + " En dólares de cada momento: pasalo a dólares de hoy para comparar épocas. Es precio internacional, no el de Rosario."))
    try:
        s = _fred("FEDFUNDS")
        out.append(catalogo.S("ctx_fed", "Tasa de fondos federales de EE.UU. (Fed)", CAT, "none", "% anual", catalogo._mes(s, idx), -1,
                              "Reserva Federal de EE.UU. vía FRED, serie FEDFUNDS",
                              "Tasa de interés que fija la Fed. Cuando sube, el dinero se encarece en todo el mundo y los países como la Argentina reciben menos crédito. Promedio mensual de la tasa efectiva."))
    except Exception as e:  # noqa: BLE001
        print(f"  FRED FEDFUNDS: no disponible ({e})")
    try:
        sid = "82.2_ITI_2004_T_27"
        t = _cacheado("ctx_terminos", lambda: catalogo._series_api([sid])[sid])
        out.append(catalogo.S("ctx_terminos", "Términos de intercambio (INDEC)", CAT, "none", "índice 2004=100",
                              catalogo._trim_a_mes(t, idx), 1, f"INDEC vía datos.gob.ar, serie {sid}",
                              "Precio de lo que la Argentina exporta dividido el precio de lo que importa. Más alto = el mundo nos paga mejor. Trimestral, repetido en los 3 meses."))
    except Exception as e:  # noqa: BLE001
        print(f"  Términos de intercambio: no disponible ({e})")
    return out
