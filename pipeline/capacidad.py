"""
Capacidad de gobierno (bloque 6d, D-009): bancas propias y aliadas, leyes del Ejecutivo, DNU y vetos por presidente.

Los datos se cargan a mano en CSV versionados en datos/manual/ (cada fila lleva la URL de su fuente).
Este módulo los valida (corta con un error que nombra archivo y fila), avisa qué falta cargar y arma
web/public/datos/capacidad.json. No usa red: --solo-json y la corrida completa dan lo mismo.

Archivos (columnas):
  congreso_bancas.csv   fecha_corte, camara (dip|sen), presidente, propios, aliados, total, fuente, nota
  congreso_bloques.csv  fecha_corte, camara, bloque, bancas, rol (propio|aliado|otro), fuente
  leyes_ejecutivo.csv   presidente, enviadas, aprobadas, fuente, nota
  vetos.csv             presidente, anio, totales, parciales, insistidos, fuente
  dnu.csv               presidente, anio, cantidad, fuente
  notas.csv             presidente, nota   (avisos por presidente que se muestran en la página)
"""
import csv
import io
import json
import re
import urllib.request
import zipfile
from collections import Counter
import datetime as dt
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MANUAL = RAIZ / "datos" / "manual"

# Tiene que coincidir con PRES_DEF de web/lib/estadisticas.ts (id y mes de asunción).
PRESIDENTES = ["menem1", "menem2", "delarua", "duhalde", "nk", "cfk1", "cfk2", "macri", "af", "milei"]
CAMARAS = ("dip", "sen")
ROLES = ("propio", "aliado", "otro")


# Fechas reales de asunción (los DNU, vetos y leyes se asignan por fecha de firma o ingreso, no por mes). Último: fin del mandato.
MANDATOS = [("menem1", "1989-07-08"), ("menem2", "1995-07-08"), ("delarua", "1999-12-10"), ("duhalde", "2002-01-01"), ("nk", "2003-05-25"),
            ("cfk1", "2007-12-10"), ("cfk2", "2011-12-10"), ("macri", "2015-12-10"), ("af", "2019-12-10"), ("milei", "2023-12-10")]
FIN_ULTIMO = "9999-12-31"
INFOLEG = ("https://datos.jus.gob.ar/dataset/d9a963ea-8b1d-4ca3-9dd9-07a4773e8c23/resource/bf0ec116-ad4e-4572-a476-e57167a84403/"
           "download/base-infoleg-normativa-nacional.zip")
HCDN_PROY = ("https://datos.hcdn.gob.ar/dataset/839441fc-1b5c-45b8-82c9-8b0f18ac7c9b/resource/22b2d52c-7a0e-426b-ac0a-a3326c388ba6/"
             "download/proyectos_parlamentarios2.6.csv")
HCDN_LEYES = ("https://datos.hcdn.gob.ar/dataset/5b1d2f38-e23f-412c-a286-02ab9dcf6082/resource/68dfd7f8-91f3-4ecf-aebf-a860d1ca1a98/"
              "download/leyes_sancionadas3.3.csv")
HCDN_DESDE = "2011-12-10"   # los datos abiertos de proyectos empiezan en marzo de 2008: CFK 1 queda incompleto y se omite
CACHE_AUTO = RAIZ / "datos" / "cache" / "capacidad_auto.json"


def _pres_de(fecha):
    """Id del presidente en funciones en `fecha` (AAAA-MM-DD) o None si es anterior al primero."""
    if "2001-12-21" <= fecha < "2002-01-01":
        return None   # interinatos de diciembre de 2001 (Puerta, Rodríguez Saá, Camaño): no son presidentes de la lista
    quien = None
    for pid, ini in MANDATOS:
        if fecha >= ini:
            quien = pid
    return quien


