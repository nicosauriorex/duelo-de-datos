"""
Semáforo de actividad: unos 30 indicadores mensuales para web/public/datos/semaforo.json.
Cada indicador lleva su serie original (`orig`) y su serie sin estacionalidad (`sa`), mensuales desde `f0`.

Sin estacionalidad:
- "oficial": se baja la serie oficial desestacionalizada y la original (INDEC, Sec. de Trabajo).
- "propia": método clásico de promedios móviles en pandas/numpy (ver `desestacionalizar`).
- "ninguno": índice de encuesta (confianza del consumidor): sa = orig.
Las series en pesos ("real") se deflactan con el IPC empalmado del sitio (ipc_empalme de datos/cache/compilado.json).
Cada fuente se guarda en datos/cache/sem_<clave>.csv (las oficiales, además sem_<clave>_sa.csv): si la bajada
falla se usa esa copia, y con `con_red=False` (--solo-json) se arma solo con las copias.

Uso suelto:  python pipeline/semaforo.py --bajar   (baja solo estas series y deja los respaldos, sin armar el JSON)
"""
import io
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from salarios import _cacheado, _get, _serie_api

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
MAX_ATRASO_MESES = 4
MAX_SALTO_PCT = 60  # variación de un mes que ya parece un error de carga
MIN_MESES_PROPIA = 36
VENTANA_PROPIA = 180  # meses que usa el método propio para estimar los factores estacionales
MESES_CONTROL = 120
MIN_FILAS_RESPALDO = 0.8  # una bajada con menos de esta parte de las filas del respaldo se toma como falla
NAFTAS_CONOCIDAS = 5

_CSV = "https://infra.datos.gob.ar/catalog/sspm/dataset/{d}/distribution/{d}.{v}/download/{n}"
URL_ACERO = _CSV.format(d=359, v=3, n="datos-historicos-de-la-industria-siderurgica-datos-mensulaes.csv")
URL_NAFTAS = _CSV.format(d=365, v=3, n="actividad-empresas.csv")
URL_PESCA = _CSV.format(d=39, v=3, n="captura-pesquera-por-categorias-valores-mensuales.csv")
URL_MINERIA = "https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipi_minero.xlsx"

