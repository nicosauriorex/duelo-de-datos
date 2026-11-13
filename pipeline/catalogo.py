"""
Catálogo unificado de series para Primero los Datos.

Cada serie es un dict:
  id, n (nombre), cat (lista: ruta de categorías), tipo, u (unidad), dir, fuente, desc,
  v (pd.Series mensual), y opcionalmente min / max (pd.Series: mínimo y máximo diario del mes).

tipo:
  "ars"  monto en pesos (se puede ver real, en dólares, etc.)
  "idx"  índice de precios o valores en pesos (mismas medidas que "ars", pero se muestra como índice)
  "usd"  monto en dólares
  "fx"   precio del dólar en pesos
  "none" tasa, porcentaje, índice de cantidades, puntos básicos, personas (se muestra tal cual)
dir: 1 = que suba es bueno, -1 = que suba es malo, 0 = neutro.

Salida para la web nueva (web/public/datos/, la escribe obtener_datos.escribir_json_web):
  catalogo.json  {"version", "fechas": ["1990-01", ...], "series": [metadatos + "archivo"]}
                 metadatos = id, n, cat, tipo, u, dir, fuente, desc (+ agg, flujo = 1 si corresponde);
                 "archivo" dice en qué JSON están los valores; "version" cambia con cada dato nuevo
                 y la web la agrega a cada pedido (?v=) para no mezclar cachés.
  <categoria>.json  uno por cat[0] (nombre pasado por slug): {id: {"i0", "v", "min"?, "max"?}}
                 i0 = índice del primer mes en "fechas"; v = valores desde i0 (null = hueco);
                 min/max = {"i0", "v"} con el mínimo/máximo diario del mes.
  base.json      las series transversales que usan todas las secciones (IPC, CPI EEUU, dólares,
                 población, PIB anual): ver IDS_BASE en obtener_datos.py. Se carga siempre.
"""
import json
import re
import unicodedata
import urllib.parse

import pandas as pd

from salarios import _cacheado, _get, SERIES_API

INDEC_API = "https://api.indec.gob.ar/v1/"
BCRA_API = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/"
REGIONES = ["Nacional", "GBA", "Pampeana", "Noreste", "Noroeste", "Cuyo", "Patagonia"]


def slug(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def _controlar_canastas(can):
    """El hogar de 4 (Hogar 2) equivale a 3,09 adultos: si la relación con la canasta por adulto se aparta, los datos están mal armados."""
    for cod in ("CBA", "CBT"):
        adulto = can[can["codigo"] == cod].groupby("fecha")["valor"].mean()
        hogar = can[can["codigo"] == cod + " H2"].groupby("fecha")["valor"].mean()
        rel = (hogar / adulto).dropna()
        if len(rel) and ((rel - 3.09).abs() > 0.05).any():
            raise ValueError(f"Canastas: {cod} hogar de 4 / adulto equivalente fuera de 3,09 (entre {rel.min():.2f} y {rel.max():.2f})")


# Fuente del IPC empalmado y de la inflación: se nombra al organismo de cada tramo (ver salarios.ipc_empalmado).
FUENTE_IPC = "INDEC (IPC); de 2007 a 2016, IPC de San Luis y de la Ciudad de Buenos Aires"


def S(id, n, cat, tipo, u, v, dir=0, fuente="", desc="", mn=None, mx=None, agg=False, flujo=False):
    """agg: monto agregado de toda la economía (admite por habitante y % del PIB). flujo: se suma en el tiempo (no es stock)."""
    d = {"id": id, "n": n, "cat": cat, "tipo": tipo, "u": u, "dir": dir, "fuente": fuente, "desc": desc, "v": v, "agg": agg, "flujo": flujo}
    if mn is not None:
        d["min"], d["max"] = mn, mx
    return d


# ---------------------------------------------------------------- descargas
def _indec(tabla, token, order, **filtros):
    rows, offset = [], 0
    while True:
        params = {**filtros, "order": order, "limit": 1000, "offset": offset}
        url = INDEC_API + tabla + "?" + urllib.parse.urlencode(params, safe="*.,()")
        chunk = json.loads(_get(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}, timeout=180))
        rows += chunk
        if len(chunk) < 1000:
            return pd.DataFrame(rows)
        offset += 1000


def _cache_df(nombre, bajar):
    """Como _cacheado pero para DataFrames."""
    from salarios import CACHE
    f = CACHE / f"{nombre}.pkl"
    try:
        df = bajar()
        df.to_pickle(f)
        return df
    except Exception as e:  # noqa: BLE001
        if f.exists():
            print(f"  {nombre}: error al bajar ({e}); uso cache")
            return pd.read_pickle(f)
        print(f"  {nombre}: no disponible ({e})")
        return pd.DataFrame()


def _bcra(var_id):
    vals, offset = {}, 0
    while True:
        d = json.loads(_get(f"{BCRA_API}{var_id}?desde=1990-01-01&hasta=2100-01-01&limit=3000&offset={offset}",
                            headers={"User-Agent": "Mozilla/5.0"}, timeout=120))
        det = d["results"][0]["detalle"] if d.get("results") else []
        vals.update({x["fecha"]: x["valor"] for x in det})
        if len(det) < 3000:
            s = pd.Series(vals, dtype="float64")
            s.index = pd.to_datetime(s.index)
            return s.sort_index()
        offset += 3000


def _series_api(ids):
    """Varias series de datos.gob.ar (mensuales, trimestrales o semestrales) en su fecha de inicio de período."""
    # De a una: si se piden juntas series de distinta frecuencia, la API las lleva todas a la más baja.
    out = {}
    for g in ids:
        try:
            d = json.loads(_get(f"{SERIES_API}?ids={g}&limit=1000&format=json&start_date=1980-01-01", timeout=120))
        except Exception as e:  # noqa: BLE001
            print(f"  datos.gob.ar {g}: error ({e})")
            continue
        df = pd.DataFrame(d["data"], columns=["fecha", g])
        df["fecha"] = pd.to_datetime(df["fecha"])
        out[g] = df.set_index("fecha")[g].dropna()
    return out


def _mes(s, idx, agg="mean"):
    s = s.dropna()
    g = s.groupby(s.index.to_period("M").to_timestamp())
    return getattr(g, agg)().reindex(idx)


