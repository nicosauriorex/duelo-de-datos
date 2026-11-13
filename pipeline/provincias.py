"""
Cuánto gasta la Nación en cada provincia, para web/public/datos/provincias.json (índice) y provincias_<AÑO>.json
(detalle de cada año). Fase 1 de docs/specs/provincias.md.

Fuentes:
- Gasto de la Nación por provincia, 2018 en adelante: los respaldos de gasto_nacion.py (datos/cache/gasto_nacion_<AÑO>.csv),
  árboles prov_para_que, prov_quien y prov_en_que (n1 = provincia, `ids` empieza con el código INDEC de la ubicación
  geográfica). Millones de pesos corrientes, devengado. No se baja nada acá: lo baja gasto_nacion.py.
- Población: INDEC, proyecciones 2010-2040 por provincia (base censo 2010), c2_proyecciones_prov_2010_2040.xls.
- Gasto de todas las provincias juntas en % del PIB: Secretaría de Política Económica, Gasto Público Consolidado
  (devengado anual, 1980-2023), API de series de tiempo de datos.gob.ar.

Respaldos versionados en datos/cache/:
- provincias_poblacion.csv: codigo (INDEC; 1 = total del país), anio, poblacion.
- provincias_agregado.csv: anio y una columna por serie del agregado (% del PIB).
- provincias_meta.json: el día de la última bajada (como mucho una por día).
Con `con_red=False` (--solo-json) se arma solo con los respaldos.

Controles (si no cierran, este módulo levanta RuntimeError y la corrida sigue sin provincias*.json):
- por año: las 24 provincias + las partes sin provincia = total del año de gasto_nacion (devengado, tolerancia 1 millón);
- cada provincia: raíz de para_que = raíz de quien = raíz de en_que = su total del índice (tolerancia 1 millón);
- 2024: Córdoba 4.158.722,8 y Ciudad de Buenos Aires 19.923.286,3 millones;
- población: 24 jurisdicciones, la suma de 2024 a menos de 0,5 % del total del país; Córdoba 2024 entre 3,8 y 4,2 millones;
- agregado: las cuatro finalidades suman el total a menos de 0,1 punto del PIB; 2023 con total entre 15 y 17.

Uso suelto:  python pipeline/provincias.py --bajar    (baja población y agregado y deja los respaldos, sin armar los JSON)
             python pipeline/provincias.py            (con red, arma en memoria y muestra el tamaño; no escribe en web/)
             python pipeline/provincias.py --sin-red  (igual, solo con los respaldos)
"""
import io
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

import gasto_nacion
from gasto_nacion import INCISOS, PRIMER_ANIO, _arbol, _cerrar, _r, _titulos, _unificar, anio_en_curso
from salarios import _get

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
URL_POBLACION = "https://www.indec.gob.ar/ftp/cuadros/poblacion/c2_proyecciones_prov_2010_2040.xls"
URL_SERIES = "https://apis.datos.gob.ar/series/api/series/"
FUENTE_TXT = ("Gasto de la Nación: Presupuesto Abierto (DGSIAF, Ministerio de Economía), créditos anuales de la Administración Nacional "
              "según la ubicación geográfica que declara cada gasto (devengado, en pesos corrientes).")
FUENTE_POBLACION = ("INDEC, proyecciones de población por provincia 2010-2040 (base censo 2010). No hay una proyección con la base del "
                    "censo 2022: para 2022 en adelante son estimaciones.")
FUENTE_AGREGADO = ("Secretaría de Política Económica, Gasto Público Consolidado (Nación, provincias y municipios; devengado anual), "
                   "por la API de series de tiempo de datos.gob.ar.")
TOL_CIERRE = 1.0          # millones de pesos
FUNCION_SEG_SOCIAL = "3.3"  # finalidad 3 (Servicios sociales), función 3 (Seguridad social)

