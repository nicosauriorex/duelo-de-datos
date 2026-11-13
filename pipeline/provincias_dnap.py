"""
Las cuentas de cada provincia (ingresos, gastos, resultado, gasto por finalidad, recaudación por impuesto, empleo público y
deuda), para web/public/datos/provincias_cuentas.json. Fase 2 de docs/specs/provincias.md.

Fuente: Dirección Nacional de Asuntos Provinciales (DNAP), Subsecretaría de Coordinación Fiscal Provincial, Ministerio de
Economía, publicada en argentina.gob.ar/economia/sechacienda/. Planillas Excel; montos en millones de pesos corrientes
(el gasto en personal del empleo viene en miles: se pasa a millones). Administración Pública No Financiera de cada provincia,
ejecución provisoria. Cada link se busca en su página (los nombres de archivo cambian en cada edición):
- cuentas:      coordinacion-fiscal-provincial/ejecucion-presupuestaria-provincial/ejecuciones      -> serie_aif-apnf-<año>.xlsx
- finalidad:    coordinacion-fiscal-provincial/ejecucion-presupuestaria-provincial/gastos-por       -> serie_ff-apnf*.xlsx
- recaudación:  asuntosprovinciales/direccion-de-recursos-provinciales/recursos-tributarios-de-origen-provincial-top
                                                                                                    -> serie_top_1984_<año>*.xlsx
- empleo:       coordinacion-fiscal-provincial/ejecucion-presupuestaria-provincial/ocupacion-y      -> ocupacion_salarios_2005_2016*.xlsx
                                                                                                       y ocupacion_salarios_2017_<año>*.xlsx
- deuda:        coordinacion-fiscal-provincial/deuda-publica-provincial/evolucion-de-stock          -> stock_<trim>_trim_<año>*.xlsx
                                                                                                       (el trimestre más reciente)

Unidades de la salida: montos en millones de pesos corrientes; `emp.personal` en millones (la planilla lo trae en miles);
`emp.medio` en pesos corrientes por mes (NO millones); `emp.planta` en personas; `emp.c1000` en empleados cada mil habitantes;
`pob` en habitantes (proyección INDEC base 2010 de provincias_poblacion.csv, null antes de 2010; en `consolidado`, la suma de las 24).

Respaldos versionados en datos/cache/ (la corrida diaria los sube con el resto de datos/cache):
- provincias_dnap_<tema>.xlsx: el archivo original de cada fuente (empleo: dos, _2005_2016 y _2017).
- provincias_dnap_<tema>.csv: lo ya leído, en formato largo `provincia, anio, concepto, valor` (provincia = código INDEC,
  "consolidado" o "total").
- provincias_dnap_meta.json: el día de la última bajada (como mucho una por día), de cada fuente su página, archivo y fecha de
  bajada, y la fecha del stock de deuda.
Con `con_red=False` (--solo-json) se arma solo con los respaldos. Si una página no responde o el link no aparece, se usa el respaldo
y se avisa.

Controles (si alguno no cierra, este módulo levanta RuntimeError y la corrida sigue sin provincias_cuentas.json):
- por provincia y año: ingresos totales = corrientes + de capital; gastos totales = corrientes + de capital; resultado financiero =
  ingresos totales - gastos totales (tolerancia 1 millón);
- la suma de las 24 = Consolidado en gastos e ingresos totales (0,01 %);
- total de las finalidades = gastos totales por provincia y año (0,01 %; avisa hasta 5 % y falla más allá, porque en 2024 la DNAP
  publica las dos planillas con versiones distintas; se omiten los años sin gasto por finalidad);
- la hoja "Total" de la recaudación = tributarios de origen provincial por provincia y año (0,5 %; falla si pasan de 3 casos);
- deuda: la fila TOTAL = suma de las 24 (0,01 %);
- empleo: la población de la DNAP y la de provincias.json (INDEC) a menos de 3 % por provincia en 2024 (solo avisa);
- 2023: gastos totales del consolidado entre 15 y 19 % del PIB (de gasto_nacion_finfun);
- caja de jubilaciones propia: prestaciones de la seguridad social / gastos totales >= 5 %; en 2024 tienen que ser las 13
  provincias que no la transfirieron (si no, solo avisa con la lista).
Un nombre de jurisdicción sin alias levanta RuntimeError con el nombre.

Fase 3, alícuotas teóricas de Ingresos Brutos -> web/public/datos/provincias_alicuotas.json (aparte: si falla, las cuentas salen igual
y viceversa). Página asuntosprovinciales/direccion-de-recursos-provinciales/ingresos-brutos, archivos <año>_ib.xlsx (2024 y 2025;
la DNAP los marca "provisorio - en desarrollo"). Respaldos: provincias_dnap_ib_<año>.xlsx (el original); en la meta, "fuentes_ib" y
"bajado_ib". Los números se guardan como porcentaje con 2 decimales (la planilla trae fracciones), el texto tal cual ("exenta",
rangos como "1,70% - 2,21% -2,50%"); "sin datos" queda null. Controles (RuntimeError si no pasan): las 24 columnas con los alias de
arriba más el tope del Consenso Fiscal, al menos 8 actividades principales por año, ningún número fuera de 0 a 15 %.

Uso suelto:  python pipeline/provincias_dnap.py --bajar    (baja las planillas y deja los respaldos, sin armar el JSON)
             python pipeline/provincias_dnap.py            (con red, arma en memoria y muestra el tamaño; no escribe en web/)
             python pipeline/provincias_dnap.py --sin-red  (igual, solo con los respaldos)
"""
import io
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

import pandas as pd

from provincias import PROVINCIAS, _poblacion
from salarios import _get

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
BASE = "https://www.argentina.gob.ar/economia/sechacienda/"
BASE_SITIO = "https://www.argentina.gob.ar"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
FUENTE_TXT = ("Dirección Nacional de Asuntos Provinciales (Subsecretaría de Coordinación Fiscal Provincial, Ministerio de Economía), "
              "Administración Pública No Financiera de cada provincia, ejecución provisoria, en millones de pesos corrientes.")
PRIMER_ANIO = 2005
TOL_CIERRE = 1.0                  # millones de pesos
CAJA_MINIMO = 0.05                # prestaciones de la seguridad social sobre el gasto total
CAJA_2024 = ["Buenos Aires", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "La Pampa", "Misiones",
             "Neuquén", "Santa Cruz", "Santa Fe", "Tierra del Fuego"]