# ---------------------------------------------------------------- bloques
def ipc_indec(token, idx):
    """Índices del IPC (nacional y regional) y precios promedio por producto, desde la API de INDEC."""
    if not token:
        df = _cache_df("ipc_indec_completo", lambda: (_ for _ in ()).throw(RuntimeError("sin token")))
    else:
        df = _cache_df("ipc_indec_completo", lambda: _indec(
            "ipc_nacional", token,
            "clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida",
            tipo_de_indicador="in.(Indice,Precio promedio)"))
    if df.empty:
        return []
    df["fecha"] = pd.to_datetime(df["periodo"].astype(str).str[:6], format="%Y%m")
    out = []
    # --- Índices
    ind = df[df["tipo_de_indicador"] == "Indice"]
    nombres_cod = {}  # codigo -> descripcion (para armar las rutas)
    for (cod, desc) in ind[["codigo", "descripcion"]].drop_duplicates().itertuples(index=False):
        nombres_cod.setdefault(cod, desc)
    for (clas, nivel, cod, desc, reg), g in ind.groupby(["clasificador", "nivel", "codigo", "descripcion", "region"]):
        v = g.groupby("fecha")["valor"].mean().reindex(idx)
        if v.notna().sum() < 6:
            continue
        base = ["Precios", "IPC INDEC (índices, dic-2016 = 100)", reg]
        if clas == "IPC":
            ruta, nom = base, "Nivel general"
        elif clas.startswith("Bienes"):
            ruta, nom = base + ["Bienes y servicios"], desc
        elif clas.startswith("Estacional"):
            ruta, nom = base + ["Estacional, núcleo y regulados"], desc
        else:  # COICOP: división / grupo / clase / producto anidados por código
            partes = cod.split(".")
            ruta = base[:]
            for k in range(1, len(partes)):
                pref = ".".join(partes[:k])
                ruta.append(f"{pref} {nombres_cod.get(pref, '')}".strip())
            nom = desc if len(partes) > 1 else f"{desc} (división completa)"
            if len(partes) == 1:
                ruta.append(f"{cod} {desc}")
        out.append(S(f"ipc_{slug(reg)}_{slug(cod)}_{slug(clas)[:6]}", f"IPC {desc} ({reg})" if clas != "IPC" else f"IPC nivel general ({reg})",
                     ruta, "idx", "índice dic-2016=100", v, -1, "INDEC, API ipc_nacional",
                     f"Índice de precios al consumidor, {nivel.lower()} {cod} ({clas}), región {reg}."))
    # --- Precios promedio por producto
    pp = df[df["tipo_de_indicador"] == "Precio promedio"]
    for (desc, reg, cod, um), g in pp.groupby(["descripcion", "region", "codigo", "tipo_de_indicador_descripcion"]):
        v = g.groupby("fecha")["valor"].mean().reindex(idx)
        if v.notna().sum() < 6:
            continue
        cant = re.sub(r"^Valor por\s*", "", str(um)).strip() or "unidad"   # "kg", "390 g", "litro", "Env. 4 u"…
        div = str(cod).split(".")[0]
        rubro = f"{div} {nombres_cod.get(div, '')}".strip()
        out.append(S(f"pp_{slug(reg)}_{slug(desc)}", f"{desc} ({reg})", ["Precios", "Precios promedio por producto (INDEC)", reg, rubro],
                     "ars", f"$ por {cant}", v, -1, "INDEC, precios promedio del IPC",
                     f"Precio promedio relevado por INDEC para el IPC, región {reg}, por {cant}."))
    return out


