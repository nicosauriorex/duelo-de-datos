// Herencia: cómo estaba cada variable cuando asumió cada presidente ("Recibió") y cómo la dejó ("Entregó", o "Hoy" si está en funciones).
// Ver docs/specs/herencia.md (fase 1). Todos los cálculos de la sección están acá; la página y la imagen solo dibujan lo que sale de este archivo.
//
// - La herencia es por definición el dato al traspaso: siempre T-1 (último mes del antecesor), sin mirar la configuración de inicio de mandato.
// - "Recibió" = el último dato en o antes de T-1: es el cierre (`fin` de `statsMandato`) del mandato del antecesor.
//   "Entregó" = el último dato en o antes del último mes del mandato: el cierre de `statsMandato` del propio mandato.
// - Un dato con más de `MAX_ATRASO` meses de antigüedad respecto del traspaso no cuenta como recibido ni entregado (una serie que se dejó
//   de publicar no "se entrega" años después): la celda dice "sin dato" y por qué.
// - Las cuentas se hacen con los valores tal como se muestran (`m.fmtC`), así el cambio cierra a la vista.
// - Palabras neutras (D-012): recibió, entregó, cambio. Sin calificar la herencia.
import { claseVariacion, crearPres, statsMandato, type BaseCfg, type Pres } from "./estadisticas";
import { fmtMes, ok, r1, valorMostrado } from "./formato";
import { hrefDato } from "./temas";
import { NOMBRES } from "./nombres";
import type { Calculo, Expr, Motor, SerieMeta } from "./motor";

/** Inicio fijo de la herencia: T-1 para todos, sin excepciones (no depende de la configuración). */
export const BASE_HERENCIA: BaseCfg = { t0: -1, t0p: {} };
/** Antigüedad máxima (en meses) del dato respecto del mes del traspaso para contarlo como recibido o entregado. */
export const MAX_ATRASO = 12;

export const GRUPOS_HERENCIA = ["Banco Central", "Dólar", "Cuentas públicas", "Precios", "Deuda y sector externo", "Social"] as const;
export type GrupoHerencia = (typeof GRUPOS_HERENCIA)[number];

/** Medida candidata: la primera que la serie admite es la que se usa (las series nuevas pueden llegar con otro tipo). */
interface Medida { med: string; esc?: string }
/** Una fila de la tabla. `medidas` en orden de preferencia. `cociente`: la fila es id / cociente × 100 (en pesos corrientes de cada mes).
 *  `neutra`: dirección ambigua, sin color. `nombre`: si falta, el nombre público de la serie (nombres.ts). */
export interface DefFila {
  clave: string; grupo: GrupoHerencia; id: string; medidas: Medida[]; nombre?: string; cociente?: { id: string; nombre: string; unidad: string };
  neutra?: boolean; nota?: string;
  /** Llevar la serie a 100 en su primer mes con dato (para índices relativos, que en "real" quedan en puntos de hoy). */
  base100?: { unidad: string };
}