PAGINAS = {
    "cuentas": "coordinacion-fiscal-provincial/ejecucion-presupuestaria-provincial/ejecuciones",
    "finalidad": "coordinacion-fiscal-provincial/ejecucion-presupuestaria-provincial/gastos-por",
    "recaudacion": "asuntosprovinciales/direccion-de-recursos-provinciales/recursos-tributarios-de-origen-provincial-top",
    "empleo": "coordinacion-fiscal-provincial/ejecucion-presupuestaria-provincial/ocupacion-y",
    "deuda": "coordinacion-fiscal-provincial/deuda-publica-provincial/evolucion-de-stock",
}
# cada archivo: (patrón del nombre, nombre del respaldo)
ARCHIVOS = {
    "cuentas": [(r"serie_aif-apnf-\d{4}.*\.xlsx", "provincias_dnap_cuentas.xlsx")],
    "finalidad": [(r"serie_ff-apnf.*\.xlsx", "provincias_dnap_finalidad.xlsx")],
    "recaudacion": [(r"serie_top_1984_\d{4}.*\.xlsx", "provincias_dnap_recaudacion.xlsx")],
    "empleo": [(r"ocupacion_salarios_2005_2016.*\.xlsx", "provincias_dnap_empleo_2005_2016.xlsx"),
               (r"ocupacion_salarios_2017_\d{4}.*\.xlsx", "provincias_dnap_empleo_2017.xlsx")],
    "deuda": [(r"stock_(?:iv|iii|ii|i)_trim_\d{4}.*\.xlsx", "provincias_dnap_deuda.xlsx")],
}
TEMAS = list(PAGINAS)

# Fase 3: alícuotas teóricas de Ingresos Brutos (un archivo por año, <año>_ib.xlsx). Va aparte de TEMAS: si falla, las cuentas salen igual.
PAGINA_IB = "asuntosprovinciales/direccion-de-recursos-provinciales/ingresos-brutos"
PATRON_IB = r"^(\d{4})_ib.*\.xlsx$"
AVISO_IB = "Provisorio, en desarrollo (DNAP)"
FUENTE_IB = ("Dirección Nacional de Asuntos Provinciales (Subsecretaría de Coordinación Fiscal Provincial, Ministerio de Economía), "
             "alícuotas teóricas de Ingresos Brutos según la normativa de cada provincia (interpretación de la SSCFP).")
IB_MIN_PRINCIPAL = 5     # una fila de la columna 0 con menos provincias con dato (y alguna) es una apertura de la actividad de arriba
IB_MIN_ACTIVIDADES = 8
IB_MAX_PCT = 15.0

CORDOBA = 14


def _fallo(msg):
    raise RuntimeError(f"provincias_dnap: {msg}; no se escribe el archivo")


# ---------- nombres ----------

def _n(s):
    """Normaliza un nombre para compararlo: sin paréntesis, sin tildes, minúsculas, solo letras y números."""
    s = re.sub(r"\(.*?\)", "", str(s))
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _sin_acentuadas(s):
    """El nombre sin las letras con tilde (así quedan cuando el archivo trae la codificación rota: 'Córdoba' -> 'C?rdoba')."""
    return "".join(c for c in str(s) if not any(unicodedata.combining(k) for k in unicodedata.normalize("NFKD", c)))


def _armar_alias():
    alias = {}
    for cod, nombre in PROVINCIAS.items():
        alias[_n(nombre)] = cod
        alias[_n(_sin_acentuadas(nombre))] = cod
    alias.update({"ciudad": 2, "caba": 2, "gcba": 2, "bsaires": 6, "bsas": 6, "sgodelestero": 86, "santaf": 82})
    return alias


ALIAS = _armar_alias()
CABA_ID = 2


def _cod(nombre):
    k = _n(nombre)
    if k not in ALIAS:
        raise RuntimeError(f"provincias_dnap: jurisdicción sin alias: {str(nombre).strip()!r}")
    return ALIAS[k]


def _num(x):
    v = pd.to_numeric(x, errors="coerce")
    return None if pd.isna(v) else float(v)


def _r(x):
    return None if x is None or pd.isna(x) else round(float(x), 1)


# ---------- lectura de las planillas ----------

def _fila_titulo(d, texto, col=0, hasta=None):
    """Índice de la primera fila cuya celda `col` (normalizada) es `texto`."""
    for i in range(d.shape[0] if hasta is None else min(hasta, d.shape[0])):
        if _n(d.iloc[i, col]) == texto:
            return i
    raise RuntimeError(f"no se encontró la fila {texto!r} (algo cambió en la planilla)")


def _anios_de_fila(d, r, desde=1):
    """{columna: año} de la fila de encabezado `r` (las celdas que son un año)."""
    out = {}
    for c in range(desde, d.shape[1]):
        v = _num(d.iloc[r, c])
        if v is not None and 1900 <= v <= 2100:
            out[c] = int(v)
    return out


# orden de las reglas: (bloque, comienzo del nombre normalizado, id). Bloque: I ingresos corrientes, II gastos corrientes, III resultado
# económico, IV ingresos de capital, V gastos de capital, VI a X totales y resultados.
REGLAS_CUENTAS = [
    ("I", "ingresoscorrientes", "ing_cor"), ("I", "tributarios", "trib"), ("I", "deorigenprovincial", "trib_prov"),
    ("I", "deorigennacional", "trib_nac"), ("I", "distribucionsecundaria", "copart"), ("I", "leydefinanciamiento", "fin_edu"),
    ("I", "contribucionesalaseguridadsocial", "contrib_ss"), ("I", "regalias", "regalias"),
    ("I", "transferenciascorrientes", "transf_cor_ing"),
    ("II", "gastoscorrientes", "gas_cor"), ("II", "personal", "personal"), ("II", "rentasdelapropiedad", "intereses"),
    ("II", "prestacionesdelaseguridadsocial", "prest_ss"), ("II", "transferenciascorrientes", "transf_cor_gas"),
    ("III", "resultadoeconomico", "res_eco"),
    ("IV", "ingresosdecapital", "ing_cap"), ("IV", "transferenciasdecapital", "transf_cap_ing"),
    ("V", "gastosdecapital", "gas_cap"), ("V", "inversionrealdirecta", "inversion"),
    ("V", "transferenciasdecapital", "transf_cap_gas"), ("V", "inversionfinanciera", "inv_fin"),
    ("VI", "ingresostotales", "ing_tot"), ("VII", "gastostotales", "gas_tot"), ("VIII", "resultadofinanciero", "res_fin"),
    ("IX", "resultadoprimario", "res_pri"), ("X", "gastosprimarios", "gas_pri"),
]
IDS_CUENTAS = [i for _, _, i in REGLAS_CUENTAS]
ROMANO = re.compile(r"^\s*(X|IX|VIII|VII|VI|V|IV|III|II|I)\.\s")


