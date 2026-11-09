"""
Precios en el mundo (bloque 6c, decisión D-008): niveles de precios por rubro de la Argentina contra el mundo.

Fuentes (todas sin clave; se verificaron el 2026-11-09):
1) Niveles de precios medidos: Banco Mundial, Programa de Comparación Internacional (ICP). API de fuentes del Banco Mundial:
   https://api.worldbank.org/v2/sources/<id>/series/<código ICP>/country/<países>/time/all?format=json
   Fuente 90 = ICP 2021 (trae también 2017, revisado con la metodología nueva); si aparece una fuente "ICP 2024" se toma sola.
   La clasificación "PX.WL" es el índice de nivel de precios con el mundo = 100.
   (La API v2 normal por indicador, /country/X/indicator/<código>, no devuelve estos datos: hay que usar /sources/.)
2) IPC por división (COICOP) mensual de cada país:
   - OCDE (EE.UU., México, Colombia, Chile): API SDMX, dos bases que se empalman con el mes en común:
     COICOP 1999 (DSD_PRICES@DF_PRICES_ALL) y COICOP 2018 (DSD_PRICES_COICOP2018@DF_PRICES_C2018_ALL).
   - Zona euro: Eurostat, prc_hicp_midx (IPCA armonizado por COICOP, unidad I15).
   - Brasil: IBGE, SIDRA tabla 7060 (IPCA, variación mensual por grupo; se encadena a un índice).
3) Tipo de cambio mensual contra el dólar: OCDE, DSD_STES@DF_FINMARK, medida CC (moneda local por US$).

Todo pasa por la caché de datos/cache/ (si la fuente falla se usa la última copia). El JSON final también queda en
datos/cache/precios_mundo.json para que --solo-json funcione sin red.
"""
import io
import json
import re
import urllib.request
from datetime import date

import pandas as pd

from salarios import CACHE

WB = "https://api.worldbank.org/v2/"
OCDE = "https://sdmx.oecd.org/public/rest/data/"
EUROSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx"
DESDE = "2017-01"  # la estimación arranca en la primera medición del ICP que usamos

# código -> nombre. Los de la OCDE/Eurostat/IBGE son los de cada fuente; ver RUBROS.
PAISES = {"ARG": "Argentina", "USA": "Estados Unidos", "EA": "Zona euro", "BRA": "Brasil", "CHL": "Chile", "MEX": "México",
          "COL": "Colombia", "URY": "Uruguay", "PRY": "Paraguay", "BOL": "Bolivia", "PER": "Perú", "ECU": "Ecuador", "CHN": "China"}
# la zona euro en el ICP no es un país: se promedian estos cuatro (los de mayor peso)
EA_ICP = ["DEU", "FRA", "ITA", "ESP"]
ISO_ICP = [p for p in PAISES if p != "EA"] + EA_ICP
SIN_DATOS = {
    "URY": "no publica el IPC por división en un formato descargable sin clave",
    "PRY": "no publica el IPC por división en un formato descargable sin clave",
    "BOL": "no publica el IPC por división en un formato descargable sin clave",
    "PER": "no está en la base de precios de la OCDE ni tiene API pública sin clave",
    "ECU": "no está en la base de precios de la OCDE ni tiene API pública sin clave",
    "CHN": "no está en la base de precios de la OCDE ni tiene API pública sin clave",
}
# país con IPC por rubro -> de dónde sale
FUENTE_IPC = {"USA": "ocde", "MEX": "ocde", "COL": "ocde", "CHL": "ocde", "EA": "eurostat", "BRA": "ibge"}
# moneda local por US$ (OCDE); EA20 = euros por dólar
TC_OCDE = {"BRA": "BRA", "CHL": "CHL", "COL": "COL", "MEX": "MEX", "EA": "EA20"}

# id -> nombre, código ICP, serie del IPC argentino en el catálogo, código en OCDE / Eurostat / IBGE (None = el país no lo publica)
# "d" = división del IPC; "p" = producto (más fino). El IPC nacional por producto no existe: se usa el de GBA.
def _r(n, icp, arg, oecd=None, eu=None, br=None, tipo="d", nota=""):
    return {"n": n, "icp": icp, "arg": arg, "oecd": oecd, "eu": eu, "br": br, "tipo": tipo, "nota": nota}