// Las expresiones son las de los datos fijos (lib/datos-fijos.ts) cuando el dato ya es fijo, para que coincidan con el resto del sitio.
export const FILAS_HERENCIA: DefFila[] = [
  // Banco Central
  { clave: "reservas", grupo: "Banco Central", id: "bcra_1", medidas: [{ med: "usdr" }], nombre: "Reservas brutas" },
  { clave: "pasivos", grupo: "Banco Central", id: "bcra_pasivos_rem", medidas: [{ med: "real" }], nombre: "Pasivos remunerados del Banco Central", neutra: true,
    nota: "Letras y pases por los que el Banco Central paga interés (Lebac, pases, Leliq, Lefi). Más o menos pasivos no se califica: sin color." },
  {
    clave: "pasivos_base", grupo: "Banco Central", id: "bcra_pasivos_rem", medidas: [{ med: "corr" }], nombre: "Pasivos remunerados / base monetaria", neutra: true, nota: "Cuenta propia: pasivos remunerados dividido la base monetaria, en pesos de cada mes.",
    cociente: { id: "bcra_15", nombre: "base monetaria", unidad: "% de la base monetaria" },
  },
  {
    clave: "cuasifiscal", grupo: "Banco Central", id: "bcra_cuasifiscal", medidas: [{ med: "real", esc: "pib" }, { med: "real" }],
    nota: "No incluye los intereses de las Lebac (2002 a 2017).",
  },
  // Dólar
  { clave: "brecha", grupo: "Dólar", id: "brecha_blue", medidas: [{ med: "asis" }], nombre: "Brecha con el dólar blue" },
  { clave: "oficial", grupo: "Dólar", id: "fx_oficial", medidas: [{ med: "real" }] },
  { clave: "tcrm", grupo: "Dólar", id: "tcrm", medidas: [{ med: "asis" }], neutra: true },
  // Cuentas públicas
  { clave: "primario", grupo: "Cuentas públicas", id: "dg_379_9_superavit_017_23_94", medidas: [{ med: "real", esc: "pib" }] },
  { clave: "financiero", grupo: "Cuentas públicas", id: "dg_379_9_resultado_017_18_38", medidas: [{ med: "real", esc: "pib" }] },
  { clave: "subsidios", grupo: "Cuentas públicas", id: "dg_452_2_energiagia_0_t_7_79", medidas: [{ med: "real", esc: "pib" }, { med: "real" }, { med: "usdr" }], nota: "Serie desde 2016." },
  // Precios
  { clave: "inflacion12", grupo: "Precios", id: "ipc_empalme", medidas: [{ med: "via" }], nombre: "Inflación de los últimos 12 meses" },
  { clave: "inflacion1", grupo: "Precios", id: "ipc_empalme", medidas: [{ med: "vm" }], nombre: "Inflación del último mes" },
  {
    clave: "regulados", grupo: "Precios", id: "ipc_nacional_r_estaci", medidas: [{ med: "real" }], nombre: "Precios regulados contra el nivel general", neutra: true,
    base100: { unidad: "índice, dic-16 = 100 (regulados / nivel general)" },
    nota: "Índice de precios regulados (tarifas, combustibles, transporte) dividido por el índice general: si sube, los regulados aumentaron más que el resto. Serie desde 2017.",
  },
  // Deuda y sector externo
  { clave: "riesgo", grupo: "Deuda y sector externo", id: "riesgo", medidas: [{ med: "asis" }] },
  { clave: "cuenta_corriente", grupo: "Deuda y sector externo", id: "dg_160_2_tl_cuennte_0_t_22", medidas: [{ med: "corr", esc: "pib" }] },
  {
    clave: "importadores", grupo: "Deuda y sector externo", id: "dg_313_1_deuda_por_nes_0_t_28", medidas: [{ med: "usdr" }, { med: "real" }], nombre: "Deuda con importadores",
    nota: "La serie abierta va de 2001 a 2017. Desde 2017 el dato sale de los informes de deuda externa privada del Banco Central (fila “Deuda comercial de importadores (informes)”), con otro relevamiento: no se empalman.",
  },
  // Social
  { clave: "pobreza", grupo: "Social", id: "pob_tasa_pobreza_personas", medidas: [{ med: "asis" }] },
  { clave: "indigencia", grupo: "Social", id: "pob_tasa_indigencia_personas", medidas: [{ med: "asis" }] },
  { clave: "desocupacion", grupo: "Social", id: "dg_42_3_eph_puntuatal_0_m_30", medidas: [{ med: "asis" }] },
  { clave: "salario", grupo: "Social", id: "sipa_med", medidas: [{ med: "real" }], nombre: "Salario real (mediano, registrados)" },
];

/** Ids de series que necesita la sección (para pedir sus archivos). */
export const idsHerencia = (): string[] => [...new Set(FILAS_HERENCIA.flatMap((f) => (f.cociente ? [f.id, f.cociente.id] : [f.id])))];
export const defPorClave = (clave: string | null | undefined): DefFila | null => FILAS_HERENCIA.find((f) => f.clave === clave) ?? null;

/** La expresión de una fila: la primera medida que la serie admite. Null si la serie no está en el catálogo cargado. */
export function exprDe(m: Motor, d: DefFila): Expr | null {
  const s: SerieMeta | undefined = m.SER[d.id];
  if (!s || (d.cociente && !m.SER[d.cociente.id])) return null;
  const meds = m.medidasDe(s), escs = m.escPermitidas(s);
  for (const x of d.medidas) {
    if (x.esc && !escs.some((o) => o[0] === x.esc)) continue;
    if (!x.esc && !meds.some((o) => o[0] === x.med)) continue;
    return { id: d.id, med: x.med, rel: null, modo: "compra", esc: x.esc ?? "" };
  }
  return { id: d.id, med: m.medDefault(s), rel: null, modo: "compra", esc: "" };
}