def bcra(idx):
    DB, TA = ["Dinero y bancos (BCRA)"], ["Tasas de interés"]
    CR = ["Dinero y bancos (BCRA)", "Crédito"]
    VARS = [
        # id, nombre, ruta, tipo, unidad, dir, opciones (agg, flujo, agregacion mensual), descripción
        (1, "Reservas internacionales del BCRA (brutas)", DB, "usd", "millones de US$", 1, dict(agg=True),
         "Activos externos del BCRA. Son brutas: incluyen encajes de depósitos en dólares, el swap con China y préstamos; las netas (lo que es realmente propio) son bastante menos."),
        (78, "Compras netas de dólares del BCRA", DB, "usd", "millones de US$", 1, dict(agg=True, flujo=True, suma=True),
         "Dólares que el BCRA compró (positivo) o vendió (negativo) en el mercado de cambios. Suma de las operaciones diarias del mes."),
        (15, "Base monetaria", DB, "ars", "millones de $", 0, dict(agg=True), "Billetes y monedas en circulación más las cuentas corrientes de los bancos en el BCRA."),
        (16, "Circulación monetaria", DB, "ars", "millones de $", 0, dict(agg=True), "Billetes y monedas emitidos (en el público y en los bancos)."),
        (17, "Billetes y monedas en poder del público", DB, "ars", "millones de $", 0, dict(agg=True), "Efectivo en manos de personas y empresas."),
        (21, "Depósitos totales en entidades financieras", DB, "ars", "millones de $", 0, dict(agg=True), "Depósitos en pesos y en dólares (pasados a pesos) del sector público y privado."),
        (24, "Depósitos a plazo fijo", DB, "ars", "millones de $", 0, dict(agg=True), "Plazos fijos del sector privado."),
        (26, "Préstamos al sector privado (total)", CR, "ars", "millones de $", 1, dict(agg=True), "Stock de préstamos de bancos a familias y empresas, en pesos y dólares (pasados a pesos)."),
        (117, "Préstamos al sector privado en pesos", CR, "ars", "millones de $", 1, dict(agg=True), "Stock de préstamos en pesos a familias y empresas."),
        (125, "Préstamos al sector privado en dólares", CR, "usd", "millones de US$", 1, dict(agg=True), "Stock de préstamos en dólares (sobre todo a exportadores)."),
        (112, "Préstamos hipotecarios en pesos", CR, "ars", "millones de $", 1, dict(agg=True), "Stock de créditos hipotecarios en pesos (incluye UVA)."),
        (113, "Préstamos prendarios en pesos", CR, "ars", "millones de $", 1, dict(agg=True), "Stock de créditos prendarios (autos, maquinaria)."),
        (25, "M2 privado: variación interanual", DB, "none", "%", 0, {}, "Crecimiento en 12 meses del dinero del sector privado (efectivo + cuentas a la vista)."),
        (7, "Tasa BADLAR bancos privados", TA, "none", "% TNA", 0, {}, "Tasa que pagan los bancos privados por plazos fijos de más de $1 millón a 30-35 días. Referencia del mercado."),
        (12, "Tasa de plazo fijo a 30 días", TA, "none", "% TNA", 0, {}, "Tasa promedio que pagan los bancos a un plazo fijo minorista a 30 días."),
        (44, "Tasa TAMAR bancos privados", TA, "none", "% TNA", 0, {}, "Tasa de plazos fijos mayoristas (más de $1.000 millones). Existe desde 2024."),
        (13, "Tasa de adelantos en cuenta corriente", TA, "none", "% TNA", -1, {}, "Lo que cobran los bancos a empresas por girar en descubierto."),
        (14, "Tasa de préstamos personales", TA, "none", "% TNA", -1, {}, "Tasa promedio de préstamos personales a familias."),
        (29, "Inflación esperada próximos 12 meses (REM)", ["Precios", "Indicadores de inflación"], "none", "%", -1, {},
         "Mediana de lo que esperan los analistas que encuesta el BCRA (Relevamiento de Expectativas de Mercado)."),
        (30, "CER (coeficiente de estabilización de referencia)", ["Precios", "Unidades indexadas"], "idx", "índice 2-2-2002=1", -1, {}, "Coeficiente que sigue al IPC con rezago; ajusta bonos y créditos indexados."),
        (31, "UVA (unidad de valor adquisitivo)", ["Precios", "Unidades indexadas"], "ars", "$", -1, {}, "Unidad que sigue a la inflación (vía CER); se usa en créditos hipotecarios y plazos fijos UVA."),
        (40, "ICL (índice para contratos de locación)", ["Precios", "Unidades indexadas"], "idx", "índice 30-6-2020=1", -1, {}, "Índice de la ley de alquileres de 2020 (mitad inflación, mitad salarios)."),
        (4, "Dólar minorista (promedio vendedor BCRA)", ["Dólar y tipo de cambio"], "fx", "$ por US$", -1, {}, "Dólar oficial en ventanilla de bancos (sin impuestos)."),
        (1187, "Banda cambiaria: límite inferior", ["Dólar y tipo de cambio", "Bandas cambiarias"], "fx", "$ por US$", 0, {}, "Piso de la banda de flotación (desde abr-2025)."),
        (1188, "Banda cambiaria: límite superior", ["Dólar y tipo de cambio", "Bandas cambiarias"], "fx", "$ por US$", 0, {}, "Techo de la banda de flotación (desde abr-2025)."),
    ]
    out = []
    for vid, n, ruta, tipo, u, dr, op, desc in VARS:
        try:
            s = _cacheado(f"bcra_{vid}", lambda vid=vid: _bcra(vid))
        except Exception as e:  # noqa: BLE001
            print(f"  BCRA {vid}: no disponible ({e})")
            continue
        if s.empty:
            continue
        if op.get("suma"):
            out.append(S(f"bcra_{vid}", n, ruta, tipo, u, _mes(s, idx, "sum"), dr, f"BCRA, API de estadísticas (variable {vid})", desc,
                         agg=op.get("agg", False), flujo=True))
        else:
            out.append(S(f"bcra_{vid}", n, ruta, tipo, u, _mes(s, idx), dr, f"BCRA, API de estadísticas (variable {vid})",
                         desc + " Promedio mensual de datos diarios.", _mes(s, idx, "min"), _mes(s, idx, "max"), agg=op.get("agg", False)))
    # Déficit cuasifiscal y pasivos remunerados
    try:
        inter = _cacheado("bcra_55", lambda: _bcra(55))
        cuasi = _mes(inter, idx, "sum")
        out.append(S("bcra_cuasifiscal", "Déficit cuasifiscal del BCRA (intereses de pases, LELIQ y LEFI)", ["Fiscal"], "ars", "millones de $",
                     cuasi, -1, "BCRA, API (variable 55: efecto monetario de intereses de pases y LELIQ)",
                     "Pesos que emitió el BCRA para pagar intereses de sus deudas en pesos (pases, LELIQ, LEFI). Es déficit del Banco Central, fuera del presupuesto. Casi cero desde mediados de 2024, cuando se desarmaron esas deudas. No incluye los intereses de las LEBAC (2002-2017), que el BCRA no publica por separado: en esos años el cuasifiscal real fue mayor.",
                     agg=True, flujo=True))
    except Exception as e:  # noqa: BLE001
        print(f"  BCRA cuasifiscal: {e}")
    try:
        partes = [_cacheado(f"bcra_{v}", lambda v=v: _bcra(v)) for v in (155, 152, 196, 1258)]
        tot = sum(_mes(p, idx).fillna(0) for p in partes)
        tot = tot.where(tot.index >= "2003-01-01")
        out.append(S("bcra_pasivos_rem", "Pasivos remunerados del BCRA (LEBAC, pases, LELIQ, LEFI)", DB, "ars", "millones de $", tot, -1,
                     "BCRA, API (variables 1258, 155, 152 y 196)",
                     "Deuda en pesos del BCRA que paga interés: LEBAC/NOBAC y otras letras, pases pasivos, LELIQ/NOTALQ y LEFI. Las LEFI pasaron al Tesoro en jul-2025.", agg=True))
    except Exception as e:  # noqa: BLE001
        print(f"  BCRA pasivos: {e}")
    return out


def _trim_a_mes(s, idx, repartir=False):
    """Trimestral (fecha = 1er mes) a mensual: repite el valor en los 3 meses, o lo divide por 3 si es un flujo."""
    s = s.dropna()
    m = s.reindex(pd.date_range(s.index.min(), s.index.max() + pd.offsets.MonthBegin(2), freq="MS")).ffill(limit=2)
    return (m / 3 if repartir else m).reindex(idx)