RUBROS = {
    "total": _r("Consumo total de los hogares", "9020000", "ipc_nacional_0_ipc", "_T", "CP00", "7169",
                nota="ICP: consumo individual real (incluye servicios públicos de salud y educación); IPC: nivel general."),
    "01": _r("Alimentos y bebidas no alcohólicas", "1101000", "ipc_nacional_01_coicop", "CP01", "CP01", "7170",
             nota="En Brasil, el grupo incluye bebidas alcohólicas."),
    "02": _r("Bebidas alcohólicas y tabaco", "1102000", "ipc_nacional_02_coicop", "CP02", "CP02", None),
    "03": _r("Ropa y calzado", "1103000", "ipc_nacional_03_coicop", "CP03", "CP03", "7558"),
    "04": _r("Vivienda, agua, electricidad y gas", "9060000", "ipc_nacional_04_coicop", "CP04", "CP04", "7445",
             nota="ICP: vivienda real (incluye el alquiler imputado); en Brasil, el grupo Habitação."),
    "05": _r("Equipamiento del hogar", "1105000", "ipc_nacional_05_coicop", "CP05", "CP05", "7486", nota="En Brasil, Artigos de residência."),
    "06": _r("Salud", "9080000", "ipc_nacional_06_coicop", "CP06", "CP06", "7660", nota="ICP: salud real (incluye la que paga el Estado)."),
    "07": _r("Transporte", "1107000", "ipc_nacional_07_coicop", "CP07", "CP07", "7625"),
    "08": _r("Comunicación", "1108000", "ipc_nacional_08_coicop", "CP08", "CP08", "7786"),
    "09": _r("Recreación y cultura", "9110000", "ipc_nacional_09_coicop", "CP09", "CP09", None, nota="ICP: recreación real."),
    "10": _r("Educación", "9120000", "ipc_nacional_10_coicop", "CP10", "CP10", "7766", nota="ICP: educación real (incluye la que paga el Estado)."),
    "11": _r("Restaurantes y hoteles", "1111000", "ipc_nacional_11_coicop", "CP11", "CP11", "7432",
             nota="En Brasil, alimentación fuera del hogar (no incluye hoteles)."),
    "12": _r("Bienes y servicios varios", "9140000", "ipc_nacional_12_coicop", "CP12", "CP12", "7712", nota="En Brasil, gastos personales."),
    "carne": _r("Carne", "1101120", "ipc_gba_01_1_2_coicop", None, "CP0112", "7283", "p",
                "El IPC de la Argentina es «Carnes y derivados» (GBA); el ICP mide solo carne."),
    "pan": _r("Pan y cereales", "1101110", "ipc_gba_01_1_1_coicop", None, "CP0111", "7172", "p",
              "En Brasil, cereales, legumbres y oleaginosas."),
    "leche": _r("Leche, quesos y huevos", "1101140", "ipc_gba_01_1_4_coicop", None, "CP0114", "7356", "p", "En Brasil, leche y derivados."),
    "frutas": _r("Frutas", "1101160", "ipc_gba_01_1_6_coicop", None, "CP0116", "7254", "p"),
    "verduras": _r("Verduras", "1101170", "ipc_gba_01_1_7_coicop", None, "CP0117", "7241", "p", "En Brasil, hortalizas y verduras."),
}
UA = {"User-Agent": "Mozilla/5.0"}


def _bajar(url, timeout=180):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def _cache_json(nombre, bajar):
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


def _meses():
    hoy = date.today()
    return [f"{p.year}-{p.month:02d}" for p in pd.period_range(DESDE, f"{hoy.year}-{hoy.month:02d}", freq="M")]


# ------------------------------------------------------------------ 1) ICP
def _fuentes_icp():
    """Ids de las fuentes 'ICP 2021' y posteriores (la 90 y las que salgan después), de la más vieja a la más nueva."""
    fuentes = json.loads(_bajar(WB + "sources?format=json&per_page=200"))[1]
    out = []
    for s in fuentes:
        m = re.fullmatch(r"ICP (\d{4})", s["name"].strip())
        if m and int(m.group(1)) >= 2021:
            out.append((int(m.group(1)), int(s["id"])))
    return [i for _, i in sorted(out)] or [90]


