"""
Cuánto reciben las universidades nacionales y cuántos estudiantes tienen, para web/public/datos/universidades.json
(fase 3 de docs/specs/gasto-nacion.md).

Fuentes:
- Transferencias a cada universidad, 2018 en adelante: los respaldos de gasto_nacion.py (datos/cache/gasto_nacion_<AÑO>.csv),
  árbol `quien`, programa "Desarrollo de la Educación Superior", nivel 4 = universidad. Millones de pesos corrientes.
  No se baja nada acá: lo baja gasto_nacion.py.
- Estudiantes: Portal de Información Universitaria (PIU) de la Auditoría General de la Nación, https://piu.agn.gov.ar/
  (API CKAN, datasets "Matrícula estudiantil - <sigla>": un CSV por universidad y año, `;`, latin-1 o utf-8, columnas
  UNIVERSIDAD; EJERCICIO; PERÍODO; TÍTULO; CONDICIÓN; SEXO; CANTIDAD). Solo hay 2023 y 2024. Los datos los provee el CIN
  a partir de las universidades y la AGN no los audita. El total de las 61 sale del XLSX "estudiantes-2023-2024-61-uunn".

Respaldos versionados en datos/cache/:
- universidades_estudiantes.csv: una fila por universidad, año, título (grado/pregrado) y condición, con la cantidad
  (suma de los sexos) y la URL del CSV de origen: uni, anio, titulo, condicion, cant, url.
- universidades_estudiantes_61.json: total de pregrado y grado de las 61 universidades por año, y su URL.
- universidades_meta.json: el día de la última bajada (como mucho una por día).
Con `con_red=False` (--solo-json) se arma solo con los respaldos.

Controles (si no cierran, este módulo levanta RuntimeError y la corrida sigue sin universidades.json):
- por año: suma de universidades + "Sin asignar a una universidad" + "Otros gastos del programa" = total del programa
  (devengado y vigente, tolerancia 1 millón);
- UBA 2024 = 602.898,1 millones de devengado; UBA 2018 contra el informe 2023-004 de la AGN (19.383,7);
- estudiantes UBA 2023 = 326.421 y UNC 2023 = 158.625;
- la suma de las universidades con archivo en el PIU no pasa el total de las 61.

Uso suelto:  python pipeline/universidades.py --bajar    (baja el PIU y deja los respaldos, sin armar el JSON)
             python pipeline/universidades.py            (con red, arma en memoria y muestra el tamaño; no escribe en web/)
             python pipeline/universidades.py --sin-red  (igual, solo con los respaldos)
"""
import csv
import io
import json
import re
import sys
import urllib.parse
from datetime import date
from pathlib import Path

import pandas as pd

from gasto_nacion import (OTROS_PROGRAMA, PRIMER_ANIO, PROGRAMA_UNIVERSIDADES, _clave, _con_tildes, _r,
                          anio_en_curso)
from salarios import _get

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
URL_CKAN = "https://piu.agn.gov.ar/api/3/action/package_search"
URL_XLSX_61 = ("https://piu.agn.gov.ar/dataset/3da0b47f-2e5b-4799-ae7d-718767513a4e/resource/"
               "63b37ee8-004b-4973-b74e-7e998aa30eef/download/estudiantes-2023-2024-61-uunn.xlsx")
DATASET_61 = "matricula-estudiantil-uunn-2023"
FUENTE_TXT = ("Transferencias: Presupuesto Abierto (DGSIAF, Ministerio de Economía), programa Desarrollo de la Educación Superior. "
              "Estudiantes: Portal de Información Universitaria de la Auditoría General de la Nación (datos provistos por el "
              "Consejo Interuniversitario Nacional, sin auditar).")
ANIOS_EST = (2023, 2024)
TOL_CIERRE = 1.0          # millones de pesos
ESTUDIANTES_CONTROL = {("Universidad de Buenos Aires", 2023): 326421, ("Universidad Nacional de Córdoba", 2023): 158625}
UBA = "Universidad de Buenos Aires"
UBA_2024_DEV = 602898.1   # millones; coincide con la tabla de la p. 4 de comentario_universidades_2024.pdf
UBA_2018_DEV_AGN = 19383.7  # informe AGN 2023-004 (Cuenta de Inversión 2018)
SIN_ASIGNAR = "Sin asignar a una universidad"
SIN_ASIGNAR_CLAVES = {_clave("Universidades sin Discriminar"), _clave("Otras Universidades no especificadas")}
COLS_LARGO = ["uni", "anio", "titulo", "condicion", "cant", "url"]

