"""
Cómo viene el año en curso: ejecución mes a mes de la Administración Nacional contra el mismo período del año anterior,
para web/public/datos/gasto_nacion_mensual.json (fase 2 de docs/specs/gasto-nacion.md).

Fuente: Presupuesto Abierto (DGSIAF, Ministerio de Economía), repositorio sin clave:
  credito-mensual-<AÑO>.zip  (un CSV de ~335 MB sin comprimir, 360 mil filas; se lee por partes, el crudo NO se guarda)
Montos en millones de pesos corrientes. Cómo vienen las etapas por mes: presupuestado, todo en enero; vigente, el de
enero más las modificaciones de cada mes (la suma acumulada es el vigente al cierre de cada mes); devengado, lo de cada mes.
El último mes viene parcial (el archivo se actualiza a mitad de mes): `meses_completos` y `mes_parcial` salen de la fecha
de `ultima_actualizacion_fecha`.

Respaldos versionados en datos/cache/:
- gasto_mensual_<AÑO>.csv: el agregado del año en formato largo, una fila por hoja de cada árbol y mes:
  arbol, ids, n1, n2, n3, mes, pres, vig, dev (montos del mes, sin acumular).
- gasto_mensual_meta.json: de cada año, la fecha de actualización que declara el archivo y el día en que se bajó.
Año cerrado (`gasto_nacion.anio_cerrado`): no se vuelve a bajar. Año en curso: como mucho una bajada por día.
Con `con_red=False` (--solo-json) se arma solo con los respaldos.

Árboles (contrato con el sitio): para_que (finalidad > función), quien (jurisdicción > entidad > programa, sin el nivel de
universidades) y en_que (inciso, con su nombre para el público y el técnico en "t" > partida principal).

Uso suelto:  python pipeline/gasto_mensual.py --bajar    (baja y deja los respaldos, sin armar el JSON)
             python pipeline/gasto_mensual.py            (con red, arma en memoria y muestra el tamaño; no escribe en web/)
             python pipeline/gasto_mensual.py --sin-red  (igual, solo con los respaldos)
"""
import io
import json
import sys
import zipfile
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from gasto_nacion import (INCISOS, URL_BASE, _fecha_actualizacion, _r, _titulos, _unificar, anio_cerrado,
                          limpiar)
from salarios import _get

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
URL_MENSUAL = URL_BASE + "/{a}/credito-mensual-{a}.zip"
FUENTE_TXT = ("Presupuesto Abierto, Dirección General de Sistemas de Información Financiera (DGSIAF), Ministerio de Economía: "
              "créditos mensuales de la Administración Nacional (sin empresas públicas ni fondos fiduciarios).")
DEV_ANIO_CERRADO = 0.005   # suma de los 12 meses de A-1 contra el anual de A-1
DEV_ANIO_CURSO = 0.02      # idem para A, y para el vigente acumulado de A
ETAPAS = {"credito_presupuestado": "pres", "credito_vigente": "vig", "credito_devengado": "dev"}
COLS = ["jurisdiccion_desc", "entidad_desc", "programa_desc", "finalidad_id", "finalidad_desc", "funcion_id", "funcion_desc",
        "inciso_id", "inciso_desc", "principal_desc", "impacto_presupuestario_anio", "impacto_presupuestario_mes",
        "ultima_actualizacion_fecha"] + list(ETAPAS)
# (árbol, columna con el id o None, columnas de nombre)
ARBOLES = [
    ("para_que", "id_pq", ["finalidad_desc", "funcion_desc"]),
    ("quien", None, ["jurisdiccion_desc", "entidad_desc", "programa_desc"]),
    ("en_que", "id_inc", ["inciso_desc", "principal_desc"]),
]
SIN_NOMBRE = "Sin clasificar"
TIPOS_LARGO = {"ids": str, "n1": str, "n2": str, "n3": str}


# ---------- bajada y agregado ----------