def datos_gob(idx, ipc=None):
    A, E, EX, FI, SA = ["Actividad"], ["Empleo, pobreza e ingresos"], ["Sector externo"], ["Fiscal"], ["Salarios"]
    CN, CO, EM = ["Actividad", "Cuentas nacionales (trimestral)"], ["Actividad", "Consumo e indicadores de demanda"], ["Empleo, pobreza e ingresos", "Empleo registrado (SIPA)"]
    EPH = ["Empleo, pobreza e ingresos", "Mercado de trabajo (EPH, trimestral)"]
    EN = ["Sector externo", "Energía"]
    VARS = [
        # id, nombre, ruta, tipo, unidad, dir, opciones, descripción
        ("143.3_NO_PR_2004_A_31", "EMAE: actividad económica mensual (desestacionalizado)", A, "none", "índice 2004=100", 1, {},
         "Estimador Mensual de Actividad Económica del INDEC: anticipa el PIB mes a mes. Sin estacionalidad."),
        ("3.2_OGP_D_2004_T_17", "PIB real desestacionalizado", CN, "none", "millones de $ de 2004", 1, dict(agg=True),
         "Producto bruto interno a precios de 2004 (ya es real), sin estacionalidad, trimestral."),
        ("4.2_MGCP_2004_T_25", "Consumo privado real", CN, "none", "millones de $ de 2004", 1, dict(agg=True), "Gasto de consumo de los hogares a precios de 2004 (con estacionalidad), trimestral."),
        ("4.2_DGCP_2004_T_30", "Consumo público real", CN, "none", "millones de $ de 2004", 0, dict(agg=True), "Gasto de consumo del Estado a precios de 2004, trimestral."),
        ("4.2_DGIT_2004_T_25", "Inversión real (formación bruta de capital fijo)", CN, "none", "millones de $ de 2004", 1, dict(agg=True), "Inversión en construcción, maquinaria y equipo a precios de 2004, trimestral."),
        ("4.2_DGE_2004_T_26", "Exportaciones reales (cuentas nacionales)", CN, "none", "millones de $ de 2004", 1, dict(agg=True), "Exportaciones de bienes y servicios a precios de 2004."),
        ("4.2_OGI_2004_T_25", "Importaciones reales (cuentas nacionales)", CN, "none", "millones de $ de 2004", 0, dict(agg=True), "Importaciones de bienes y servicios a precios de 2004."),
        ("33.2_ISAC_SIN_EDAD_0_M_23_56", "Actividad de la construcción (ISAC, desest.)", A, "none", "índice 2004=100", 1, {}, "Indicador sintético de la actividad de la construcción (INDEC)."),
        ("453.1_SERIE_DESEADA_0_0_24_58", "Producción industrial manufacturera (IPI, desest.)", A, "none", "índice 2004=100", 1, {}, "Índice de producción industrial manufacturera del INDEC, sin estacionalidad."),
        ("38.3_CEM_1994_M_7", "Despachos de cemento al mercado interno", CO, "none", "miles de toneladas", 1, dict(agg=True), "Asociación de Fabricantes de Cemento Portland. Buen termómetro de la construcción."),
        ("455.1_VENTAS_PRETES_0_M_25_98", "Ventas en supermercados (a precios constantes)", CO, "none", "millones de $ de 2017", 1, dict(agg=True), "Encuesta de supermercados del INDEC, deflactada."),
        ("458.1_VENTAS_TOTTES_ABRI_M_33_40", "Ventas en shoppings (a precios constantes)", CO, "none", "miles de $ de 2017", 1, dict(agg=True), "Encuesta de centros de compras del INDEC, deflactada."),
        # "Producción de autos" (41.3_AA_0_A_23) retirada el 2026-11-13: no es producción en unidades (ronda 100 por mes
        # desde 1994, 2002 igual que 1998, la versión anual corta en 2009) y no coincide con ADEFA. Su id web
        # (dg_41_3_aa_0_a_23) no se reutiliza; un link viejo cae al valor por defecto.
        ("380.3_ICC_NACIONNAL_0_T_12", "Confianza del consumidor (UTDT)", ["Opinión pública (UTDT)"], "none", "puntos (0 a 100)", 1, {}, "Índice de Confianza del Consumidor de la Universidad Di Tella: encuesta mensual sobre la situación personal, la macroeconómica y la intención de comprar durables e inmuebles. Va de 0 a 100; 50 es neutro."),
        ("380.3_DESAGREGACNAL_0_T_43", "Confianza del consumidor: situación personal", ["Opinión pública (UTDT)"], "none", "puntos (0 a 100)", 1, {}, "Subíndice del ICC (UTDT): cómo ve cada encuestado su situación económica personal hoy y dentro de un año."),
        ("380.3_DESAGREGACCRO_0_T_40", "Confianza del consumidor: situación macroeconómica", ["Opinión pública (UTDT)"], "none", "puntos (0 a 100)", 1, {}, "Subíndice del ICC (UTDT): expectativas sobre la economía del país."),
        ("380.3_DESAGREGACLES_0_T_50", "Confianza del consumidor: compra de durables e inmuebles", ["Opinión pública (UTDT)"], "none", "puntos (0 a 100)", 1, {}, "Subíndice del ICC (UTDT): si es buen momento para comprar autos, electrodomésticos o una casa."),
        ("370.3_ICG_NIVEL_RAL_0_0_17_94", "Confianza en el gobierno (UTDT)", ["Opinión pública (UTDT)"], "none", "puntos (0 a 5)", 1, {}, "Índice de Confianza en el Gobierno de la Universidad Di Tella: encuesta mensual que evalúa al gobierno nacional en cinco dimensiones (evaluación general, interés general, eficiencia, honestidad y capacidad). Va de 0 (mínimo) a 5 (máximo)."),
        ("370.3_EVALUACIONRAL_0_0_18_90", "Confianza en el gobierno: evaluación general", ["Opinión pública (UTDT)"], "none", "puntos (0 a 5)", 1, {}, "Componente del ICG (UTDT)."),
        ("370.3_EFICIENCIACIA_0_0_10_66", "Confianza en el gobierno: eficiencia", ["Opinión pública (UTDT)"], "none", "puntos (0 a 5)", 1, {}, "Componente del ICG (UTDT)."),
        ("370.3_HONESTIDADDAD_0_0_10_58", "Confianza en el gobierno: honestidad", ["Opinión pública (UTDT)"], "none", "puntos (0 a 5)", 1, {}, "Componente del ICG (UTDT)."),
        ("370.3_CAPACIDADDAD_0_0_9_83", "Confianza en el gobierno: capacidad", ["Opinión pública (UTDT)"], "none", "puntos (0 a 5)", 1, {}, "Componente del ICG (UTDT)."),
        ("370.3_INTERES_GERAL_0_0_15_61", "Confianza en el gobierno: interés general", ["Opinión pública (UTDT)"], "none", "puntos (0 a 5)", 1, {}, "Componente del ICG (UTDT): si el gobierno gobierna para el interés general o para unos pocos."),
        ("42.3_EPH_PUNTUATAL_0_M_30", "Desocupación", EPH, "none", "% de la PEA", -1, {"x100": True}, "Personas que buscan trabajo y no consiguen, como % de la población activa. EPH, 31 aglomerados, trimestral."),
        ("44.2_ECTET_0_T_30", "Tasa de empleo", EPH, "none", "% de la población", 1, {"x100": True}, "Ocupados como % de la población total. EPH, trimestral."),
        ("43.2_ECTAT_0_T_33", "Tasa de actividad", EPH, "none", "% de la población", 0, {"x100": True}, "Personas que trabajan o buscan trabajo como % de la población. EPH, trimestral."),
        ("52.2_ASDJ_0_0_37", "Informalidad: asalariados sin descuento jubilatorio", EPH, "none", "% de los asalariados", -1, {"x100": True},
         "Asalariados a los que no les hacen aportes jubilatorios (trabajo \"en negro\"). EPH, trimestral."),
        ("151.1_TL_SIN_TAC_2012_M_15", "Trabajadores registrados totales (desest.)", EM, "none", "miles de personas", 1, {}, "Todas las modalidades con aportes: asalariados, monotributistas, autónomos, casas particulares."),
        ("151.1_AARIADOTAC_2012_M_26", "Asalariados registrados del sector privado (desest.)", EM, "none", "miles de personas", 1, {}, "Empleo formal en empresas privadas, sin estacionalidad."),
        ("151.1_AARIADODAD_2012_M_30", "Asalariados registrados del sector público", EM, "none", "miles de personas", 0, {}, "Empleados públicos nacionales, provinciales y municipales juntos (SIPA no los separa)."),
        ("151.1_AARIADODAD_2012_M_45", "Trabajadoras de casas particulares registradas", EM, "none", "miles de personas", 1, {}, "Personal doméstico con aportes."),
        ("151.1_IPENDIEDAD_2012_M_41", "Monotributistas", EM, "none", "miles de personas", 0, {}, "Independientes en el monotributo."),
        ("151.1_IPENDIEDAD_2012_M_39", "Autónomos", EM, "none", "miles de personas", 0, {}, "Independientes en el régimen de autónomos."),
        ("149.1_TL_INDIIOS_OCTU_0_21", "Índice de salarios INDEC: total", SA + ["Índice de salarios (INDEC)"], "idx", "índice oct-2016=100", 1, {},
         "Evolución de los salarios de registrados privados, públicos y no registrados (estos con 5 meses de rezago)."),
        ("149.1_TL_REGIADO_OCTU_0_16", "Índice de salarios INDEC: registrados", SA + ["Índice de salarios (INDEC)"], "idx", "índice oct-2016=100", 1, {}, "Asalariados registrados privados y públicos."),
        ("149.1_SOR_PRIADO_OCTU_0_25", "Índice de salarios INDEC: privados registrados", SA + ["Índice de salarios (INDEC)"], "idx", "índice oct-2016=100", 1, {}, "Asalariados en blanco de empresas privadas."),
        ("149.1_SOR_PUBICO_OCTU_0_14", "Índice de salarios INDEC: sector público", SA + ["Índice de salarios (INDEC)"], "idx", "índice oct-2016=100", 1, {}, "Empleados públicos (nación, provincias y municipios)."),
        ("149.1_SOR_PRIADO_OCTU_0_28", "Índice de salarios INDEC: no registrados (informales)", SA + ["Índice de salarios (INDEC)"], "idx", "índice oct-2016=100", 1, {},
         "Asalariados en negro. Ojo: INDEC lo publica con 5 meses de rezago (el dato de un mes refleja salarios de 5 meses antes)."),
        ("74.3_IET_0_M_16", "Exportaciones de bienes", EX, "usd", "millones de US$", 1, dict(agg=True, flujo=True), "Exportaciones de bienes (INDEC, intercambio comercial argentino)."),
        ("74.3_IIT_0_M_25", "Importaciones de bienes", EX, "usd", "millones de US$", 0, dict(agg=True, flujo=True), "Importaciones de bienes (INDEC)."),
        ("160.2_TL_CUENNTE_0_T_22", "Cuenta corriente del balance de pagos", EX, "usd", "millones de US$", 1, dict(agg=True, flujo=True, trim_flujo=True),
         "Resultado de todo lo que entra y sale con el exterior por bienes, servicios, intereses y utilidades. Trimestral (repartido en los 3 meses)."),
        ("74.2_IECE_0_T_35", "Exportaciones de combustibles y energía", EN, "usd", "millones de US$", 1, dict(agg=True, flujo=True, trim_flujo=True), "Trimestral (repartido en los 3 meses)."),
        ("74.2_IICL_0_T_42", "Importaciones de combustibles y lubricantes", EN, "usd", "millones de US$", -1, dict(agg=True, flujo=True, trim_flujo=True), "Trimestral (repartido en los 3 meses)."),
        ("41.3_GN_0_A_11", "Producción de gas natural", EN, "none", "millones de m³", 1, {}, "Producción mensual de gas natural."),
        ("363.3_PRODUCCIONUDO__28", "Producción de petróleo crudo", EN, "none", "miles de m³", 1, {}, "Producción mensual de petróleo (Secretaría de Energía)."),
        ("172.3_TL_RECAION_M_0_0_17", "Recaudación tributaria total", FI, "ars", "millones de $", 1, dict(agg=True, flujo=True), "Impuestos y aportes recaudados por ARCA (ex AFIP) en el mes."),
        ("379.9_ING_DESPUE017__28_10", "Ingresos totales del sector público nacional", FI, "ars", "millones de $", 1, dict(agg=True, flujo=True), "Base caja. Incluye impuestos, aportes y rentas."),
        ("379.9_GTOS_PRIMA017__39_96", "Gasto primario del sector público nacional", FI, "ars", "millones de $", 0, dict(agg=True, flujo=True), "Todo el gasto menos los intereses de la deuda. Base caja."),
        ("379.9_GTOS_CORR_017__40_84", "Intereses de la deuda pública", FI, "ars", "millones de $", -1, dict(agg=True, flujo=True), "Intereses netos pagados por el sector público nacional."),
        ("379.9_SUPERAVIT_017__23_94", "Resultado primario del sector público nacional", FI, "ars", "millones de $", 1, dict(agg=True, flujo=True),
         "Ingresos menos gasto primario (sin intereses). Positivo = superávit."),
        ("379.9_RESULTADO_017__18_38", "Resultado financiero del sector público nacional", FI, "ars", "millones de $", 1, dict(agg=True, flujo=True),
         "Resultado primario menos intereses de la deuda. Positivo = superávit."),
        ("452.2_ENERGIAGIA_0_T_7_79", "Subsidios económicos a la energía", FI, "ars", "millones de $", 0, dict(agg=True, flujo=True, trim_flujo=True, fuente="Secretaría de Hacienda (Ministerio de Economía) vía datos.gob.ar, serie 452.2_ENERGIAGIA_0_T_7_79"),
         "Plata que el Estado nacional pone para que la luz, el gas y los combustibles cuesten menos de lo que valen (subsidios a la energía), en base caja. Dato trimestral, repartido en los 3 meses."),
        ("313.1_DEUDA_POR_NES_0_T_28", "Deuda de empresas privadas con importadores del exterior", EX, "usd", "millones de US$", 0, dict(agg=True, trim_stock=True, fuente="BCRA vía datos.gob.ar (Subsecretaría de Programación Macroeconómica), serie 313.1_DEUDA_POR_NES_0_T_28"),
         "Lo que las empresas privadas del país debían a proveedores del exterior por importaciones de bienes (deuda comercial), en dólares. Dato trimestral de stock. La serie abierta termina en 2017: después no hay publicación comparable."),
    ]
    extra = ["4.4_OGP_2004_T_17", "4.4_DGCP_2004_T_27", "4.4_DGI_2004_T_19", "9.2_P_2004_T_9"]
    datos = _cacheado_dict("datos_gob", [v[0] for v in VARS] + extra)
    out = []
    for sid, n, ruta, tipo, u, dr, op, desc in VARS:
        if sid not in datos or datos[sid].empty:
            continue
        v = datos[sid]
        if op.get("x100") and v.max() < 1.5:
            v = v * 100
        v = _trim_a_mes(v, idx, repartir=True) if op.get("trim_flujo") else (_trim_a_mes(v, idx) if op.get("trim_stock") else v.reindex(idx))
        out.append(S("dg_" + slug(sid), n, ruta, tipo, u, v, dr, op.get("fuente", f"datos.gob.ar, serie {sid}"), desc, agg=op.get("agg", False), flujo=op.get("flujo", False)))
    get = lambda k: next((o["v"] for o in out if o["id"] == "dg_" + slug(k)), None)  # noqa: E731
    if get("74.3_IET_0_M_16") is not None and get("74.3_IIT_0_M_25") is not None:
        out.append(S("dg_saldo_comercial", "Saldo comercial (exportaciones - importaciones)", EX, "usd", "millones de US$",
                     get("74.3_IET_0_M_16") - get("74.3_IIT_0_M_25"), 1, "datos.gob.ar (cálculo propio)", "Exportaciones menos importaciones de bienes.", agg=True, flujo=True))
    if get("74.2_IECE_0_T_35") is not None and get("74.2_IICL_0_T_42") is not None:
        out.append(S("dg_balanza_energetica", "Balanza comercial energética", EN, "usd", "millones de US$",
                     get("74.2_IECE_0_T_35") - get("74.2_IICL_0_T_42"), 1, "datos.gob.ar (cálculo propio, INDEC)",
                     "Exportaciones menos importaciones de combustibles y energía. Trimestral, repartido en los 3 meses.", agg=True, flujo=True))
    if get("379.9_GTOS_PRIMA017__39_96") is not None and get("379.9_GTOS_CORR_017__40_84") is not None:
        out.append(S("dg_gasto_total", "Gasto total del sector público nacional", FI, "ars", "millones de $",
                     get("379.9_GTOS_PRIMA017__39_96") + get("379.9_GTOS_CORR_017__40_84"), 0, "datos.gob.ar (cálculo propio)",
                     "Gasto primario más intereses. Base caja.", agg=True, flujo=True))
    # PIB nominal: los trimestres vienen anualizados (el promedio de 4 trimestres = PIB del año)
    if "4.4_OGP_2004_T_17" in datos:
        q = datos["4.4_OGP_2004_T_17"].dropna()
        out.append(S("pib_nom", "PIB nominal (a precios corrientes, anualizado)", CN, "ars", "millones de $", _trim_a_mes(q, idx), 0,
                     "INDEC vía datos.gob.ar (4.4_OGP_2004_T_17)",
                     "Producto bruto interno en pesos de cada momento, a ritmo anual. Sirve para ver el PIB en dólares o por habitante.", agg=True))
        anual = q.rolling(4).mean()
        m = _trim_a_mes(anual, idx)
        if ipc is not None and m.notna().any():  # extender con la inflación hasta hoy
            u = m.last_valid_index()
            fut = (m.index > u) & ipc.notna().values
            m[fut] = m[u] * ipc[fut] / ipc[u]
        out.append(S("pib_nom_anual", "PIB nominal de los últimos 12 meses", CN, "ars", "millones de $", m, 0, "INDEC (cálculo propio)",
                     "Promedio de los últimos 4 trimestres anualizados. Es el denominador de los \"% del PIB\". Los meses posteriores al último dato se estiman con la inflación.", agg=False))
        for sid, n in [("4.4_DGCP_2004_T_27", "Consumo privado (% del PIB)"), ("4.4_DGI_2004_T_19", "Inversión (% del PIB)")]:
            if sid in datos:
                r = (datos[sid].rolling(4).mean() / anual * 100).dropna()
                out.append(S("dg_" + slug(sid) + "_pib", n, CN, "none", "% del PIB", _trim_a_mes(r, idx), 1 if "Inv" in n else 0,
                             "INDEC vía datos.gob.ar (cálculo propio)", n + ", a precios corrientes, últimos 4 trimestres."))
    if "9.2_P_2004_T_9" in datos:
        p = datos["9.2_P_2004_T_9"].dropna()
        m = p.reindex(pd.date_range(p.index.min(), idx[-1], freq="MS")).interpolate(limit_area="inside")
        crec = (p.iloc[-1] / p.iloc[-5]) ** (1 / 12)  # crecimiento mensual del último año
        ult = p.index[-1]
        fut = m.index > ult
        m[fut] = p.iloc[-1] * crec ** ((m.index[fut].year - ult.year) * 12 + m.index[fut].month - ult.month)
        out.append(S("poblacion", "Población total", ["Empleo, pobreza e ingresos"], "none", "personas", m.reindex(idx), 0,
                     "INDEC, proyecciones de población vía datos.gob.ar", "Población estimada de Argentina (trimestral, interpolada por mes)."))
    return out