# clave, grupo, nombre público, organismo, unidad, fuente de la serie, ajuste, real, id del catálogo del sitio o None.
# Fuente: ("dgo", id[, id de la original]) | ("csv", url, columna o columnas que se suman) | ("minero",)
INDICADORES = [
    ("emae", "General", "Actividad económica (EMAE)", "INDEC", "índice 2004=100",
     ("dgo", "143.3_NO_PR_2004_A_31", "143.3_NO_PR_2004_A_21"), "oficial", False, "143.3_NO_PR_2004_A_31"),
    ("ipi", "Industria", "Producción industrial", "INDEC", "índice 2004=100",
     ("dgo", "453.1_SERIE_DESEADA_0_0_24_58", "453.1_SERIE_ORIGNAL_0_0_14_46"), "oficial", False, "453.1_SERIE_DESEADA_0_0_24_58"),
    # Producción de autos fuera: la serie 41.3_AA_0_A_23 da ~100 mil por mes (ADEFA informa 45 a 55 mil) y repite valores.
    ("acero", "Industria", "Producción de acero", "Cámara Argentina del Acero", "miles de toneladas",
     ("csv", URL_ACERO, "acero_crudo"), "propia", False, None),
    ("hierro", "Industria", "Producción de hierro", "Cámara Argentina del Acero", "miles de toneladas",
     ("csv", URL_ACERO, "hierro_primario_total"), "propia", False, None),
    ("mineria", "Industria", "Producción minera", "INDEC", "índice 2016=100",
     ("minero",), "oficial", False, None),
    ("isac", "Construcción", "Actividad de la construcción (ISAC)", "INDEC", "índice 2004=100",
     ("dgo", "33.2_ISAC_SIN_EDAD_0_M_23_56", "33.2_ISAC_NIVELRAL_0_M_18_63"), "oficial", False, "33.2_ISAC_SIN_EDAD_0_M_23_56"),
    ("cemento", "Construcción", "Ventas de cemento", "AFCP", "miles de toneladas",
     ("dgo", "38.3_CEM_1994_M_7"), "propia", False, "38.3_CEM_1994_M_7"),
    ("gas", "Energía", "Producción de gas", "Secretaría de Energía", "millones de m³",
     ("dgo", "41.3_GN_0_A_11"), "propia", False, "41.3_GN_0_A_11"),
    ("electricidad", "Energía", "Demanda de electricidad", "CAMMESA", "GWh",
     ("dgo", "367.3_DEMANDA_TOTAL__13"), "propia", False, None),
    ("naftas", "Energía", "Venta de naftas", "Secretaría de Energía", "metros cúbicos",
     ("csv", URL_NAFTAS, "prefijo:ventas_naftas_"), "propia", False, None),
    ("faena_vacuna", "Agro y pesca", "Faena vacuna", "Sec. de Agricultura", "cabezas",
     ("dgo", "40.3_VC_0_M_15"), "propia", False, None),
    ("faena_aves", "Agro y pesca", "Faena de aves", "Sec. de Agricultura", "toneladas",
     ("dgo", "40.3_AT_0_M_14"), "propia", False, None),
    ("trigo", "Agro y pesca", "Producción de harina de trigo", "Sec. de Agricultura", "miles de toneladas",
     ("dgo", "41.3_H_0_A_10"), "propia", False, None),
    ("soja", "Agro y pesca", "Molienda de soja", "INDEC (rama del índice industrial)", "índice 2004=100",
     ("dgo", "453.2_MOLIENDA_OSAS_0_0_20_8"), "propia", False, None),
    ("pesca", "Agro y pesca", "Pesca", "Sec. de Agricultura", "toneladas",
     ("csv", URL_PESCA, "total_general"), "propia", False, None),
    ("divisas_agro", "Agro y pesca", "Liquidación de divisas del agro", "CIARA-CEC", "millones de US$",
     ("dgo", "349.2_ACUM_MENSUAL__13"), "propia", False, None),
    ("supermercados", "Consumo", "Ventas en supermercados (reales)", "INDEC", "millones de $ de 2017",
     ("dgo", "455.1_VENTAS_PRETES_0_M_25_98"), "propia", False, "455.1_VENTAS_PRETES_0_M_25_98"),
    ("shoppings", "Consumo", "Ventas en centros de compra (reales)", "INDEC", "miles de $ de 2017",
     ("dgo", "458.1_VENTAS_TOTTES_ABRI_M_33_40"), "propia", False, "458.1_VENTAS_TOTTES_ABRI_M_33_40"),
    ("confianza", "Consumo", "Confianza del consumidor", "UTDT", "puntos (0 a 100)",
     ("dgo", "380.3_ICC_NACIONNAL_0_T_12"), "ninguno", False, "380.3_ICC_NACIONNAL_0_T_12"),
    ("iva", "Fiscal", "Recaudación de IVA (real)", "Min. de Economía", "millones de $ constantes",
     ("dgo", "142.3_IVA_D_2001_M_7"), "propia", True, None),
    ("debcred", "Fiscal", "Impuesto a créditos y débitos (real)", "Min. de Economía", "millones de $ constantes",
     ("dgo", "142.3_CREDI_2001_M_24"), "propia", True, None),
    ("segsocial", "Fiscal", "Aportes a la seguridad social (real)", "Min. de Economía", "millones de $ constantes",
     ("dgo", "142.3_SISTE_2001_M_24"), "propia", True, None),
    ("prest_personales", "Crédito", "Préstamos personales (reales)", "BCRA", "millones de $ constantes",
     ("dgo", "91.1_DETALLE_PRLES_0_0_52"), "propia", True, None),
    ("prest_comerciales", "Crédito", "Préstamos comerciales (reales)", "BCRA", "millones de $ constantes",
     ("dgo", "91.1_PRESTAMOS_LES_0_0_37"), "propia", True, None),
    ("expo", "Comercio exterior", "Exportaciones", "INDEC", "millones de US$",
     ("dgo", "74.3_IET_0_M_16"), "propia", False, "74.3_IET_0_M_16"),
    ("impo", "Comercio exterior", "Importaciones", "INDEC", "millones de US$",
     ("dgo", "74.3_IIT_0_M_25"), "propia", False, "74.3_IIT_0_M_25"),
    ("expo_brasil", "Comercio exterior", "Exportaciones a Brasil", "INDEC", "millones de US$",
     ("dgo", "77.3_IEB_0_A_24"), "propia", False, None),
    ("impo_brasil", "Comercio exterior", "Importaciones desde Brasil", "INDEC", "millones de US$",
     ("dgo", "78.3_IIB_0_A_24"), "propia", False, None),
    ("empleo", "Empleo", "Empleo privado registrado", "Sec. de Trabajo", "miles de personas",
     ("dgo", "151.1_AARIADOTAC_2012_M_26", "151.1_AARIADODAD_2012_M_31"), "oficial", False, "151.1_AARIADOTAC_2012_M_26"),
]