/** El cálculo de una fila (con el cociente propio si lo lleva). */
export function calcDe(m: Motor, d: DefFila, e: Expr): Calculo {
  const c = m.calc(e);
  if (d.base100) {
    const i0 = primerDato(c.v), b0 = i0 >= 0 ? (c.v[i0] as number) : null;
    const v = c.v.map((x) => (ok(x) && ok(b0) && b0 !== 0 ? (x / b0) * 100 : null));
    return { ...c, v, lo: undefined, hi: undefined, unidad: d.base100.unidad };
  }
  if (!d.cociente) return c;
  const a = m.nominalPesos(m.SER[d.id]), b = m.nominalPesos(m.SER[d.cociente.id]);
  const v = a.map((x, i) => (ok(x) && ok(b[i]) && b[i] !== 0 ? (x / (b[i] as number)) * 100 : null));
  return { ...c, v, lo: undefined, hi: undefined, nombre: d.nombre ?? c.nombre, corto: d.nombre ?? c.corto, unidad: d.cociente.unidad, dir: 0, pct: true };
}

/** Un dato de la tabla: el valor tal como se muestra, su número redondeado como se ve y su mes. */
export interface Punto { i: number; v: number; visto: number; txt: string; mes: string }
const punto = (m: Motor, c: Calculo, v: number, i: number): Punto => {
  const txt = m.fmtC(c, v);
  return { i, v, visto: c.pct ? r1(v) : valorMostrado(txt) ?? v, txt, mes: fmtMes(m.F[i]) };
};
const primerDato = (v: ArrayLike<number | null>): number => { for (let i = 0; i < v.length; i++) if (ok(v[i])) return i; return -1; };
const ultimoDato = (v: ArrayLike<number | null>): number => { for (let i = v.length - 1; i >= 0; i--) if (ok(v[i])) return i; return -1; };

/** Por qué no hay dato en el mes `ref` (T-1 o el cierre del mandato): la serie empieza después, terminó antes, o hay un hueco. */
function motivoSinDato(F: string[], v: ArrayLike<number | null>, ref: number): string {
  const a = primerDato(v), z = ultimoDato(v);
  if (a < 0) return "sin datos en la serie";
  if (ref < a) return `la serie empieza en ${fmtMes(F[a])}`;
  if (z < ref - MAX_ATRASO) return `la serie termina en ${fmtMes(F[z])}`;
  return "no hay dato cerca de esa fecha";
}

/** Índice del mes de asunción (T) de un presidente; -1 si es anterior al primer mes de datos. */
export const mesAsuncion = (F: string[], p: Pres): number => F.indexOf(p.ini);

/** Lo que recibió el presidente `k`: el cierre del mandato del antecesor (último dato en o antes de T-1). */
export function recibio(m: Motor, c: Calculo, PRES: Pres[], k: number): { p: Punto | null; motivo: string } {
  const F = m.F, t = mesAsuncion(F, PRES[k]), ant = PRES[k - 1];
  if (t <= 0 || !ant) {
    const a = primerDato(c.v);
    return { p: null, motivo: a < 0 ? "sin datos en la serie" : `la serie empieza en ${fmtMes(F[a])}` };
  }
  const st = statsMandato(F, c.v, ant, BASE_HERENCIA);
  if (st.n && st.finI != null && st.finI >= t - 1 - MAX_ATRASO) return { p: punto(m, c, st.fin as number, st.finI), motivo: "" };
  // mandato corto sin dato propio (series trimestrales o semestrales): el último dato anterior, si no pasa del tope de atraso
  for (let i = Math.min(ant.i0 - 1, t - 1); i >= Math.max(0, t - 1 - MAX_ATRASO); i--) if (ok(c.v[i])) return { p: punto(m, c, c.v[i] as number, i), motivo: "" };
  return { p: null, motivo: motivoSinDato(F, c.v, t - 1) };
}