def mercados(idx):
    """Merval y acciones argentinas en Nueva York (Yahoo Finance)."""
    hasta = int(pd.Timestamp.now().timestamp())

    def yahoo(tk):
        d = json.loads(_get(f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(tk)}?interval=1d&period1=631152000&period2={hasta}",
                            headers={"User-Agent": "Mozilla/5.0"}, timeout=120))["chart"]["result"][0]
        s = pd.Series(d["indicators"]["quote"][0]["close"], index=pd.to_datetime(d["timestamp"], unit="s") - pd.Timedelta(hours=5), dtype="float64")
        return s[s > 0].dropna()
    out = []
    lista = [("^MERV", "Índice Merval", ["Mercados"], "ars", "puntos ($)", "S&P Merval: las principales acciones de la Bolsa de Buenos Aires, en pesos. Pasalo a dólares CCL para ver el Merval en dólares.")]
    ACC = ["Mercados", "Acciones argentinas en Nueva York (ADR)"]
    for tk, n in [("YPF", "YPF"), ("GGAL", "Grupo Financiero Galicia"), ("BMA", "Banco Macro"), ("PAM", "Pampa Energía"), ("TGS", "Transportadora de Gas del Sur"),
                  ("TEO", "Telecom Argentina"), ("CEPU", "Central Puerto"), ("LOMA", "Loma Negra"), ("BBAR", "BBVA Argentina"), ("CRESY", "Cresud"),
                  ("SUPV", "Grupo Supervielle"), ("EDN", "Edenor"), ("MELI", "Mercado Libre"), ("GLOB", "Globant")]:
        lista.append((tk, f"{n} (ADR)", ACC, "usd", "US$ por acción", f"Cotización de {n} en Nueva York ({tk}), en dólares."))
    for tk, n, ruta, tipo, u, desc in lista:
        try:
            s = _cacheado("y_" + slug(tk), lambda tk=tk: yahoo(tk))
        except Exception as e:  # noqa: BLE001
            print(f"  Yahoo {tk}: {e}")
            continue
        out.append(S("mk_" + slug(tk), n, ruta, tipo, u, _mes(s, idx), 1, "Yahoo Finance", desc + " Promedio mensual de cierres diarios.",
                     _mes(s, idx, "min"), _mes(s, idx, "max")))
    return out