def _hojas_por_jurisdiccion(x):
    """{'consolidado' o código: nombre de hoja}. Un nombre de hoja sin alias levanta RuntimeError."""
    out = {}
    for h in x.sheet_names:
        out["consolidado" if _n(h) == "consolidado" else _cod(h)] = h
    faltan = [c for c in PROVINCIAS if c not in out]
    if faltan or "consolidado" not in out:
        raise RuntimeError(f"faltan hojas: {[PROVINCIAS[c] for c in faltan]}{'' if 'consolidado' in out else ' y Consolidado'}")
    return out


def _leer_cuentas(raw):
    x = pd.ExcelFile(io.BytesIO(raw))
    filas = []
    for pid, hoja in _hojas_por_jurisdiccion(x).items():
        d = x.parse(hoja, header=None)
        r0 = _fila_titulo(d, "concepto", hasta=20)
        anios = _anios_de_fila(d, r0)
        bloque, vistos = None, set()
        for i in range(r0 + 1, d.shape[0]):
            etiqueta = d.iloc[i, 0]
            if not isinstance(etiqueta, str):
                continue
            if _n(etiqueta).startswith("nota"):
                break
            m = ROMANO.match(etiqueta)
            if m:
                bloque = m.group(1)
            k = _n(re.sub(r"^\s*(X|IX|VIII|VII|VI|V|IV|III|II|I)\.\s", "", etiqueta))
            for b, ini, ident in REGLAS_CUENTAS:
                if b == bloque and k.startswith(ini) and ident not in vistos:
                    vistos.add(ident)
                    for c, a in anios.items():
                        v = _num(d.iloc[i, c])
                        if v is not None:
                            filas.append((str(pid), a, ident, v))
                    break
        if len(vistos) != len(IDS_CUENTAS):
            raise RuntimeError(f"hoja {hoja!r}: faltan renglones {sorted(set(IDS_CUENTAS) - vistos)}")
    return pd.DataFrame(filas, columns=["provincia", "anio", "concepto", "valor"])


FINALIDADES = ["administraciongubernamental", "serviciosdeseguridad", "serviciossociales", "servicioseconomicos", "deudapublica"]


def _leer_finalidad(raw):
    x = pd.ExcelFile(io.BytesIO(raw))
    filas = []
    for pid, hoja in _hojas_por_jurisdiccion(x).items():
        d = x.parse(hoja, header=None)
        r0 = _fila_titulo(d, "finalidadyfuncion", hasta=20)
        anios = _anios_de_fila(d, r0)
        fin, hubo_total = None, False
        for i in range(r0 + 1, d.shape[0]):
            etiqueta = d.iloc[i, 0]
            if not isinstance(etiqueta, str):
                continue
            nombre = re.sub(r"\s+", " ", etiqueta).strip()
            k = _n(nombre)
            if k.startswith("nota"):
                break
            if k == "total":
                concepto, hubo_total = "TOTAL", True
            elif k in FINALIDADES:
                fin, concepto = nombre, nombre
            elif fin is None:
                raise RuntimeError(f"hoja {hoja!r}: {nombre!r} aparece antes de una finalidad conocida")
            else:
                concepto = f"{fin} / {nombre}"
            for c, a in anios.items():
                v = _num(d.iloc[i, c])
                if v is not None:
                    filas.append((str(pid), a, concepto, v))
            if hubo_total:
                break
        if not hubo_total:
            raise RuntimeError(f"hoja {hoja!r}: no se encontró la fila TOTAL")
    return pd.DataFrame(filas, columns=["provincia", "anio", "concepto", "valor"])


HOJAS_TOP = {"Ingresos Brutos": "ib", "Inmobiliario": "inmo", "Sellos": "sellos", "Automotores": "auto", "Otros": "otros",
             "Total": "total"}


def _leer_recaudacion(raw):
    x = pd.ExcelFile(io.BytesIO(raw))
    filas = []
    for hoja, ident in HOJAS_TOP.items():
        h = next((s for s in x.sheet_names if _n(s) == _n(hoja)), None)
        if h is None:
            raise RuntimeError(f"falta la hoja {hoja!r}")
        d = x.parse(h, header=None)
        r0 = c0 = None
        for i in range(min(20, d.shape[0])):
            for c in range(min(4, d.shape[1])):
                if _n(d.iloc[i, c]) == "provincias":
                    r0, c0 = i, c
        if r0 is None:
            raise RuntimeError(f"hoja {hoja!r}: no se encontró la fila PROVINCIAS")
        anios = {c: a for c, a in _anios_de_fila(d, r0, c0 + 1).items() if a >= PRIMER_ANIO}
        for i in range(r0 + 1, d.shape[0]):
            etiqueta = d.iloc[i, c0]
            if not isinstance(etiqueta, str):
                continue
            k = _n(etiqueta)
            if k == "total":
                break
            if k == "provincias":    # subtotal de las 23 sin la Ciudad
                continue
            pid = _cod(etiqueta)
            for c, a in anios.items():
                v = _num(d.iloc[i, c])
                if v is not None:
                    filas.append((str(pid), a, ident, v))
    return pd.DataFrame(filas, columns=["provincia", "anio", "concepto", "valor"])