# ---------- bajada ----------

def _a_mes(s):
    """Serie con índice al primer día de cada mes, sin repetidos ni vacíos, ordenada."""
    s = pd.Series(s).astype("float64").dropna()
    s.index = pd.DatetimeIndex(s.index).to_period("M").to_timestamp()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    return s


def _bajar_dgo(sid):
    s = _serie_api(sid)
    if len(s) > 2:
        paso = pd.Series(s.index).diff().dt.days.median()
        if paso < 20:  # diaria: se resume en promedio mensual
            s = s.groupby(s.index.to_period("M").to_timestamp()).mean()
    return _a_mes(s)


def _bajar_csv(url, cols):
    df = pd.read_csv(io.BytesIO(_get(url)), parse_dates=["indice_tiempo"]).set_index("indice_tiempo")
    if isinstance(cols, str) and cols.startswith("prefijo:"):
        pre = cols[len("prefijo:"):]
        cols = [c for c in df.columns if str(c).startswith(pre)]
        if len(cols) != NAFTAS_CONOCIDAS:
            print(f"  Semáforo: posible error, las columnas '{pre}*' son {len(cols)} y eran {NAFTAS_CONOCIDAS} ({cols}); revisar la fuente")
        if not cols:
            raise ValueError(f"no hay columnas '{pre}*'")
    cols = [cols] if isinstance(cols, str) else cols
    faltan = [c for c in cols if c not in df.columns]
    if faltan:
        raise ValueError(f"faltan columnas {faltan}")
    parte = df[cols].apply(pd.to_numeric, errors="coerce")
    # Suma de columnas: el mes cuenta solo si están todas (si falta alguna, la suma subestimaría)
    s = parte.sum(axis=1, min_count=len(cols)).where(parte.notna().all(axis=1))
    return _a_mes(s)


MESES = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
         "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}


def _bajar_minero():
    """IPI minero (INDEC, Cuadro 1): devuelve (original, desestacionalizada). Columnas: 1 año, 2 mes, 3 original, 7 desest."""
    d = pd.read_excel(io.BytesIO(_get(URL_MINERIA)), sheet_name="Cuadro 1", header=None)
    cab = lambda f, c: str(d.iloc[f, c]).lower()  # noqa: E731
    if (d.shape[1] < 8 or "serie original" not in cab(3, 3) or "nivel general" not in cab(4, 3)
            or "desestacionalizada" not in cab(3, 7) or "nivel general" not in cab(4, 7)):
        raise ValueError("el cuadro 1 del IPI minero cambió de columnas (cabeceras distintas de las esperadas)")
    anio = None
    orig, sa = {}, {}
    for _, f in d.iterrows():
        a = f.iloc[1]
        if pd.notna(a):
            try:
                anio = int(str(a).strip().rstrip("*").strip())
            except ValueError:
                pass
        mes = MESES.get(str(f.iloc[2]).strip().lower())
        if anio is None or mes is None:
            continue
        fecha = pd.Timestamp(anio, mes, 1)
        o, s = pd.to_numeric(f.iloc[3], errors="coerce"), pd.to_numeric(f.iloc[7], errors="coerce")
        if pd.notna(o):
            orig[fecha] = float(o)
        if pd.notna(s):
            sa[fecha] = float(s)
    if not orig or not sa:
        raise ValueError("no se encontraron los datos del cuadro 1")
    return _a_mes(pd.Series(orig)), _a_mes(pd.Series(sa))


def _leer_cache(nombre):
    f = CACHE / f"{nombre}.csv"
    if not f.exists():
        return None
    return _a_mes(pd.read_csv(f, index_col=0, parse_dates=True).iloc[:, 0])