/** Lo que entregó (o tiene hoy) el presidente `k`: el cierre de su mandato (último dato en o antes del último mes). */
export function entrego(m: Motor, c: Calculo, PRES: Pres[], k: number): { p: Punto | null; motivo: string } {
  const F = m.F, p = PRES[k], st = statsMandato(F, c.v, p, BASE_HERENCIA);
  const ref = Math.min(p.i1, F.length - 1);
  if (st.n && st.finI != null && st.finI >= ref - MAX_ATRASO) return { p: punto(m, c, st.fin as number, st.finI), motivo: "" };
  return { p: null, motivo: motivoSinDato(F, c.v, ref) };
}

const menos = (t: string) => t.replace(/^-/, "−");
/** Cambio entre dos datos, con los valores como se muestran (en puntos si el dato es un porcentaje; si no, en %). */
export function cambio(m: Motor, c: Calculo, a: Punto | null, b: Punto | null, neutra: boolean): { txt: string; abs: string; cls: "bueno" | "malo" | "neutro" } {
  if (!a || !b) return { txt: "–", abs: "", cls: "neutro" };
  const txt = menos(m.variacionTxt(c, a.visto, b.visto));
  return { txt, abs: a.visto === b.visto ? "" : m.difAbsTxt(c, a.visto, b.visto), cls: neutra ? "neutro" : claseVariacion(c.dir, c.pct, a.visto, b.visto) };
}

/** Una fila armada para un presidente. */
export interface FilaHerencia {
  def: DefFila; grupo: GrupoHerencia; nombre: string; unidad: string; expr: Expr | null; c: Calculo | null; href: string | null;
  recibio: Punto | null; sinRecibio: string; entrego: Punto | null; sinEntrego: string;
  cambio: string; cambioAbs: string; cls: "bueno" | "malo" | "neutro";
}
export interface TablaHerencia { pres: Pres; k: number; enCurso: boolean; mesT1: string | null; filas: FilaHerencia[] }

/** Nombre de una fila sin datos cargados (la serie todavía no está en el catálogo). */
const nombreSinSerie = (d: DefFila): string => d.nombre ?? NOMBRES[d.id] ?? d.id;

/** La tabla de un presidente: una fila por variable, en el orden de `FILAS_HERENCIA`. */
export function tablaHerencia(m: Motor, presId: string): TablaHerencia | null {
  const PRES = crearPres(m.F), k = PRES.findIndex((x) => x.id === presId);
  if (k < 0) return null;
  const p = PRES[k], t = mesAsuncion(m.F, p);
  const filas = FILAS_HERENCIA.map((d): FilaHerencia => {
    const e = exprDe(m, d);
    if (!e) return { def: d, grupo: d.grupo, nombre: nombreSinSerie(d), unidad: "", expr: null, c: null, href: null, recibio: null, sinRecibio: "la serie todavía no está cargada", entrego: null, sinEntrego: "la serie todavía no está cargada", cambio: "–", cambioAbs: "", cls: "neutro" };
    const c = calcDe(m, d, e), r = recibio(m, c, PRES, k), en = entrego(m, c, PRES, k), cb = cambio(m, c, r.p, en.p, !!d.neutra);
    return {
      def: d, grupo: d.grupo, nombre: d.nombre ?? c.corto, unidad: c.unidad, expr: e, c, href: d.cociente || d.base100 ? null : hrefDato(e, { pd: p.id }),
      recibio: r.p, sinRecibio: r.motivo, entrego: en.p, sinEntrego: en.motivo, cambio: cb.txt, cambioAbs: cb.abs, cls: cb.cls,
    };
  });
  return { pres: p, k, enCurso: p.i1 >= m.F.length - 1, mesT1: t > 0 ? fmtMes(m.F[t - 1]) : null, filas };
}

/** Una fila de "Todos los traspasos": quién entregó, quién recibió, el mes del traspaso y el valor recibido. */
export interface Traspaso { de: Pres; a: Pres; mes: string; dato: Punto | null; motivo: string }
export interface VistaTraspasos { def: DefFila; nombre: string; unidad: string; expr: Expr | null; href: string | null; filas: Traspaso[]; hoy: { p: Pres; dato: Punto | null; motivo: string } }