def _agregar_zip(raw_zip, anio):
    """ZIP del crédito mensual (bytes) -> (DataFrame largo: arbol, ids, n1, n2, n3, mes, pres, vig, dev; fecha de actualización)."""
    z = zipfile.ZipFile(io.BytesIO(raw_zip))
    nombre = next(n for n in z.namelist() if n.lower().endswith(".csv"))
    partes, fechas = [], set()
    with z.open(nombre) as fh:
        for chunk in pd.read_csv(fh, encoding="utf-8-sig", dtype=str, usecols=lambda c: c in COLS, chunksize=200_000):
            fechas.update(chunk["ultima_actualizacion_fecha"].dropna().unique())
            chunk = chunk[pd.to_numeric(chunk["impacto_presupuestario_anio"], errors="coerce") == anio].copy()
            chunk["mes"] = pd.to_numeric(chunk["impacto_presupuestario_mes"], errors="coerce").fillna(0).astype(int)
            chunk = chunk[(chunk["mes"] >= 1) & (chunk["mes"] <= 12)]
            for col, corto in ETAPAS.items():   # decimales con coma
                chunk[corto] = pd.to_numeric(chunk[col].astype(str).str.replace(",", ".", regex=False), errors="coerce").fillna(0.0)
            for c in ("finalidad_id", "funcion_id", "inciso_id"):
                chunk[c] = pd.to_numeric(chunk[c], errors="coerce").fillna(0).astype(int)
            for c in [c for c in COLS if c.endswith("_desc")]:
                chunk[c] = chunk[c].fillna("")
            chunk["id_pq"] = chunk["finalidad_id"].astype(str) + "." + chunk["funcion_id"].astype(str)
            chunk["id_inc"] = chunk["inciso_id"].astype(str)
            for arbol, col_id, nombres in ARBOLES:
                claves = ([col_id] if col_id else []) + nombres + ["mes"]
                g = chunk.groupby(claves, dropna=False)[["pres", "vig", "dev"]].sum().reset_index()
                out = pd.DataFrame(index=g.index)
                out["arbol"] = arbol
                out["ids"] = g[col_id].astype(str) if col_id else ""
                for i in range(3):
                    out[f"n{i + 1}"] = g[nombres[i]] if i < len(nombres) else ""
                out["mes"] = g["mes"]
                for e in ("pres", "vig", "dev"):
                    out[e] = g[e]
                partes.append(out)
    if not partes:
        raise RuntimeError(f"el archivo mensual {anio} no trae filas del ejercicio")
    largo = pd.concat(partes, ignore_index=True)
    for c in ("n1", "n2", "n3"):   # limpiar sobre las combinaciones únicas (no sobre 360 mil filas)
        largo[c] = largo[c].map(limpiar)
    largo = largo.groupby(["arbol", "ids", "n1", "n2", "n3", "mes"], dropna=False)[["pres", "vig", "dev"]].sum().reset_index()
    for e in ("pres", "vig", "dev"):
        largo[e] = largo[e].round(4)
    largo = largo[(largo["pres"] != 0) | (largo["vig"] != 0) | (largo["dev"] != 0)].reset_index(drop=True)
    return largo, _fecha_actualizacion(pd.Series(list(fechas)))