def _validada(nombre, fn):
    """Envuelve la bajada: vacía, o con menos del 80 % de las filas del respaldo, es una falla (así _cacheado no pisa el respaldo)."""
    def f():
        s = fn()
        if s is None or len(s) == 0:
            raise ValueError("la bajada vino vacía")
        previa = _leer_cache(nombre)
        if previa is not None and len(s) < MIN_FILAS_RESPALDO * len(previa):
            raise ValueError(f"la bajada trae {len(s)} filas y el respaldo {len(previa)}: parece recortada")
        return s
    return f


def _obtener(clave, fuente, con_red):
    """(original, oficial sin estacionalidad o None). Con red usa _cacheado; sin red, solo las copias de datos/cache/."""
    tipo = fuente[0]
    pares = []  # (nombre de cache, función de bajada)
    if tipo == "dgo":
        pares.append((f"sem_{clave}", lambda: _bajar_dgo(fuente[1] if len(fuente) == 2 else fuente[2])))
        if len(fuente) == 3:
            pares.append((f"sem_{clave}_sa", lambda: _bajar_dgo(fuente[1])))
    elif tipo == "csv":
        pares.append((f"sem_{clave}", lambda: _bajar_csv(fuente[1], fuente[2])))
    elif tipo == "minero":
        # Una sola descarga para las dos series
        cuadro = {}

        def uno(i):
            if "x" not in cuadro:
                cuadro["x"] = _bajar_minero()
            return cuadro["x"][i]
        pares.append((f"sem_{clave}", lambda: uno(0)))
        pares.append((f"sem_{clave}_sa", lambda: uno(1)))
    out = []
    for nombre, fn in pares:
        if con_red:
            out.append(_a_mes(_cacheado(nombre, _validada(nombre, fn))))
        else:
            s = _leer_cache(nombre)
            if s is None:
                raise FileNotFoundError(f"falta datos/cache/{nombre}.csv (hace falta una bajada con red)")
            out.append(s)
    return out[0], (out[1] if len(out) > 1 else None)


# ---------- IPC ----------

def _ipc():
    """IPC empalmado que usa el sitio (ipc_empalme), tomado de datos/cache/compilado.json."""
    d = json.loads((CACHE / "compilado.json").read_text(encoding="utf-8"))
    s = next(x for x in d["series"] if x["id"] == "ipc_empalme")
    fechas = pd.to_datetime([f + "-01" for f in d["fechas"]])
    v = pd.Series(s["v"], index=fechas[s["i0"]:s["i0"] + len(s["v"])], dtype="float64").dropna()
    return v


def deflactar(s, ipc):
    """Valores del último mes del IPC disponible: s / IPC × IPC_último. Meses sin IPC quedan sin dato."""
    base = ipc.iloc[-1]
    return (s / ipc.reindex(s.index) * base).dropna()


# ---------- desestacionalización propia ----------

def desestacionalizar(s):
    """Método clásico de descomposición por promedios móviles. Devuelve la serie sin estacionalidad (o None si no se puede).
    - Usa el tramo final continuo (sin huecos) de la serie, con un mínimo de MIN_MESES_PROPIA meses y un máximo de VENTANA_PROPIA.
    - Tendencia: media móvil centrada de 12 meses (2x12: medias en los extremos); necesita 6 meses a cada lado.
    - Factor de cada mes del año: mediana de (serie / tendencia) de ese mes, en logaritmos y normalizado a promedio 1.
      Si hay valores no positivos se usa el método aditivo (diferencias en lugar de cocientes; normalizado a promedio 0).
    - Los factores se estiman con los meses que tienen tendencia, pero se aplican a todos, incluso a los últimos 6.
    No corrige feriados móviles ni días hábiles; los últimos meses pueden cambiar al entrar un dato nuevo."""
    s = _a_mes(s)
    if len(s) < MIN_MESES_PROPIA:
        return None
    completo = s.reindex(pd.date_range(s.index[0], s.index[-1], freq="MS"))
    faltan = np.flatnonzero(completo.isna().to_numpy())
    if len(faltan):
        completo = completo.iloc[faltan[-1] + 1:]
    completo = completo.iloc[-VENTANA_PROPIA:]
    if len(completo) < MIN_MESES_PROPIA:
        return None
    mult = bool((completo > 0).all())
    y = np.log(completo.to_numpy()) if mult else completo.to_numpy()
    n = len(y)
    pesos = np.array([0.5] + [1.0] * 11 + [0.5]) / 12
    tend = np.convolve(y, pesos, mode="valid")  # n-12 valores, alineados con y[6:n-6]
    resto = y[6:n - 6] - tend
    meses = completo.index.month.to_numpy()
    factor = np.zeros(12)
    for m in range(1, 13):
        r = resto[meses[6:n - 6] == m]
        factor[m - 1] = np.median(r) if len(r) else 0.0
    factor -= factor.mean()
    ajustada = y - factor[meses - 1]
    sa = np.exp(ajustada) if mult else ajustada
    return pd.Series(sa, index=completo.index)