# Bono previsional para quienes cobran la mínima (ANSES). Meses sin dato verificado = 0.
BONOS = {"2019-12": 5000, "2020-01": 5000, "2020-04": 3000, "2021-04": 1500, "2021-05": 1500, "2021-08": 5000,
         **{f"2022-{m:02d}": 7000 for m in (9, 10, 11)}, "2022-12": 10000, "2023-01": 10000, "2023-02": 10000,
         **{f"2023-{m:02d}": 15000 for m in (3, 4, 5)}, **{f"2023-{m:02d}": 17000 for m in (6, 7, 8)},
         **{f"2023-{m:02d}": 37000 for m in (9, 10, 11)}, "2023-12": 55000, "2024-01": 55000, "2024-02": 55000}


def _bono(idx):
    b = pd.Series(0.0, index=idx)
    for k, v in BONOS.items():
        b[pd.Timestamp(k + "-01")] = v
    b[idx >= pd.Timestamp("2024-03-01")] = 70000
    return b


def _cacheado_dict(nombre, ids):
    from salarios import CACHE
    f = CACHE / f"{nombre}.pkl"
    try:
        viejo = pd.read_pickle(f) if f.exists() else {}
        d = {**{k: v for k, v in viejo.items() if k in ids}, **_series_api(ids)}
        pd.to_pickle(d, f)
        return d
    except Exception as e:  # noqa: BLE001
        print(f"  {nombre}: error al bajar ({e}); uso cache")
        return pd.read_pickle(f) if f.exists() else {}


