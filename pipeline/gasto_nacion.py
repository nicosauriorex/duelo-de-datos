"""
En qué gasta la Nación: presupuesto y ejecución de la Administración Nacional, año por año (2018 en adelante),
para web/public/datos/gasto_nacion.json (índice) y gasto_nacion_<AÑO>.json (cinco árboles de cada año).

Fuente: Presupuesto Abierto (DGSIAF, Ministerio de Economía), repositorio sin clave:
  credito-anual-<AÑO>.zip  (un CSV de ~100 MB por año; entra en memoria, el crudo NO se guarda)
  serie_finfun_anual.csv   (devengado por finalidad y función desde 2004, y el PIB nominal; en pesos)
Montos en millones de pesos corrientes. Etapas, siempre en este orden: presupuestado, vigente, comprometido, devengado, pagado.

Respaldos versionados en datos/cache/:
- gasto_nacion_<AÑO>.csv: el agregado de ese año, en formato largo (una fila por hoja de cada árbol):
  arbol, ids, n1..n4 (nombres), y las cinco etapas. Se suma hacia arriba para armar cada nivel.
- gasto_nacion_meta.json: de cada año, la fecha de actualización que declara el archivo y el día en que se bajó.
- gasto_nacion_finfun.csv: copia de serie_finfun_anual.csv.
Años cerrados (`anio_cerrado`: el respaldo se bajó con la actualización de N+1, posterior a marzo): no se vuelven a bajar.
Años sin cerrar ("en curso", puede haber dos): como mucho una bajada por día.
Con `con_red=False` (--solo-json) se arma solo con los respaldos.

Además, tres cruces con la provincia (los usa provincias.py; no van a gasto_nacion_<AÑO>.json): prov_para_que, prov_quien y prov_en_que
(n1 = provincia; `ids` empieza con el código INDEC de la ubicación geográfica).

Árboles (contrato con el sitio): para_que (finalidad > función), quien (jurisdicción > entidad > programa; en el programa
de Educación Superior, un nivel más con cada universidad), en_que (inciso > partida principal), donde (provincia), fuente.

Uso suelto:  python pipeline/gasto_nacion.py --bajar   (baja y deja los respaldos, sin armar los JSON)
             python pipeline/gasto_nacion.py           (con red, arma todo en memoria y muestra el tamaño de cada JSON; no escribe en web/)
             python pipeline/gasto_nacion.py --sin-red (igual, solo con los respaldos)
"""
import io
import json
import re
import sys
import unicodedata
import zipfile
from datetime import date
from pathlib import Path

import pandas as pd

from salarios import _get

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
URL_BASE = "https://dgsiaf-repo.mecon.gob.ar/repository/pa/datasets"
URL_ANUAL = URL_BASE + "/{a}/credito-anual-{a}.zip"
URL_FINFUN = URL_BASE + "/serie_finfun_anual.csv"
PRIMER_ANIO = 2018
ETAPAS = ["credito_presupuestado", "credito_vigente", "credito_comprometido", "credito_devengado", "credito_pagado"]
FUENTE_TXT = ("Presupuesto Abierto, Dirección General de Sistemas de Información Financiera (DGSIAF), Ministerio de Economía: "
              "créditos anuales de la Administración Nacional (sin empresas públicas ni fondos fiduciarios).")
MAX_DESVIO_FINFUN = 0.05  # si el total de un año se aparta más de esto de la serie oficial, algo cambió (unidad, filas): se frena
PROGRAMA_UNIVERSIDADES = "desarrollodelaeducacionsuperior"
OTROS_PROGRAMA = "Otros gastos del programa"

COLS = ["jurisdiccion_desc", "entidad_desc", "programa_desc", "finalidad_id", "finalidad_desc", "funcion_id", "funcion_desc",
        "inciso_id", "inciso_desc", "principal_id", "principal_desc", "subparcial_desc",
        "fuente_financiamiento_desc", "ubicacion_geografica_id", "ubicacion_geografica_desc", "ultima_actualizacion_fecha"] + ETAPAS