def variacion_mensual(s):
    """Variación porcentual contra el mes anterior (solo meses consecutivos con valor anterior positivo)."""
    ant = s.shift(1, freq="MS").reindex(s.index)
    return ((s / ant - 1) * 100).where(ant > 0).dropna()


def control(orig, sa_oficial):
    """(error medio absoluto en puntos porcentuales, meses) de la variación mensual propia contra la oficial, últimos 10 años."""
    propia = desestacionalizar(orig)
    if propia is None:
        return None
    a, b = variacion_mensual(propia), variacion_mensual(sa_oficial)
    comun = a.index.intersection(b.index)
    comun = comun[comun >= b.index[-1] - pd.DateOffset(months=MESES_CONTROL - 1)]
    if len(comun) < 12:
        return None
    return round(float((a[comun] - b[comun]).abs().mean()), 2), int(len(comun))


# ---------- armado ----------

def _lista(s, idx):
    return [None if pd.isna(x) or not np.isfinite(x) else round(float(x), 4) for x in s.reindex(idx).to_numpy()]


def _revisar(clave, nombre, orig, sa, hoy):
    ultimo = orig.index[-1] if sa is None else max(orig.index[-1], sa.index[-1])
    atraso = (hoy.year - ultimo.year) * 12 + hoy.month - ultimo.month
    if atraso > MAX_ATRASO_MESES:
        print(f"  Semáforo: '{nombre}' ({clave}) tiene último dato de {ultimo:%Y-%m} ({atraso} meses de atraso)")
    for etiqueta, s in (("original", orig), ("sin estacionalidad", sa)):
        if s is None or len(s) < 2:
            continue
        v = variacion_mensual(s)
        if len(v) and v.index[-1] == s.index[-1] and abs(v.iloc[-1]) > MAX_SALTO_PCT:
            print(f"  Semáforo: '{nombre}' ({clave}), {etiqueta}: el último mes ({s.index[-1]:%Y-%m}) varía {v.iloc[-1]:+.1f} % contra el anterior; revisar la fuente")
    if len(orig) >= 3 and orig.iloc[-1] == orig.iloc[-2] == orig.iloc[-3]:
        print(f"  Semáforo: '{nombre}' ({clave}) repite el mismo valor tres meses seguidos ({orig.iloc[-1]})")


