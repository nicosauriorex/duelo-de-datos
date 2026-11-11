// Cómo se lee Histórico desde la URL: parámetros de cada gráfico y del período. Lo usan la sección y la imagen de compartir.
import { desdePreferido, type DesdePref } from "./config";
import { nf0, nf1, ok } from "./formato";
import type { Expr, Motor } from "./motor";
import { decExpr, lista as listaUrl, unoDe } from "./url";

export const TODOS_MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const REFS_VALIDAS = ["ult", "prom", "med", "max", "min", "mk_ult", "mk_max", "mk_min"];
export const REFS_DEF = "ult,prom,med,mk_ult,mk_max,mk_min";
export const MAX_MISMA_UNIDAD = 4; // en modo valor: hasta 4 variables si todas tienen la misma unidad (si no, 2)

/** Parámetros de cada gráfico. El 1.º usa estos nombres; del 2.º al 4.º llevan el número al final (`v2`, `m2`… `t4`). */
export const PG = ["v", "m", "e", "bd", "ej", "r", "t", "pf"] as const;
export const MAX_GRAFICOS = 4;
export const sfx = (k: number) => (k === 0 ? "" : String(k + 1));

export type Comun = {
  F: string[]; ult: string; desde: string; hasta: string; meses: Set<number>; freq: "M" | "T" | "A"; ag: "promedio" | "cierre";
};
export type GEst = {
  modo: "valor" | "b100"; exprs: Expr[]; todas: Expr[]; escala: "lin" | "log"; banda: "no" | "si"; eje: "propia" | "misma"; refs: Set<string>; tabla: "grafico" | "tabla"; pf: "1" | "0" | "";
};

/** Lee un gráfico de la URL. `null` = ese gráfico no está en el link (el 1.º arranca con `def`; sin `def` y sin variables también da null). */
export function leerGrafico(p: URLSearchParams, k: number, existe: (id: string) => boolean, def: Expr | null): GEst | null {
  const s = sfx(k);
  let exprs = listaUrl(p.get("v" + s)).map((x) => decExpr(x, existe)).filter(Boolean) as Expr[];
  if (!exprs.length) { if (k > 0 || !def) return null; exprs = [def]; }
  const modo = unoDe(p.get("m" + s), ["valor", "b100"] as const, "valor");
  return {
    modo, exprs: modo === "b100" ? exprs.slice(0, 10) : exprs.slice(0, MAX_MISMA_UNIDAD), todas: exprs,
    escala: unoDe(p.get("e" + s), ["lin", "log"] as const, "lin"), banda: unoDe(p.get("bd" + s), ["no", "si"] as const, "no"), eje: unoDe(p.get("ej" + s), ["propia", "misma"] as const, "propia"),
    refs: new Set(listaUrl(p.has("r" + s) ? p.get("r" + s) : REFS_DEF).filter((x) => REFS_VALIDAS.includes(x))),
    tabla: unoDe(p.get("t" + s), ["grafico", "tabla"] as const, "grafico"),
    pf: unoDe(p.get("pf" + s), ["1", "0"] as const, "" as "1" | "0" | ""),
  };
}

/** Período, meses y frecuencia (comunes a todos los gráficos). */
export function leerComun(p: URLSearchParams, F: string[], desdeCfg: DesdePref): Comun {
  const ult = F[F.length - 1];
  let desde = /^\d{4}-\d{2}$/.test(p.get("d") || "") ? (p.get("d") as string) : desdePreferido(desdeCfg, F);
  let hasta = /^\d{4}-\d{2}$/.test(p.get("h") || "") ? (p.get("h") as string) : ult;
  desde = desde < F[0] ? F[0] : desde > ult ? ult : desde;
  hasta = hasta > ult ? ult : hasta < F[0] ? F[0] : hasta;
  if (desde > hasta) desde = hasta; // rango inválido: se corrige al más cercano
  const ms = new Set(listaUrl(p.get("ms")).map(Number).filter((n) => n >= 1 && n <= 12));
  return {
    F, ult, desde, hasta,
    meses: ms.size ? ms : new Set(TODOS_MESES),
    freq: unoDe(p.get("f"), ["M", "T", "A"] as const, "M"), ag: unoDe(p.get("ag"), ["promedio", "cierre"] as const, "promedio"),
  };
}