def _leer_empleo(raw):
    """Un archivo de empleo (una hoja por año) -> DataFrame largo. El gasto en personal pasa de miles a millones de pesos."""
    x = pd.ExcelFile(io.BytesIO(raw))
    filas = []
    for hoja in x.sheet_names:
        if not hoja.strip().isdigit():
            continue
        anio = int(hoja.strip())
        d = x.parse(hoja, header=None)
        r0 = None
        for i in range(min(20, d.shape[0])):
            if _n(d.iloc[i, 1]) in ("jurisdicciones", "provincias"):
                r0 = i
                break
        if r0 is None:
            raise RuntimeError(f"hoja {hoja}: no se encontró la fila JURISDICCIONES")
        col = {}
        for c in range(2, d.shape[1]):
            t = _n(d.iloc[r0, c])
            if "empleados" in t:
                col["c1000"] = c
            elif "medio" in t:   # antes que "personal": "gasto medio mensual" no es el gasto en personal
                col["medio"] = c
            elif "personal" in t and "planta" not in t:
                col["personal"] = c
            elif "planta" in t:
                col["planta"] = c
            elif "habitantes" in t:
                col["hab"] = c
        if set(col) != {"c1000", "personal", "planta", "medio", "hab"}:
            raise RuntimeError(f"hoja {hoja}: columnas no reconocidas {sorted(col)}")
        for i in range(r0 + 1, d.shape[0]):
            etiqueta = d.iloc[i, 1]
            if not isinstance(etiqueta, str):
                continue
            k = _n(etiqueta)
            if k == "total":
                break
            pid = _cod(etiqueta)
            for ident, c in col.items():
                v = _num(d.iloc[i, c])
                if v is not None:
                    filas.append((str(pid), anio, ident, v / 1000 if ident == "personal" else v))
    return pd.DataFrame(filas, columns=["provincia", "anio", "concepto", "valor"])


COLUMNAS_DEUDA = [("totalsindeudaflotante", "total"), ("gobiernonacional", "gob_nac"), ("fffir", "fffir"), ("ffdp", "ffdp"),
                  ("bancos", "bancos"), ("deudaconsolidada", "consolidada"), ("bonos", "bonos"),
                  ("organismosinternacionales", "org_int")]
MESES = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8, "septiembre": 9,
         "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}


def _leer_deuda(raw):
    """-> (DataFrame largo con provincia 'total' para la fila TOTAL, fecha ISO del stock)."""
    x = pd.ExcelFile(io.BytesIO(raw))
    d = x.parse(x.sheet_names[0], header=None)
    fecha = None
    for i in range(min(30, d.shape[0])):
        m = re.search(r"AL\s+(\d{1,2})\s+DE\s+(\w+)\s+DE\s+(\d{4})", unicodedata.normalize("NFKD", str(d.iloc[i, 0])).upper())
        if m and m.group(2).lower() in MESES:
            fecha = date(int(m.group(3)), MESES[m.group(2).lower()], int(m.group(1))).isoformat()
            break
    if fecha is None:
        raise RuntimeError("no se encontró la fecha del stock de deuda (fila 'STOCK DE DEUDA PROVINCIAL AL ...')")
    r0 = _fila_titulo(d, "jurisdiccion", hasta=30)
    col = {}
    for c in range(1, d.shape[1]):
        t = _n(d.iloc[r0, c])
        for ini, ident in COLUMNAS_DEUDA:
            if t.startswith(ini):
                col[ident] = c
    if len(col) != len(COLUMNAS_DEUDA):
        raise RuntimeError(f"columnas de deuda no reconocidas: {sorted(col)}")
    anio = int(fecha[:4])
    filas = []
    for i in range(r0 + 1, d.shape[0]):
        etiqueta = d.iloc[i, 0]
        if not isinstance(etiqueta, str) or _n(etiqueta).startswith("nota"):
            if isinstance(etiqueta, str):
                break
            continue
        pid = "total" if _n(etiqueta) == "total" else str(_cod(etiqueta))
        for ident, c in col.items():
            v = _num(d.iloc[i, c])
            if v is not None:
                filas.append((pid, anio, ident, v))
    return pd.DataFrame(filas, columns=["provincia", "anio", "concepto", "valor"]), fecha


# ---------- alícuotas de Ingresos Brutos (fase 3) ----------

def _celda_ib(x):
    """Número -> porcentaje con 2 decimales (la planilla trae fracciones: 0,0075 = 0,75 %); texto -> tal cual sin espacios de más;
    vacío o "sin datos" -> None."""
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None
    if isinstance(x, (int, float)):
        return round(float(x) * 100, 2)
    t = re.sub(r"\s+", " ", str(x)).strip()
    if not t or _n(t) in ("sindatos", "sd", "nd"):
        return None
    return t


def _leer_alicuotas(raw):
    """Un <año>_ib.xlsx -> (año, columnas {col: código o "tope"}, actividades [{"n", "fila": {cod|"tope": valor}, "aperturas": [...]}]).
    Estructura (2024 y 2025): una hoja; la fila de encabezado tiene el año en la columna 0, "Alícuota Máxima Consenso Fiscal" y una
    columna por jurisdicción. Debajo, la actividad principal en la columna 0 y sus aperturas en la columna 1. Algunas filas de la
    columna 0 con una o dos provincias (Agricultura, Ganadería…) son aperturas de la actividad de arriba. Termina en la primera
    fila vacía."""
    d = pd.read_excel(io.BytesIO(raw), header=None)
    enc = None
    for i in range(min(15, d.shape[0])):
        if any("consenso" in _n(v) for v in d.iloc[i].tolist()):
            enc = i
            break
    if enc is None:
        raise RuntimeError("no aparece la fila de encabezado con 'Alícuota Máxima Consenso Fiscal'")
    anio = _num(d.iloc[enc, 0])
    if anio is None or not 2000 <= anio <= 2100:
        raise RuntimeError(f"el encabezado no trae el año en la primera columna ({d.iloc[enc, 0]!r})")
    cols = {}
    for c in range(2, d.shape[1]):
        v = d.iloc[enc, c]
        if pd.isna(v) or not str(v).strip():
            continue
        cols[c] = "tope" if "consenso" in _n(v) else _cod(v)
    cods = [k for k in cols.values() if k != "tope"]
    if "tope" not in cols.values():
        raise RuntimeError("falta la columna del tope del Consenso Fiscal")
    if sorted(cods) != sorted(PROVINCIAS) or len(cods) != len(set(cods)):
        faltan = sorted(PROVINCIAS[c] for c in set(PROVINCIAS) - set(cods))
        raise RuntimeError(f"las columnas no son las 24 jurisdicciones (faltan: {faltan}; columnas: {len(cods)})")

    actividades = []
    for i in range(enc + 1, d.shape[0]):
        c0, c1 = d.iloc[i, 0], d.iloc[i, 1]
        vacia0, vacia1 = pd.isna(c0) or not str(c0).strip(), pd.isna(c1) or not str(c1).strip()
        if vacia0 and vacia1:
            break
        fila = {k: _celda_ib(d.iloc[i, c]) for c, k in cols.items()}
        con_dato = sum(1 for k, v in fila.items() if k != "tope" and v is not None)
        nombre = re.sub(r"\s+", " ", str(c0 if not vacia0 else c1)).strip()
        if not vacia0 and (con_dato == 0 or con_dato >= IB_MIN_PRINCIPAL):
            actividades.append({"n": nombre, "fila": fila, "aperturas": []})
        else:
            if not actividades:
                raise RuntimeError(f"la fila {i + 1} es una apertura ({nombre!r}) y no hay una actividad principal arriba")
            if not vacia0:   # se avisa: si aparece una actividad principal nueva con pocas provincias, hay que verla
                print(f"  alícuotas {int(anio)}: {nombre!r} (columna 0, {con_dato} provincias con dato) va como apertura de {actividades[-1]['n']!r}")
            actividades[-1]["aperturas"].append({"n": nombre, "fila": fila})
    return int(anio), actividades