# código INDEC -> nombre corto para el público
PROVINCIAS = {
    2: "Ciudad de Buenos Aires", 6: "Buenos Aires", 10: "Catamarca", 14: "Córdoba", 18: "Corrientes", 22: "Chaco", 26: "Chubut",
    30: "Entre Ríos", 34: "Formosa", 38: "Jujuy", 42: "La Pampa", 46: "La Rioja", 50: "Mendoza", 54: "Misiones", 58: "Neuquén",
    62: "Río Negro", 66: "Salta", 70: "San Juan", 74: "San Luis", 78: "Santa Cruz", 82: "Santa Fe", 86: "Santiago del Estero",
    90: "Tucumán", 94: "Tierra del Fuego",
}
SIN_PROVINCIA = {97: "Nacional", 96: "Interprovincial", 98: "Binacional", 99: "No clasificado", 95: "Exterior"}  # 95 solo aparece en 2026
CORDOBA, CABA = 14, 2
CORDOBA_2024 = 4158722.8   # millones, devengado
CABA_2024 = 19923286.3

# serie de datos.gob.ar -> nombre en el sitio (en este orden; la primera es el total)
SERIES_AGREGADO = [
    ("451.6_GPP_PIBPIB_0_0_7_41", "Total"),
    ("451.6_GPP_FUNCIOPIB_0_0_29_76", "Funcionamiento del Estado"),
    ("451.6_GPP_SERVICPIB_0_0_26_100", "Servicios sociales"),
    ("451.6_GPP_SERVICPIB_0_0_28_76", "Servicios económicos"),
    ("451.6_GPP_SERVICPIB_0_0_31_1", "Deuda"),
]


def _fallo(msg):
    raise RuntimeError(f"provincias: {msg}; no se escribe el archivo")


# ---------- bajada ----------