/** Las variables que entran en un gráfico: en modo valor, 2, o hasta 4 si todas tienen la misma unidad (con la medida aplicada). */
export function exprsUsadas(m: Motor, g: Pick<GEst, "modo" | "exprs">): Expr[] {
  if (g.modo === "b100" || g.exprs.length <= 2) return g.exprs;
  const cargadas = g.exprs.every((e) => m.SER[e.id] && (!e.rel || m.SER[e.rel]));
  const igual = cargadas && new Set(g.exprs.map((e) => m.calc(e).unidad)).size === 1;
  return igual ? g.exprs : g.exprs.slice(0, 2);
}

const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export type FrecOrigen = "M" | "T" | "S" | "A";
const PLURAL_ORIGEN: Record<FrecOrigen, string> = { M: "mensuales", T: "trimestrales", S: "semestrales", A: "anuales" };
/** Cada cuántos meses trae datos la serie original (mensual, trimestral, semestral, anual), por la separación típica de sus últimos datos. */
export function frecuenciaOrigen(vals: (number | null)[]): FrecOrigen {
  const pos: number[] = [];
  vals.forEach((v, i) => { if (v != null && Number.isFinite(v)) pos.push(i); });
  const ult = pos.slice(-37), gaps = ult.slice(1).map((p, i) => p - ult[i]).sort((x, y) => x - y);
  if (!gaps.length) return "M";
  const g = gaps[Math.floor(gaps.length / 2)];
  return g >= 11 ? "A" : g >= 5 ? "S" : g >= 2.5 ? "T" : "M";
}
/** Qué se está viendo, en una línea: "Datos mensuales", "Promedio de cada año (datos mensuales)", "Solo los meses de marzo"…
 *  La usan el gráfico de Histórico y la imagen compartible. `suma` = la serie es un flujo que se suma al agrupar.
 *  `origen` = frecuencia de la serie original (por defecto mensual): cambia "datos mensuales" por "trimestrales", etc. */
export function textoTemporalidad(o: { freq: "M" | "T" | "A"; ag: "promedio" | "cierre"; meses: Set<number>; suma?: boolean; origen?: FrecOrigen }): string {
  const per = o.freq === "A" ? "año" : "trimestre", datos = PLURAL_ORIGEN[o.origen ?? "M"];
  const base = o.freq === "M" ? `Datos ${datos}`
    : o.suma ? `Suma de cada ${per}`
    : o.ag === "cierre" ? `Último dato de cada ${per}`
    : `Promedio de cada ${per} (datos ${datos})`;
  if (o.meses.size >= 12) return base;
  const ms = [...o.meses].sort((a, b) => a - b).map((k) => NOMBRE_MES[k - 1]);
  const lista = ms.length === 1 ? ms[0] : ms.slice(0, -1).join(", ") + " y " + ms[ms.length - 1];
  return `${base}. Solo los meses de ${lista}`;
}

/** La frase de las tarjetas de resumen: cuánto está el último dato por encima o por debajo de `desde`.
 *  "El último está 7,2 % abajo" (o "2,1 puntos arriba" si el dato es un porcentaje). Vacía si falta algún dato. */
export function fraseUltimoVs(pct: boolean, desde: number | null | undefined, hasta: number | null | undefined): string {
  if (!ok(desde) || !ok(hasta)) return "";
  // contra un valor cero o negativo (un déficit) el porcentaje no dice nada: solo se informa si está arriba o abajo
  if (!pct && desde <= 0) return hasta === desde ? "El último es igual" : `El último está ${hasta > desde ? "arriba" : "abajo"}`;
  const mag = pct ? Math.abs(hasta - desde) : Math.abs(hasta / desde - 1) * 100;
  if (mag < 0.05) return "El último es igual";
  const dir = hasta > desde ? "arriba" : "abajo";
  const txt = pct ? `${nf1.format(mag)} ${nf1.format(mag) === "1,0" ? "punto" : "puntos"}` : `${mag >= 1000 ? nf0.format(mag) : nf1.format(mag)} %`;
  return `El último está ${txt} ${dir}`;
}