def _controles_alicuotas(por_anio):
    for anio, acts in por_anio.items():
        if len(acts) < IB_MIN_ACTIVIDADES:
            raise RuntimeError(f"{anio}: solo {len(acts)} actividades principales (se esperan al menos {IB_MIN_ACTIVIDADES})")
        fuera = []
        for a in acts:
            for f in [a] + a["aperturas"]:
                for k, v in f["fila"].items():
                    if isinstance(v, float) and not 0 <= v <= IB_MAX_PCT:
                        fuera.append(f"{a['n']} / {f['n']} / {k}: {v}")
        if fuera:
            raise RuntimeError(f"{anio}: alícuotas fuera de 0 a {IB_MAX_PCT:.0f} %: {'; '.join(fuera[:5])}")
        print(f"  control alícuotas {anio}: 24 jurisdicciones, {len(acts)} actividades, "
              f"{sum(len(a["aperturas"]) for a in acts)} renglones de apertura (con o sin dato), todo entre 0 y {IB_MAX_PCT:.0f} %")


def _bajar_alicuotas(meta):
    """Baja todos los <año>_ib.xlsx de la página y deja los originales en provincias_dnap_ib_<año>.xlsx. Si falla, no toca nada."""
    html = _bytes(BASE + PAGINA_IB, timeout=60).decode("utf-8", "replace")
    links = [u for u in _links(html) if re.search(PATRON_IB, u.rsplit("/", 1)[-1])]
    if not links:
        raise RuntimeError(f"no aparece ningún link que coincida con {PATRON_IB!r}")
    archivos = {}
    for u in links:
        b = _bytes(u)
        anio, _ = _leer_alicuotas(b)   # que se pueda leer antes de reemplazar el respaldo
        archivos[anio] = (u, b)
    for anio, (u, b) in archivos.items():
        (CACHE / f"provincias_dnap_ib_{anio}.xlsx").write_bytes(b)
        meta.setdefault("fuentes_ib", {})[str(anio)] = {"pagina": BASE + PAGINA_IB, "archivo": u, "bajado": date.today().isoformat()}


def _actualizar_alicuotas(con_red):
    """Como mucho una bajada por día (meta "bajado_ib"). Si falla y hay respaldo, avisa y sigue con el respaldo."""
    meta = _meta()
    hoy = date.today().isoformat()
    hay = any(CACHE.glob("provincias_dnap_ib_*.xlsx"))
    if not con_red or (hay and meta.get("bajado_ib") == hoy):
        return
    try:
        _bajar_alicuotas(meta)
        meta["bajado_ib"] = hoy
        _guardar_meta(meta)
        print("  provincias_dnap: alícuotas de Ingresos Brutos bajadas")
    except Exception as e:  # noqa: BLE001
        if not hay:
            raise RuntimeError(f"no se pudieron bajar las alícuotas de Ingresos Brutos y no hay respaldo ({e})") from e
        print(f"  provincias_dnap: error al bajar las alícuotas ({e}); uso el respaldo")


def construir_alicuotas(con_red=True):
    """provincias_alicuotas.json desde los respaldos provincias_dnap_ib_<año>.xlsx. Levanta RuntimeError si cambió la estructura."""
    CACHE.mkdir(parents=True, exist_ok=True)
    _actualizar_alicuotas(con_red)
    archivos = sorted(CACHE.glob("provincias_dnap_ib_*.xlsx"))
    if not archivos:
        raise RuntimeError("no hay respaldo de las alícuotas de Ingresos Brutos (datos/cache/provincias_dnap_ib_<año>.xlsx)")
    por_anio = {}
    for f in archivos:
        anio, acts = _leer_alicuotas(f.read_bytes())
        por_anio[anio] = acts
    _controles_alicuotas(por_anio)
    anios = sorted(por_anio)
    ultimo = anios[-1]

    # Las actividades y aperturas se emparejan entre años por nombre normalizado y sin la "s" final ("Generación de energías" en
    # 2024 y "de energía" en 2025), en el orden del último año.
    def _k(nombre):
        return _n(nombre).rstrip("s")

    orden, nombres = [], {}
    for anio in [ultimo] + anios[:-1]:
        for a in por_anio[anio]:
            k = _k(a["n"])
            if k not in nombres:
                orden.append(k)
                nombres[k] = a["n"]

    def serie(filas, clave):
        return [f["fila"].get(clave) if f else None for f in filas]

    actividades = []
    for k in orden:
        filas = [next((a for a in por_anio[y] if _k(a["n"]) == k), None) for y in anios]
        ap_orden, ap_nombres = [], {}
        for f in filas[::-1]:
            for ap in (f["aperturas"] if f else []):
                kk = _k(ap["n"])
                if kk not in ap_nombres:
                    ap_orden.append(kk)
                    ap_nombres[kk] = ap["n"]
        aperturas = []
        for kk in ap_orden:
            fs = [next((ap for ap in f["aperturas"] if _k(ap["n"]) == kk), None) if f else None for f in filas]
            prov = {str(c): serie(fs, c) for c in PROVINCIAS}
            prov = {p: v for p, v in prov.items() if any(x is not None for x in v)}
            tope = serie(fs, "tope")
            if prov or any(x is not None for x in tope):
                aperturas.append({"n": ap_nombres[kk], "tope": tope, "prov": prov})
        actividades.append({"n": nombres[k], "tope": serie(filas, "tope"),
                            "prov": {str(c): serie(filas, c) for c in PROVINCIAS}, "aperturas": aperturas})
    meta = _meta()
    return {"generado": date.today().isoformat(), "fuente": FUENTE_IB, "aviso": AVISO_IB,
            "fuentes": meta.get("fuentes_ib", {}), "anios": anios, "actividades": actividades}