# nombres para el público de los incisos: id -> nombre (el técnico va en "t")
INCISOS = {
    1: "Sueldos y cargas sociales del personal",
    2: "Bienes de consumo",
    3: "Servicios",
    4: "Obras y equipos (bienes de uso)",
    5: "Transferencias",
    6: "Préstamos y compras de activos financieros",
    7: "Deuda: intereses y pagos de capital",
    8: "Otros gastos",
    9: "Gastos figurativos",
}
FINALIDADES = {  # el archivo las trae en mayúsculas y sin tildes
    "ADMINISTRACION GUBERNAMENTAL": "Administración gubernamental",
    "SERVICIOS DE DEFENSA Y SEGURIDAD": "Servicios de defensa y seguridad",
    "SERVICIOS SOCIALES": "Servicios sociales",
    "SERVICIOS ECONOMICOS": "Servicios económicos",
    "DEUDA PUBLICA": "Deuda pública",
}
MINUSCULAS = {"de", "del", "la", "las", "los", "y", "e", "en", "a", "al", "para", "por", "con", "el", "o", "u"}
MESES = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
         "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}


# ---------- nombres ----------

def _clave(txt):
    """Clave para unificar un mismo nombre escrito distinto (mayúsculas, tildes, espacios, signos)."""
    s = unicodedata.normalize("NFD", str(txt))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())


def limpiar(txt):
    """Espacios limpios y mayúscula inicial. Si viene todo en mayúsculas, lo pasa a minúsculas salvo las siglas cortas."""
    if txt is None or (isinstance(txt, float) and pd.isna(txt)):
        return ""
    s = re.sub(r"\s+", " ", str(txt)).strip()
    if not s:
        return ""
    if s.upper() == s and any(c.isalpha() for c in s):
        if s in FINALIDADES:
            return FINALIDADES[s]
        palabras = []
        for i, p in enumerate(s.split(" ")):
            pl = p.lower()
            if pl in MINUSCULAS and i > 0:
                palabras.append(pl)
            elif len(p) <= 5 and p.isalpha() and i > 0 and pl not in MINUSCULAS:
                palabras.append(p)  # sigla corta
            else:
                palabras.append(pl)
        s = " ".join(palabras)
    return s[0].upper() + s[1:]


# ---------- bajada y agregado ----------

def _fecha_actualizacion(serie):
    """'Última actualización del ejercicio 2024: 01 Julio 2025.' -> '2025-07-01' (la más reciente si hay varias)."""
    fechas = []
    for t in serie.dropna().unique():
        m = re.search(r"(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{4})", str(t))
        if m and m.group(2).lower() in MESES:
            fechas.append(date(int(m.group(3)), MESES[m.group(2).lower()], int(m.group(1))))
    return max(fechas).isoformat() if fechas else None


def _num(s):
    """Los montos pueden venir con coma o con punto decimal según el año."""
    return pd.to_numeric(s.astype(str).str.replace(",", ".", regex=False), errors="coerce").fillna(0.0)


def _id(s):
    return pd.to_numeric(s, errors="coerce").fillna(0).astype(int)