def _meta():
    f = CACHE / "gasto_mensual_meta.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def _guardar_meta(meta):
    (CACHE / "gasto_mensual_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def _leer_respaldo(f):
    return pd.read_csv(f, keep_default_na=False, dtype=TIPOS_LARGO)


def cargar_anio(anio, con_red, meta):
    """Agregado largo del año (de la red o del respaldo), o None si no hay. Actualiza `meta`."""
    f = CACHE / f"gasto_mensual_{anio}.csv"
    hoy = date.today().isoformat()
    m = meta.get(str(anio), {})
    cerrado = anio_cerrado(anio, m.get("actualizado"))
    if f.exists() and (not con_red or cerrado or m.get("bajado") == hoy):
        return _leer_respaldo(f)
    if con_red:
        try:
            raw = _get(URL_MENSUAL.format(a=anio), timeout=600)
            largo, actualizado = _agregar_zip(raw, anio)
            largo.to_csv(f, index=False)
            meta[str(anio)] = {"actualizado": actualizado, "bajado": hoy}
            print(f"  gasto mensual {anio}: bajado ({len(largo)} filas agregadas, actualizado {actualizado})")
            return largo
        except Exception as e:  # noqa: BLE001
            if f.exists():
                print(f"  gasto mensual {anio}: error al bajar ({e}); uso el respaldo {f.name}")
                return _leer_respaldo(f)
            print(f"  gasto mensual {anio}: no se pudo bajar y no hay respaldo ({e}); se omite el año")
            return None
    return None


def meses_de_datos(anio, actualizado):
    """(meses completos, mes parcial o None) según la fecha de actualización del archivo del ejercicio `anio`.
    Los completos son los anteriores al mes de la fecha (todos si es del año siguiente o del último día del mes)."""
    if not actualizado:
        return 0, None
    f = date.fromisoformat(actualizado)
    if f.year > anio:
        return 12, None
    if f.year < anio:
        return 0, None
    if (f + timedelta(days=1)).month != f.month or f.month == 12 and f.day == 31:
        return f.month, None
    return f.month - 1, f.month


def bajar():
    """Baja lo que corresponda y deja los respaldos (sin armar el JSON)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    meta = _meta()
    elegir_anios(True, meta)
    _guardar_meta(meta)


def elegir_anios(con_red, meta):
    """-> (A, df de A, A-1, df de A-1). A: el año de hoy si ya tiene un mes completo; si no (enero), el anterior."""
    hoy = date.today().year
    for a in (hoy, hoy - 1):
        df = cargar_anio(a, con_red, meta)
        if df is None:
            continue
        completos, _ = meses_de_datos(a, meta.get(str(a), {}).get("actualizado"))
        if completos == 0:
            continue
        ant = cargar_anio(a - 1, con_red, meta)
        if ant is None:
            raise RuntimeError(f"gasto mensual: no hay datos de {a - 1} para comparar con {a}")
        return a, df, a - 1, ant
    raise RuntimeError("gasto mensual: no hay datos de ningún año con un mes completo (ni red ni respaldo)")


# ---------- armado del JSON ----------

def _nodo(n):
    z = lambda k=12: np.zeros(k)   # noqa: E731
    return {"n": n, "d": z(), "a": z(), "vm": z(), "vam": z(), "p": 0.0, "pa": 0.0, "h": {}}


def _sumar(nodo, mes, fila, actual):
    i = mes - 1
    if actual:
        nodo["d"][i] += fila.dev
        nodo["vm"][i] += fila.vig
        nodo["p"] += fila.pres
    else:
        nodo["a"][i] += fila.dev
        nodo["vam"][i] += fila.vig
        nodo["pa"] += fila.pres


NIVELES_ARBOL = {"para_que": 2, "quien": 3, "en_que": 2}


def _armar_arbol(df_act, df_ant, arbol, tecnicos):
    """Dos agregados largos (año A y A-1, con nombres ya unificados) -> árbol de dicts con vectores mensuales sin redondear.
    Un nodo del otro año se empareja por el nombre, dentro del mismo padre."""
    raiz = _nodo("Total")
    for df, actual in ((df_act, True), (df_ant, False)):
        g = df[df["arbol"] == arbol]
        for fila in g.itertuples(index=False):
            nodo = raiz
            _sumar(nodo, fila.mes, fila, actual)
            # cada árbol tiene una cantidad fija de niveles; un nombre vacío va a "Sin clasificar" para que la suma de los hijos dé el padre
            for nombre in (fila.n1, fila.n2, fila.n3)[: NIVELES_ARBOL[arbol]]:
                nombre = nombre or SIN_NOMBRE
                hijo = nodo["h"].get(nombre)
                if hijo is None:
                    hijo = nodo["h"][nombre] = _nodo(nombre)
                    if nodo is raiz and nombre in tecnicos:
                        hijo["t"] = tecnicos[nombre]
                _sumar(hijo, fila.mes, fila, actual)
                nodo = hijo
    return raiz


def _redondear(x):
    r = _r(x)
    return int(r) if r == int(r) else r


def _cerrar(nodo, largo):
    """Dict de hijos -> lista ordenada por devengado a la fecha (mayor a menor); vectores finales (d y vd de `largo` meses).
    Redondea a 1 decimal de abajo hacia arriba: cada nodo con hijos vale la suma de sus hijos ya redondeados."""
    hijos = nodo.pop("h")
    if hijos:
        lista = [_cerrar(h, largo) for h in hijos.values()]
        lista.sort(key=lambda x: (-sum(x["d"]), -sum(x["a"]), x["n"]))
        nodo["h"] = lista
        for k in ("d", "a", "vd", "va"):
            nodo[k] = [_redondear(sum(h[k][i] for h in lista)) for i in range(len(lista[0][k]))]
        for k in ("p", "pa"):
            nodo[k] = _redondear(sum(h[k] for h in lista))
    else:
        nodo["d"] = [_redondear(x) for x in nodo["d"][:largo]]
        nodo["a"] = [_redondear(x) for x in nodo["a"]]
        nodo["vd"] = [_redondear(x) for x in np.cumsum(nodo["vm"])[:largo]]
        nodo["va"] = [_redondear(x) for x in np.cumsum(nodo["vam"])]
        nodo["p"], nodo["pa"] = _redondear(nodo["p"]), _redondear(nodo["pa"])
    nodo.pop("vm", None)
    nodo.pop("vam", None)
    # orden de claves del contrato: n, t, d, a, vd, va, p, pa, h
    h = nodo.pop("h", None)
    out = {k: nodo[k] for k in ("n", "t", "d", "a", "vd", "va", "p", "pa") if k in nodo}
    if h:
        out["h"] = h
    return out


def _podar(nodo):
    """Saca los nodos sin ningún valor en ninguno de los dos años (el redondeo puede dejar hojas en cero)."""
    if "h" in nodo:
        nodo["h"] = [h for h in (_podar(h) for h in nodo["h"]) if h is not None]
        if not nodo["h"]:
            del nodo["h"]
    todo_cero = not any(any(nodo[k]) for k in ("d", "a", "vd", "va")) and not nodo["p"] and not nodo["pa"]
    return None if todo_cero and "h" not in nodo else nodo


def _total_anual(anio):
    """(vigente, devengado) del archivo anual del año (suma de las hojas del árbol para_que), o None si no hay respaldo."""
    f = CACHE / f"gasto_nacion_{anio}.csv"
    if not f.exists():
        return None
    df = pd.read_csv(f, keep_default_na=False, usecols=["arbol", "credito_vigente", "credito_devengado"])
    df = df[df["arbol"] == "para_que"]
    return float(df["credito_vigente"].sum()), float(df["credito_devengado"].sum())


def _control(nombre, valor, ref, tol):
    desvio = valor / ref - 1 if ref else float("inf")
    print(f"  control {nombre}: mensual {valor:,.1f} vs anual {ref:,.1f} ({desvio:+.3%}, tolerancia {tol:.1%})")
    if abs(desvio) > tol:
        raise RuntimeError(f"gasto mensual: el control '{nombre}' no pasa ({desvio:+.2%}, tolerancia {tol:.1%}); no se escribe el archivo")


def construir(con_red=True):
    """Devuelve {"gasto_nacion_mensual.json": objeto}. Si un control no pasa, levanta RuntimeError."""
    CACHE.mkdir(parents=True, exist_ok=True)
    meta = _meta()
    anio, df_act, anio_ant, df_ant = elegir_anios(con_red, meta)
    if con_red:
        _guardar_meta(meta)
    actualizado = meta.get(str(anio), {}).get("actualizado")
    completos, parcial = meses_de_datos(anio, actualizado)
    if parcial is not None and not df_act[(df_act["mes"] == parcial) & (df_act["dev"] != 0)].shape[0]:
        parcial = None   # la fecha dice parcial pero el mes no trae gasto: no hay mes parcial
    largo = completos + (1 if parcial else 0)

    mostrar = _titulos({anio: df_act.assign(n4=""), anio_ant: df_ant.assign(n4="")})
    unif = [_unificar(d.assign(n4=""), mostrar).drop(columns="n4") for d in (df_act, df_ant)]
    tecnicos = {}
    for d in unif:   # en_que: el nivel 1 son los incisos, con el nombre del público y el técnico en "t"
        m = d["arbol"] == "en_que"
        tec = {}
        nuevos = []
        for i, n in zip(d.loc[m, "ids"], d.loc[m, "n1"]):
            try:
                pub = INCISOS.get(int(i), n)
            except ValueError:
                pub = n
            tec[pub] = f"Inciso {i} - {n}"
            nuevos.append(pub)
        d.loc[m, "n1"] = nuevos
        tecnicos.update(tec)

    arboles = {}
    for arbol, _, _ in ARBOLES:
        arboles[arbol] = _podar(_cerrar(_armar_arbol(unif[0], unif[1], arbol, tecnicos if arbol == "en_que" else {}), largo))

    # controles
    total = arboles["para_que"]
    for nombre, arb in arboles.items():
        for k in ("d", "a", "vd", "va"):
            if any(abs(x - y) > 5 for x, y in zip(arb[k], total[k])):
                raise RuntimeError(f"gasto mensual: el árbol {nombre} no suma el mismo total que para_que ({k})")
        if abs(arb["p"] - total["p"]) > 5 or abs(arb["pa"] - total["pa"]) > 5:
            raise RuntimeError(f"gasto mensual: el árbol {nombre} no suma el mismo presupuestado que para_que")
    if len(total["a"]) != 12 or len(total["d"]) != largo:
        raise RuntimeError("gasto mensual: largo inesperado de los vectores mensuales")
    anual_ant, anual_act = _total_anual(anio_ant), _total_anual(anio)
    if anual_ant is None or anual_act is None:
        print("  controles contra el anual: falta el respaldo gasto_nacion_<AÑO>.csv; se omiten (correr gasto_nacion primero)")
    else:
        _control(f"devengado {anio_ant} (12 meses)", sum(total["a"]), anual_ant[1], DEV_ANIO_CERRADO)
        _control(f"devengado {anio} (a la fecha)", sum(total["d"]), anual_act[1], DEV_ANIO_CURSO)
        _control(f"vigente {anio} (acumulado)", total["vd"][-1], anual_act[0], DEV_ANIO_CURSO)

    raiz = {k: v for k, v in total.items() if k != "h"}
    obj = {"generado": date.today().isoformat(), "fuente": FUENTE_TXT, "anio": anio, "anio_ant": anio_ant,
           "actualizado": actualizado, "meses_completos": completos, "mes_parcial": parcial,
           "total": raiz, "arboles": arboles}
    return {"gasto_nacion_mensual.json": obj}


def construir_json(con_red=True):
    return construir(con_red)


if __name__ == "__main__":
    if "--bajar" in sys.argv:
        bajar()
        sys.exit(0)
    res = construir(con_red="--sin-red" not in sys.argv)
    for nombre, obj in sorted(res.items()):
        txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        print(f"{nombre}: {len(txt.encode('utf-8')) / 1024:.0f} KB")