def _bajar(url, timeout=300):
    req = urllib.request.Request(url, headers={"User-Agent": "primero-los-datos-script"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _csv_filas(datos):
    csv.field_size_limit(10**9)
    return csv.DictReader(io.StringIO(datos.decode("utf-8-sig"), newline=""))


def _dnu_infoleg():
    """DNU por presidente y año (base Infoleg: tipo Decreto y clase DNU, por fecha de sanción)."""
    zf = zipfile.ZipFile(io.BytesIO(_bajar(INFOLEG)))
    nombre = next(n for n in zf.namelist() if n.lower().endswith(".csv"))
    csv.field_size_limit(10**9)
    vistos, cuenta = set(), Counter()
    with zf.open(nombre) as crudo:
        for f in csv.DictReader(io.TextIOWrapper(crudo, encoding="utf-8-sig", newline="")):
            if f.get("tipo_norma") != "Decreto" or f.get("clase_norma") != "DNU" or f["id_norma"] in vistos:
                continue
            vistos.add(f["id_norma"])
            fecha = (f.get("fecha_sancion") or "")[:10]
            pid = _pres_de(fecha) if fecha else None
            if pid:
                cuenta[(pid, fecha[:4])] += 1
    out = {}
    for (pid, anio), n in sorted(cuenta.items()):
        out.setdefault(pid, {})[anio] = n
    return out


def _leyes_hcdn():
    """Proyectos de ley del Ejecutivo (expediente -PE-, mensaje y proyecto de ley) enviados y sancionados antes de que termine el mandato."""
    sanc = {f["PROYECTO_ID"]: f["SANCION_DEFINITIVA"][:10] for f in _csv_filas(_bajar(HCDN_LEYES)) if f.get("SANCION_DEFINITIVA")}
    fines = {pid: (MANDATOS[k + 1][1] if k + 1 < len(MANDATOS) else FIN_ULTIMO) for k, (pid, _) in enumerate(MANDATOS)}
    env, apr = Counter(), Counter()
    for f in _csv_filas(_bajar(HCDN_PROY)):
        if f.get("TIPO") != "MENSAJE Y PROYECTO DE LEY" or not re.search(r"-PE-", f"{f.get('EXP_DIPUTADOS', '')} {f.get('EXP_SENADO', '')}"):
            continue
        fecha = (f.get("PUBLICACION_FECHA") or "")[:10]
        if not fecha or fecha < HCDN_DESDE:
            continue
        pid = _pres_de(fecha)
        env[pid] += 1
        if f["PROYECTO_ID"] in sanc and sanc[f["PROYECTO_ID"]] < fines[pid]:
            apr[pid] += 1
    return {pid: {"enviadas": env[pid], "aprobadas": apr[pid]} for pid in env}


def automaticos():
    """DNU (Infoleg) y leyes del Ejecutivo (datos abiertos de Diputados). Cada origen se baja por separado: si uno falla se usa su última copia de datos/cache/."""
    viejo = json.loads(CACHE_AUTO.read_text(encoding="utf-8")) if CACHE_AUTO.exists() else {}
    d = {"bajado": viejo.get("bajado")}
    for clave, bajar in (("dnu", _dnu_infoleg), ("leyes", _leyes_hcdn)):
        try:
            d[clave] = bajar()
            d["bajado"] = dt.date.today().isoformat()
        except Exception as e:  # noqa: BLE001
            print(f"  capacidad ({clave}): error al bajar ({e}); " + ("uso la copia de datos/cache/" if clave in viejo else "sin copia: solo se usan los CSV de datos/manual/"))
            d[clave] = viejo.get(clave, {})
    CACHE_AUTO.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    return d


class ErrorDatos(Exception):
    pass


def _leer(nombre, columnas, opcional=False):
    ruta = MANUAL / nombre
    if not ruta.exists():
        if opcional:
            return []
        raise ErrorDatos(f"{nombre}: no existe el archivo (datos/manual/{nombre})")
    with ruta.open(encoding="utf-8-sig", newline="") as f:
        lector = csv.DictReader(f)
        faltan = [c for c in columnas if c not in (lector.fieldnames or [])]
        if faltan:
            raise ErrorDatos(f"{nombre}: faltan las columnas {', '.join(faltan)}")
        filas = []
        for n, fila in enumerate(lector, start=2):  # la fila 1 es el encabezado
            fila = {k: (v or "").strip() for k, v in fila.items() if k is not None}
            if not any(fila.values()):
                continue
            fila["_fila"] = n
            filas.append(fila)
    return filas


def _error(nombre, fila, msg):
    return ErrorDatos(f"{nombre}, fila {fila['_fila']}: {msg}")


def _entero(nombre, fila, campo):
    try:
        v = int(fila[campo])
    except (ValueError, KeyError):
        raise _error(nombre, fila, f"'{campo}' tiene que ser un número entero (vale '{fila.get(campo, '')}')")
    if v < 0:
        raise _error(nombre, fila, f"'{campo}' no puede ser negativo")
    return v


def _fecha(nombre, fila, campo):
    try:
        return dt.date.fromisoformat(fila[campo])
    except ValueError:
        raise _error(nombre, fila, f"'{campo}' tiene que ser una fecha AAAA-MM-DD (vale '{fila.get(campo, '')}')")


def _comunes(nombre, fila, con_presidente=True):
    if not fila.get("fuente"):
        raise _error(nombre, fila, "falta la fuente (URL)")
    if con_presidente and fila.get("presidente") not in PRESIDENTES:
        raise _error(nombre, fila, f"presidente desconocido '{fila.get('presidente', '')}' (ids válidos: {', '.join(PRESIDENTES)})")


def cargar(auto=None):
    """Lee y valida todos los CSV. Devuelve el diccionario que va a capacidad.json."""
    # ---- bancas
    N = "congreso_bancas.csv"
    bancas = []
    for f in _leer(N, ["fecha_corte", "camara", "presidente", "propios", "aliados", "total", "fuente", "nota"]):
        _comunes(N, f)
        _fecha(N, f, "fecha_corte")
        if f["camara"] not in CAMARAS:
            raise _error(N, f, f"cámara desconocida '{f['camara']}' (dip o sen)")
        p, a, t = (_entero(N, f, c) for c in ("propios", "aliados", "total"))
        if t == 0:
            raise _error(N, f, "el total de bancas no puede ser 0")
        if p + a > t:
            raise _error(N, f, f"propios + aliados ({p + a}) es mayor que el total ({t})")
        bancas.append({"fecha": f["fecha_corte"], "camara": f["camara"], "pres": f["presidente"], "propios": p, "aliados": a, "total": t,
                       **({"nota": f["nota"]} if f["nota"] else {})})
    bancas.sort(key=lambda b: (b["fecha"], b["camara"]))

    # ---- bloques (detalle de cada corte)
    N = "congreso_bloques.csv"
    bloques = {}
    for f in _leer(N, ["fecha_corte", "camara", "bloque", "bancas", "rol", "fuente"], opcional=True):
        _comunes(N, f, con_presidente=False)
        _fecha(N, f, "fecha_corte")
        if f["camara"] not in CAMARAS:
            raise _error(N, f, f"cámara desconocida '{f['camara']}' (dip o sen)")
        if f["rol"] not in ROLES:
            raise _error(N, f, f"rol desconocido '{f['rol']}' (propio, aliado u otro)")
        bloques.setdefault(f"{f['fecha_corte']}|{f['camara']}", []).append({"b": f["bloque"], "n": _entero(N, f, "bancas"), "rol": f["rol"]})
    # el detalle tiene que cerrar con la tabla de bancas
    por_corte = {(b["fecha"], b["camara"]): b for b in bancas}
    for clave, lista in bloques.items():
        fecha, camara = clave.split("|")
        b = por_corte.get((fecha, camara))
        if not b:
            raise ErrorDatos(f"congreso_bloques.csv: el corte {fecha} ({camara}) no está en congreso_bancas.csv")
        for rol, campo in (("propio", "propios"), ("aliado", "aliados")):
            s = sum(x["n"] for x in lista if x["rol"] == rol)
            if s != b[campo]:
                raise ErrorDatos(f"congreso_bloques.csv: en el corte {fecha} ({camara}) los bloques '{rol}' suman {s} y congreso_bancas.csv dice {b[campo]}")

    # ---- leyes
    N = "leyes_ejecutivo.csv"
    leyes = {}
    for f in _leer(N, ["presidente", "enviadas", "aprobadas", "fuente", "nota"]):
        _comunes(N, f)
        e, a = _entero(N, f, "enviadas"), _entero(N, f, "aprobadas")
        if a > e:
            raise _error(N, f, f"aprobadas ({a}) es mayor que enviadas ({e})")
        leyes[f["presidente"]] = {"enviadas": e, "aprobadas": a, **({"nota": f["nota"]} if f["nota"] else {})}

    # ---- vetos
    N = "vetos.csv"
    vetos = {}
    for f in _leer(N, ["presidente", "anio", "totales", "parciales", "insistidos", "fuente"]):
        _comunes(N, f)
        anio = _entero(N, f, "anio")
        i = _entero(N, f, "insistidos")
        # totales y parciales pueden quedar vacíos (sin fuente oficial): se guardan como null y la página muestra solo los insistidos
        t, p = (None if f[c] == "" else _entero(N, f, c) for c in ("totales", "parciales"))
        if (t is None) != (p is None):
            raise _error(N, f, "totales y parciales se cargan juntos o se dejan los dos vacíos")
        if t is not None and i > t + p:
            raise _error(N, f, f"insistidos ({i}) es mayor que los vetos ({t + p})")
        vetos.setdefault(f["presidente"], {})[str(anio)] = {"t": t, "p": p, "i": i}

    # ---- DNU
    N = "dnu.csv"
    dnu = {}
    for f in _leer(N, ["presidente", "anio", "cantidad", "fuente"], opcional=True):
        _comunes(N, f)
        dnu.setdefault(f["presidente"], {})[str(_entero(N, f, "anio"))] = _entero(N, f, "cantidad")

    notas = {f["presidente"]: f["nota"] for f in _leer("notas.csv", ["presidente", "nota"], opcional=True) if f.get("presidente") in PRESIDENTES}

    # Lo automático completa lo que no esté en los CSV (lo cargado a mano manda).
    auto = auto or {"dnu": {}, "leyes": {}}
    for pid, anios in auto["dnu"].items():
        if pid not in dnu:
            dnu[pid] = anios
    for pid, l in auto["leyes"].items():
        if pid not in leyes:
            leyes[pid] = l
    fuentes = {"bancas": set(), "leyes": set(), "dnu": set(), "vetos": set()}
    if auto["dnu"]:
        fuentes["dnu"].add(INFOLEG)
    if auto["leyes"]:
        fuentes["leyes"].update([HCDN_PROY, HCDN_LEYES])
    for nombre, clave in (("congreso_bancas.csv", "bancas"), ("congreso_bloques.csv", "bancas"), ("leyes_ejecutivo.csv", "leyes"),
                          ("dnu.csv", "dnu"), ("vetos.csv", "vetos")):
        for f in _leer(nombre, ["fuente"], opcional=True):
            for url in f["fuente"].split(" "):
                if url.startswith("http"):
                    fuentes[clave].add(url)

    ultima = max((p.stat().st_mtime for p in MANUAL.glob("*.csv")), default=0)
    return {
        "bancas": bancas, "bloques": bloques, "leyes": leyes, "dnu": dnu, "vetos": vetos,
        "ultima_carga": dt.date.fromtimestamp(ultima).isoformat() if ultima else None,
        "fuentes": {k: sorted(v) for k, v in fuentes.items()}, "notas": notas,
    }


def avisos(d, hoy=None):
    """Lo que falta cargar (no es un error). Devuelve una lista de textos."""
    hoy = hoy or dt.date.today()
    falta = []
    corte = dt.date(hoy.year, 3, 1)
    if hoy >= corte:
        for cam, nom in (("dip", "Diputados"), ("sen", "Senado")):
            ult = max((b["fecha"] for b in d["bancas"] if b["camara"] == cam), default="")
            if ult < corte.isoformat():
                falta.append(f"bancas de {nom} al 1 de marzo de {hoy.year}")
    ant = str(hoy.year - 1)
    actual = PRESIDENTES[-1]
    if ant not in d["vetos"].get(actual, {}):
        falta.append(f"vetos de {ant}")
    if ant not in d["dnu"].get(actual, {}):
        falta.append(f"DNU de {ant}")
    sin_leyes = [p for p in PRESIDENTES if p not in d["leyes"]]
    if sin_leyes:
        falta.append("leyes del Ejecutivo de " + ", ".join(sin_leyes) + " (los datos abiertos empiezan en 2008)")
    return falta


def construir_json(hoy=None, con_red=True):
    """con_red=False (--solo-json) usa solo la copia de datos/cache/, sin bajar nada."""
    if con_red:
        auto = automaticos()
    elif CACHE_AUTO.exists():
        auto = json.loads(CACHE_AUTO.read_text(encoding="utf-8"))
    else:
        auto = None
    d = cargar(auto)
    falta = avisos(d, hoy)
    print(f"Capacidad de gobierno: {len(d['bancas'])} cortes de bancas, {len(d['leyes'])} presidentes con leyes, "
          f"{len(d['vetos'])} con vetos, {len(d['dnu'])} con DNU.")
    if falta:
        print("Capacidad de gobierno: falta cargar " + "; ".join(falta) + ".")
    return d