def construir_json(con_red=True):
    ahora = datetime.now(timezone(timedelta(hours=-3)))  # hora argentina
    hoy = pd.Timestamp(ahora.date())
    try:
        ipc = _ipc()
    except Exception as e:  # noqa: BLE001
        ipc = None
        print(f"  Semáforo: error al leer el IPC ({e}); quedan afuera los indicadores en términos reales")
    indicadores, controles = [], []
    for clave, grupo, nombre, fuente_org, unidad, fuente, ajuste, real, sid in INDICADORES:
        try:
            orig, sa_of = _obtener(clave, fuente, con_red)
            if orig.empty:
                print(f"  Semáforo: la serie '{nombre}' ({clave}) está vacía (no disponible); queda afuera")
                continue
            ultimo_bruto = orig.index[-1]
            if real and ipc is None:
                print(f"  Semáforo: '{nombre}' ({clave}) no disponible sin IPC; queda afuera")
                continue
            if real:
                orig = deflactar(orig, ipc)
                if orig.empty:
                    print(f"  Semáforo: '{nombre}' ({clave}) no disponible: no tiene IPC para deflactar; queda afuera")
                    continue
                if orig.index[-1] < ultimo_bruto:
                    print(f"  Semáforo: '{nombre}' ({clave}): el IPC llega a {ipc.index[-1]:%Y-%m}, los últimos meses de la serie no se pudieron deflactar")
            # Sin estacionalidad
            if ajuste == "oficial":
                sa = sa_of
                if sa is None:
                    raise ValueError("falta la serie oficial desestacionalizada")
                c = control(orig, sa)
                if c:
                    controles.append({"clave": clave, "error_medio_pp": c[0], "meses": c[1]})
                    print(f"  Semáforo control {clave}: diferencia media {c[0]} pp en {c[1]} meses (propia contra oficial)")
                else:
                    print(f"  Semáforo control {clave}: no se pudo calcular")
            elif ajuste == "ninguno":
                sa = orig.copy()
            else:
                sa = desestacionalizar(orig)
                if sa is None:
                    print(f"  Semáforo: '{nombre}' ({clave}) sin estimación propia (menos de {MIN_MESES_PROPIA} meses seguidos); solo interanual")
            _revisar(clave, nombre, orig, sa, hoy)
            ini = orig.index[0] if sa is None or sa.empty else min(orig.index[0], sa.index[0])
            fin = orig.index[-1] if sa is None or sa.empty else max(orig.index[-1], sa.index[-1])
            idx = pd.date_range(ini, fin, freq="MS")
            indicadores.append({
                "clave": clave, "grupo": grupo, "nombre": nombre, "fuente": fuente_org, "unidad": unidad,
                "ajuste": ajuste,
                "real": real, "id": sid, "f0": ini.strftime("%Y-%m"),
                "orig": _lista(orig, idx), "sa": _lista(sa, idx) if sa is not None else [None] * len(idx),
            })
        except Exception as e:  # noqa: BLE001
            print(f"  Semáforo: '{nombre}' ({clave}) error: no se pudo armar y queda afuera ({e})")
    if not indicadores:
        raise RuntimeError("ningún indicador del semáforo se pudo armar")
    _validar(indicadores)
    return {"actualizado": ahora.replace(microsecond=0).isoformat(), "control": controles, "indicadores": indicadores}


def _validar(indicadores):
    """Controles de cordura sobre el JSON final: claves únicas, listas del mismo largo, sin NaN, ids y datos presentes."""
    claves = [i["clave"] for i in indicadores]
    if len(set(claves)) != len(claves):
        raise ValueError("claves repetidas en el semáforo")
    for i in indicadores:
        if len(i["orig"]) != len(i["sa"]):
            raise ValueError(f"{i['clave']}: orig y sa de distinto largo")
        for v in i["orig"] + i["sa"]:
            if v is not None and not np.isfinite(v):
                raise ValueError(f"{i['clave']}: valor no finito")
        if not any(v is not None for v in i["orig"]):
            raise ValueError(f"{i['clave']}: sin datos")
        if i["ajuste"] == "propia" and not any(v is not None for v in i["sa"]):
            print(f"  Semáforo: '{i['nombre']}' sin serie ajustada; solo interanual")


def bajar():
    """Baja solo las series del semáforo y deja los respaldos en datos/cache/ (sin armar el JSON)."""
    ok, mal = [], []
    for clave, _g, nombre, _o, _u, fuente, *_ in INDICADORES:
        try:
            orig, sa = _obtener(clave, fuente, True)
            ok.append(clave)
            print(f"  {clave}: {len(orig)} meses, {orig.index[0]:%Y-%m} a {orig.index[-1]:%Y-%m}, último {orig.iloc[-1]:.4g}"
                  + (f"; oficial sin est. hasta {sa.index[-1]:%Y-%m}" if sa is not None else ""))
        except Exception as e:  # noqa: BLE001
            mal.append(clave)
            print(f"  {clave}: error, FALLÓ ({e})")
    print(f"Semáforo: {len(ok)} series bajadas, {len(mal)} fallaron {mal if mal else ''}")


if __name__ == "__main__":
    if "--bajar" in sys.argv:
        bajar()
    else:
        sys.exit("Uso: python pipeline/semaforo.py --bajar")
