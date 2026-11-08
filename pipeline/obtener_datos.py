"""
Descarga precios de cortes de carne (INDEC), salarios SIPA (Sec. de Trabajo) e IPC (INDEC)
y calcula kg de carne comprables con un salario.

Fuentes:
- Precios promedio GBA: INDEC, https://www.indec.gob.ar/ftp/cuadros/economia/sh_ipc_precios_promedio.xls
- Salarios e IPC: API Series de Tiempo, https://apis.datos.gob.ar/series/api/
    153.1_RNERACIDIO_2009_M_21  Remuneración bruta PROMEDIO asalariados registrados sector privado (SIPA)
    153.1_RNERACIANA_2009_M_20  Remuneración bruta MEDIANA  asalariados registrados sector privado (SIPA)
    148.3_INIVELNAL_DICI_M_26   IPC Nivel General Nacional, base dic 2016
- Opcional: si existe la variable de entorno INDEC_TOKEN (o un archivo .indec_token.txt en la raíz del
  proyecto con el token adentro), precios e IPC se toman de
  https://api.indec.gob.ar/v1/ipc_nacional (requiere registro en api.indec.gob.ar).
  Los salarios siguen saliendo de datos.gob.ar (la API de INDEC solo tiene el índice de salarios).
"""
import io
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import pandas as pd

import catalogo
import macro
import salarios

RAIZ = Path(__file__).resolve().parent.parent  # carpeta del proyecto
OUT = RAIZ / "datos"
OUT.mkdir(exist_ok=True)

API = "https://apis.datos.gob.ar/series/api/series/"
SERIES = {
    "sal_prom": "153.1_RNERACIDIO_2009_M_21",
    "sal_med": "153.1_RNERACIANA_2009_M_20",
    "ipc": "148.3_INIVELNAL_DICI_M_26",
}
CORTES = ["Asado", "Cuadril", "Nalga", "Paleta", "Carne picada común"]
XLS = "https://www.indec.gob.ar/ftp/cuadros/economia/sh_ipc_precios_promedio.xls"


INDEC_API = "https://api.indec.gob.ar/v1/"
IPC_KEY = ("clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,"
           "tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida")


def get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "duelo-de-datos-script", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def indec_query(tabla, token, **filtros):
    """Consulta paginada a la API de INDEC (estilo PostgREST). Devuelve un DataFrame."""
    rows, offset = [], 0
    while True:
        params = {**filtros, "order": IPC_KEY, "limit": 1000, "offset": offset}
        url = INDEC_API + tabla + "?" + urllib.parse.urlencode(params, safe="*.,()")
        chunk = json.loads(get(url, {"Authorization": f"Bearer {token}", "Accept": "application/json"}))
        rows += chunk
        if len(chunk) < 1000:
            return pd.DataFrame(rows)
        offset += 1000


def _a_fecha(df):
    return pd.to_datetime(df["periodo"].astype(str).str[:6], format="%Y%m")


def precios_e_ipc_api_indec(token):
    """Precios promedio de los cortes (región GBA) e IPC nivel general nacional desde api.indec.gob.ar."""
    pp = indec_query("ipc_nacional", token, tipo_de_indicador="ilike.*precio*")
    if pp.empty:
        raise RuntimeError("la API no devolvió precios promedio")
    pp["fecha"] = _a_fecha(pp)
    gba = pp[pp["region"].str.contains("GBA|Gran Buenos Aires", case=False, na=False)]
    precios = {}
    for corte in CORTES:
        s = gba[gba["descripcion"].str.strip().str.lower() == corte.lower()]
        if not s.empty:
            precios[corte] = s.groupby("fecha")["valor"].mean()
    faltan = set(CORTES) - set(precios)
    if faltan:
        print("API INDEC: sin precio para", sorted(faltan),
              "| regiones:", sorted(pp["region"].dropna().unique()),
              "| ej. productos:", sorted(gba["descripcion"].dropna().unique())[:40])

    ng = indec_query("ipc_nacional", token, descripcion="ilike.*nivel general*", tipo_de_indicador="ilike.*ndice*")
    ng = ng[ng["region"].str.contains("nacional", case=False, na=False)]
    ng["fecha"] = _a_fecha(ng)
    ipc = ng.groupby("fecha")["valor"].mean()
    if ipc.empty:
        raise RuntimeError("la API no devolvió el IPC nivel general nacional")
    return pd.DataFrame(precios).sort_index(), ipc.rename("ipc")


def api_series():
    url = f"{API}?ids={','.join(SERIES.values())}&limit=1000&format=json&start_date=2015-01-01"
    d = json.loads(get(url))
    df = pd.DataFrame(d["data"], columns=["fecha", *SERIES.keys()])
    df["fecha"] = pd.to_datetime(df["fecha"])
    return df.set_index("fecha")


def precios_indec():
    raw = pd.read_excel(io.BytesIO(get(XLS)), sheet_name="GBA", header=None)
    # Fila 2: años ("Año 2016"), fila 3: meses. Construir fechas por columna.
    years = raw.iloc[2].ffill()
    months = raw.iloc[3]
    meses = {m: i + 1 for i, m in enumerate(
        ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
         "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"])}
    fechas = {}
    for c in range(2, raw.shape[1]):
        y = "".join(ch for ch in str(years[c]) if ch.isdigit())[:4]  # "Año 2016" o 2023
        m = str(months[c]).strip()
        if len(y) == 4 and m in meses:
            fechas[c] = pd.Timestamp(int(y), meses[m], 1)
    out = {}
    for _, row in raw.iterrows():
        name = str(row[0]).strip()
        if name in CORTES:
            out[name] = pd.Series({f: pd.to_numeric(row[c], errors="coerce") for c, f in fechas.items()})
    return pd.DataFrame(out).sort_index()