# Nombres que cambian entre años o entre fuentes -> el nombre que se muestra (oficial). Las claves de arriba salen de _clave,
# así que mayúsculas, tildes, espacios y puntos no hace falta repetirlos. Va el nombre tal como lo escribe la fuente.
ALIAS = {
    # errores de tipeo del presupuesto (2018-2024)
    "Uiversidad Nacional del Oeste": "Universidad Nacional del Oeste",
    "Univesidad Nacional de San Juan": "Universidad Nacional de San Juan",
    # abreviaturas del presupuesto
    "Universidad Nacional del Centro de la Provincia de Bs.As.": "Universidad Nacional del Centro de la Provincia de Buenos Aires",
    "Universidad Nacional del Noroeste de la Pcia.de Buenos Aires": "Universidad Nacional del Noroeste de la Provincia de Buenos Aires",
    # el presupuesto y el PIU las llaman distinto
    "Universidad Nacional de Chaco Austral": "Universidad Nacional del Chaco Austral",
    "Universidad de Rafaela": "Universidad Nacional de Rafaela",
    "Universidad Nacional de Comechingones": "Universidad Nacional de los Comechingones",
    "Universidad Nacional de la Patagonia": "Universidad Nacional de la Patagonia San Juan Bosco",
    "Universidad Nacional de General San Martín": "Universidad Nacional de San Martín",
    "Universidad Nacional de Guillermo Brown": "Universidad Nacional Guillermo Brown",
    "Universidad Nacional José C. Paz": "Universidad Nacional José Clemente Paz",
}
ALIAS_CLAVE = {_clave(k): _clave(v) for k, v in ALIAS.items()}
NOMBRE_DE_CLAVE = {_clave(v): v for v in ALIAS.values()}


def _canonica(nombre):
    c = _clave(nombre)
    return ALIAS_CLAVE.get(c, c)


# ---------- bajada del PIU ----------

