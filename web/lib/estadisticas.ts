// Estadísticas de Histórico, mandatos, desempeño de presidentes y correlaciones de elecciones.
// Port de src/app.js sin cambiar resultados. Todo recibe el motor y la configuración por parámetro.
import { ok } from "./formato";
import type { Calculo, Expr, Motor, Vals } from "./motor";

// ---------------------------------------------------------------- Histórico
export type Fila = Record<string, any>;
export const MESES_PER: Record<string, (q: number) => number[]> = {
  T: (q) => [q * 3 - 2, q * 3 - 1, q * 3],
  A: () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

export function agrupar(rows: Fila[], freq: string, meses: Set<number>, sumar = new Set<string>(), ultimo = new Set<string>()): Fila[] {
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
      else if (ultimo.has(k)) o[k] = vals[vals.length - 1];
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

// ---------------------------------------------------------------- Presidentes
export interface Pres { id: string; n: string; ini: string; color: string; dash?: boolean; i0: number; i1: number }
const PRES_DEF = [
  { id: "menem1", n: "Menem 1", ini: "1989-07", color: "--neutral", dash: true },
  { id: "menem2", n: "Menem 2", ini: "1995-07", color: "--neutral", dash: true },
  { id: "delarua", n: "De la Rúa", ini: "1999-12", color: "--series-8" },
  { id: "duhalde", n: "Duhalde", ini: "2002-01", color: "--series-7" },
  { id: "nk", n: "Néstor Kirchner", ini: "2003-05", color: "--series-6" },
  { id: "cfk1", n: "CFK 1", ini: "2007-12", color: "--series-5" },
  { id: "cfk2", n: "CFK 2", ini: "2011-12", color: "--series-4" },
  { id: "macri", n: "Macri", ini: "2015-12", color: "--series-3" },
  { id: "af", n: "Alberto Fernández", ini: "2019-12", color: "--series-2" },
  { id: "milei", n: "Milei", ini: "2023-12", color: "--series-1" },
];
export function crearPres(F: string[]): Pres[] {
  const N = F.length;
  return PRES_DEF.map((p, k) => {
    const sig = PRES_DEF[k + 1];
    return { ...p, i0: Math.max(0, F.indexOf(p.ini)), i1: sig ? F.indexOf(sig.ini) - 1 : N - 1 };
  });
}
export interface BaseCfg { base: string; n: number }
export const baseIdx = (F: string[], p: Pres, b: BaseCfg): number =>
  b.base === "prev" ? F.indexOf(p.ini) - 1 : b.base === "mas" ? Math.min(F.indexOf(p.ini) + b.n, p.i1) : F.indexOf(p.ini);
export const baseTxt = (b: BaseCfg) => b.base === "prev" ? "último mes del antecesor (T-1)" : b.base === "mas" ? `${b.n} ${b.n === 1 ? "mes" : "meses"} después de asumir (T+${b.n})` : "mes de asunción (T)";

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
  !!e.rel || ["vm", "via", "vac"].includes(e.med || "") || ["none", "tasa"].includes(m.SER[e.id].tipo) || e.esc === "pib"
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