def _meta():
    f = CACHE / "provincias_meta.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def _guardar_meta(meta):
    (CACHE / "provincias_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def _poblacion_de_xls(raw):
    """XLS de INDEC (bytes) -> DataFrame codigo, anio, poblacion (ambos sexos, total de edades). Se identifica cada hoja por el
    código que va antes del guion (los nombres traen la codificación rota)."""
    x = pd.ExcelFile(io.BytesIO(raw))
    filas = []
    for hoja in x.sheet_names:
        pref = hoja.split("-")[0].strip()
        if not pref.isdigit():
            continue
        codigo = int(pref)
        d = x.parse(hoja, header=None)
        col0 = d.iloc[:, 0].astype(str).str.strip()
        for r in d.index[col0 == "Edad"]:
            totales = [i for i in d.index if i > r and col0[i] == "Total"]
            if not totales:
                continue
            t = totales[0]
            for c in range(1, d.shape[1]):
                anio = pd.to_numeric(d.iloc[r, c], errors="coerce")
                if pd.isna(anio):
                    continue
                if str(d.iloc[r + 1, c]).strip() != "Ambos sexos":
                    raise RuntimeError(f"hoja {hoja}: bajo el año {int(anio)} no dice 'Ambos sexos'")
                filas.append((codigo, int(anio), int(d.iloc[t, c])))
    out = pd.DataFrame(filas, columns=["codigo", "anio", "poblacion"]).drop_duplicates(["codigo", "anio"])
    if len(out) < 25 * 31 or out["codigo"].nunique() != 25:
        raise RuntimeError(f"la población bajada trae {len(out)} filas y {out['codigo'].nunique()} jurisdicciones; algo cambió")
    return out.sort_values(["codigo", "anio"]).reset_index(drop=True)


def _agregado_de_api(raw):
    """Respuesta de la API de series -> DataFrame anio + una columna por serie."""
    data = json.loads(raw)["data"]
    cols = [i for i, _ in SERIES_AGREGADO]
    df = pd.DataFrame(data, columns=["fecha"] + cols)
    df.insert(0, "anio", pd.to_datetime(df.pop("fecha")).dt.year)
    if len(df) < 40:
        raise RuntimeError(f"el agregado bajado trae solo {len(df)} años; algo cambió")
    return df


def bajar():
    """Baja población y agregado y deja los respaldos. Si uno falla y hay respaldo, lo conserva; si no, levanta.
    Devuelve True solo si bajaron los dos (si se usó algún respaldo, se reintenta en la próxima corrida)."""
    bajados = 0
    CACHE.mkdir(parents=True, exist_ok=True)
    fp, fa = CACHE / "provincias_poblacion.csv", CACHE / "provincias_agregado.csv"
    try:
        _poblacion_de_xls(_get(URL_POBLACION, timeout=120)).to_csv(fp, index=False)
        print("  provincias: población bajada")
        bajados += 1
    except Exception as e:  # noqa: BLE001
        if not fp.exists():
            raise
        print(f"  provincias: error al bajar la población ({e}); uso el respaldo")
    try:
        ids = ",".join(i for i, _ in SERIES_AGREGADO)
        _agregado_de_api(_get(f"{URL_SERIES}?ids={ids}&limit=1000&format=json", timeout=60)).to_csv(fa, index=False)
        print("  provincias: agregado bajado")
        bajados += 1
    except Exception as e:  # noqa: BLE001
        if not fa.exists():
            raise
        print(f"  provincias: error al bajar el agregado ({e}); uso el respaldo")
    return bajados == 2


def _actualizar_respaldos(con_red):
    meta = _meta()
    hoy = date.today().isoformat()
    hay = (CACHE / "provincias_poblacion.csv").exists() and (CACHE / "provincias_agregado.csv").exists()
    if con_red and (not hay or meta.get("bajado") != hoy):
        try:
            if bajar():   # la fecha se guarda solo si bajó todo: si se usó un respaldo, se reintenta en la próxima corrida
                meta["bajado"] = hoy
                _guardar_meta(meta)
        except Exception as e:  # noqa: BLE001
            if not hay:
                raise RuntimeError(f"no se pudo bajar la población ni el agregado y no hay respaldo ({e})") from e
            print(f"  provincias: error al bajar ({e}); uso el respaldo")
    elif not hay:
        raise RuntimeError("no hay respaldo de población ni del agregado (datos/cache/provincias_*)")


# ---------- lectura de los respaldos ----------

def _cargar_presupuesto():
    """-> {año: DataFrame largo de gasto_nacion_<año>.csv} solo de los años que ya traen los cruces con la provincia."""
    datos = {}
    for a in range(PRIMER_ANIO, anio_en_curso() + 1):
        f = CACHE / f"gasto_nacion_{a}.csv"
        if not f.exists():
            continue
        df = pd.read_csv(f, keep_default_na=False, dtype={"ids": str, "n1": str, "n2": str, "n3": str, "n4": str})
        if "prov_para_que" in set(df["arbol"]):
            datos[a] = df
        else:
            print(f"  provincias: {f.name} no trae los cruces con la provincia (correr gasto_nacion.py --bajar); se omite el año {a}")
    if not datos:
        raise RuntimeError("ningún respaldo gasto_nacion_<AÑO>.csv trae los cruces con la provincia (correr gasto_nacion.py --bajar)")
    return datos


def _ub(ids):
    """'14|3.3' -> 14; '14' -> 14."""
    return int(str(ids).split("|")[0])


def _nodo_prov(g, nivel_inciso=False):
    """Filas de una provincia en un árbol prov_* -> Nodo raíz cerrado (sin el nivel de la provincia)."""
    g = g.copy()
    g["n1"], g["n2"], g["n3"], g["n4"] = g["n2"], g["n3"], "", ""
    tec = None
    if nivel_inciso:
        tec, nuevos = {}, []
        for ids, n in zip(g["ids"], g["n1"]):
            i = str(ids).split("|")[1]
            pub = INCISOS.get(int(i), n)
            tec[pub] = f"Inciso {i} - {n}"
            nuevos.append(pub)
        g["n1"] = nuevos
    return _cerrar(_arbol(g, tec))


def _detalle_anio(df):
    """DataFrame largo (ya con nombres unificados) -> ({código: {"para_que", "quien", "en_que"}}, {código: devengado}, {código: devengado Seguridad social}, total)."""
    por = {}
    for arbol in ("prov_para_que", "prov_quien", "prov_en_que"):
        g = df[df["arbol"] == arbol].copy()
        g["ub"] = [_ub(i) for i in g["ids"]]
        por[arbol] = g
    desconocidos = set(por["prov_quien"]["ub"]) - set(PROVINCIAS) - set(SIN_PROVINCIA)
    if desconocidos:
        raise RuntimeError(f"ubicaciones geográficas sin nombre: {sorted(desconocidos)}")
    nodos, dev, ss = {}, {}, {}
    for ub in PROVINCIAS:
        nodos[ub] = {
            "para_que": _nodo_prov(por["prov_para_que"][por["prov_para_que"]["ub"] == ub]),
            "quien": _nodo_prov(por["prov_quien"][por["prov_quien"]["ub"] == ub]),
            "en_que": _nodo_prov(por["prov_en_que"][por["prov_en_que"]["ub"] == ub], nivel_inciso=True),
        }
    gq = por["prov_quien"].groupby("ub")["credito_devengado"].sum()
    dev = {int(u): float(v) for u, v in gq.items()}
    gp = por["prov_para_que"]
    seg = gp[gp["ids"].str.endswith("|" + FUNCION_SEG_SOCIAL)].groupby("ub")["credito_devengado"].sum()
    ss = {int(u): float(v) for u, v in seg.items()}
    total = float(df[df["arbol"] == "para_que"]["credito_devengado"].sum())
    return nodos, dev, ss, total


# ---------- construcción ----------

def _poblacion():
    d = pd.read_csv(CACHE / "provincias_poblacion.csv")
    return {(int(c), int(a)): int(p) for c, a, p in zip(d["codigo"], d["anio"], d["poblacion"])}


def _controles_poblacion(pob):
    anio = 2024
    total_pais = pob.get((1, anio))
    suma = sum(pob.get((c, anio), 0) for c in PROVINCIAS)
    faltan = [c for c in PROVINCIAS if (c, anio) not in pob]
    if faltan or total_pais is None:
        _fallo(f"falta la población {anio} de {faltan or 'el total del país'}")
    dif = abs(suma / total_pais - 1)
    print(f"  control población {anio}: 24 jurisdicciones suman {suma:,} vs total del país {total_pais:,} (diferencia {dif:.3%})")
    if dif > 0.005:
        _fallo(f"la población {anio} de las 24 jurisdicciones ({suma}) se aparta más de 0,5 % del total del país ({total_pais})")
    c = pob[(CORDOBA, anio)]
    print(f"  control población Córdoba {anio}: {c:,} (esperado entre 3,8 y 4,2 millones)")
    if not 3.8e6 <= c <= 4.2e6:
        _fallo(f"la población de Córdoba {anio} ({c}) está fuera de 3,8-4,2 millones")


def _agregado():
    d = pd.read_csv(CACHE / "provincias_agregado.csv").sort_values("anio")
    cols = [i for i, _ in SERIES_AGREGADO]
    # control: las cuatro finalidades suman el total (puntos del PIB)
    for _, f in d.iterrows():
        v = [f[c] for c in cols]
        if any(pd.isna(x) for x in v):
            continue
        if abs(sum(v[1:]) - v[0]) > 0.1:
            _fallo(f"agregado {int(f['anio'])}: las cuatro finalidades suman {sum(v[1:]):.2f} y el total es {v[0]:.2f} (% del PIB)")
    f23 = d[d["anio"] == 2023]
    if len(f23):
        t = float(f23.iloc[0][cols[0]])
        print(f"  control agregado 2023: total {t:.2f} % del PIB (esperado entre 15 y 17); las cuatro finalidades suman el total (tolerancia 0,1)")
        if not 15 <= t <= 17:
            _fallo(f"el gasto consolidado de las provincias 2023 ({t:.2f} % del PIB) está fuera de 15-17")
    return {"anios": [int(a) for a in d["anio"]],
            "series": [{"n": n, "v": [None if pd.isna(x) else round(float(x), 2) for x in d[i]]} for i, n in SERIES_AGREGADO]}


def construir(con_red=True):
    """Devuelve {"provincias.json": índice, "provincias_<AÑO>.json": detalle}. Si un control no pasa, levanta RuntimeError."""
    CACHE.mkdir(parents=True, exist_ok=True)
    _actualizar_respaldos(con_red)
    pob = _poblacion()
    _controles_poblacion(pob)
    agregado = _agregado()

    datos = _cargar_presupuesto()
    mostrar = _titulos(datos)
    # años y sus datos (en_curso, actualizado, pib) como en gasto_nacion.json; sin red, de los respaldos
    base = gasto_nacion.construir(con_red=False)["gasto_nacion.json"]["anios"]
    anios_base = {x["anio"]: x for x in base if x["anio"] in datos}
    anios = sorted(anios_base)
    if not anios:
        _fallo("no hay años con gasto por provincia")

    nodos, dev, ss, total = {}, {}, {}, {}
    for a in anios:
        nodos[a], dev[a], ss[a], total[a] = _detalle_anio(_unificar(datos[a], mostrar))
        # control: 24 provincias + sin provincia = total del año
        suma = sum(dev[a].values())
        print(f"  control {a}: 24 provincias + sin provincia = {suma:,.1f} vs total de gasto_nacion {total[a]:,.1f} (tolerancia {TOL_CIERRE:.0f})")
        if abs(suma - total[a]) > TOL_CIERRE:
            _fallo(f"{a}: las provincias y las partes sin provincia suman {suma:,.1f} y el total del año es {total[a]:,.1f}")
        # control: cada provincia, los tres árboles contra su total
        for ub in PROVINCIAS:
            v = dev.get(a, {}).get(ub, 0.0)
            for forma, n in nodos[a][ub].items():
                if abs(n["v"][3] - v) > TOL_CIERRE:
                    _fallo(f"{a}, {PROVINCIAS[ub]}: la raíz de {forma} ({n['v'][3]:,.1f}) no coincide con su total ({v:,.1f})")
    if 2024 in dev:
        c, b = dev[2024][CORDOBA], dev[2024][CABA]
        print(f"  control 2024: Córdoba {c:,.1f} (esperado {CORDOBA_2024:,.1f}); Ciudad de Buenos Aires {b:,.1f} (esperado {CABA_2024:,.1f})")
        if abs(c - CORDOBA_2024) > 0.1 or abs(b - CABA_2024) > 0.1:
            _fallo(f"2024: Córdoba {c:,.1f} / CABA {b:,.1f}, se esperaba {CORDOBA_2024:,.1f} / {CABA_2024:,.1f}")

    def serie(f, ub):
        return [_r(f[a][ub]) if ub in f[a] else None for a in anios]

    provincias = []
    for ub, n in PROVINCIAS.items():
        provincias.append({"id": str(ub), "n": n, "pob": [pob.get((ub, a)) for a in anios],
                           "v": serie(dev, ub), "ss": [_r(ss[a].get(ub, 0.0)) if ub in dev[a] else None for a in anios]})
    sin_provincia = [{"id": str(ub), "n": n, "v": serie(dev, ub)} for ub, n in SIN_PROVINCIA.items()]
    indice = {
        "generado": date.today().isoformat(), "fuente": FUENTE_TXT, "fuente_poblacion": FUENTE_POBLACION, "fuente_agregado": FUENTE_AGREGADO,
        "anios": [{"anio": a, "en_curso": anios_base[a]["en_curso"], "actualizado": anios_base[a]["actualizado"],
                   "pib": anios_base[a]["pib"], "archivo": f"provincias_{a}.json"} for a in anios],
        "provincias": provincias, "sin_provincia": sin_provincia, "total": [_r(total[a]) for a in anios], "agregado": agregado,
    }
    archivos = {"provincias.json": indice}
    for a in anios:
        archivos[f"provincias_{a}.json"] = {"anio": a, "provincias": {str(ub): nodos[a][ub] for ub in PROVINCIAS}}
    return archivos


def construir_json(con_red=True):
    return construir(con_red)


if __name__ == "__main__":
    if "--bajar" in sys.argv:
        if bajar():
            _guardar_meta({**_meta(), "bajado": date.today().isoformat()})
        sys.exit(0)
    res = construir(con_red="--sin-red" not in sys.argv)
    for nombre, obj in sorted(res.items()):
        txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        print(f"{nombre}: {len(txt.encode('utf-8')) / 1024:.0f} KB")
