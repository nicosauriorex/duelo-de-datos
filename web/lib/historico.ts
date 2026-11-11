// Cómo se lee Histórico desde la URL: parámetros de cada gráfico y del período. Lo usan la sección y la imagen de compartir.
import { desdePreferido, type DesdePref } from "./config";
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