# ---------- bajada ----------

def _meta():
    f = CACHE / "provincias_dnap_meta.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def _guardar_meta(meta):
    (CACHE / "provincias_dnap_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def _links(html):
    """Todos los links a planillas de la página, con la dirección completa (se normalizan '/sites/…' y el prefijo 'blank:#')."""
    out = []
    for h in re.findall(r'href="([^"]*)"', html):
        h = h.strip()
        if h.startswith("blank:#"):
            h = h[len("blank:#"):]
        if h.startswith("/"):
            h = BASE_SITIO + h
        if re.search(r"\.xlsx?$", h, re.I):
            out.append(h)
    return sorted(set(out))


def _clave_orden(url):
    """Para elegir el stock más reciente: (año, trimestre) del nombre stock_<trim>_trim_<año>."""
    nombre = url.rsplit("/", 1)[-1]
    m = re.search(r"stock_(iv|iii|ii|i)_trim_(\d{4})", nombre)
    if m:
        return (int(m.group(2)), {"i": 1, "ii": 2, "iii": 3, "iv": 4}[m.group(1)], nombre)
    return (0, 0, nombre)


def _elegir_link(links, patron):
    cand = [u for u in links if re.search(patron, u.rsplit("/", 1)[-1])]
    if not cand:
        raise RuntimeError(f"no aparece ningún link que coincida con {patron!r}")
    return sorted(cand, key=_clave_orden)[-1]


def _bytes(url, timeout=120):
    return _get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)


def _bajar_tema(tema, meta):
    """Baja y lee los archivos de un tema; escribe el original, el CSV y la meta. Si algo falla no toca nada."""
    html = _bytes(BASE + PAGINAS[tema], timeout=60).decode("utf-8", "replace")
    links = _links(html)
    originales, urls = [], []
    for patron, destino in ARCHIVOS[tema]:
        url = _elegir_link(links, patron)
        originales.append((destino, _bytes(url)))
        urls.append(url)
    if tema == "cuentas":
        df = _leer_cuentas(originales[0][1])
    elif tema == "finalidad":
        df = _leer_finalidad(originales[0][1])
    elif tema == "recaudacion":
        df = _leer_recaudacion(originales[0][1])
    elif tema == "empleo":
        df = pd.concat([_leer_empleo(b) for _, b in originales], ignore_index=True)
    else:
        df, fecha = _leer_deuda(originales[0][1])
    if df.empty:
        raise RuntimeError("la planilla no trajo datos")
    for destino, b in originales:
        (CACHE / destino).write_bytes(b)
    df.to_csv(CACHE / f"provincias_dnap_{tema}.csv", index=False)
    if tema == "deuda":
        meta["deuda_fecha"] = fecha   # recién después de escribir el respaldo: la fecha y el dato van juntos
    meta.setdefault("fuentes", {})[tema] = {"pagina": BASE + PAGINAS[tema], "archivo": ", ".join(urls),
                                            "bajado": date.today().isoformat()}