def _icp_serie(fuente, codigo):
    """{(país, año): valor} del índice con mundo = 100 (clasificación PX.WL)."""
    paises = ";".join(ISO_ICP)
    url = f"{WB}sources/{fuente}/series/{codigo}/country/{paises}/time/all?format=json&per_page=5000"
    out = {}
    for fila in json.loads(_bajar(url))["source"]["data"]:
        v = {x["concept"]: x["id"] for x in fila["variable"]}
        if v.get("Classification") == "PX.WL" and fila["value"] is not None:
            out[(v["Country"], int(v["Time"][2:]))] = float(fila["value"])
    return out


def _medido():
    def bajar():
        res = {}
        for fuente in _fuentes_icp():  # las fuentes nuevas pisan a las viejas
            for rid, r in RUBROS.items():
                for (pais, anio), val in _icp_serie(fuente, r["icp"]).items():
                    res.setdefault(str(anio), {}).setdefault(rid, {})[pais] = round(val, 3)
        return res
    crudo = _cache_json("pm_icp", bajar)
    if not crudo:
        return None
    # zona euro = promedio simple de Alemania, Francia, Italia y España
    for anio, rubros in crudo.items():
        for rid, vals in rubros.items():
            ea = [vals[p] for p in EA_ICP if p in vals]
            if len(ea) == len(EA_ICP):
                vals["EA"] = round(sum(ea) / len(ea), 3)
            for p in EA_ICP:
                vals.pop(p, None)
    return crudo


# ------------------------------------------------------------------ 2) IPC por rubro
def _ocde_ipc():
    """{(país, código OCDE): Series mensual} empalmando COICOP 1999 con COICOP 2018 en el último mes en común."""
    def leer(flujo, paises):
        url = f"{OCDE}{flujo}/{paises}.M.N.CPI.IX..N._Z?startPeriod=2016-01&format=csvfilewithlabels"
        df = pd.read_csv(io.BytesIO(_bajar(url, 300)))
        df = df[df["TIME_PERIOD"].str.fullmatch(r"\d{4}-\d{2}")]
        return {k: g.set_index("TIME_PERIOD")["OBS_VALUE"].sort_index() for k, g in df.groupby(["REF_AREA", "EXPENDITURE"])}

    def bajar():
        paises = "+".join(p for p, f in FUENTE_IPC.items() if f == "ocde")
        v99 = leer("OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0", paises)
        try:
            v18 = leer("OECD.SDD.TPS,DSD_PRICES_COICOP2018@DF_PRICES_C2018_ALL,1.0", paises)
        except Exception as e:  # noqa: BLE001
            print(f"  OCDE COICOP 2018: no disponible ({e}); solo la base 1999")
            v18 = {}
        # divisiones 01 a 07, 10 y 11 y el total tienen el mismo contenido en las dos clasificaciones
        iguales = {"_T", *[f"CP{i:02d}" for i in (1, 2, 3, 4, 5, 6, 7, 10, 11)]}
        out = {}
        for k, s in v99.items():
            s = s.copy()
            n = v18.get(k) if k[1] in iguales else None
            if n is not None:
                comun = s.index.intersection(n.index)
                if len(comun):
                    m = comun[-1]
                    s = pd.concat([s[s.index <= m], n[n.index > m] * (s[m] / n[m])])
            out[f"{k[0]}|{k[1]}"] = {t: round(float(x), 4) for t, x in s.items()}
        return out
    return _cache_json("pm_ocde_ipc", bajar) or {}