def _agregar_completo(raw_zip):
    """ZIP del crédito anual (bytes) -> (DataFrame largo con las hojas de cada árbol, fecha de actualización)."""
    z = zipfile.ZipFile(io.BytesIO(raw_zip))
    nombre = next(n for n in z.namelist() if n.lower().endswith(".csv"))
    df = pd.read_csv(z.open(nombre), encoding="utf-8-sig", dtype=str, usecols=lambda c: c in COLS)
    actualizado = _fecha_actualizacion(df["ultima_actualizacion_fecha"])
    for e in ETAPAS:
        df[e] = _num(df[e])
    for c in ("finalidad_id", "funcion_id", "inciso_id", "principal_id", "ubicacion_geografica_id"):
        df[c] = _id(df[c])
    for c in [c for c in COLS if c.endswith("_desc")]:
        df[c] = df[c].map(limpiar)
    es_prog = df["programa_desc"].map(_clave) == PROGRAMA_UNIVERSIDADES
    es_univ = es_prog & (df["inciso_id"] == 5) & (df["principal_id"] == 6) & (df["subparcial_desc"] != "")
    df["universidad"] = ""
    df.loc[es_prog, "universidad"] = OTROS_PROGRAMA
    df.loc[es_univ, "universidad"] = df.loc[es_univ, "subparcial_desc"]
    df["id_pq"] = df["finalidad_id"].astype(str) + "." + df["funcion_id"].astype(str)
    df["id_inc"] = df["inciso_id"].astype(str)
    ub = df["ubicacion_geografica_id"].astype(str)
    df["id_prov_pq"] = ub + "|" + df["id_pq"]
    df["id_prov_inc"] = ub + "|" + df["id_inc"]
    df["id_prov"] = ub
    # (árbol, columna con el id, columnas de nombre); el id se agrupa junto con los nombres
    arboles = [
        ("para_que", "id_pq", ["finalidad_desc", "funcion_desc"]),
        ("quien", None, ["jurisdiccion_desc", "entidad_desc", "programa_desc", "universidad"]),
        ("en_que", "id_inc", ["inciso_desc", "principal_desc"]),
        ("donde", None, ["ubicacion_geografica_desc"]),
        ("fuente", None, ["fuente_financiamiento_desc"]),
        # cruces con la provincia (fase 1 de provincias.md): n1 = provincia
        ("prov_para_que", "id_prov_pq", ["ubicacion_geografica_desc", "finalidad_desc", "funcion_desc"]),
        ("prov_quien", "id_prov", ["ubicacion_geografica_desc", "jurisdiccion_desc", "entidad_desc"]),
        ("prov_en_que", "id_prov_inc", ["ubicacion_geografica_desc", "inciso_desc", "principal_desc"]),
    ]
    partes = []
    for arbol, col_id, nombres in arboles:
        claves = ([col_id] if col_id else []) + nombres
        g = df.groupby(claves, dropna=False)[ETAPAS].sum().reset_index()
        out = pd.DataFrame(index=g.index)
        out["arbol"] = arbol
        out["ids"] = g[col_id] if col_id else ""
        for i in range(4):
            out[f"n{i + 1}"] = g[nombres[i]] if i < len(nombres) else ""
        for e in ETAPAS:
            out[e] = g[e].round(4)
        partes.append(out)
    return pd.concat(partes, ignore_index=True), actualizado