def indec_social(token, idx):
    out = []
    if token:
        can = _cache_df("indec_canastas", lambda: _indec("valorizacion_canastas_cba_cbt", token,
              "clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida"))
        pob = _cache_df("indec_pobreza", lambda: _indec("pobreza_eph", token, "area_geografica_nom,periodo"))
    else:
        can = _cache_df("indec_canastas", lambda: (_ for _ in ()).throw(RuntimeError("sin token")))
        pob = _cache_df("indec_pobreza", lambda: (_ for _ in ()).throw(RuntimeError("sin token")))
    if not can.empty:
        can["fecha"] = pd.to_datetime(can["periodo"].astype(str).str[:6], format="%Y%m")
        # La tabla trae, con el mismo código, el valor en pesos y sus variaciones en %: solo sirven los pesos.
        can = can[can["unidad_de_medida"] == "Pesos argentinos"]
        _controlar_canastas(can)
        for cod, n in [("CBA", "Canasta básica alimentaria (adulto equivalente)"), ("CBT", "Canasta básica total (adulto equivalente)"),
                       ("CBA H2", "Canasta básica alimentaria, hogar de 4"), ("CBT H2", "Canasta básica total, hogar de 4 (línea de pobreza)")]:
            g = can[can["codigo"] == cod]
            if g.empty:
                continue
            out.append(S("can_" + slug(cod), n, ["Empleo, pobreza e ingresos", "Canastas básicas (GBA)"], "ars", "$ por mes",
                         g.groupby("fecha")["valor"].mean().reindex(idx), -1, "INDEC, API valorizacion_canastas_cba_cbt",
                         n + ", Gran Buenos Aires."))
    if not pob.empty:
        p = pob[pob["area_geografica_nom"] == "T_31_A"].copy()  # total 31 aglomerados
        p["fecha"] = pd.to_datetime(p["anio"].astype(int).astype(str) + "-" + p["semestre"].map({1: "01", 2: "07"}) + "-01")
        for col, n in [("tasa_pobreza_personas", "Pobreza (% de personas)"), ("tasa_indigencia_personas", "Indigencia (% de personas)"),
                       ("tasa_pobreza_hogares", "Pobreza (% de hogares)"), ("tasa_indigencia_hogares", "Indigencia (% de hogares)")]:
            out.append(S("pob_" + col, n, ["Empleo, pobreza e ingresos", "Pobreza (EPH, semestral)"], "none", "%",
                         p.set_index("fecha")[col].astype(float).reindex(idx), -1, "INDEC, API pobreza_eph",
                         n + ", total 31 aglomerados urbanos. Dato semestral (se ubica en enero y julio)."))
    return out