def _eurostat_ipc():
    def bajar():
        cods = sorted({r["eu"] for r in RUBROS.values() if r["eu"]})
        url = f"{EUROSTAT}?geo=EA&unit=I15&sinceTimePeriod=2016-12&format=JSON&" + "&".join(f"coicop={c}" for c in cods)
        d = json.loads(_bajar(url))
        tiempos = {i: t for t, i in d["dimension"]["time"]["category"]["index"].items()}
        coi = {i: c for c, i in d["dimension"]["coicop"]["category"]["index"].items()}
        nt = len(tiempos)
        out = {}
        for pos, val in d["value"].items():
            pos = int(pos)
            out.setdefault(coi[pos // nt], {})[tiempos[pos % nt]] = float(val)
        return out
    return _cache_json("pm_eurostat_ipc", bajar) or {}


def _ibge_ipc():
    """Encadena la variación mensual del IPCA a un índice (base arbitraria 100 en dic-2016)."""
    def bajar():
        cods = sorted({r["br"] for r in RUBROS.values() if r["br"]})
        hoy = date.today()
        filas = json.loads(_bajar(f"https://apisidra.ibge.gov.br/values/t/7060/n1/1/v/63/p/201701-{hoy.year}{hoy.month:02d}/c315/{','.join(cods)}"))[1:]
        por = {}
        for f in filas:
            if f["V"] in ("...", "-", ""):
                continue
            t = f["D3C"]
            por.setdefault(f["D4C"], {})[f"{t[:4]}-{t[4:]}"] = float(f["V"])
        out = {}
        for c, serie in por.items():
            nivel, idx = 100.0, {}
            for t in sorted(serie):
                nivel *= 1 + serie[t] / 100
                idx[t] = round(nivel, 4)
            out[c] = idx
        return out
    return _cache_json("pm_ibge_ipc", bajar) or {}


# ------------------------------------------------------------------ 3) tipo de cambio
def _tc_ocde():
    def bajar():
        areas = "+".join(TC_OCDE.values())
        url = f"{OCDE}OECD.SDD.STES,DSD_STES@DF_FINMARK,4.0/{areas}..CC.XDC_USD.....?startPeriod=2016-12&format=csv"
        df = pd.read_csv(io.BytesIO(_bajar(url)))
        df = df[df["TIME_PERIOD"].str.fullmatch(r"\d{4}-\d{2}")]
        inv = {v: k for k, v in TC_OCDE.items()}
        return {inv[a]: {t: round(float(x), 6) for t, x in g.set_index("TIME_PERIOD")["OBS_VALUE"].items()} for a, g in df.groupby("REF_AREA")}
    return _cache_json("pm_tc", bajar) or {}


# ------------------------------------------------------------------ armado
def _alinear(d, meses):
    return [None if d is None or d.get(m) is None else round(float(d[m]), 4) for m in meses]


def construir_json():
    """Arma el dict de precios_mundo.json. Si el ICP no se puede bajar y no hay copia, devuelve None."""
    print("Precios en el mundo: bajando ICP, IPC por rubro y tipos de cambio...")
    medido = _medido()
    if not medido:
        previo = CACHE / "precios_mundo.json"
        if previo.exists():
            print("  ICP no disponible; uso precios_mundo.json de datos/cache/")
            return json.loads(previo.read_text(encoding="utf-8"))
        return None
    meses = _meses()
    ocde, eu, br, tc = _ocde_ipc(), _eurostat_ipc(), _ibge_ipc(), _tc_ocde()
    ipc = {}
    for rid, r in RUBROS.items():
        por = {}
        for pais, fuente in FUENTE_IPC.items():
            if fuente == "ocde" and r["oecd"]:
                s = ocde.get(f"{pais}|{r['oecd']}")
            elif fuente == "eurostat" and r["eu"]:
                s = eu.get(r["eu"])
            elif fuente == "ibge" and r["br"]:
                s = br.get(r["br"])
            else:
                continue
            if s and any(m in s for m in meses):
                por[pais] = _alinear(s, meses)
        ipc[rid] = por
    # los dos rubros que el ICP no mide pero sirven para Argentina (electricidad/gas y combustibles) quedan afuera: no tienen nivel de precios
    tcs = {"USA": [1.0] * len(meses)}
    for pais in TC_OCDE:
        if tc.get(pais):
            tcs[pais] = _alinear(tc[pais], meses)
    datos = {
        "rubros": {rid: {"n": r["n"], "icp": r["icp"], "arg": r["arg"], "tipo": r["tipo"], "nota": r["nota"]} for rid, r in RUBROS.items()},
        "paises": PAISES, "medido": {a: medido[a] for a in sorted(medido)}, "fechas": meses, "ipc": ipc, "tc": tcs,
        "sin_datos": SIN_DATOS,
        "notas_pais": {"EA": "El nivel medido es el promedio simple de Alemania, Francia, Italia y España."},
        "fuente": "Banco Mundial (Programa de Comparación Internacional, ICP); OCDE; Eurostat; IBGE; INDEC",
    }
    (CACHE / "precios_mundo.json").write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    llenos = sum(1 for r in ipc.values() for s in r.values() if s)
    print(f"  medido: años {sorted(medido)}; {len(RUBROS)} rubros; {llenos} series de IPC; tipos de cambio: {sorted(tcs)}")
    return datos


def cargar_cache():
    f = CACHE / "precios_mundo.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