/** Una variable en todos los traspasos (la misma información de la tabla por presidente, girada). */
export function traspasos(m: Motor, clave: string): VistaTraspasos | null {
  const d = defPorClave(clave);
  if (!d) return null;
  const PRES = crearPres(m.F), e = exprDe(m, d);
  if (!e) {
    return { def: d, nombre: nombreSinSerie(d), unidad: "", expr: null, href: null, filas: [],
      hoy: { p: PRES[PRES.length - 1], dato: null, motivo: "la serie todavía no está cargada" } };
  }
  const c = calcDe(m, d, e);
  const filas: Traspaso[] = [];
  for (let k = 1; k < PRES.length; k++) {
    const t = mesAsuncion(m.F, PRES[k]);
    if (t <= 0) continue;
    const r = recibio(m, c, PRES, k);
    filas.push({ de: PRES[k - 1], a: PRES[k], mes: fmtMes(m.F[t]), dato: r.p, motivo: r.motivo });
  }
  const ult = PRES.length - 1, hoy = entrego(m, c, PRES, ult);
  return { def: d, nombre: d.nombre ?? c.corto, unidad: c.unidad, expr: e, href: d.cociente || d.base100 ? null : hrefDato(e), filas, hoy: { p: PRES[ult], dato: hoy.p, motivo: hoy.motivo } };
}

// ---------------------------------------------------------------- lo que no se puede medir y lo que falta cargar (al pie de la página)
/** Lista C de la spec: sin dato oficial. */
export const NO_MEDIBLE: [string, string][] = [
  ["Reservas netas", "No hay serie oficial: solo aparecen en documentos del FMI y en estimaciones privadas; el swap con China y los encajes en dólares no están en las series abiertas del Banco Central."],
  ["Importaciones pendientes de pago (SIRA)", "No hay un dato oficial del total de permisos pendientes."],
  ["Opciones de venta de los bancos (puts)", "No hay un dato oficial del total."],
  ["Dividendos retenidos de empresas", "No hay un dato oficial."],
  ["Cuánto del costo cubren las tarifas", "Solo hay estimaciones privadas; lo medible es cómo se movieron los precios regulados contra el resto (fila de Precios)."],
  ["Precios congelados", "Solo se conocen las fechas de los programas, no un indicador mensual."],
];
/** Lista B de la spec: dato oficial que está en un informe (se carga a mano, con su cita; lib/herencia-informes.ts).
 *  El tercer elemento son las claves de `FILAS_INFORME` que lo cubren: un ítem sale de la lista cuando todas tienen algún dato cargado. */
export const FALTA_CARGAR: [string, string, string[]][] = [
  ["Deuda pública (bruta, en % del PIB y parte en moneda extranjera)", "Informes de la Secretaría de Finanzas.", ["deuda_bruta_usd", "deuda_bruta_pib", "deuda_moneda_ext"]],
  ["Deuda con el FMI y estado del acuerdo vigente", "Documentos del FMI de cada acuerdo (2018, 2022 y 2025).", ["fmi_deuda", "fmi_acuerdo"]],
  ["Deuda con importadores después de 2017", "Informes del Banco Central sobre deuda externa privada.", ["deuda_importadores"]],
  ["Bonos del Banco Central para importadores (BOPREAL)", "Resultados de las licitaciones del Banco Central.", ["bopreal"]],
  ["Restricciones para comprar dólares vigentes al asumir", "Comunicaciones del Banco Central con la fecha de cada cambio.", ["cepo"]],
];

// ---------------------------------------------------------------- vista previa en redes
/** Título y descripción de la vista previa de /herencia/ (presidente en funciones). */
export function textosPreviaHerencia(t: TablaHerencia): { titulo: string; descripcion: string } {
  const n = t.filas.filter((f) => f.recibio && f.entrego).length;
  return {
    titulo: `Herencia: lo que recibió ${t.pres.n}${t.mesT1 ? ` (${t.mesT1})` : ""} y el último dato`,
    descripcion: `${n} datos oficiales, al asumir y ${t.enCurso ? "hoy" : "al entregar"}: reservas, dólar, cuentas públicas, inflación, deuda, pobreza y salario. Y lo mismo para cada traspaso presidencial, desde que hay datos.`,
  };
}