def propias(m):
    """Series que ya armamos antes (salarios, dólares, mercados, soja, IPC empalmado)."""
    idx = m.index
    F = {"oficial": "oficial (A3500)", "blue": "blue", "mep": "MEP", "ccl": "CCL"}
    out = [
        S("sipa_prom", "Salario SIPA promedio", ["Salarios"], "ars", "$ por mes", m["sipa_prom_con"], 1, "Sec. de Trabajo (SIPA) vía datos.gob.ar",
          "Remuneración bruta promedio de asalariados registrados del sector privado, con aguinaldo prorrateado."),
        S("sipa_med", "Salario SIPA mediana", ["Salarios"], "ars", "$ por mes", m["sipa_med_con"], 1, "Sec. de Trabajo (SIPA) vía datos.gob.ar",
          "Remuneración bruta mediana de asalariados registrados del sector privado, con aguinaldo prorrateado."),
        S("ripte", "RIPTE", ["Salarios"], "ars", "$ por mes", m["ripte_con"], 1, "Sec. de Trabajo vía datos.gob.ar",
          "Remuneración imponible promedio de trabajadores estables (sin aguinaldo en la fuente; acá × 13/12)."),
        S("smvm", "Salario mínimo, vital y móvil", ["Salarios"], "ars", "$ por mes", m["smvm_con"], 1, "Consejo del Salario vía datos.gob.ar",
          "Salario mínimo mensual (× 13/12 por aguinaldo)."),
        S("jub_min", "Jubilación mínima", ["Salarios"], "ars", "$ por mes", m["jub_min_con"], 1, "ANSES vía datos.gob.ar",
          "Haber mínimo jubilatorio de ANSES, sin el bono (× 13/12 por aguinaldo)."),
        S("jub_min_bono", "Jubilación mínima con bono", ["Salarios"], "ars", "$ por mes", m["jub_min_con"] + _bono(idx).where(m["jub_min_con"].notna()), 1,
          "ANSES vía datos.gob.ar + decretos del bono",
          "Haber mínimo (× 13/12 por aguinaldo) más el bono previsional que cobra quien gana la mínima (el bono no tiene aguinaldo). "
          "Bonos: $5.000 dic-19/ene-20, $3.000 abr-20, $1.500 abr/may-21, $5.000 ago-21, mensuales desde sep-22 ($7.000 a $55.000) y $70.000 fijos desde mar-24. "
          "Puede faltar algún bono suelto de 2020-2022."),
        S("ipc_empalme", "IPC empalmado (nivel)", ["Precios", "Indicadores de inflación"], "idx", "índice", m["ipc_ar"], -1,
          FUENTE_IPC, "Índice de precios de largo plazo usado para pasar a pesos reales (ver Fuentes)."),
        S("inflacion", "Inflación mensual", ["Precios", "Indicadores de inflación"], "none", "%", (m["ipc_ar"] / m["ipc_ar"].shift(1) - 1) * 100, -1,
          FUENTE_IPC, "Variación mensual del IPC empalmado."),
        S("inflacion_ia", "Inflación interanual", ["Precios", "Indicadores de inflación"], "none", "%", (m["ipc_ar"] / m["ipc_ar"].shift(12) - 1) * 100, -1,
          FUENTE_IPC, "Variación contra el mismo mes del año anterior."),
        S("cpi_usa", "Inflación de EEUU (CPI-U, nivel)", ["Precios", "Indicadores de inflación"], "none", "índice 1982-84=100", m["cpi_us"], -1,
          "Bureau of Labor Statistics", "Índice de precios al consumidor de EEUU."),
        S("riesgo", "Riesgo país (EMBI)", ["Mercados"], "none", "puntos básicos", m["riesgo"], -1, "argentinadatos.com",
          "Diferencial de tasa de los bonos argentinos contra los del Tesoro de EEUU.", m["riesgo_min"], m["riesgo_max"]),
        S("tcrm", "Tipo de cambio real multilateral", ["Dólar y tipo de cambio"], "none", "índice 17-12-2015=100", m["tcrm"], 0, "BCRA",
          "Más alto = peso más barato frente a los socios comerciales.", m["tcrm_min"], m["tcrm_max"]),
        S("soja_chi", "Soja en Chicago (CBOT)", ["Sector externo", "Soja"], "usd", "US$ por tonelada", m["soja_chi"], 1, "CBOT vía Yahoo Finance",
          "Futuro de soja primer vencimiento, convertido a US$/tn.", m["soja_chi_min"], m["soja_chi_max"]),
        S("soja_ros", "Soja en Rosario (pizarra)", ["Sector externo", "Soja"], "ars", "$ por tonelada", m["soja_ros"], 1, "Bolsa de Comercio de Rosario",
          "Precio pizarra de la Cámara Arbitral de Rosario.", m["soja_ros_min"], m["soja_ros_max"]),
    ]
    # Fuente de cada dólar, con el organismo o el sitio que publica la cotización (el detalle de los empalmes está en Fuentes).
    fuente_fx = {"oficial": "BCRA (tipo de cambio mayorista, Com. A 3500)", "blue": "Ámbito y Bluelytics (cotización informal)",
                 "mep": "argentinadatos.com (dólar MEP)", "ccl": "argentinadatos.com (contado con liquidación)"}
    for k, n in F.items():
        out.append(S(f"fx_{k}", f"Dólar {n}", ["Dólar y tipo de cambio"], "fx", "$ por US$", m[f"fx_{k}"], -1, fuente_fx.get(k, "ver Fuentes"),
                     f"Cotización del dólar {n}, promedio mensual.", m[f"fx_{k}_min"], m[f"fx_{k}_max"]))
        if k != "oficial":
            out.append(S(f"brecha_{k}", f"Brecha {n} / oficial", ["Dólar y tipo de cambio", "Brechas"], "none", "%",
                         (m[f"fx_{k}"] / m["fx_oficial"] - 1) * 100, -1,
                         f"Cálculo propio con {fuente_fx.get(k, 'el dólar ' + n)} y {fuente_fx['oficial']}", f"Cuánto más caro está el dólar {n} que el oficial."))
        out.append(S(f"soja_ratio_{k}", f"Soja: Rosario / Chicago (al {n})", ["Sector externo", "Soja"], "none", "%",
                     m["soja_ros"] / m[f"fx_{k}"] / m["soja_chi"] * 100, 1,
                     f"Cálculo propio con Bolsa de Comercio de Rosario, CBOT vía Yahoo Finance y {fuente_fx.get(k, 'el dólar ' + n)}",
                     f"Precio en Rosario pasado a dólares al {n}, como % del precio en Chicago."))
    return out


def construir(m: pd.DataFrame, token: str | None):
    idx = m.index
    print("Catálogo: armando series...")
    series = propias(m)
    for nombre, f in [("IPC INDEC", lambda: ipc_indec(token, idx)), ("BCRA", lambda: bcra(idx)),
                      ("datos.gob.ar", lambda: datos_gob(idx, m["ipc_ar"])), ("INDEC social", lambda: indec_social(token, idx)),
                      ("Mercados", lambda: mercados(idx))]:
        try:
            nuevas = f()
            print(f"  {nombre}: {len(nuevas)} series")
            series += nuevas
        except Exception as e:  # noqa: BLE001
            print(f"  {nombre}: error ({e})")
    # ids únicos
    vistos = set()
    for s in series:
        while s["id"] in vistos:
            s["id"] += "_b"
        vistos.add(s["id"])
    return series


def a_json(series, idx):
    """Formato compacto: cada serie guarda desde qué mes empieza (i0) y sus valores."""
    fechas = [f.strftime("%Y-%m") for f in idx]

    def comp(v):
        v = v.reindex(idx)
        if v.notna().sum() == 0:
            return None, []
        a, b = idx.get_loc(v.first_valid_index()), idx.get_loc(v.last_valid_index())
        vals = [None if pd.isna(x) else float(f"{x:.6g}") for x in v.iloc[a:b + 1]]
        return a, vals

    out = []
    for s in series:
        i0, vals = comp(s["v"])
        if i0 is None:
            continue
        d = {k: s[k] for k in ("id", "n", "cat", "tipo", "u", "dir", "fuente", "desc")}
        for k in ("agg", "flujo"):
            if s.get(k):
                d[k] = 1
        d["i0"], d["v"] = i0, vals
        if "min" in s:
            for k in ("min", "max"):
                j0, vv = comp(s[k])
                if j0 is not None:
                    d[k] = {"i0": j0, "v": vv}
        out.append(d)
    return {"fechas": fechas, "series": out}