def prorratear_sac(s: pd.Series, devolver_base: bool = False):
    """Saca el aguinaldo de junio/diciembre y lo reparte en los 6 meses del semestre.

    base(jun) = media geométrica de may y jul (o may si no hay jul); idem dic con nov/ene.
    SAC del semestre = valor observado - base. Cada mes del semestre recibe
    base_mes * (1 + SAC / suma(bases del semestre)).
    """
    s = s.dropna().copy()
    base = s.copy()
    for f in s.index[s.index.month.isin([6, 12])]:
        prev, nxt = f - pd.DateOffset(months=1), f + pd.DateOffset(months=1)
        if prev in s.index and nxt in s.index:
            base[f] = (s[prev] * s[nxt]) ** 0.5
        elif prev in s.index:
            base[f] = s[prev] * (s[prev] / s.get(prev - pd.DateOffset(months=1), s[prev]))
    prorr = base.copy()
    for f in s.index[s.index.month.isin([6, 12])]:
        sem = pd.date_range(f - pd.DateOffset(months=5), f, freq="MS")
        sem = [m for m in sem if m in base.index]
        sac = s[f] - base[f]
        ratio = sac / base[sem].sum()
        prorr[sem] = base[sem] * (1 + ratio)
    # Semestre en curso sin junio/dic publicado: aguinaldo estimado como 1/12
    ult = s.index.max()
    if ult.month not in (6, 12):
        ini = pd.Timestamp(ult.year, 1 if ult.month < 6 else 7, 1)
        abiertos = base.index[base.index >= ini]
        prorr[abiertos] = base[abiertos] * 13 / 12
    return (prorr, base) if devolver_base else prorr


def main():
    api = api_series()
    pr = precios_indec()
    fuente = "Excel INDEC + IPC de datos.gob.ar"
    token = os.environ.get("INDEC_TOKEN", "").strip()
    for nombre in (".indec_token", "indec_token.txt", ".indec_token.txt"):
        archivo_token = RAIZ / nombre
        if not token and archivo_token.exists():
            token = archivo_token.read_text(encoding="utf-8-sig").strip()
    if token:
        try:
            pr_api, ipc_api = precios_e_ipc_api_indec(token)
            # Control: diferencia entre la API y las fuentes anteriores en los meses comunes
            for c in pr_api:
                comun = pr_api[c].dropna().index.intersection(pr[c].dropna().index)
                if len(comun):
                    dif = (pr_api.loc[comun, c] / pr.loc[comun, c] - 1).abs().max()
                    print(f"API INDEC {c}: {len(pr_api[c].dropna())} meses, dif. máx. vs Excel {dif:.2%}")
            pr = pr_api.combine_first(pr)  # la API manda; el Excel completa meses faltantes
            api = api.reindex(api.index.union(ipc_api.index))
            api["ipc"] = ipc_api.combine_first(api["ipc"])
            fuente = "API INDEC (api.indec.gob.ar)"
        except Exception as e:  # noqa: BLE001
            print(f"API INDEC no disponible ({e}); uso las fuentes anteriores.")
    else:
        print("Sin INDEC_TOKEN: uso Excel de INDEC + IPC de datos.gob.ar.")
    print("Fuente de precios e IPC:", fuente)
    ipc_nac_override = api["ipc"].dropna() if token else None
    sal = salarios.construir(prorratear_sac, ipc_nac_override)
    idx = pd.date_range("1990-01-01", sal.index.max(), freq="MS")
    sal = sal.reindex(idx)
    mer = macro.construir(sal.index)
    for k in mer.columns:  # reemplaza fx_oficial/fx_blue de salarios.py por la versión diaria
        sal[k] = mer[k]
    sal.to_csv(OUT / "mensual.csv", float_format="%.4f")

    series = catalogo.construir(sal, token)
    # Sin token (o si la API falla) los precios de carne de GBA salen del Excel de INDEC
    ids = {s["id"] for s in series}
    for c in CORTES:
        sid = f"pp_gba_{catalogo.slug(c)}"
        if sid not in ids:
            series.append(catalogo.S(sid, f"{c} (GBA)", ["Precios", "Precios promedio por producto (INDEC)", "GBA"], "ars", "$ por kg",
                                     pr[c].reindex(idx), -1, "INDEC, sh_ipc_precios_promedio.xls", f"Precio promedio del kg de {c.lower()} en GBA."))
    datos = catalogo.a_json(series, idx)
    print(f"Catálogo: {len(datos['series'])} series en total")
    js = "window.DATOS = " + json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";"
    (OUT / "datos.js").write_text(js, encoding="utf-8")
    compilar_pagina(js)


def compilar_pagina(datos_js):
    """Une src/index.html + src/estilos.css + src/app.js + datos en un único DueloDeDatos.html."""
    base = RAIZ
    src = base / "src"
    html = (src / "index.html").read_text(encoding="utf-8")
    html = html.replace("/*ESTILOS*/", (src / "estilos.css").read_text(encoding="utf-8"))
    html = html.replace("/*DATOS*/", datos_js.replace("</", "<\\/"))
    html = html.replace("/*APP*/", (src / "app.js").read_text(encoding="utf-8"))
    (base / "DueloDeDatos.html").write_text(html, encoding="utf-8")
    print(f"Página: DueloDeDatos.html ({len(html) / 1e6:.1f} MB)")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--solo-pagina":  # recompila sin volver a bajar datos
        compilar_pagina((OUT / "datos.js").read_text(encoding="utf-8"))
    else:
        sys.exit(main())
