// Contexto internacional (bloque 6b, D-008): cálculos de la sección Contexto y del recuadro "Contexto del mandato".
// Una sola fuente de verdad: la sección y el recuadro usan estas funciones.
// Datos: web/public/datos/contexto.json (FMI, anual) + series mensuales del catálogo (viento de cola o de frente).
import { ok } from "./formato";
import { PRES_DEF, type Pres } from "./estadisticas";
import type { Motor } from "./motor";

export interface IndicadorCtx { n: string; u: string; dir: number }
export interface DatosContexto {
  anios: number[];
  entidades: Record<string, string>;
  indicadores: Record<string, IndicadorCtx>;
  real: Record<string, Record<string, (number | null)[]>>;
  es_proyeccion: Record<string, Record<string, number>>;
  proy_abril: Record<string, Record<string, (number | null)[]>>;
  fuente: string;
}

// ---------------------------------------------------------------- entidades
export const ARG = "ARG";
export const VEC = "VEC"; // virtual: promedio simple de los vecinos
export const VECINOS = ["BRA", "CHL", "URY", "PRY", "BOL"];
export const PAISES = ["BRA", "CHL", "URY", "PRY", "BOL", "PER", "COL", "MEX", "ECU", "USA", "EURO", "CHN"];
/** Grupos de comparación (código del FMI; VEC lo calcula la web). */
export const GRUPOS_CMP: [string, string, string][] = [
  ["mundo", "Mundo", "WEOWORLD"], ["emergentes", "Emergentes", "OEMDC"],
  ["latam", "América Latina y el Caribe", "WE"], ["vecinos", "Vecinos", VEC],
];
export const GRUPOS_EXTRA = ["ADVEC"];
export const nombreEnt = (d: DatosContexto, e: string): string => (e === VEC ? "Vecinos" : d.entidades[e] ?? e);

// ---------------------------------------------------------------- indicadores
export interface DefInd { id: string; n: string; u: string; dir: number; origen: string; indice?: boolean }
/** Datos que se pueden comparar entre países. `indice` = se puede ver en base 100. */
export const COMPARAR: DefInd[] = [
  { id: "crec", n: "Crecimiento", u: "% anual", dir: 1, origen: "NGDP_RPCH" },
  { id: "infl", n: "Inflación", u: "% anual", dir: -1, origen: "PCPIPCH" },
  { id: "desem", n: "Desempleo", u: "% de la fuerza laboral", dir: -1, origen: "LUR" },
  { id: "pibpc", n: "PIB por habitante (PPA)", u: "US$ internacionales", dir: 1, origen: "PPPPC" },
  { id: "pibr", n: "PIB real", u: "índice", dir: 1, origen: "NGDP_RPCH", indice: true },
  { id: "pibpcr", n: "PIB por habitante real", u: "índice", dir: 1, origen: "LP", indice: true },
  { id: "deuda", n: "Deuda pública", u: "% del PIB", dir: -1, origen: "GGXWDG_NGDP" },
  { id: "fiscal", n: "Resultado fiscal", u: "% del PIB", dir: 1, origen: "GGXCNL_NGDP" },
  { id: "cc", n: "Cuenta corriente", u: "% del PIB", dir: 1, origen: "BCA_NGDPD" },
];
/** Datos para "lo esperado vs. lo que pasó" (crecimiento e inflación: la base histórica del FMI no trae desempleo). */
export const ESPERADO: DefInd[] = COMPARAR.slice(0, 2); // el FMI no publica desempleo proyectado en abril de forma descargable

// ---------------------------------------------------------------- años y presidentes
/** Cada año es del presidente que gobernó 6 meses o más de ese año (en empate, el que estaba al empezar el año). */
export function presidenteDelAnio(y: number): string | null {
  let mejor: string | null = null, max = 0;
  PRES_DEF.forEach((p, k) => {
    const sig = PRES_DEF[k + 1];
    let n = 0;
    for (let mm = 1; mm <= 12; mm++) {
      const f = `${y}-${String(mm).padStart(2, "0")}`;
      if (f >= p.ini && (!sig || f < sig.ini)) n++;
    }
    if (n > max) { max = n; mejor = p.id; }
  });
  return max >= 6 ? mejor : null;
}
export function aniosDe(presId: string, hasta: number, desde = 1990): number[] {
  const out: number[] = [];
  for (let y = desde; y <= hasta; y++) if (presidenteDelAnio(y) === presId) out.push(y);
  return out;
}
export const textoAnios = (a: number[]): string => (!a.length ? "sin años completos" : a.length === 1 ? String(a[0]) : `${a[0]}–${a[a.length - 1]}`);