def bajar():
    """Baja las cinco fuentes y deja los respaldos. Si una falla y hay respaldo, lo conserva y avisa; si no hay, levanta.
    Devuelve True solo si bajaron todas (si se usó algún respaldo, se reintenta en la próxima corrida)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    meta = _meta()
    bajados = 0
    for tema in TEMAS:
        try:
            _bajar_tema(tema, meta)
            _guardar_meta(meta)
            print(f"  provincias_dnap: {tema} bajado")
            bajados += 1
        except Exception as e:  # noqa: BLE001
            if not (CACHE / f"provincias_dnap_{tema}.csv").exists():
                raise
            print(f"  provincias_dnap: error al bajar {tema} ({e}); uso el respaldo")
    return bajados == len(TEMAS)


def _hay_respaldos():
    return all((CACHE / f"provincias_dnap_{t}.csv").exists() for t in TEMAS) and "deuda_fecha" in _meta()


def _actualizar_respaldos(con_red):
    meta = _meta()
    hoy = date.today().isoformat()
    hay = _hay_respaldos()
    if con_red and (not hay or meta.get("bajado") != hoy):
        try:
            if bajar():   # la fecha se guarda solo si bajó todo: si se usó un respaldo, se reintenta en la próxima corrida
                meta = _meta()
                meta["bajado"] = hoy
                _guardar_meta(meta)
        except Exception as e:  # noqa: BLE001
            if not hay:
                raise RuntimeError(f"no se pudieron bajar las planillas de la DNAP y no hay respaldo ({e})") from e
            print(f"  provincias_dnap: error al bajar ({e}); uso el respaldo")
    elif not hay:
        raise RuntimeError("no hay respaldo de las planillas de la DNAP (datos/cache/provincias_dnap_*)")


# ---------- construcción ----------

def _cargar(tema):
    """CSV de un tema -> {(provincia, concepto): {año: valor}} y el orden en que aparecen los conceptos."""
    d = pd.read_csv(CACHE / f"provincias_dnap_{tema}.csv", dtype={"provincia": str})
    datos, orden = {}, []
    for p, a, c, v in zip(d["provincia"], d["anio"], d["concepto"], d["valor"]):
        if (p, c) not in datos:
            datos[(p, c)] = {}
        datos[(p, c)][int(a)] = float(v)
        if c not in orden:
            orden.append(c)
    return datos, orden


def _g(datos, p, c, a):
    return datos.get((p, c), {}).get(a)


def _dif_rel(a, b):
    return abs(a - b) / abs(b) if b else (0.0 if a == 0 else float("inf"))


def _controles_cuentas(cu, anios):
    ids = [str(c) for c in PROVINCIAS]
    for p in ids + ["consolidado"]:
        for a in anios:
            v = {k: _g(cu, p, k, a) for k in ("ing_tot", "ing_cor", "ing_cap", "gas_tot", "gas_cor", "gas_cap", "res_fin")}
            if any(x is None for x in v.values()):
                continue
            nombre = PROVINCIAS[int(p)] if p != "consolidado" else "Consolidado"
            if abs(v["ing_tot"] - v["ing_cor"] - v["ing_cap"]) > TOL_CIERRE:
                _fallo(f"{nombre} {a}: ingresos totales {v['ing_tot']:,.1f} no es corrientes + de capital ({v['ing_cor'] + v['ing_cap']:,.1f})")
            if abs(v["gas_tot"] - v["gas_cor"] - v["gas_cap"]) > TOL_CIERRE:
                _fallo(f"{nombre} {a}: gastos totales {v['gas_tot']:,.1f} no es corrientes + de capital ({v['gas_cor'] + v['gas_cap']:,.1f})")
            if abs(v["res_fin"] - (v["ing_tot"] - v["gas_tot"])) > TOL_CIERRE:
                _fallo(f"{nombre} {a}: resultado financiero {v['res_fin']:,.1f} no es ingresos - gastos ({v['ing_tot'] - v['gas_tot']:,.1f})")
    peor = 0.0
    for k in ("gas_tot", "ing_tot"):
        for a in anios:
            cons = _g(cu, "consolidado", k, a)
            suma = sum(_g(cu, p, k, a) or 0.0 for p in ids)
            if cons is None:
                continue
            dif = _dif_rel(suma, cons)
            peor = max(peor, dif)
            if dif > 1e-4:
                _fallo(f"{a}: las 24 suman {suma:,.1f} y el Consolidado de {k} es {cons:,.1f} (diferencia {dif:.4%})")
    print(f"  control cuentas: ingresos y gastos cierran en las 24 y el consolidado; mayor diferencia de la suma {peor:.5%} (tolerancia 0,01 %)")


def _controles_finalidad(cu, fi, anios):
    """Las finalidades tienen que sumar el gasto total. La DNAP no las publica siempre con la misma versión de la ejecución (en 2024
    difieren hasta casi 4 %): hasta 0,01 % es lo esperado; entre 0,01 % y 5 % se avisa con los años; más de 5 % es un error."""
    peor, omitidos, fuera = 0.0, [], {}
    for p in [str(c) for c in PROVINCIAS] + ["consolidado"]:
        nombre = PROVINCIAS[int(p)] if p != "consolidado" else "Consolidado"
        for a in anios:
            gas = _g(cu, p, "gas_tot", a)
            tot_fin = sum(v.get(a, 0.0) for (pp, c), v in fi.items() if pp == p and " / " not in c and c != "TOTAL")
            if gas is None or tot_fin == 0:
                if tot_fin == 0:
                    omitidos.append(f"{nombre} {a}")
                continue
            dif = _dif_rel(tot_fin, gas)
            peor = max(peor, dif)
            if dif > 0.05:
                _fallo(f"{nombre} {a}: las finalidades suman {tot_fin:,.1f} y el gasto total es {gas:,.1f} ({dif:.4%})")
            if dif > 1e-4:
                fuera.setdefault(a, []).append(f"{nombre} {dif:.2%}")
    print(f"  control finalidades = gastos totales: mayor diferencia {peor:.3%} (esperado 0,01 %; falla si pasa de 5 %)"
          + (f"; sin gasto por finalidad: {', '.join(omitidos)}" if omitidos else ""))
    for a, lista in sorted(fuera.items()):
        print(f"    aviso {a}: {len(lista)} casos por encima de 0,01 %: {', '.join(lista[:12])}{' ...' if len(lista) > 12 else ''}")


def _controles_recaudacion(cu, rc, anios):
    malos = []
    for c in PROVINCIAS:
        p = str(c)
        for a in anios:
            t, tp = _g(rc, p, "total", a), _g(cu, p, "trib_prov", a)
            if t is None or tp is None or (t == 0 and tp == 0):
                continue
            if _dif_rel(t, tp) > 0.005:
                malos.append(f"{PROVINCIAS[c]} {a} ({t:,.1f} vs {tp:,.1f})")
    print(f"  control recaudación (hoja Total = tributarios de origen provincial, 0,5 %): {len(malos)} casos fuera"
          + (f": {'; '.join(malos[:6])}" if malos else ""))
    if len(malos) > 3:
        _fallo(f"la recaudación por impuesto no coincide con los tributarios de origen provincial en {len(malos)} casos: {'; '.join(malos[:10])}")


def _controles_deuda(de):
    ids = [str(c) for c in PROVINCIAS]
    total = next(iter(de.get(("total", "total"), {}).values()), None)
    suma = sum(next(iter(de.get((p, "total"), {None: 0.0}).values()), 0.0) or 0.0 for p in ids)
    if total is None:
        _fallo("la planilla de deuda no trae la fila TOTAL")
    dif = _dif_rel(suma, total)
    print(f"  control deuda: la fila TOTAL ({total:,.1f}) y la suma de las 24 ({suma:,.1f}) difieren {dif:.5%} (tolerancia 0,01 %)")
    if dif > 1e-4:
        _fallo(f"la deuda: TOTAL {total:,.1f} y la suma de las 24 {suma:,.1f} difieren {dif:.4%}")


def _controles_empleo(em):
    try:
        pob = _poblacion()
    except Exception as e:  # noqa: BLE001
        print(f"  control empleo: no se pudo leer la población de INDEC ({e}); se omite")
        return
    malos = []
    for c in PROVINCIAS:
        h, p = _g(em, str(c), "hab", 2024), pob.get((c, 2024))
        if h is None or p is None:
            continue
        if _dif_rel(h, p) > 0.03:
            malos.append(f"{PROVINCIAS[c]} (DNAP {h:,.0f}, INDEC {p:,})")
    print(f"  control empleo: habitantes de la DNAP vs INDEC 2024 (3 %): {len(malos)} fuera" + (f": {'; '.join(malos)}" if malos else ""))


def _control_pib_2023(cu):
    d = pd.read_csv(CACHE / "gasto_nacion_finfun.csv")
    f = d[d["ejercicio_presupuestario"] == 2023]
    gas = _g(cu, "consolidado", "gas_tot", 2023)
    if f.empty or gas is None:
        print("  control 2023: sin PIB o sin gasto consolidado; se omite")
        return
    pct = gas / (float(f.iloc[0]["pib"]) / 1e6) * 100
    print(f"  control 2023: gastos totales del consolidado {pct:.2f} % del PIB (esperado entre 15 y 19)")
    if not 15 <= pct <= 19:
        _fallo(f"el gasto consolidado de las provincias 2023 ({pct:.2f} % del PIB) está fuera de 15-19")


def _cajas(cu, anios):
    """{id: [True/False/None por año]}."""
    out = {}
    for c in PROVINCIAS:
        p, fila = str(c), []
        for a in anios:
            ss, gas = _g(cu, p, "prest_ss", a), _g(cu, p, "gas_tot", a)
            fila.append(None if ss is None or not gas else bool(ss / gas >= CAJA_MINIMO))
        out[p] = fila
    if 2024 in anios:
        i = anios.index(2024)
        con = sorted(PROVINCIAS[c] for c in PROVINCIAS if out[str(c)][i])
        esperadas = sorted(CAJA_2024)
        print(f"  caja propia 2024 (prestaciones de la seguridad social >= 5 % del gasto): {len(con)} provincias")
        if con != esperadas:
            print(f"  AVISO caja propia 2024: salen {len(con)} y se esperaban {len(esperadas)}. Sobran: {sorted(set(con) - set(esperadas))}. "
                  f"Faltan: {sorted(set(esperadas) - set(con))}")
    return out


def construir(con_red=True):
    """Devuelve {"provincias_cuentas.json": objeto}. Si un control no pasa, levanta RuntimeError."""
    CACHE.mkdir(parents=True, exist_ok=True)
    _actualizar_respaldos(con_red)
    meta = _meta()
    cu, _ = _cargar("cuentas")
    fi, orden_fi = _cargar("finalidad")
    rc, _ = _cargar("recaudacion")
    em, _ = _cargar("empleo")
    de, _ = _cargar("deuda")
    anios = sorted({a for v in cu.values() for a in v if a >= PRIMER_ANIO})
    if not anios:
        _fallo("no hay años en las cuentas")

    _controles_cuentas(cu, anios)
    _controles_finalidad(cu, fi, anios)
    _controles_recaudacion(cu, rc, anios)
    _controles_deuda(de)
    _controles_empleo(em)
    _control_pib_2023(cu)
    cajas = _cajas(cu, anios)

    def ser(datos, p, c):
        return [_r(_g(datos, p, c, a)) for a in anios]

    try:
        pob = _poblacion()   # proyección INDEC base 2010 (datos/cache/provincias_poblacion.csv); desde 2010
    except Exception as e:  # noqa: BLE001
        print(f"  provincias_dnap: no se pudo leer la población de INDEC ({e}); 'pob' sale vacío")
        pob = {}
    pob_cons = [sum(pob.get((c, a), 0) for c in PROVINCIAS) if a >= 2010 and pob else None for a in anios]
    fin_orden = [c for c in orden_fi if c != "TOTAL"]
    provincias = []
    sin_cuentas = {}   # {año: [códigos]}: la DNAP publica la hoja con todo en cero cuando falta la ejecución (La Pampa 2025)
    for cod in PROVINCIAS:
        p = str(cod)
        c_ser = {i: ser(cu, p, i) for i in IDS_CUENTAS}
        caja = list(cajas[p])
        for k, a in enumerate(anios):
            if all(v[k] in (None, 0.0) for v in c_ser.values()):
                for v in c_ser.values():
                    v[k] = None
                caja[k] = None
                sin_cuentas.setdefault(str(a), []).append(p)
                print(f"  provincias_dnap: {PROVINCIAS[cod]} {a} sin cuentas publicadas (todo en cero): queda sin dato")
        fin = []
        for c in fin_orden:
            if (p, c) not in fi:
                continue
            f, _, n = c.partition(" / ")
            fin.append({"n": n or f, "f": f if n else None, "v": ser(fi, p, c)})
        deuda = {k: _r(next(iter(de.get((p, k), {}).values()), None)) for _, k in COLUMNAS_DEUDA}
        if deuda["total"] in (None, 0.0) and all(v is None for k, v in deuda.items() if k != "total"):
            deuda = None
        provincias.append({
            "id": p,
            "pob": [pob.get((cod, a)) if a >= 2010 else None for a in anios],
            "c": c_ser,
            "caja": caja,
            "fin": fin,
            "imp": {k: ser(rc, p, k) for k in ("ib", "inmo", "sellos", "auto", "otros")},
            "emp": {k: ser(em, p, k) for k in ("planta", "personal", "medio", "c1000")},
            "deuda": deuda,
        })
    fuentes = meta.get("fuentes", {})
    obj = {
        "generado": date.today().isoformat(), "fuente": FUENTE_TXT,
        "fuentes": {t: fuentes.get(t) for t in TEMAS},
        "anios": anios, "provincias": provincias, "deuda_fecha": meta["deuda_fecha"],
        "sin_cuentas": sin_cuentas,   # años en que el consolidado de la DNAP no incluye a esas provincias
        "consolidado": {"pob": pob_cons, "c": {i: ser(cu, "consolidado", i) for i in IDS_CUENTAS}},
    }
    return {"provincias_cuentas.json": obj}


def construir_json(con_red=True):
    """Las cuentas (fase 2) y las alícuotas (fase 3) por separado: si una falla, la otra sale igual. Levanta solo si fallan las dos."""
    out, errores = {}, []
    for nombre, f in (("cuentas", construir), ("alícuotas", lambda r: {"provincias_alicuotas.json": construir_alicuotas(r)})):
        try:
            out.update(f(con_red))
        except Exception as e:  # noqa: BLE001
            errores.append(f"{nombre}: {e}")
            print(f"  provincias_dnap: no se pudieron armar las {nombre}; la página sale sin ellas ({e})")
    if not out:
        raise RuntimeError("; ".join(errores))
    return out


if __name__ == "__main__":
    if "--bajar" in sys.argv:
        if bajar():
            _guardar_meta({**_meta(), "bajado": date.today().isoformat()})
        _bajar_alicuotas(m := _meta())
        m["bajado_ib"] = date.today().isoformat()
        _guardar_meta(m)
        print("  provincias_dnap: alícuotas de Ingresos Brutos bajadas")
        sys.exit(0)
    res = construir_json(con_red="--sin-red" not in sys.argv)
    for nombre, obj in sorted(res.items()):
        txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        print(f"{nombre}: {len(txt.encode('utf-8')) / 1024:.0f} KB")
