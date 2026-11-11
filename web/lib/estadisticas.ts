// Estadísticas de Histórico, mandatos, desempeño de presidentes y correlaciones de elecciones.
// Port de src/app.js sin cambiar resultados. Todo recibe el motor y la configuración por parámetro.
import { ok, mesNum, fmtNum, lastIdx, nf0, nf1 } from "./formato";
import { kDe, txtT, type BaseCfg } from "./config";
import { ES_VAR, type Calculo, type Expr, type Motor, type Vals } from "./motor";

// ---------------------------------------------------------------- Histórico
export type Fila = Record<string, any>;
export const MESES_PER: Record<string, (q: number) => number[]> = {
  T: (q) => [q * 3 - 2, q * 3 - 1, q * 3],
  A: () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

export function agrupar(rows: Fila[], freq: string, meses: Set<number>, sumar = new Set<string>(), ultimo = new Set<string>(), cierre = false): Fila[] {
  if (!freq || freq === "M" || !rows.length) return rows;
  const grupos = new Map<string, { y: string; q: number; rs: Fila[] }>();
  rows.forEach((r) => {
    const y = r.fecha.slice(0, 4), q = Math.ceil(+r.fecha.slice(5, 7) / 3);
    const p = freq === "A" ? y : `${y}-${q}`;
    if (!grupos.has(p)) grupos.set(p, { y, q, rs: [] });
    grupos.get(p)!.rs.push(r);
  });
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== "fecha" && !k.startsWith("_"));
  return [...grupos.values()].map(({ y, q, rs }) => {
    const esperado = MESES_PER[freq](q).filter((m) => meses.has(m)).length;
    const ini = freq === "A" ? `${y}-01` : `${y}-${String(q * 3 - 2).padStart(2, "0")}`;
    const o: Fila = { fecha: ini, per: (freq === "A" ? y : `T${q} ${y}`) + (rs.length < esperado ? ` (${rs.length} de ${esperado} meses)` : "") };
    keys.forEach((k) => {
      const vals = rs.map((r) => r[k]).filter(ok) as number[];
      if (!vals.length) { o[k] = null; return; }
      if (k.endsWith("_lo")) o[k] = Math.min(...vals);
      else if (k.endsWith("_hi")) o[k] = Math.max(...vals);
      else if (sumar.has(k)) o[k] = vals.length === esperado ? vals.reduce((a, b) => a + b, 0) : null;
      else if (ultimo.has(k) || cierre) o[k] = vals[vals.length - 1]; // cierre: el último mes con dato del período
      else o[k] = vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    return o;
  });
}

import { fmtMes } from "./formato";
export const etiqueta = (r: Fila): string => r.per || fmtMes(r.fecha);

export type Par = [number, string];
export interface EstRows { ult: Par; pri: Par; prom: number; med: number; min: Par; max: Par; n: number }
export function estadisticasRows(rows: Fila[], key: string): EstRows | null {
  const vals = rows.map((r) => [r[key], etiqueta(r)] as [number, string]).filter((c) => ok(c[0]));
  if (!vals.length) return null;
  const ord = vals.map((v) => v[0]).sort((a, b) => a - b), h = Math.floor(ord.length / 2);
  return {
    ult: vals[vals.length - 1], pri: vals[0], prom: ord.reduce((a, b) => a + b, 0) / ord.length,
    med: ord.length % 2 ? ord[h] : (ord[h - 1] + ord[h]) / 2,
    min: vals.reduce((a, c) => c[0] < a[0] ? c : a), max: vals.reduce((a, c) => c[0] > a[0] ? c : a), n: vals.length,
  };
}

export const recortar = (rows: Fila[], keys: string[]): Fila[] => {
  const a = rows.findIndex((r) => keys.some((k) => ok(r[k])));
  let b = rows.length - 1;
  while (b >= 0 && keys.every((k) => !ok(rows[b][k]))) b--;
  return a < 0 ? [] : rows.slice(a, b + 1);
};

/** Una columna del gráfico: la serie calculada y cómo se agrupa al pasar a trimestres o años. */
export interface ColGraf { key: string; c: { v: Vals; lo?: Vals; hi?: Vals }; flujo: boolean; ultimo: boolean }
/** Las filas que dibuja un gráfico: el período visible, los meses elegidos y la frecuencia (una sola fuente de verdad para el gráfico y la imagen). */
export function filasGrafico(F: string[], cols: ColGraf[], o: { desde: string; hasta: string; meses: Set<number>; freq: string; cierre: boolean; banda: boolean }): Fila[] {
  const enFiltro = (f: string) => f >= o.desde && f <= o.hasta && o.meses.has(+f.slice(5, 7));
  const rows = F.map((f, i) => {
    if (!enFiltro(f)) return null;
    const r: Fila = { fecha: f };
    cols.forEach((x) => { r[x.key] = x.c.v[i]; if (o.banda && x.c.lo && x.c.hi) { r[x.key + "_lo"] = x.c.lo[i]; r[x.key + "_hi"] = x.c.hi[i]; } });
    return r;
  }).filter(Boolean) as Fila[];
  return recortar(agrupar(rows, o.freq, o.meses, new Set(cols.filter((x) => x.flujo).map((x) => x.key)), new Set(cols.filter((x) => x.ultimo).map((x) => x.key)), o.cierre), cols.map((x) => x.key));
}
/** Pasa cada columna a base 100 (primer dato del período = 100). Modifica las filas y devuelve, por columna, el período que vale 100. */
export function aBase100(rows: Fila[], keys: string[]): Record<string, string> {
  const base: Record<string, string> = {};
  keys.forEach((k) => {
    const r0 = rows.find((r) => ok(r[k]) && r[k] !== 0);
    base[k] = r0 ? etiqueta(r0) : "–";
    const f = r0 ? 100 / r0[k] : null;
    rows.forEach((r) => { r[k] = f && ok(r[k]) ? r[k] * f : null; });
  });
  return base;
}

// ---------------------------------------------------------------- Presidentes
/** `corto`: nombre abreviado para columnas angostas y para la imagen (si no se indica, es el mismo nombre). */
export interface Pres { id: string; n: string; corto: string; ini: string; color: string; dash?: boolean; i0: number; i1: number }
export const PRES_DEF = [
  { id: "menem1", n: "Menem 1", ini: "1989-07", color: "--pres-menem1", base: "--neutral", dash: true },
  { id: "menem2", n: "Menem 2", ini: "1995-07", color: "--pres-menem2", base: "--neutral", dash: true },
  { id: "delarua", n: "De la Rúa", ini: "1999-12", color: "--pres-delarua", base: "--series-8" },
  { id: "duhalde", n: "Duhalde", ini: "2002-01", color: "--pres-duhalde", base: "--series-7" },
  { id: "nk", n: "Néstor Kirchner", corto: "Néstor K.", ini: "2003-05", color: "--pres-nk", base: "--series-6" },
  { id: "cfk1", n: "CFK 1", ini: "2007-12", color: "--pres-cfk1", base: "--series-5" },
  { id: "cfk2", n: "CFK 2", ini: "2011-12", color: "--pres-cfk2", base: "--series-4" },
  { id: "macri", n: "Macri", ini: "2015-12", color: "--pres-macri", base: "--series-3" },
  { id: "af", n: "Alberto Fernández", corto: "Alberto F.", ini: "2019-12", color: "--pres-af", base: "--series-2" },
  { id: "milei", n: "Milei", ini: "2023-12", color: "--pres-milei", base: "--series-1" },
];
export interface Franja { ini: number; fin: number; nombre: string; color: string }
/** Franjas de colores de los mandatos para los gráficos. Cada una empieza en el mes que la configuración toma como inicio y llega hasta el inicio de la siguiente. */
export function franjasPres(F: string[], b: BaseCfg): Franja[] {
  const PRES = crearPres(F);
  const idx = PRES.map((p) => baseIdx(F, p, b));
  const out: Franja[] = [];
  PRES.forEach((p, k) => {
    const ini = mesNum(F[idx[k]]), fin = k < PRES.length - 1 ? mesNum(F[idx[k + 1]]) : mesNum(F[F.length - 1]);
    if (fin > ini) out.push({ ini, fin, nombre: p.n, color: p.color });
  });
  return out;
}
export function crearPres(F: string[]): Pres[] {
  const N = F.length;
  return PRES_DEF.map((p, k) => {
    const sig = PRES_DEF[k + 1];
    return { ...p, corto: (p as { corto?: string }).corto ?? p.n, i0: Math.max(0, F.indexOf(p.ini)), i1: sig ? F.indexOf(sig.ini) - 1 : N - 1 };
  });
}
export type { BaseCfg } from "./config";
/** Mes base del presidente: asunción + k (k = su desplazamiento), sin pasar del último mes del mandato ni de antes del primer mes con datos. */
export function baseIdx(F: string[], p: Pres, b: BaseCfg): number {
  const asume = F.indexOf(p.ini) >= 0 ? F.indexOf(p.ini) : p.i0;
  return Math.max(0, Math.min(asume + kDe(b, p.id), p.i1));
}
const mesesTxt = (k: number) => `${k} ${Math.abs(k) === 1 ? "mes" : "meses"}`;
/** Cómo se explica la base: una frase si es igual para todos, o el resumen con las excepciones. */
export function baseTxt(b: BaseCfg): string {
  const hay = Object.keys(b.t0p).length > 0;
  const k = b.t0;
  const gral = k === -1 ? "último mes del antecesor (T-1)" : k === 0 ? "mes de asunción (T)"
    : k > 0 ? `${mesesTxt(k)} después de asumir (T+${k})` : `${mesesTxt(-k)} antes de asumir (T${k})`;
  return hay ? `${gral}, con excepciones: ${resumenExcepciones(b)}` : gral;
}
function resumenExcepciones(b: BaseCfg): string {
  return PRES_DEF.filter((p) => b.t0p[p.id] != null).map((p) => `${p.n} ${txtT(b.t0p[p.id])}`).join(", ");
}
/** Resumen corto para la línea "Inicio: …" (ej. "T-1 · Milei T+1"). */
/** El inicio del mandato en una oración: "Mes inicial de cada presidente: T-1, excepto Milei (T+1)." Con más de tres excepciones, "con excepciones". */
export function oracionInicio(b: BaseCfg): string {
  const exc = PRES_DEF.filter((p) => b.t0p[p.id] != null && b.t0p[p.id] !== b.t0).map((p) => `${p.n} (${txtT(b.t0p[p.id])})`);
  const cola = !exc.length ? "" : exc.length > 3 ? ", con excepciones" : `, excepto ${exc.length === 1 ? exc[0] : exc.slice(0, -1).join(", ") + " y " + exc[exc.length - 1]}`;
  return `Mes inicial de cada presidente: ${txtT(b.t0)}${cola}.`;
}
/** Qué significa T, para acompañar a `oracionInicio`. */
export const AYUDA_T = "T = mes de asunción. T-1 = último mes del antecesor. T+1 = un mes después de asumir.";
export const baseResumen = (b: BaseCfg): string =>
  [txtT(b.t0), ...PRES_DEF.filter((p) => b.t0p[p.id] != null).map((p) => `${p.n} ${txtT(b.t0p[p.id])}`)].join(" · ");

export interface StatsM {
  n: number; total?: number; ini?: number; iniI?: number; fin?: number; finI?: number;
  min?: number; minI?: number; max?: number; maxI?: number; prom?: number; med?: number;
}
export function statsMandato(F: string[], arr: Vals, p: Pres, b: BaseCfg): StatsM {
  const res: StatsM = { n: 0 };
  const vals: [number, number][] = [];
  for (let i = p.i0; i <= p.i1; i++) { const x = arr[i]; if (ok(x)) vals.push([x, i]); }
  if (!vals.length) return res;
  const bi = baseIdx(F, p, b);
  res.n = vals.length; res.total = p.i1 - p.i0 + 1;
  if (bi >= 0 && ok(arr[bi])) { res.ini = arr[bi] as number; res.iniI = bi; } else { res.ini = vals[0][0]; res.iniI = vals[0][1]; }
  const u = vals[vals.length - 1]; res.fin = u[0]; res.finI = u[1];
  const mn = vals.reduce((a, c) => c[0] < a[0] ? c : a), mx = vals.reduce((a, c) => c[0] > a[0] ? c : a);
  res.min = mn[0]; res.minI = mn[1]; res.max = mx[0]; res.maxI = mx[1];
  res.prom = vals.reduce((a, c) => a + c[0], 0) / vals.length;
  const ord = vals.map((c) => c[0]).sort((a, c) => a - c), h = Math.floor(ord.length / 2);
  res.med = ord.length % 2 ? ord[h] : (ord[h - 1] + ord[h]) / 2;
  return res;
}
export const varNum = (c: { pct: boolean }, st: StatsM): number | null =>
  (!ok(st.ini) || !ok(st.fin)) ? null : c.pct ? st.fin - st.ini : st.ini === 0 ? null : (st.fin / st.ini - 1) * 100;

export function rankScores(valores: (number | null | undefined)[], dir: number): number[] {
  const idx = valores.map((x, i) => [x, i] as [number | null | undefined, number]).filter((c) => ok(c[0])) as [number, number][];
  const out = valores.map(() => 0);
  if (!dir || idx.length < 2) return out;
  idx.sort((a, b) => (a[0] - b[0]) * dir);
  idx.forEach(([, i], k) => { out[i] = -1 + 2 * k / (idx.length - 1); });
  return out;
}
export function ordenar<T>(items: T[], ord: { k: string | null; d: number }, valor: (x: T) => number | null | undefined): T[] {
  if (!ord.k) return items;
  return items.slice().sort((a, b) => {
    const va = valor(a), vb = valor(b);
    if (!ok(va) && !ok(vb)) return 0;
    if (!ok(va)) return 1;
    if (!ok(vb)) return -1;
    return (va - vb) * ord.d;
  });
}
// Comparar niveles entre presidentes solo tiene sentido en medidas reales, índices o ratios
export const nivelComparable = (m: Motor, e: Expr): boolean =>
  !!e.rel || ES_VAR(e.med === "vac" ? "via" : e.med) || ["none", "tasa"].includes(m.SER[e.id].tipo) || e.esc === "pib"
  || ["real", "realbi", "usdr"].includes(e.med || "") || String(e.med).startsWith("usdr_") || String(e.med).startsWith("real_");

export interface Desempeno {
  st: StatsM; cambio: number; mejora: number; nivel: number | null; enPuntos: boolean; bueno: boolean; malo: boolean;
  m_puesto?: number; m_de?: number; m_pct?: number; n_puesto?: number; n_de?: number; n_pct?: number;
  puesto?: { mejora: number[]; nivel: number[] };
}
export function desempeno(m: Motor, F: string[], ind: Expr, p: Pres, c: Calculo, b: BaseCfg): Desempeno | null {
  const st = statsMandato(F, c.v, p, b);
  if (!st.n || st.n < Math.min(6, Math.ceil((st.total as number) / 2)) || !ok(st.ini) || !ok(st.fin) || !c.dir) return null;
  let cruza = false;
  for (let i = p.i0; i <= p.i1; i++) { const x = c.v[i]; if (ok(x) && x <= 0) { cruza = true; break; } }
  const enPuntos = c.pct || cruza || st.ini <= 0;
  const meses = Math.max(1, (st.finI as number) - (st.iniI as number));
  const cambio = enPuntos ? st.fin - st.ini : st.fin / st.ini - 1;
  const mejora = enPuntos ? cambio : Math.pow(st.fin / st.ini, 12 / meses) - 1;
  const nivel = c.pct || nivelComparable(m, ind) ? (st.prom as number) : null;
  return { st, cambio, mejora, nivel, enPuntos, bueno: Math.sign(cambio) * c.dir > 0, malo: Math.sign(cambio) * c.dir < 0 };
}
export function puestos(des: (Desempeno | null)[], campo: "mejora" | "nivel", dir: number, pre: "m_" | "n_") {
  const orden = des.map((d, i) => [d && ok(d[campo]) ? (d[campo] as number) * dir : null, i] as [number | null, number])
    .filter((x) => ok(x[0])).sort((a, b) => (b[0] as number) - (a[0] as number));
  orden.forEach(([, i], pos) => {
    const d = des[i] as Desempeno;
    (d as any)[pre + "puesto"] = pos + 1; (d as any)[pre + "de"] = orden.length;
    (d as any)[pre + "pct"] = orden.length > 1 ? 100 * (1 - pos / (orden.length - 1)) : 50;
  });
}
export function tablaDesempeno(m: Motor, F: string[], PRES: Pres[], ind: Expr, b: BaseCfg) {
  const c = m.calc(ind);
  const des = PRES.map((p) => desempeno(m, F, ind, p, c, b));
  puestos(des, "mejora", c.dir, "m_"); puestos(des, "nivel", c.dir, "n_");
  // criterio "nivel": si el nivel no es comparable, se usa la mejora
  des.forEach((d) => {
    if (!d) return;
    const mm = [d.m_puesto, d.m_de, d.m_pct] as number[];
    d.puesto = { mejora: mm, nivel: ok(d.n_pct) ? [d.n_puesto, d.n_de, d.n_pct] as number[] : mm };
  });
  return { c, des };
}

// ---------------------------------------------------------------- Elecciones
export interface Eleccion { f: string; tipo: "pres" | "leg"; of: string; v: number; gano: boolean; i: number; anio: string }
const ELEC_DEF: Omit<Eleccion, "i" | "anio">[] = [
  { f: "1995-05", tipo: "pres", of: "PJ (Menem)", v: 49.9, gano: true },
  { f: "1997-10", tipo: "leg", of: "PJ", v: 36.3, gano: false },
  { f: "1999-10", tipo: "pres", of: "PJ (Duhalde)", v: 38.3, gano: false },
  { f: "2001-10", tipo: "leg", of: "Alianza", v: 23.5, gano: false },
  { f: "2003-04", tipo: "pres", of: "Kirchner (apoyado por Duhalde)", v: 22.2, gano: true },
  { f: "2005-10", tipo: "leg", of: "Frente para la Victoria", v: 40.0, gano: true },
  { f: "2007-10", tipo: "pres", of: "FpV (CFK)", v: 45.3, gano: true },
  { f: "2009-06", tipo: "leg", of: "Frente para la Victoria", v: 30.8, gano: false },
  { f: "2011-10", tipo: "pres", of: "FpV (CFK)", v: 54.1, gano: true },
  { f: "2013-10", tipo: "leg", of: "Frente para la Victoria", v: 33.0, gano: true },
  { f: "2015-10", tipo: "pres", of: "FpV (Scioli)", v: 37.1, gano: false },
  { f: "2017-10", tipo: "leg", of: "Cambiemos", v: 41.8, gano: true },
  { f: "2019-10", tipo: "pres", of: "Juntos por el Cambio (Macri)", v: 40.3, gano: false },
  { f: "2021-11", tipo: "leg", of: "Frente de Todos", v: 34.0, gano: false },
  { f: "2023-10", tipo: "pres", of: "Unión por la Patria (Massa)", v: 36.8, gano: false },
  { f: "2025-10", tipo: "leg", of: "La Libertad Avanza", v: 40.7, gano: true },
];
export const crearElec = (F: string[]): Eleccion[] => ELEC_DEF.map((e) => ({ ...e, i: F.indexOf(e.f), anio: e.f.slice(0, 4) }));
export const METRICA_E: Record<string, [string, string]> = {
  var12: ["Cambio en los 12 meses previos", "cambio entre 13 y 1 mes antes de la elección (en % o, si la variable es un porcentaje, en puntos)"],
  nivel: ["Nivel promedio de los 12 meses previos", "promedio de los 12 meses anteriores a la elección (solo variables que se pueden comparar entre épocas: %, tasas, valores reales)"],
  mandato: ["Cambio desde el inicio del mandato", "cambio desde el inicio del mandato del presidente en ejercicio hasta el mes anterior a la elección"],
};
export function valorElec(m: Motor, F: string[], PRES: Pres[], metrica: string, b: BaseCfg, c: Calculo, e: Eleccion, ind: Expr): number | null {
  const u = e.i - 1; if (u < 13) return null;
  let iu = -1;
  for (let k = u; k >= u - 3; k--) if (ok(c.v[k])) { iu = k; break; }
  if (iu < 0) return null;
  if (metrica === "nivel") {
    if (!(c.pct || nivelComparable(m, ind))) return null;
    const xs: number[] = [];
    for (let k = u - 11; k <= u; k++) { const x = c.v[k]; if (ok(x)) xs.push(x); }
    return xs.length >= 2 ? xs.reduce((a, x) => a + x, 0) / xs.length : null;
  }
  let i0: number;
  if (metrica === "var12") i0 = iu - 12;
  else { const p = PRES.filter((q) => q.i0 <= u).pop(); if (!p) return null; i0 = baseIdx(F, p, b); }
  let j = i0;
  while (j >= 0 && i0 - j < 3 && !ok(c.v[j])) j--;
  if (j < 0 || !ok(c.v[j])) return null;
  const a = c.v[j] as number, bb = c.v[iu] as number;
  if (c.pct || a <= 0) return bb - a;
  return (bb / a - 1) * 100;
}
export function pearson(xs: number[], ys: number[]) {
  const n = xs.length; if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < n; k++) { const dx = xs[k] - mx, dy = ys[k] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx && syy ? { r: sxy / Math.sqrt(sxx * syy), b: sxy / sxx, a: my - sxy / sxx * mx } : null;
}

// ---------------------------------------------------------------- Colores de variaciones
/** Clasifica un cambio según `dir` (1: subir es bueno; -1: bajar es bueno; 0 o sin dato: neutro). */
export function claseVariacion(dir: number | null | undefined, pct: boolean, desde: number | null | undefined, hasta: number | null | undefined): "bueno" | "malo" | "neutro" {
  if (!dir || !ok(desde) || !ok(hasta)) return "neutro";
  if (!pct && desde === 0) return "neutro";
  let d = hasta - desde;
  if (!pct && desde < 0) d = -d; // la variación % se calcula como cociente: con base negativa el signo se invierte
  const s = Math.sign(d) * Math.sign(dir);
  return s > 0 ? "bueno" : s < 0 ? "malo" : "neutro";
}

// ---------------------------------------------------------------- Ranking de presidentes
export type CritRk = "mejora" | "nivel" | "ambos";
export interface IndRk { ind: Expr; grupo: string; nombre: string }
export interface ItemRk { nombre: string; grupo: string; pct: number; puesto: number; de: number; d: Desempeno; c: Calculo; ind: Expr }
export interface FilaRk { p: Pres; score: number | null; items: ItemRk[] }
export interface ResRanking { filas: FilaRk[]; incompletas: boolean }

/** Puntaje de 0 a 100 por indicador según el puesto, promedio dentro de cada grupo y después entre grupos.
 *  Es el mismo cálculo para todos los presidentes; un indicador con menos de 3 presidentes con datos no cuenta. */
export function rankingPresidentes(m: Motor, F: string[], PRES: Pres[], inds: IndRk[], crit: CritRk, b: BaseCfg): ResRanking {
  const items: ItemRk[][] = PRES.map(() => []);
  let incompletas = false;
  inds.forEach((it) => {
    const { c, des } = tablaDesempeno(m, F, PRES, it.ind, b);
    const con = des.filter(Boolean).length;
    if (con < PRES.length) incompletas = true;
    if (con < 3) return;
    des.forEach((d, k) => {
      if (!d) return;
      const pm = (d.puesto as NonNullable<Desempeno["puesto"]>);
      const pct = crit === "ambos" ? (pm.mejora[2] + pm.nivel[2]) / 2 : pm[crit][2];
      const ref = crit === "nivel" ? pm.nivel : pm.mejora;
      items[k].push({ nombre: it.nombre, grupo: it.grupo, pct, puesto: ref[0], de: ref[1], d, c, ind: it.ind });
    });
  });
  const filas = PRES.map((p, k) => {
    const porGrupo: Record<string, number[]> = {};
    items[k].forEach((i) => (porGrupo[i.grupo] = porGrupo[i.grupo] || []).push(i.pct));
    const g = Object.values(porGrupo).map((a) => a.reduce((s, y) => s + y, 0) / a.length);
    return { p, score: g.length ? g.reduce((s, y) => s + y, 0) / g.length : null, items: items[k].sort((a, c) => c.pct - a.pct) };
  }).filter((f) => f.score != null).sort((a, c) => (c.score as number) - (a.score as number));
  return { filas, incompletas };
}

/** Desempeño de cada indicador para todos los presidentes (se calcula una vez y sirve para varios presidentes abiertos). */
export interface TablaInd { ind: Expr; grupo: string; nombre: string; c: Calculo; des: (Desempeno | null)[] }
export function tablasIndicadores(m: Motor, F: string[], PRES: Pres[], inds: IndRk[], b: BaseCfg): TablaInd[] {
  return inds.map((it) => ({ ...it, ...tablaDesempeno(m, F, PRES, it.ind, b) }));
}
export interface FilaMP { nombre: string; grupo: string; ind: Expr; c: Calculo; d: Desempeno; score: number }
/** Lo mejor y lo peor de un presidente: indicadores que mejoraron / empeoraron, ordenados por el puesto frente a los demás.
 *  Con el criterio "ambos" se usa el promedio de los dos puntajes. */
export function mejorPeor(tablas: TablaInd[], PRES: Pres[], pres: Pres, crit: CritRk): { mejores: FilaMP[]; peores: FilaMP[] } {
  const k = PRES.indexOf(pres);
  const filas: FilaMP[] = [];
  tablas.forEach((t) => {
    const d = t.des[k]; if (!d || !d.puesto) return;
    const score = crit === "ambos" ? (d.puesto.mejora[2] + d.puesto.nivel[2]) / 2 : d.puesto[crit][2];
    filas.push({ nombre: t.nombre, grupo: t.grupo, ind: t.ind, c: t.c, d, score });
  });
  return {
    mejores: filas.filter((f) => f.d.bueno).sort((a, c) => c.score - a.score),
    peores: filas.filter((f) => f.d.malo).sort((a, c) => a.score - c.score),
  };
}

// ---------------------------------------------------------------- Voto estimado
export interface CorrVoto { s: { id: string; n: string }; c: Calculo; ind: Expr; pts: { e: Eleccion; x: number }[]; r: number; b: number; a: number; n: number }
export interface VotoVar { o: CorrVoto; hoy: number; est: number; fuera: boolean; fuerte: boolean; peso: number }
export interface VotoEst {
  vars: VotoVar[];                                          // todas las usadas; las de relación fuerte primero
  fuertes: number;                                          // cuántas pasan el corte de |r|
  fuerte: { mediana: number; min: number; max: number } | null;  // null si hay menos de 3 fuertes
  ponderada: number | null;                                 // promedio de las rectas ponderado por r²; null si no alcanza
  corte: number;
}
export const CORTES_R = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

/** Valor "de hoy" de una variable, medido igual que en las elecciones: se evalúa como si hubiera una elección el mes siguiente al último dato.
 *  Si el último dato quedó muy atrás respecto del resto (serie discontinuada), no se calcula. */
export function valorHoy(m: Motor, F: string[], PRES: Pres[], metrica: string, b: BaseCfg, o: CorrVoto, ultimoGlobal: number): number | null {
  const li = o.c.v.reduce((a: number, x, i) => (ok(x) ? i : a), -1);
  if (li < 0 || li < ultimoGlobal - 6) return null;
  const e: Eleccion = { f: "", tipo: "pres", of: "", v: 0, gano: false, i: li + 1, anio: "" };
  return valorElec(m, F, PRES, metrica, b, o.c, e, o.ind);
}

/** Último mes con dato entre las variables con 8 elecciones o más (sirve para descartar series discontinuadas). */
export const ultimoGlobalDe = (corrs: CorrVoto[]): number =>
  Math.max(-1, ...corrs.filter((o) => o.n >= 8).map((o) => o.c.v.reduce((a: number, x, i) => (ok(x) ? i : a), -1)));

/** Recta (mínimos cuadrados) de cada variable evaluada en el valor de hoy.
 *  - "Solo fuertes": hacen falta al menos 3 variables con |r| ≥ corte y 8 elecciones; da rango y mediana.
 *  - "Ponderada": todas las variables con 8 elecciones, promediadas con peso r² (se acota a 0–100 %). No se calcula si Σ r² < 0,1. */
export function estimarVoto(m: Motor, F: string[], PRES: Pres[], metrica: string, b: BaseCfg, corrs: CorrVoto[], corte = 0.6): VotoEst | null {
  const cand = corrs.filter((o) => o.n >= 8);
  const ultimoGlobal = ultimoGlobalDe(corrs);
  const vars: VotoVar[] = [];
  cand.forEach((o) => {
    const hoy = valorHoy(m, F, PRES, metrica, b, o, ultimoGlobal);
    if (!ok(hoy)) return;
    const xs = o.pts.map((q) => q.x);
    vars.push({ o, hoy, est: Math.max(0, Math.min(100, o.a + o.b * hoy)), fuera: hoy < Math.min(...xs) || hoy > Math.max(...xs), fuerte: Math.abs(o.r) >= corte - 1e-9, peso: 0 });
  });
  const sr2 = vars.reduce((a, v) => a + v.o.r * v.o.r, 0);
  vars.forEach((v) => { v.peso = sr2 > 0 ? v.o.r * v.o.r / sr2 : 0; });
  vars.sort((a, c) => Number(c.fuerte) - Number(a.fuerte) || Math.abs(c.o.r) - Math.abs(a.o.r));
  const fu = vars.filter((v) => v.fuerte);
  let fuerte: VotoEst["fuerte"] = null;
  if (fu.length >= 3) {
    const ord = fu.map((v) => v.est).sort((a, c) => a - c), h = Math.floor(ord.length / 2);
    fuerte = { mediana: ord.length % 2 ? ord[h] : (ord[h - 1] + ord[h]) / 2, min: ord[0], max: ord[ord.length - 1] };
  }
  const ponderada = vars.length >= 3 && sr2 >= 0.1 ? Math.max(0, Math.min(100, vars.reduce((a, v) => a + v.peso * v.est, 0))) : null;
  if (!fuerte && ponderada == null) return null;
  return { vars, fuertes: fu.length, fuerte, ponderada, corte };
}

// ---------------------------------------------------------------- Meses de mandato
export type ModoMandato = "teorico" | "var" | "indice" | "valor";
export interface ParamsMandato {
  expr: Expr; modo: ModoMandato; banda: boolean; b: BaseCfg;
  presIds: Set<string>; anc: string | null; md: string | null; mh: string | null;   // md/mh: parámetros de URL tal cual
}
const entEn = (s: string | null, min: number, max: number, def: number): number => {
  const n = s == null || s === "" ? NaN : Number(s);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : def;
};
/** Todo lo que muestra el gráfico de Meses de mandato: una sola fuente de verdad para la página y la imagen. Null si faltan datos. */
export function calcularMandato(m: Motor, PRES: Pres[], PRES_T0: Pres[], q: ParamsMandato) {
  const eB = q.expr, b = q.b, modo = q.modo;
  if (!m.SER[eB.id] || (eB.rel && !m.SER[eB.rel])) return null;
  const F = m.F;
  const c = m.calc(eB), arr = c.v;
  const bnd = q.banda && c.lo && c.hi ? [c.lo, c.hi] : null;
  const pres = PRES_T0.filter((x) => q.presIds.has(x.id));
  const teo = modo === "teorico";
  const li = lastIdx(arr);
  const ancOpc: [string, string][] = [["ultimo", `Último dato (${fmtMes(F[li])})`], ...PRES_T0.slice().reverse().map((x): [string, string] => [x.id, `Mes 0 de ${x.n}`])];
  const anc = ancOpc.some((o) => o[0] === q.anc) ? (q.anc as string) : "milei";
  let ancla: number | null = null, ancTxt = "";
  if (anc === "ultimo") { ancla = arr[li]; ancTxt = `el último dato (${fmtMes(F[li])})`; }
  else { const x = PRES.find((r) => r.id === anc)!, bi = baseIdx(F, x, b); ancla = bi >= 0 ? arr[bi] : null; ancTxt = `el mes 0 de ${x.n} (${bi >= 0 ? fmtMes(F[bi]) : "–"})`; }
  const conv = (xv: number | null, x0: number | null) => {
    if (!ok(x0) || !ok(xv) || x0 === 0) return null;
    if (c.pct && modo !== "valor") return xv - x0 + (teo && ok(ancla) ? ancla : 0);
    if (modo === "indice") return xv / x0 * 100;
    if (modo === "var") return (xv / x0 - 1) * 100;
    if (teo) return ok(ancla) ? ancla * xv / x0 : null;
    return xv;
  };
  const maxMes = Math.max(1, ...pres.map((x) => x.i1 - baseIdx(F, x, b)));
  const todas: Fila[] = Array.from({ length: maxMes + 1 }, (_, t) => ({ t }));
  pres.forEach((x) => {
    const bi = baseIdx(F, x, b), x0 = arr[bi];
    for (let t = 0; t <= x.i1 - bi; t++) {
      todas[t][x.id] = conv(arr[bi + t], x0);
      if (bnd) { todas[t][x.id + "_lo"] = conv(bnd[0][bi + t], x0); todas[t][x.id + "_hi"] = conv(bnd[1][bi + t], x0); }
      todas[t]["_f_" + x.id] = F[bi + t];
    }
  });
  const hasta = Math.min(maxMes, entEn(q.mh, 1, 10000, maxMes));
  const desde = Math.min(entEn(q.md, 0, 10000, 0), hasta - 1);
  const rows = todas.slice(desde, hasta + 1);
  let fmtAxis: (v: number) => string, fmtTip: (v: number) => string, ref: number | null = null;
  if (c.pct && modo !== "valor") { fmtAxis = (v) => nf0.format(v); fmtTip = (v) => nf1.format(v) + " %"; ref = teo ? ancla : 0; }
  else if (modo === "indice") { fmtAxis = (v) => nf0.format(v); fmtTip = (v) => nf1.format(v); ref = 100; }
  else if (modo === "var") { fmtAxis = (v) => nf0.format(v) + " %"; fmtTip = (v) => (v > 0 ? "+" : "") + nf1.format(v) + " %"; ref = 0; }
  else { fmtAxis = (v) => c.pct ? nf0.format(v) + " %" : (Math.abs(v) >= 1e6 ? nf1.format(v / 1e6) + " M" : Math.abs(v) >= 1e4 ? nf0.format(v / 1e3) + " mil" : fmtNum(v)); fmtTip = (v) => m.fmtC(c, v); ref = teo ? ancla : null; }
  const vals = rows.flatMap((r) => pres.map((x) => r[x.id])).filter((v) => ok(v) && v > 0) as number[];
  const usarLog = !c.pct && modo !== "var" && vals.length > 1 && Math.max(...vals) / Math.min(...vals) > 30 && rows.every((r) => pres.every((x) => !ok(r[x.id]) || r[x.id] > 0));
  const paso = (hasta - desde) > 36 ? 6 : (hasta - desde) > 12 ? 3 : 1;
  const cel = (x: Pres, t: number) => { const r = todas[t]; return r && ok(r[x.id]) ? fmtTip(r[x.id]) : "–"; };
  const nota = (teo ? `Partiendo de ${ancTxt}: `.replace("de el ", "del ") + `${m.fmtC(c, ancla)} (${c.unidad}), y aplicando ${c.pct ? "los cambios en puntos" : "las variaciones"} de cada mandato. `
    : `Unidad: ${modo === "indice" ? "índice" : modo === "var" && !c.pct ? "%" : c.unidad}. `) + `Mes 0 = ${baseTxt(b)}.` +
    (c.pct ? " En porcentajes se suman los cambios en puntos, no se multiplican." : "") + (bnd ? " La sombra va del mínimo al máximo diario de cada mes." : "") +
    (q.banda && !c.lo ? " (Esta variable no tiene datos diarios: no hay rango.)" : "");
  return { c, pres, teo, ancOpc, anc, ancTxt, ancla, maxMes, desde, hasta, rows, fmtAxis, fmtTip, ref, usarLog, paso, nota, cel, todas, bnd };
}

export const TITULOS_MANDATO: Record<ModoMandato, string> = { teorico: "precio teórico", indice: "índice, mes 0 = 100", var: "variación % desde el mes 0", valor: "valor" };
/** Nombre abreviado de un presidente para espacios chicos ("Néstor Kirchner" → "Néstor K.", "Alberto Fernández" → "Alberto F."): el `corto` de `PRES_DEF`. */
export const nombreCorto = (n: string): string => (PRES_DEF.find((p) => p.n === n) as { corto?: string } | undefined)?.corto ?? n;