/** Último año con dato real (los años posteriores son proyección del FMI). */
export function ultimoCerrado(d: DatosContexto): number {
  const p = d.es_proyeccion?.NGDP_RPCH?.[ARG];
  return p != null ? p - 1 : d.anios[d.anios.length - 1];
}

// ---------------------------------------------------------------- series
const pos = (d: DatosContexto, y: number) => d.anios.indexOf(y);

function promedio(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter(ok) as number[];
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
/** Serie anual de una entidad (VEC = promedio de los vecinos que tengan dato ese año). */
export function serieAnual(d: DatosContexto, codigo: string, ent: string, tabla: "real" | "proy_abril" = "real"): (number | null)[] {
  const t = d[tabla]?.[codigo];
  if (!t) return d.anios.map(() => null);
  if (ent === VEC) return d.anios.map((_, i) => promedio(VECINOS.map((e) => t[e]?.[i])));
  return t[ent] ?? d.anios.map(() => null);
}
/** Índice de PIB real encadenando el crecimiento anual, 100 en `base`. */
export function indiceCrecimiento(d: DatosContexto, ent: string, base: number): (number | null)[] {
  const g = serieAnual(d, "NGDP_RPCH", ent);
  const out: (number | null)[] = d.anios.map(() => null);
  const b = pos(d, base);
  if (b < 0) return out;
  out[b] = 100;
  for (let i = b + 1; i < d.anios.length; i++) { const p = out[i - 1], x = g[i]; if (!ok(p) || !ok(x)) break; out[i] = p * (1 + x / 100); }
  for (let i = b - 1; i >= 0; i--) { const s = out[i + 1], x = g[i + 1]; if (!ok(s) || !ok(x)) break; out[i] = s / (1 + x / 100); }
  return out;
}
/** Serie anual de un dato comparable; los índices (PIB real) salen con base 100 en `base`. */
export function serieComparar(d: DatosContexto, def: DefInd, ent: string, base: number): (number | null)[] {
  if (def.id === "pibr") {
    if (ent === VEC) { const s = VECINOS.map((e) => indiceCrecimiento(d, e, base)); return d.anios.map((_, i) => promedio(s.map((x) => x[i]))); }
    return indiceCrecimiento(d, ent, base);
  }
  if (def.id === "pibpcr") {
    // PIB real (índice encadenado) dividido por la población, llevado a 100 en el año base
    const porHab = (e: string) => {
      const idx = indiceCrecimiento(d, e, base), lp = serieAnual(d, "LP", e);
      const raw = idx.map((x, i) => (ok(x) && ok(lp[i]) && lp[i] !== 0 ? x / (lp[i] as number) : null));
      const b = raw[pos(d, base)];
      return ok(b) && b !== 0 ? raw.map((x) => (ok(x) ? (x / b) * 100 : null)) : raw.map(() => null);
    };
    if (ent === VEC) { const s = VECINOS.map(porHab); return d.anios.map((_, i) => promedio(s.map((x) => x[i]))); }
    return porHab(ent);
  }
  return serieAnual(d, def.origen, ent);
}

export interface Prom { v: number | null; n: number; de: number }
/** Promedio de una serie anual en los años cerrados de un presidente. */
export function promedioAnios(d: DatosContexto, s: (number | null)[], anios: number[]): Prom {
  const v = anios.map((y) => s[pos(d, y)]).filter(ok) as number[];
  return { v: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, n: v.length, de: anios.length };
}
/** Crecimiento acumulado (%) de un índice durante los años del mandato: del cierre del año previo al último año. */
export function crecimientoIndice(d: DatosContexto, s: (number | null)[], anios: number[]): Prom {
  if (!anios.length) return { v: null, n: 0, de: 0 };
  // Si no hay cierre del año anterior (los datos arrancan en 1990), se mide desde el primer año y se indica "n de m años".
  const previo = s[pos(d, anios[0] - 1)] ?? null;
  const a = ok(previo) ? previo : s[pos(d, anios[0])] ?? null, n = ok(previo) ? anios.length : anios.length - 1;
  const b = s[pos(d, anios[anios.length - 1])] ?? null;
  return ok(a) && ok(b) && a !== 0 && n > 0 ? { v: (b / a - 1) * 100, n, de: anios.length } : { v: null, n: 0, de: anios.length };
}

// ---------------------------------------------------------------- esperado vs. pasó
export interface FilaAnio { y: number; pArg: number | null; rArg: number | null; sArg: number | null; pGrp: number | null; rGrp: number | null; sGrp: number | null; dif: number | null }
export function filasEsperado(d: DatosContexto, codigo: string, grupo: string): FilaAnio[] {
  const hasta = ultimoCerrado(d);
  const rA = serieAnual(d, codigo, ARG), pA = serieAnual(d, codigo, ARG, "proy_abril");
  const rG = serieAnual(d, codigo, grupo), pG = serieAnual(d, codigo, grupo, "proy_abril");
  const sor = (r: number | null, p: number | null) => (ok(r) && ok(p) ? r - p : null);
  return d.anios.map((y, i) => {
    const cerrado = y <= hasta;
    const sA = cerrado ? sor(rA[i], pA[i]) : null, sG = cerrado ? sor(rG[i], pG[i]) : null;
    return { y, pArg: pA[i] ?? null, rArg: cerrado ? rA[i] ?? null : null, sArg: sA, pGrp: pG[i] ?? null, rGrp: cerrado ? rG[i] ?? null : null, sGrp: sG, dif: ok(sA) && ok(sG) ? sA - sG : null };
  });
}
export interface SorpresaPres { anios: number[]; n: number; sArg: number | null; sGrp: number | null; dif: number | null }
/** Promedios sobre los mismos años (los que tienen sorpresa de la Argentina y del grupo), así la diferencia es siempre la resta de las dos. */
export function sorpresaPres(filas: FilaAnio[], anios: number[]): SorpresaPres {
  const par = filas.filter((x) => anios.includes(x.y) && ok(x.sArg) && ok(x.sGrp));
  const m = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return { anios, n: par.length, sArg: m(par.map((x) => x.sArg as number)), sGrp: m(par.map((x) => x.sGrp as number)), dif: m(par.map((x) => (x.sArg as number) - (x.sGrp as number))) };
}

// ---------------------------------------------------------------- viento de cola o de frente
export type Marca = "favor" | "neutro" | "contra" | "sin";
export interface DefViento {
  id: string; n: string; u: string; dir: number; marca: boolean; fmt: (v: number) => string;
  fuente: "mensual" | "anual"; serie?: string; med?: string; codigo?: string; ent?: string; umbralAbs?: number;
}
/** Indicadores de viento. Umbral: 10 % del promedio de toda la serie, o `umbralAbs` puntos si está. */
export const VIENTOS: Omit<DefViento, "fmt">[] = [
  { id: "soja", n: "Soja", u: "US$ de hoy por tonelada", dir: 1, marca: true, fuente: "mensual", serie: "ctx_soja", med: "usdr" },
  { id: "maiz", n: "Maíz", u: "US$ de hoy por tonelada", dir: 1, marca: true, fuente: "mensual", serie: "ctx_maiz", med: "usdr" },
  { id: "trigo", n: "Trigo", u: "US$ de hoy por tonelada", dir: 1, marca: true, fuente: "mensual", serie: "ctx_trigo", med: "usdr" },
  { id: "petroleo", n: "Petróleo (Brent)", u: "US$ de hoy por barril", dir: 0, marca: false, fuente: "mensual", serie: "ctx_petroleo", med: "usdr" },
  { id: "tdi", n: "Términos de intercambio", u: "índice 2004=100", dir: 1, marca: true, fuente: "mensual", serie: "ctx_terminos" },
  { id: "fed", n: "Tasa de la Fed", u: "% anual", dir: -1, marca: true, fuente: "mensual", serie: "ctx_fed", umbralAbs: 1 },
  { id: "bra", n: "Crecimiento de Brasil", u: "% anual", dir: 1, marca: true, fuente: "anual", codigo: "NGDP_RPCH", ent: "BRA", umbralAbs: 1 },
  { id: "chn", n: "Crecimiento de China", u: "% anual", dir: 1, marca: true, fuente: "anual", codigo: "NGDP_RPCH", ent: "CHN", umbralAbs: 1 },
];
export const IDS_VIENTO = VIENTOS.filter((v) => v.serie).map((v) => v.serie as string);

export interface FilaViento { def: Omit<DefViento, "fmt">; mandato: number | null; total: number | null; marca: Marca; n: number }
function marcar(def: Omit<DefViento, "fmt">, mandato: number | null, total: number | null): Marca {
  if (!def.marca || !ok(mandato) || !ok(total)) return "sin";
  const umbral = def.umbralAbs ?? Math.abs(total) * 0.1;
  const mejor = (mandato - total) * def.dir;
  return mejor > umbral ? "favor" : mejor < -umbral ? "contra" : "neutro";
}
/** Vientos de un presidente: promedio del mandato contra el de toda la serie. Devuelve null en los que no tienen datos. */
export function vientosPres(m: Motor, d: DatosContexto | null, pres: Pres): FilaViento[] {
  const hasta = d ? ultimoCerrado(d) : 0;
  return VIENTOS.map((def) => {
    if (def.fuente === "anual") {
      if (!d) return { def, mandato: null, total: null, marca: "sin" as Marca, n: 0 };
      const s = serieAnual(d, def.codigo as string, def.ent as string);
      const anios = aniosDe(pres.id, hasta);
      const pm = promedioAnios(d, s, anios), tot = promedio(d.anios.map((y, i) => (y <= hasta ? s[i] : null)));
      return { def, mandato: pm.v, total: tot, marca: marcar(def, pm.v, tot), n: pm.n };
    }
    if (!def.serie || !m.SER[def.serie]) return { def, mandato: null, total: null, marca: "sin" as Marca, n: 0 };
    const v = m.calc({ id: def.serie, med: def.med, rel: null }).v;
    const dentro = v.slice(pres.i0, pres.i1 + 1).filter(ok) as number[];
    const mand = dentro.length ? dentro.reduce((a, b) => a + b, 0) / dentro.length : null;
    const tot = promedio(v);
    return { def, mandato: mand, total: tot, marca: marcar(def, mand, tot), n: dentro.length };
  });
}
export const MARCA_TXT: Record<Marca, string> = { favor: "a favor", neutro: "neutro", contra: "en contra", sin: "—" };

// ---------------------------------------------------------------- recuadro "Contexto del mandato"
export interface ResumenMandato {
  anios: number[]; crecArg: Prom; crecGrp: Prom; sorpresa: SorpresaPres; favor: number; neutro: number; contra: number; hayViento: boolean;
}
export function resumenMandato(m: Motor, d: DatosContexto, pres: Pres, grupo: string): ResumenMandato {
  const anios = aniosDe(pres.id, ultimoCerrado(d));
  const filas = filasEsperado(d, "NGDP_RPCH", grupo);
  const v = vientosPres(m, d, pres).filter((x) => x.marca !== "sin");
  return {
    anios, crecArg: promedioAnios(d, serieAnual(d, "NGDP_RPCH", ARG), anios), crecGrp: promedioAnios(d, serieAnual(d, "NGDP_RPCH", grupo), anios),
    sorpresa: sorpresaPres(filas, anios), favor: v.filter((x) => x.marca === "favor").length, neutro: v.filter((x) => x.marca === "neutro").length,
    contra: v.filter((x) => x.marca === "contra").length, hayViento: v.length > 0,
  };
}