def _meta():
    f = CACHE / "gasto_nacion_meta.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def _guardar_meta(meta):
    (CACHE / "gasto_nacion_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def anio_en_curso():
    return date.today().year


def anio_cerrado(anio, actualizado):
    """Un año está cerrado solo si su respaldo se bajó cuando el ejercicio ya había cerrado: el ejercicio N se cierra con la
    actualización de mediados de N+1 (2024 -> '2025-07-01'). `actualizado`: fecha ISO que declara el archivo (o None).
    Cerrado si esa fecha es de N+1 en adelante y posterior a marzo de N+1; si no, el año sigue abierto (se baja a lo sumo una vez por día)."""
    if not actualizado:
        return False
    try:
        return date.fromisoformat(actualizado) >= date(anio + 1, 4, 1)
    except ValueError:
        return False


def cargar_anio(anio, con_red, meta):
    """Devuelve el agregado largo del año (de la red o del respaldo), o None si no hay. Actualiza `meta`."""
    f = CACHE / f"gasto_nacion_{anio}.csv"
    hoy = date.today().isoformat()
    m = meta.get(str(anio), {})
    cerrado = anio_cerrado(anio, m.get("actualizado"))
    if f.exists() and (not con_red or cerrado or m.get("bajado") == hoy):
        largo = pd.read_csv(f, keep_default_na=False, dtype={"ids": str, "n1": str, "n2": str, "n3": str, "n4": str})
        # un respaldo anterior a los cruces con la provincia se vuelve a bajar una vez (aunque el año esté cerrado)
        if not con_red or "prov_para_que" in set(largo["arbol"]):
            return largo
    if con_red:
        try:
            raw = _get(URL_ANUAL.format(a=anio), timeout=300)
            largo, actualizado = _agregar_completo(raw)
            largo.to_csv(f, index=False)
            meta[str(anio)] = {"actualizado": actualizado, "bajado": hoy}
            print(f"  gasto {anio}: bajado ({len(largo)} filas agregadas, actualizado {actualizado})")
            return largo
        except Exception as e:  # noqa: BLE001
            if f.exists():
                print(f"  gasto {anio}: error al bajar ({e}); uso el respaldo {f.name}")
                return pd.read_csv(f, keep_default_na=False, dtype={"ids": str, "n1": str, "n2": str, "n3": str, "n4": str})
            print(f"  gasto {anio}: no se pudo bajar y no hay respaldo ({e}); se omite el año")
            return None
    return None


def cargar_finfun(con_red):
    f = CACHE / "gasto_nacion_finfun.csv"
    if con_red:
        try:
            raw = _get(URL_FINFUN, timeout=120)
            pd.read_csv(io.BytesIO(raw), encoding="utf-8-sig", nrows=1)  # que al menos sea un CSV
            f.write_bytes(raw)
        except Exception as e:  # noqa: BLE001
            if not f.exists():
                raise
            print(f"  serie_finfun_anual: error al bajar ({e}); uso el respaldo")
    return pd.read_csv(f, encoding="utf-8-sig")


def bajar():
    """Baja todo lo que corresponda y deja los respaldos (sin armar los JSON)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    meta = _meta()
    for a in range(PRIMER_ANIO, anio_en_curso() + 1):
        cargar_anio(a, True, meta)
    _guardar_meta(meta)
    cargar_finfun(True)


# ---------- armado de los JSON ----------

def _r(v):
    return round(float(v), 1) + 0.0   # + 0.0: round(-0.04, 1) da -0.0


def _arbol(df, t_nivel1=None):
    """df largo de un árbol -> Nodo raíz (n 'Total'). Los nombres ya vienen unificados. Suma hacia arriba."""
    raiz = {"n": "Total", "v": [0.0] * 5, "h": {}}
    for fila in df.itertuples(index=False):
        valores = [getattr(fila, e) for e in ETAPAS]
        nodo = raiz
        for k in range(5):
            nodo["v"][k] += valores[k]
        for i in range(4):
            nombre = getattr(fila, f"n{i + 1}")
            if nombre == "":
                break
            hijo = nodo["h"].get(nombre)
            if hijo is None:
                hijo = nodo["h"][nombre] = {"n": nombre, "v": [0.0] * 5, "h": {}}
                if i == 0 and t_nivel1 and nombre in t_nivel1:
                    hijo["t"] = t_nivel1[nombre]
            for k in range(5):
                hijo["v"][k] += valores[k]
            nodo = hijo
    return raiz


def _cerrar(nodo):
    """Dict de hijos -> lista ordenada por devengado (mayor a menor). Redondea a 1 decimal de abajo hacia arriba:
    cada nodo con hijos vale la suma de sus hijos ya redondeados (así las cuentas cierran al decimal)."""
    hijos = nodo.pop("h")
    if hijos:
        lista = [_cerrar(h) for h in hijos.values()]
        lista.sort(key=lambda x: (-x["v"][3], -x["v"][1], x["n"]))
        nodo["h"] = lista
        nodo["v"] = [_r(sum(h["v"][k] for h in lista)) for k in range(5)]
    else:
        nodo["v"] = [_r(x) for x in nodo["v"]]
    return nodo


def _titulos(anios_df):
    """Mapa clave -> nombre a mostrar: el del año más reciente donde aparece (unifica variantes entre años)."""
    mostrar = {}
    for anio in sorted(anios_df, reverse=True):
        df = anios_df[anio]
        for arbol, g in df.groupby("arbol"):
            for c in ("n1", "n2", "n3", "n4"):
                for n in g[c].unique():
                    if n:
                        mostrar.setdefault((arbol, _clave(n)), n)
    tildes = _con_tildes(mostrar.values())
    return {k: tildes(v) for k, v in mostrar.items()}


# Palabras que la fuente suele escribir sin tilde (completan las que el propio archivo trae con tilde en otros nombres).
TILDES_FIJAS = ["Tecnológica", "Tecnológico", "Tecnología", "Pública", "Público", "Públicos", "Públicas", "Económica", "Económico", "Política",
                "Políticas", "Científica", "Científico", "Académica", "Técnica", "Técnico", "Energía", "Minería", "Ganadería", "Policía", "Médica",
                "Básica", "Básicos", "Atlántico", "Mínimo", "Línea", "Tránsito", "Geográfico", "Estadística", "Áreas", "Área", "Régimen", "Así",
                "Más", "Según", "Jurídica", "Jurídicos", "Crédito", "Créditos", "Garantía", "Auditoría", "Ingeniería",
                "Aéreo", "Antártico", "Artísticas", "Artístico", "Autovías", "Bibliográfica", "Bioeconomía", "Cartografía", "Ciudadanía", "Climático",
                "Cosméticos", "Crónicas", "Cuestión", "Democrático", "Días", "Diplomáticas", "Doméstico", "Economías", "Económicas", "Eléctrica",
                "Eléctricas", "Eléctrico", "Endémicas", "Energética", "Energético", "Específicas", "Estadísticas", "Estadístico", "Estratégica",
                "Estratégico", "Estratégicos", "Física", "Futbolísticos", "Geológica", "Hidráulica", "Hídrica", "Hídricos", "Hidrografía",
                "Históricas", "Informática", "Logística", "Logístico", "María", "Médico", "Médicos", "Meteorología", "Metrología", "Narcotráfico",
                "Oceánica", "Patologías", "Perón", "Problemáticas", "Problemáticos", "Psicofísicas", "Sastrería", "Secretarías", "Sísmica", "Soberanía",
                "Tecnologías", "Tecnológicas", "Común", "Comunes", "Género", "Géneros", "Temáticos", "Turísticos", "Vías", "Xenofobia", "Ámbito"]
_PALABRA = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")


def _con_tildes(nombres):
    """Devuelve una función que repone tildes: usa la forma con tilde que aparece en algún otro nombre, la lista fija y la terminación -ción/-sión/-gión."""
    vocab = {}
    for n in list(nombres) + TILDES_FIJAS:
        for w in _PALABRA.findall(n):
            if w != _clave(w) and _clave(w) and any(c in "áéíóúÁÉÍÓÚ" for c in w):
                vocab.setdefault(_clave(w), w.lower())

    def arreglar_palabra(m):
        w = m.group(0)
        if any(c in "áéíóúÁÉÍÓÚ" for c in w) or w.isupper() and len(w) <= 5:
            return w  # ya tiene tilde, o es una sigla
        nueva = vocab.get(_clave(w))
        if nueva is None:
            low = w.lower()
            for fin, con in (("cion", "ción"), ("sion", "sión"), ("gion", "gión")):
                if low.endswith(fin) and len(low) > 5:
                    nueva = low[: -len(fin)] + con
                    break
        if nueva is None:
            return w
        if w.isupper():
            return nueva.upper()
        return nueva[0].upper() + nueva[1:] if w[0].isupper() else nueva

    return lambda n: _PALABRA.sub(arreglar_palabra, n) if n else n


def _unificar(df, mostrar):
    df = df.copy()
    for c in ("n1", "n2", "n3", "n4"):
        df[c] = [mostrar[(a, _clave(n))] if n else "" for a, n in zip(df["arbol"], df[c])]
    return df


def _anio_json(anio, df, tecnicos):
    arboles = {}
    for arbol in ("para_que", "quien", "en_que", "donde", "fuente"):
        g = df[df["arbol"] == arbol]
        if arbol == "en_que":
            # el nivel 1 son los incisos: nombre del público y técnico en "t"
            g = g.copy()
            tec = {}
            nuevos = []
            for i, n in zip(g["ids"], g["n1"]):
                try:
                    pub = INCISOS.get(int(i), n)
                except ValueError:
                    pub = n
                tec[pub] = f"Inciso {i} - {n}"
                nuevos.append(pub)
            g["n1"] = nuevos
            arboles[arbol] = _cerrar(_arbol(g, tec))
        else:
            arboles[arbol] = _cerrar(_arbol(g))
    return {"anio": anio, "arboles": arboles}


def _serie_larga(fin, nombres_fin):
    """serie_finfun_anual.csv (pesos) -> bloque `serie_larga` en millones de pesos."""
    fin = fin.sort_values("ejercicio_presupuestario")
    anios = [int(a) for a in fin["ejercicio_presupuestario"]]
    pib = [None if pd.isna(x) else _r(x / 1e6) for x in fin["pib"]]
    cols = [c for c in fin.columns if re.fullmatch(r"finalidad\d+_funcion\d+", c)]
    fins = {}
    for c in cols:
        a, b = re.fullmatch(r"finalidad(\d+)_funcion(\d+)", c).groups()
        fins.setdefault(int(a), []).append((int(b), c))
    out = []
    for a in sorted(fins):
        nombre_f = nombres_fin.get(f"{a}", f"Finalidad {a}")
        hijos = []
        total = [0.0] * len(anios)
        for b, c in sorted(fins[a]):
            v = [0.0 if pd.isna(x) else x / 1e6 for x in fin[c]]
            if not any(v):
                continue
            total = [t + x for t, x in zip(total, v)]
            hijos.append({"n": nombres_fin.get(f"{a}.{b}", f"Función {a}.{b}"), "v": [_r(x) for x in v]})
        out.append({"n": nombre_f, "v": [_r(x) for x in total], "h": hijos})
    out.sort(key=lambda x: -x["v"][-1])
    return {"anios": anios, "pib": pib, "finalidades": out}


def construir(con_red=True):
    """Devuelve {nombre de archivo: objeto} para web/public/datos/ (índice + un archivo por año)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    meta = _meta()
    datos = {}
    for a in range(PRIMER_ANIO, anio_en_curso() + 1):
        largo = cargar_anio(a, con_red, meta)
        if largo is not None and len(largo):
            datos[a] = largo
    if con_red:
        _guardar_meta(meta)
    if not datos:
        raise RuntimeError("no hay datos de gasto de ningún año (ni red ni respaldo)")
    fin = cargar_finfun(con_red)
    fin_por_anio = fin.set_index("ejercicio_presupuestario")

    mostrar = _titulos(datos)
    # nombres de finalidades y funciones para la serie larga: por id, del año más reciente
    nombres_fin = {}
    for a in sorted(datos, reverse=True):
        g = datos[a][datos[a]["arbol"] == "para_que"]
        for i, n1, n2 in zip(g["ids"], g["n1"], g["n2"]):
            fi = i.split(".")[0]
            nombres_fin.setdefault(fi, mostrar[("para_que", _clave(n1))])
            nombres_fin.setdefault(i, mostrar[("para_que", _clave(n2))])

    archivos, anios = {}, []
    for a in sorted(datos):
        df = _unificar(datos[a], mostrar)
        obj = _anio_json(a, df, None)
        total = obj["arboles"]["para_que"]["v"]
        for nombre, arb in obj["arboles"].items():
            if any(abs(x - y) > 5 for x, y in zip(arb["v"], total)):  # el redondeo a 1 decimal de cientos de hojas deriva unas décimas
                raise RuntimeError(f"gasto {a}: el árbol {nombre} no suma el mismo total que para_que")
        pib = None
        cerrado = anio_cerrado(a, meta.get(str(a), {}).get("actualizado"))
        if a in fin_por_anio.index and not pd.isna(fin_por_anio.loc[a, "pib"]):
            pib = _r(fin_por_anio.loc[a, "pib"] / 1e6)
            cols = [c for c in fin.columns if re.fullmatch(r"finalidad\d+_funcion\d+", c)]
            tot_fin = float(fin_por_anio.loc[a, cols].astype(float).sum()) / 1e6
            # el control vale solo para años cerrados (un año en curso trae un gasto parcial); si uno cerrado no pasa, se omite ese año
            if cerrado and tot_fin > 0 and abs(total[3] / tot_fin - 1) > MAX_DESVIO_FINFUN:
                print(f"  gasto {a}: el devengado ({total[3]:,.0f}) se aparta de serie_finfun_anual ({tot_fin:,.0f}) más de {MAX_DESVIO_FINFUN:.0%}; se omite el año")
                continue
        nombre_arch = f"gasto_nacion_{a}.json"
        archivos[nombre_arch] = obj
        anios.append({"anio": a, "en_curso": not cerrado, "actualizado": meta.get(str(a), {}).get("actualizado"),
                      "pib": pib, "total": total, "archivo": nombre_arch})
    indice = {"generado": date.today().isoformat(), "fuente": FUENTE_TXT, "anios": anios,
              "serie_larga": _serie_larga(fin, nombres_fin)}
    archivos["gasto_nacion.json"] = indice
    return archivos


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