def _meta():
    f = CACHE / "universidades_meta.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def _guardar_meta(meta):
    (CACHE / "universidades_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def _ckan(params):
    return json.loads(_get(URL_CKAN + "?" + urllib.parse.urlencode(params), timeout=60))["result"]


def _datasets_matricula():
    """Datasets "Matrícula estudiantil - <sigla>" del PIU: los del grupo `4-matricula-estudiantil` más los que quedaron sin
    grupo (UTN 2023 y UNPA 2024, que el grupo no trae) y el de UNCAUS 2023, cuyo nombre técnico es otro."""
    por_nombre = {}
    for params in ({"fq": "groups:4-matricula-estudiantil"}, {"q": 'title:"Matrícula estudiantil"'}):
        inicio = 0
        while True:
            r = _ckan({**params, "rows": 100, "start": inicio})
            for p in r["results"]:
                if p["title"].strip().lower().startswith("matrícula estudiantil"):
                    por_nombre[p["name"]] = p
            inicio += 100
            if inicio >= r["count"]:
                break
    if len(por_nombre) < 50:
        raise RuntimeError(f"el PIU devolvió solo {len(por_nombre)} datasets de matrícula; algo cambió")
    return por_nombre


def _decodificar(b):
    try:
        return b.decode("utf-8-sig")
    except UnicodeDecodeError:
        return b.decode("latin-1")


def _num(s):
    """Cantidad con punto de miles ('1.234') o sin nada."""
    s = str(s).strip().replace(".", "").replace(" ", "")
    return int(s) if s.lstrip("-").isdigit() else None


def _filas_csv(raw, url):
    """CSV del PIU (bytes) -> lista de filas [uni, anio, titulo, condicion, cant, url] (suma de los sexos)."""
    texto = _decodificar(raw)
    filas = {}
    lector = csv.reader(io.StringIO(texto), delimiter=";")
    next(lector, None)  # encabezado: sus tildes vienen rotas según el archivo; se lee por posición
    for r in lector:
        if len(r) < 7 or not r[0].strip():
            continue
        cant = _num(r[6])
        anio = _num(r[1])
        if cant is None or anio is None:
            continue
        clave = (re.sub(r"\s+", " ", r[0]).strip(), anio, r[3].strip().lower(), r[4].strip())
        filas[clave] = filas.get(clave, 0) + cant
    return [[u, a, t, c, n, url] for (u, a, t, c), n in filas.items()]


def _total_61(raw):
    """XLSX de las 61 -> {año: total de pregrado y grado}. Busca la fila de cada año y toma su última columna."""
    d = pd.read_excel(io.BytesIO(raw), header=None)
    out = {}
    for _, fila in d.iterrows():
        a = pd.to_numeric(fila.iloc[0], errors="coerce")
        if pd.notna(a) and int(a) in ANIOS_EST:
            vals = pd.to_numeric(fila.iloc[1:], errors="coerce").dropna()
            if len(vals):
                out[int(a)] = int(vals.iloc[-1])
    if set(out) != set(ANIOS_EST):
        raise RuntimeError(f"no se encontraron los totales de {ANIOS_EST} en el XLSX de las 61 universidades")
    return out


def bajar_piu():
    """Baja el PIU y deja los respaldos. Un CSV que falla conserva sus filas del respaldo anterior. Si falla el listado, levanta."""
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / "universidades_estudiantes.csv"
    previo = pd.read_csv(f, keep_default_na=False) if f.exists() else pd.DataFrame(columns=COLS_LARGO)
    datasets = _datasets_matricula()
    csvs, url61 = [], URL_XLSX_61
    for p in datasets.values():
        for res in p["resources"]:
            u = res["url"]
            if u.lower().endswith(".csv") and u not in csvs:
                csvs.append(u)
            elif p["name"] == DATASET_61 and u.lower().endswith((".xlsx", ".xls")):
                url61 = u
    nuevas, fallaron = [], []
    for u in csvs:
        try:
            nuevas += _filas_csv(_get(u, timeout=60), u)
        except Exception as e:  # noqa: BLE001
            fallaron.append(u)
            print(f"  universidades: no se pudo bajar {u.rsplit('/', 1)[-1]} ({e})")
    largo = pd.DataFrame(nuevas, columns=COLS_LARGO)
    if fallaron:  # conservar lo último que se tenía de esos archivos
        largo = pd.concat([largo, previo[previo["url"].isin(fallaron)]], ignore_index=True)
    if largo.empty:
        raise RuntimeError("el PIU no devolvió ninguna fila de estudiantes")
    largo = largo.sort_values(["uni", "anio", "titulo", "condicion"]).reset_index(drop=True)
    largo.to_csv(f, index=False)
    print(f"  universidades: PIU bajado ({len(csvs) - len(fallaron)} de {len(csvs)} CSV, {len(largo)} filas)")
    f61 = CACHE / "universidades_estudiantes_61.json"
    try:
        tot = _total_61(_get(url61, timeout=60))
        f61.write_text(json.dumps({"totales": {str(a): n for a, n in tot.items()}, "url": url61}, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception as e:  # noqa: BLE001
        if not f61.exists():
            raise
        print(f"  universidades: error al bajar el total de las 61 ({e}); uso el respaldo")


def _actualizar_respaldos(con_red):
    meta = _meta()
    hoy = date.today().isoformat()
    hay = (CACHE / "universidades_estudiantes.csv").exists() and (CACHE / "universidades_estudiantes_61.json").exists()
    if con_red and (not hay or meta.get("bajado") != hoy):
        try:
            bajar_piu()
            meta["bajado"] = hoy
            _guardar_meta(meta)
        except Exception as e:  # noqa: BLE001
            if not hay:
                raise RuntimeError(f"no se pudo bajar el PIU y no hay respaldo ({e})") from e
            print(f"  universidades: error al bajar el PIU ({e}); uso el respaldo")
    elif not hay:
        raise RuntimeError("no hay respaldo de estudiantes (datos/cache/universidades_estudiantes*)")


# ---------- estudiantes ----------

def _estudiantes():
    """-> ({(clave canónica, año): {"total", "nuevos"}}, {clave canónica: nombre del PIU}, {año: total de las 61})."""
    df = pd.read_csv(CACHE / "universidades_estudiantes.csv", keep_default_na=False)
    df = df[df["titulo"].isin(["grado", "pregrado"]) & df["anio"].isin(ANIOS_EST)]
    # un mismo (universidad, año) en dos archivos distintos se contaría dos veces: se queda el primero
    origen = df.groupby(["uni", "anio"])["url"].agg(lambda s: sorted(set(s)))
    for (u, a), urls in origen.items():
        if len(urls) > 1:
            print(f"  universidades: {u} {a} aparece en {len(urls)} archivos; uso {urls[0].rsplit('/', 1)[-1]}")
            df = df[~((df["uni"] == u) & (df["anio"] == a) & (df["url"] != urls[0]))]
    est, nombres = {}, {}
    for (u, a), g in df.groupby(["uni", "anio"]):
        c = _canonica(u)
        nombres.setdefault(c, u)
        total = int(g["cant"].sum())
        nuevos = int(g.loc[g["condicion"].str.lower().str.startswith("nuevo"), "cant"].sum())
        if (c, int(a)) in est:   # dos nombres del PIU que caen en la misma universidad
            raise RuntimeError(f"universidades: dos nombres del PIU caen en la misma universidad ({u}, {a})")
        est[(c, int(a))] = {"total": total, "nuevos": nuevos}
    tot61 = {int(a): int(n) for a, n in json.loads((CACHE / "universidades_estudiantes_61.json").read_text(encoding="utf-8"))["totales"].items()}
    return est, nombres, tot61


# ---------- transferencias ----------

def _cargar_presupuesto():
    """-> {año: DataFrame largo de gasto_nacion_<año>.csv} con los respaldos que hay."""
    datos = {}
    for a in range(PRIMER_ANIO, anio_en_curso() + 1):
        f = CACHE / f"gasto_nacion_{a}.csv"
        if f.exists():
            datos[a] = pd.read_csv(f, keep_default_na=False, dtype={"ids": str, "n1": str, "n2": str, "n3": str, "n4": str})
    if not datos:
        raise RuntimeError("no hay respaldos gasto_nacion_<AÑO>.csv (correr gasto_nacion.py primero)")
    return datos


def _pib_por_anio():
    f = CACHE / "gasto_nacion_finfun.csv"
    if not f.exists():
        return {}
    fin = pd.read_csv(f, encoding="utf-8-sig")
    return {int(a): _r(p / 1e6) for a, p in zip(fin["ejercicio_presupuestario"], fin["pib"]) if pd.notna(p)}


def _por_universidad(df):
    """DataFrame largo de un año -> ({clave canónica: [nombre en el año, vig, dev]}, sin_asignar [vig, dev], otros [vig, dev], programa [vig, dev])."""
    q = df[(df["arbol"] == "quien") & (df["n3"].map(_clave) == PROGRAMA_UNIVERSIDADES)]
    programa = [float(q["credito_vigente"].sum()), float(q["credito_devengado"].sum())]
    univ, sin_asignar, otros = {}, [0.0, 0.0], [0.0, 0.0]
    for n4, vig, dev in zip(q["n4"], q["credito_vigente"], q["credito_devengado"]):
        c = _clave(n4)
        if n4 == OTROS_PROGRAMA:
            destino = otros
        elif c in SIN_ASIGNAR_CLAVES:
            destino = sin_asignar
        else:
            c = _canonica(n4)
            u = univ.setdefault(c, [n4, 0.0, 0.0])
            u[1] += vig
            u[2] += dev
            continue
        destino[0] += vig
        destino[1] += dev
    return univ, sin_asignar, otros, programa


def _fallo(msg):
    raise RuntimeError(f"universidades: {msg}; no se escribe el archivo")


def construir(con_red=True):
    """Devuelve {"universidades.json": objeto}. Si un control no pasa, levanta RuntimeError."""
    CACHE.mkdir(parents=True, exist_ok=True)
    _actualizar_respaldos(con_red)
    est, nombres_piu, tot61 = _estudiantes()
    datos = _cargar_presupuesto()
    pibs = _pib_por_anio()
    anios = sorted(datos)

    por_anio = {}
    for a in anios:
        univ, sin, otros, prog = _por_universidad(datos[a])
        # control: universidades + sin asignar + otros = programa (devengado y vigente)
        for k, nombre in ((1, "devengado"), (0, "vigente")):
            suma = sum(u[2 if k == 1 else 1] for u in univ.values()) + sin[k] + otros[k]
            if abs(suma - prog[k]) > TOL_CIERRE:
                _fallo(f"{a}: universidades + sin asignar + otros ({suma:,.1f}) no da el {nombre} del programa ({prog[k]:,.1f})")
        if not univ:
            _fallo(f"{a}: no se encontró ninguna universidad en el programa")
        por_anio[a] = (univ, sin, otros, prog)
        print(f"  control {a}: {len(univ)} universidades; devengado del programa {prog[1]:,.1f} = universidades + sin asignar + otros (tolerancia {TOL_CIERRE:.0f})")

    # nombre a mostrar: el oficial de ALIAS si hay; si no, el del último año en que figura (con las tildes repuestas)
    mostrar = {}
    for a in reversed(anios):
        for c, u in por_anio[a][0].items():
            mostrar.setdefault(c, u[0])
    for c in list(mostrar):
        mostrar[c] = NOMBRE_DE_CLAVE.get(c, mostrar[c])
    tildes = _con_tildes(list(mostrar.values()) + list(nombres_piu.values()))
    mostrar = {c: tildes(n) for c, n in mostrar.items()}

    # emparejamiento PIU <-> presupuesto
    claves_pres = set(mostrar)
    claves_piu = {c for c, _ in est}
    sin_estudiantes = sorted(mostrar[c] for c in claves_pres - claves_piu)
    sin_presupuesto = sorted(nombres_piu[c] for c in claves_piu - claves_pres)
    print(f"  PIU con estudiantes y sin fila en el presupuesto ({len(sin_presupuesto)}): {sin_presupuesto}")
    print(f"  presupuesto sin estudiantes en el PIU ({len(sin_estudiantes)}): {sin_estudiantes}")
    if sin_presupuesto:
        # no se frena todo: esas universidades quedan sin estudiantes hasta que se agregue el alias
        print(f"  AVISO universidades: del PIU sin emparejar con el presupuesto (agregar un alias en ALIAS): {sin_presupuesto}")

    # controles de estudiantes
    for (nombre, a), esperado in ESTUDIANTES_CONTROL.items():
        c = _clave(nombre)
        got = est.get((c, a), {}).get("total")
        print(f"  control estudiantes {nombre} {a}: {got} (esperado {esperado})")
        if got != esperado:
            _fallo(f"estudiantes de {nombre} en {a}: {got}, se esperaba {esperado}")
    for a in ANIOS_EST:
        suma = sum(v["total"] for (c, y), v in est.items() if y == a)
        n = sum(1 for (c, y) in est if y == a)
        print(f"  control estudiantes {a}: {n} universidades con archivo suman {suma:,} <= total de las 61: {tot61[a]:,}")
        if suma > tot61[a]:
            _fallo(f"los estudiantes de las universidades con archivo en {a} ({suma}) superan el total de las 61 ({tot61[a]})")

    # controles de transferencias contra fuentes externas
    cuba = _clave(UBA)
    if 2024 in por_anio:
        v = por_anio[2024][0][cuba][2]
        print(f"  control UBA 2024 devengado: {v:,.1f} (esperado {UBA_2024_DEV:,.1f})")
        if abs(v - UBA_2024_DEV) > 0.1:
            _fallo(f"UBA 2024: devengado {v:,.1f}, se esperaba {UBA_2024_DEV:,.1f}")
    if 2018 in por_anio:
        v = por_anio[2018][0][cuba][2]
        print(f"  control UBA 2018 devengado: {v:,.1f} (AGN 2023-004: {UBA_2018_DEV_AGN:,.1f}; diferencia {v - UBA_2018_DEV_AGN:+,.1f})")
        if abs(v / UBA_2018_DEV_AGN - 1) > 0.02:
            _fallo(f"UBA 2018: devengado {v:,.1f}, se esperaba cerca de {UBA_2018_DEV_AGN:,.1f}")

    # armado
    def serie(c, k):
        return [_r(por_anio[a][0][c][k]) if c in por_anio[a][0] else None for a in anios]

    universidades = []
    for c, nombre in mostrar.items():
        e = {str(a): est[(c, a)] for a in ANIOS_EST if (c, a) in est}
        universidades.append({"n": nombre, "dev": serie(c, 2), "vig": serie(c, 1), "est": e or None})
    universidades.sort(key=lambda u: (-next((x for x in reversed(u["dev"]) if x is not None), 0), u["n"]))

    def par(i, k):
        return [_r(por_anio[a][i][k]) for a in anios]

    sin_asignar = {"dev": par(1, 1), "vig": par(1, 0)}
    otros_programa = {"dev": par(2, 1), "vig": par(2, 0)}
    # el programa vale la suma de sus partes ya redondeadas (así las cuentas cierran al decimal)
    programa = {}
    for k in ("dev", "vig"):
        programa[k] = [_r(sum(u[k][i] or 0 for u in universidades) + sin_asignar[k][i] + otros_programa[k][i]) for i in range(len(anios))]
    obj = {"generado": date.today().isoformat(), "fuente": FUENTE_TXT, "anios": anios, "pib": [pibs.get(a) for a in anios],
           "universidades": universidades, "sin_asignar": sin_asignar, "otros_programa": otros_programa, "programa": programa,
           "estudiantes_61": {str(a): tot61[a] for a in ANIOS_EST}}
    return {"universidades.json": obj}


def construir_json(con_red=True):
    return construir(con_red)


if __name__ == "__main__":
    if "--bajar" in sys.argv:
        bajar_piu()
        _guardar_meta({**_meta(), "bajado": date.today().isoformat()})
        sys.exit(0)
    res = construir(con_red="--sin-red" not in sys.argv)
    for nombre, obj in sorted(res.items()):
        txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        print(f"{nombre}: {len(txt.encode('utf-8')) / 1024:.0f} KB")
