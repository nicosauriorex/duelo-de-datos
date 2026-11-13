// Las cuentas de cada provincia (/provincias/?vista=cuentas, docs/specs/provincias.md, fase 2): ingresos, gastos, resultado, deuda y empleo de los gobiernos provinciales
// (Administración Pública No Financiera; no incluye municipios ni empresas provinciales), según la Dirección Nacional de Asuntos Provinciales (DNAP).
// Los datos los escribe pipeline/provincias_dnap.py en `provincias_cuentas.json` (millones de pesos corrientes). La población sale de `provincias.json` (fase 1).
// Pesos de hoy: el mismo deflactor anual del gasto de la Nación (lib/gasto.ts). Las cuentas cierran con los valores redondeados que se ven.
// Sin puntaje combinado ni colores de bueno o malo (D-012): el orden es el de un indicador, de mayor a menor, y se puede invertir.
import type { FormatoImg } from "./config";
import type { DatosImagen, FilaBarra } from "./imagen";
import { aDec, conSigno, decPctDe, escalaDe, fechaLarga, mostrado, repartir } from "./gasto";
import { nf0, nfDec, norm, r1 } from "./formato";
import { txtVariacion, type PuntoEvo } from "./universidades";
import { buscarProv, type Contexto } from "./provincias";

// ---------------------------------------------------------------- formato del archivo (contrato con el pipeline)
export interface FuenteC { pagina: string | null; archivo: string | null; fecha: string | null }
export interface FinalidadC { n: string; f: string | null; v: (number | null)[] }
export type SerieC = Record<string, (number | null)[]>;
export interface ProvCuentas {
  id: string; c: SerieC; fin: FinalidadC[]; imp: SerieC; emp: SerieC;
  deuda: Record<string, number | null>;
  /** Por año del archivo: true si tiene caja de jubilaciones propia (`prest_ss` / `gas_tot` ≥ 5 %); null si no se sabe. */
  caja: (boolean | null)[];
  /** Población por año del archivo (INDEC, proyección base 2010; null antes de 2010). */
  pob: (number | null)[];
}
export interface DatosCuentas {
  generado: string; fuente: string; fuentes: Record<string, FuenteC>; anios: number[];
  provincias: ProvCuentas[]; deudaFecha: string | null; consolidado: { c: SerieC; emp: SerieC } | null;
  /** Por año ("2025"), ids de las provincias sin cuentas publicadas: el consolidado de ese año no las incluye. */
  sinCuentas: Record<string, string[]>;
}

const nums = (v: unknown, n: number): (number | null)[] =>
  Array.from({ length: n }, (_, i) => { const x = Array.isArray(v) ? (v[i] as unknown) : null; return typeof x === "number" && isFinite(x) ? x : null; });
const serie = (o: unknown, n: number): SerieC => {
  const r: SerieC = {};
  if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o as Record<string, unknown>)) r[k] = nums(v, n);
  return r;
};
const idDe = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x.trim() : typeof x === "number" && Number.isFinite(x) ? String(x) : null);

/** Valida el archivo con tolerancia: lo que falta queda en null o vacío. null si no trae años ni provincias. */
export function decodificarCuentas(c: unknown): DatosCuentas | null {
  if (!c || typeof c !== "object") return null;
  const r = c as Record<string, unknown>;
  const anios = (Array.isArray(r.anios) ? r.anios : []).filter((a): a is number => Number.isInteger(a));
  if (!anios.length || anios.some((a, i) => i > 0 && a <= anios[i - 1]) || !Array.isArray(r.provincias)) return null;
  const n = anios.length, provincias: ProvCuentas[] = [];
  for (const p of r.provincias as unknown[]) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>, id = idDe(o.id);
    if (!id) continue;
    const fin: FinalidadC[] = (Array.isArray(o.fin) ? (o.fin as unknown[]) : []).flatMap((f): FinalidadC[] => {
      const q = f as Record<string, unknown> | null;
      return q && typeof q === "object" && typeof q.n === "string" && q.n ? [{ n: q.n, f: typeof q.f === "string" && q.f ? q.f : null, v: nums(q.v, n) }] : [];
    });
    const dd = o.deuda && typeof o.deuda === "object" ? (o.deuda as Record<string, unknown>) : {}, deuda: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(dd)) deuda[k] = typeof v === "number" && isFinite(v) ? v : null;
    const caja = Array.from({ length: n }, (_, i) => { const x = Array.isArray(o.caja) ? (o.caja[i] as unknown) : null; return typeof x === "boolean" ? x : null; });
    provincias.push({ id, c: serie(o.c, n), fin, imp: serie(o.imp, n), emp: serie(o.emp, n), deuda, caja, pob: nums(o.pob, n) });
  }
  if (!provincias.length) return null;
  const fuentes: Record<string, FuenteC> = {};
  if (r.fuentes && typeof r.fuentes === "object") {
    for (const [k, v] of Object.entries(r.fuentes as Record<string, unknown>)) {
      const o = v as Record<string, unknown> | null, s = (x: unknown) => (typeof x === "string" && x ? x : null);
      if (o && typeof o === "object") fuentes[k] = { pagina: s(o.pagina), archivo: s(o.archivo), fecha: s(o.fecha) ?? s(o.bajado) };
    }
  }
  const cons = r.consolidado as Record<string, unknown> | null | undefined;
  return {
    generado: typeof r.generado === "string" ? r.generado : "", fuente: typeof r.fuente === "string" ? r.fuente : "", fuentes, anios, provincias,
    deudaFecha: typeof r.deuda_fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.deuda_fecha) ? r.deuda_fecha : null,
    consolidado: cons && typeof cons === "object" ? { c: serie(cons.c, n), emp: serie(cons.emp, n) } : null,
    sinCuentas: Object.fromEntries(Object.entries(r.sin_cuentas && typeof r.sin_cuentas === "object" ? (r.sin_cuentas as Record<string, unknown>) : {})
      .map(([a, v]): [string, string[]] => [a, (Array.isArray(v) ? v : []).map(idDe).filter((x): x is string => !!x)])),
  };
}

/** "En 2025 no hay cuentas publicadas de La Pampa: Las 24 juntas no la incluyen." null si están todas. */
export function notaSinCuentas(x: CtxC, anio: number): string | null {
  const ids = x.d.sinCuentas[String(anio)] ?? [];
  if (!ids.length) return null;
  const ns = ids.map((id) => nombreProv(x, id));
  const lista = ns.length === 1 ? ns[0] : `${ns.slice(0, -1).join(", ")} y ${ns[ns.length - 1]}`;
  return `En ${anio} la Dirección Nacional de Asuntos Provinciales todavía no publicó las cuentas de ${lista}: sale sin dato y "Las 24 juntas" no ${ns.length === 1 ? "la" : "las"} incluye.`;
}

// ---------------------------------------------------------------- indicadores
export type IdInd = "gasto_hab" | "sueldos" | "obra" | "recaud_hab" | "ib" | "depende" | "res_fin" | "res_pri" | "empleados" | "sueldo_medio" | "deuda_hab" | "deuda_ing";
/** pesos: pesos de hoy (variación real); pct: porcentaje (variación en puntos); tasa: cantidad (variación en unidades). */
export type TipoInd = "pesos" | "pct" | "tasa";
export interface Indicador { id: IdInd; n: string; explica: string; formula: string; tipo: TipoInd; fijo: boolean }
export const INDICADORES: Indicador[] = [
  { id: "gasto_hab", n: "Gasto por habitante", explica: "Lo que gastó el gobierno de la provincia por cada habitante, en pesos de hoy.", formula: "Gastos totales ÷ población, en pesos de hoy", tipo: "pesos", fijo: false },
  { id: "sueldos", n: "Sueldos sobre el gasto total", explica: "Qué parte de lo que gasta la provincia se va en sueldos de su personal.", formula: "Gastos en personal ÷ gastos totales", tipo: "pct", fijo: false },
  { id: "obra", n: "Obra pública sobre el gasto total", explica: "Qué parte de lo que gasta la provincia va a inversión real directa (obras y equipamiento).", formula: "Inversión real directa ÷ gastos totales", tipo: "pct", fijo: false },
  { id: "recaud_hab", n: "Recaudación propia por habitante", explica: "Lo que la provincia cobra con sus propios impuestos por cada habitante, en pesos de hoy.", formula: "Ingresos tributarios de origen provincial ÷ población, en pesos de hoy", tipo: "pesos", fijo: false },
  { id: "ib", n: "Ingresos Brutos sobre la recaudación propia", explica: "Qué parte de los impuestos propios de la provincia es Ingresos Brutos.", formula: "Ingresos Brutos ÷ ingresos tributarios de origen provincial", tipo: "pct", fijo: false },
  { id: "depende", n: "Cuánto depende de la Nación", explica: "Qué parte de los ingresos de la provincia llega de la Nación (coparticipación y transferencias).", formula: "(Ingresos tributarios de origen nacional + transferencias corrientes + transferencias de capital) ÷ ingresos totales. Las transferencias son casi todas de la Nación", tipo: "pct", fijo: false },
  { id: "res_fin", n: "Resultado financiero sobre los ingresos", explica: "Cuánto sobró (positivo) o faltó (negativo) después de pagar todos los gastos, incluidos los intereses, como parte de los ingresos.", formula: "(Ingresos totales − gastos totales) ÷ ingresos totales", tipo: "pct", fijo: false },
  { id: "res_pri", n: "Resultado primario sobre los ingresos", explica: "Lo mismo que el resultado financiero, pero sin contar los intereses de la deuda.", formula: "(Ingresos totales − gastos totales sin intereses) ÷ ingresos totales", tipo: "pct", fijo: false },
  { id: "empleados", n: "Empleados públicos cada mil habitantes", explica: "Cuántas personas trabajan para el gobierno de la provincia por cada mil habitantes.", formula: "Planta ocupada ÷ población × 1.000, como la calcula la Dirección Nacional de Asuntos Provinciales", tipo: "tasa", fijo: false },
  { id: "sueldo_medio", n: "Sueldo medio mensual", explica: "Gasto medio por mes y por persona en el personal de la provincia, en pesos de hoy.", formula: "Gasto en personal ÷ planta ocupada ÷ meses, en pesos de hoy", tipo: "pesos", fijo: false },
  { id: "deuda_hab", n: "Deuda por habitante", explica: "Lo que debe la provincia por cada habitante, en pesos de hoy. Es el último dato: no depende del año elegido.", formula: "Stock de deuda (último publicado, sin deuda flotante) ÷ población de ese año, en pesos de hoy", tipo: "pesos", fijo: true },
  { id: "deuda_ing", n: "Deuda sobre los ingresos", explica: "Lo que debe la provincia como porcentaje de lo que le ingresa en un año (100 % = un año entero de ingresos). Es el último dato: no depende del año elegido.", formula: "Stock de deuda (último publicado) ÷ ingresos totales del último año cerrado", tipo: "pct", fijo: true },
];
export const IND_DEFECTO: IdInd = "gasto_hab";
export const esIndicador = (s: string | null): s is IdInd => INDICADORES.some((i) => i.id === s);
export const indicadorDe = (id: IdInd): Indicador => INDICADORES.find((i) => i.id === id)!;
export const opcionesIndicador = (): [string, string][] => INDICADORES.map((i) => [i.id, i.n]);

export type OrdenC = "desc" | "asc";
export const ORDENES_C: [OrdenC, string][] = [["desc", "De mayor a menor"], ["asc", "De menor a mayor"]];
export const ORDEN_C_DEFECTO: OrdenC = "desc";
export const esOrdenC = (s: string | null): s is OrdenC => ORDENES_C.some((o) => o[0] === s);

export const RUTA_C = "/provincias/";
export const VISTA_CUENTAS = "cuentas";
export const TITULO_C = "Las cuentas de cada provincia";
export const ANIO_MIN_C = 2010;   // la población por provincia (INDEC) arranca en 2010
export const FUENTE_C = "Dirección Nacional de Asuntos Provinciales (Ministerio de Economía), ejecución presupuestaria provincial (provisoria), e INDEC (proyecciones de población)";
export const NOTA_CAJA = "Tiene su propia caja de jubilaciones: paga jubilaciones y pensiones provinciales, por eso gasta más por habitante y más en sueldos y prestaciones que las que la transfirieron a la Nación.";
/** El "Sueldo medio mensual" de la DNAP se toma en pesos corrientes por mes (ver docs/ESTADO.md si se confirma otra unidad). */
const UNIDAD_MEDIO = 1;

// ---------------------------------------------------------------- contexto y entidades
export interface CtxC { d: DatosCuentas; p: Contexto }
export const crearCtxC = (d: DatosCuentas, p: Contexto): CtxC => ({ d, p });
/** Un gobierno provincial (o las 24 juntas, con `id` null) con lo que hace falta para calcular. */
interface Ent { id: string | null; n: string; c: SerieC; imp: SerieC; emp: SerieC; deuda: Record<string, number | null>; caja: (boolean | null)[]; fin: FinalidadC[] }

const nombreProv = (x: CtxC, id: string) => buscarProv(x.p.d, id)?.n ?? `Jurisdicción ${id}`;
/** Las 24 jurisdicciones con nombre del público (el de provincias.json). */
function entidades(x: CtxC): Ent[] {
  return x.d.provincias.map((p) => ({ id: p.id, n: nombreProv(x, p.id), c: p.c, imp: p.imp, emp: p.emp, deuda: p.deuda, caja: p.caja, fin: p.fin }));
}
/** Población de una provincia (o de las 24 juntas) en un año. Primero la del archivo de cuentas (desde 2010);
 *  si no la trae, la de provincias.json (desde 2018). null si falta ese año o alguna provincia. */
function pobDe(x: CtxC, id: string | null, anio: number): number | null {
  const j = x.d.anios.indexOf(anio);
  if (j >= 0) {
    const de = (p: ProvCuentas) => { const v = p.pob[j]; return v != null && v > 0 ? v : null; };
    if (id != null) { const p = x.d.provincias.find((q) => Number(q.id) === Number(id)); const v = p ? de(p) : null; if (v != null) return v; }
    else { const vs = conCuentas(x, anio).map(de); if (vs.every((v) => v != null)) return (vs as number[]).reduce((a, b) => a + b, 0); }
  }
  const k = x.p.d.anios.findIndex((a) => a.anio === anio);
  if (k < 0) return null;
  if (id != null) { const v = buscarProv(x.p.d, id)?.pob[k] ?? null; return v != null && v > 0 ? v : null; }
  let s = 0;
  for (const p of conCuentas(x, anio)) { const v = buscarProv(x.p.d, p.id)?.pob[k] ?? null; if (v == null || !(v > 0)) return null; s += v; }
  return s > 0 ? s : null;
}
/** Las provincias con cuentas publicadas ese año: la población de "Las 24 juntas" se suma sobre las mismas que el consolidado. */
const conCuentas = (x: CtxC, anio: number): ProvCuentas[] => {
  const fuera = new Set((x.d.sinCuentas[String(anio)] ?? []).map(Number));
  return x.d.provincias.filter((p) => !fuera.has(Number(p.id)));
};
/** Población de las provincias con deuda publicada (la de "Las 24 juntas" suma solo esas, igual que la deuda). */
function pobConDeuda(x: CtxC, anio: number): number | null {
  let s = 0;
  for (const p of x.d.provincias) {
    if (p.deuda?.total == null) continue;
    const v = pobDe(x, p.id, anio);
    if (v == null) return null;
    s += v;
  }
  return s > 0 ? s : null;
}
/** Suma de lo que hay: una provincia sin dato no deja a "Las 24 juntas" sin valor (null solo si no hay ninguna). */
const suma = (xs: (number | null)[]): number | null => { const v = xs.filter((y): y is number => y != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
/** Las 24 juntas: el consolidado de la DNAP (cuentas) y, si no trae empleo, la suma de las 24. */
function juntas(x: CtxC): Ent {
  const n = x.d.anios.length, ps = x.d.provincias;
  const deuda: Record<string, number | null> = {};
  for (const k of new Set(ps.flatMap((p) => Object.keys(p.deuda ?? {})))) deuda[k] = suma(ps.map((p) => p.deuda?.[k] ?? null));
  const emp: SerieC = { ...(x.d.consolidado?.emp ?? {}) };
  if (!emp.planta) emp.planta = Array.from({ length: n }, (_, i) => suma(ps.map((p) => p.emp.planta?.[i] ?? null)));
  if (!emp.c1000) emp.c1000 = x.d.anios.map((a, i) => { const pl = emp.planta[i], pob = pobDe(x, null, a); return pl != null && pob ? (pl / pob) * 1000 : null; });
  const c: SerieC = { ...(x.d.consolidado?.c ?? {}) };
  for (const k of new Set(ps.flatMap((p) => Object.keys(p.c)))) if (!c[k]) c[k] = Array.from({ length: n }, (_, i) => suma(ps.map((p) => p.c[k]?.[i] ?? null)));
  const imp: SerieC = {};
  for (const k of new Set(ps.flatMap((p) => Object.keys(p.imp)))) imp[k] = Array.from({ length: n }, (_, i) => suma(ps.map((p) => p.imp[k]?.[i] ?? null)));
  return { id: null, n: "Las 24 juntas", c, imp, emp, deuda, caja: Array(n).fill(null), fin: [] };
}

const factor = (x: CtxC, anio: number) => x.p.def.factor(anio) ?? 1;
const aniosC = (x: CtxC) => x.d.anios.filter((a) => a >= ANIO_MIN_C);
export const aniosDeCuentas = aniosC;
export const anioDefectoC = (x: CtxC): number => { const a = aniosC(x); return a[a.length - 1] ?? x.d.anios[x.d.anios.length - 1]; };
export const anioValidoC = (x: CtxC, s: string | null): number | null => aniosC(x).find((a) => String(a) === s) ?? null;
export const opcionesAnioC = (x: CtxC): [string, string][] => [...aniosC(x)].reverse().map((a) => [String(a), String(a)]);
export const buscarProvC = (x: CtxC, s: string | null): { id: string; n: string } | null => {
  if (!s) return null;
  const k = Number(s), e = x.d.provincias.find((p) => p.id === s || (s.trim() !== "" && Number.isFinite(k) && Number(p.id) === k));
  return e ? { id: e.id, n: nombreProv(x, e.id) } : null;
};
/** Año del stock de deuda (el de `deuda_fecha`) y el último año cerrado con ingresos. */
const anioDeuda = (x: CtxC): number | null => (x.d.deudaFecha ? Number(x.d.deudaFecha.slice(0, 4)) : null);
const ultimoAnioIngresos = (x: CtxC, e: Ent): number | null => {
  const v = e.c.ing_tot ?? [];
  for (let i = x.d.anios.length - 1; i >= 0; i--) if (v[i] != null && v[i]! > 0) return x.d.anios[i];
  return null;
};

// ---------------------------------------------------------------- el valor de un indicador
const pct = (a: number | null | undefined, b: number | null | undefined): number | null => (a != null && b != null && b > 0 ? r1((a / b) * 100) : null);
const pesosPorHab = (x: CtxC, millones: number | null | undefined, anio: number, pob: number | null): number | null =>
  millones != null && pob != null && pob > 0 ? Math.round((millones * factor(x, anio) * 1e6) / pob) : null;

/** El valor del indicador para un gobierno y un año (null si falta algún dato). Pesos: pesos de hoy enteros; porcentajes y tasas: un decimal. */
function valorDe(x: CtxC, ind: Indicador, e: Ent, anio: number): number | null {
  const i = x.d.anios.indexOf(anio), g = (k: string) => (i >= 0 ? e.c[k]?.[i] ?? null : null);
  switch (ind.id) {
    case "gasto_hab": return pesosPorHab(x, g("gas_tot"), anio, pobDe(x, e.id, anio));
    case "recaud_hab": return pesosPorHab(x, g("trib_prov"), anio, pobDe(x, e.id, anio));
    case "sueldos": return pct(g("personal"), g("gas_tot"));
    case "obra": return pct(g("inversion"), g("gas_tot"));
    case "ib": return pct(i >= 0 ? e.imp.ib?.[i] ?? null : null, g("trib_prov"));
    case "depende": { const n = g("trib_nac"); return n == null ? null : pct(n + (g("transf_cor_ing") ?? 0) + (g("transf_cap_ing") ?? 0), g("ing_tot")); }
    case "res_fin": return pct(g("res_fin"), g("ing_tot"));
    case "res_pri": return pct(g("res_pri"), g("ing_tot"));
    case "empleados": { const v = i >= 0 ? e.emp.c1000?.[i] ?? null : null; return v != null ? r1(v) : null; }
    case "sueldo_medio": { const v = i >= 0 ? e.emp.medio?.[i] ?? null : null; return v != null ? Math.round(v * UNIDAD_MEDIO * factor(x, anio)) : null; }
    case "deuda_hab": { const a = anioDeuda(x); return a == null ? null : pesosPorHab(x, e.deuda?.total, a, e.id == null ? pobConDeuda(x, a) : pobDe(x, e.id, a)); }
    case "deuda_ing": { const a = ultimoAnioIngresos(x, e), k = a == null ? -1 : x.d.anios.indexOf(a); return k < 0 ? null : pct(e.deuda.total, e.c.ing_tot?.[k]); }
  }
}
const txtValor = (ind: Indicador, v: number): string => (ind.tipo === "pesos" ? `$ ${nf0.format(v)}` : ind.tipo === "pct" ? `${conSigno(v, 1)} %` : nfDec(1).format(v));
/** Variación contra el año anterior: real (en %) para montos; en puntos para porcentajes; en unidades para tasas. null si falta algún año. */
function variDe(x: CtxC, ind: Indicador, e: Ent, anio: number): { v: number; txt: string } | null {
  if (ind.fijo || !x.d.anios.includes(anio - 1)) return null;
  const a = valorDe(x, ind, e, anio - 1), b = valorDe(x, ind, e, anio);
  if (a == null || b == null) return null;
  if (ind.tipo === "pesos") return a > 0 ? (() => { const v = r1((b / a - 1) * 100); return { v, txt: txtVariacion(v) }; })() : null;
  const d = aDec(b - a, 1), s = d > 0 ? "+" : "";
  return { v: d, txt: ind.tipo === "pct" ? `${s}${conSigno(d, 1)} puntos` : `${s}${conSigno(d, 1)}` };
}

// ---------------------------------------------------------------- la tabla
export interface FilaC { id: string; n: string; pos: number | null; caja: boolean; valor: number | null; txt: string; variTxt: string | null }
export interface VistaC {
  anio: number; ind: Indicador; orden: OrdenC; filas: FilaC[]; juntas: { txt: string; variTxt: string | null };
  conCaja: number; unidad: string; encVari: string | null; fechaDeuda: string | null; aviso: string | null; sinPoblacion: boolean;
  /** Provincias sin cuentas publicadas ese año (null si están todas). */
  sinCuentas: string | null;
}
const unidadDe = (x: CtxC, ind: Indicador, anio: number): string => {
  const hoy = `pesos de ${x.p.def.ref}, ajustados por inflación con el IPC`;
  switch (ind.id) {
    case "gasto_hab": case "recaud_hab": return `Pesos por habitante (${hoy})`;
    case "sueldo_medio": return `Pesos por mes (${hoy})`;
    case "empleados": return "Empleados cada mil habitantes";
    case "deuda_hab": return `Pesos por habitante (${hoy}) al ${fechaLarga(x.d.deudaFecha) ?? "último dato publicado"}`;
    case "deuda_ing": return `% de los ingresos de ${ultimoAnioIngresos(x, juntas(x)) ?? "último año"} (deuda al ${fechaLarga(x.d.deudaFecha) ?? "último dato publicado"})`;
    default: return `% (${anio})`;
  }
};

/** La tabla de las 24 jurisdicciones de un año, ordenada por el indicador (sin dato al final) y la fila de las 24 juntas aparte. */
export function armarVistaC(x: CtxC, o: { anio: number; ind: IdInd; orden: OrdenC }): VistaC | null {
  const ind = indicadorDe(o.ind), i = x.d.anios.indexOf(o.anio);
  if (i < 0) return null;
  const ents = entidades(x).map((e) => ({ e, v: valorDe(x, ind, e, o.anio), vari: variDe(x, ind, e, o.anio) }));
  if (!ents.some((t) => t.v != null)) return null;
  ents.sort((a, b) => {
    if (a.v == null && b.v == null) return a.e.n.localeCompare(b.e.n, "es");
    if (a.v == null) return 1;
    if (b.v == null) return -1;
    return (o.orden === "desc" ? b.v - a.v : a.v - b.v) || a.e.n.localeCompare(b.e.n, "es");
  });
  let pos = 0;
  const filas: FilaC[] = ents.map((t) => ({
    id: t.e.id!, n: t.e.n, pos: t.v != null ? ++pos : null, caja: t.e.caja[i] === true, valor: t.v,
    txt: t.v != null ? txtValor(ind, t.v) : "Sin dato", variTxt: t.vari?.txt ?? null,
  }));
  const j = juntas(x), jv = valorDe(x, ind, j, o.anio), jvari = variDe(x, ind, j, o.anio);
  const sinFactor = x.p.def.factor(o.anio) == null && ind.tipo === "pesos";
  return {
    anio: o.anio, ind, orden: o.orden, filas, juntas: { txt: jv != null ? txtValor(ind, jv) : "–", variTxt: jvari?.txt ?? null },
    conCaja: filas.filter((f) => f.caja).length, unidad: unidadDe(x, ind, o.anio), sinCuentas: ind.fijo ? null : notaSinCuentas(x, o.anio),
    encVari: ind.fijo ? null : ind.tipo === "pesos" ? `Variación real vs ${o.anio - 1}` : ind.tipo === "pct" ? `Variación vs ${o.anio - 1}, en puntos` : `Variación vs ${o.anio - 1}`,
    fechaDeuda: ind.fijo ? x.d.deudaFecha : null,
    aviso: sinFactor ? `No hay inflación para ${o.anio}: se muestra en pesos corrientes.` : null,
    sinPoblacion: ents.some((t) => t.v == null) && (ind.id === "gasto_hab" || ind.id === "recaud_hab" || ind.id === "deuda_hab") && ents.every((t) => pobDe(x, t.e.id, ind.fijo ? anioDeuda(x) ?? o.anio : o.anio) == null),
  };
}

// ---------------------------------------------------------------- detalle de una provincia
export interface FilaCuenta { n: string; txt: string; sub?: boolean }
export interface CuentasAnio { unidad: string; ingresos: FilaCuenta[]; gastos: FilaCuenta[]; resultado: FilaCuenta }
export interface BarraFin { n: string; txt: string; parte: string; ancho: number }
export interface PuntoC extends PuntoEvo { neg: boolean }
export interface EvoC { puntos: PuntoC[]; primero: PuntoC | null; ultimo: PuntoC | null; filas: { anio: number; txt: string | null; vari: string | null }[]; hayNegativos: boolean }
export interface DetalleC {
  id: string; n: string; anio: number; caja: boolean; valorTxt: string | null; variTxt: string | null;
  cuentas: CuentasAnio | null; finalidades: BarraFin[] | null; finTotal: string | null; finNota: string | null; evo: EvoC | null;
}

const cuenta = (e: Ent, k: string, i: number) => e.c[k]?.[i] ?? null;
/** Las cuentas de un año en una tabla corta que cierra: ingresos (impuestos propios, de la Nación, otros), gastos (sueldos, jubilaciones provinciales, transferencias,
 *  intereses, obra pública, otros) y el resultado. "Otros" es lo que falta para llegar al total; todo en una sola unidad y repartido para que las filas sumen lo que se ve. */
function cuentasDe(x: CtxC, e: Ent, anio: number): CuentasAnio | null {
  const i = x.d.anios.indexOf(anio), ing = cuenta(e, "ing_tot", i), gas = cuenta(e, "gas_tot", i);
  if (i < 0 || ing == null || gas == null) return null;
  const f = factor(x, anio), n = (k: string) => cuenta(e, k, i);
  const ingPartes: [string, number | null][] = [
    ["Impuestos propios de la provincia", n("trib_prov")],
    ["De la Nación (coparticipación y transferencias)", n("trib_nac") == null ? null : (n("trib_nac") ?? 0) + (n("transf_cor_ing") ?? 0) + (n("transf_cap_ing") ?? 0)],
  ];
  const gasPartes: [string, number | null][] = [
    ["Sueldos", n("personal")], ["Jubilaciones y pensiones provinciales", n("prest_ss")],
    ["Transferencias (a municipios y otros)", n("transf_cor_gas") == null && n("transf_cap_gas") == null ? null : (n("transf_cor_gas") ?? 0) + (n("transf_cap_gas") ?? 0)],
    ["Intereses de la deuda", n("intereses")], ["Obra pública (inversión real directa)", n("inversion")],
  ];
  const otro = (tot: number, ps: [string, number | null][]) => tot - ps.reduce((a, [, v]) => a + (v ?? 0), 0);
  const ingFilas = [...ingPartes, ["Otros ingresos", otro(ing, ingPartes)] as [string, number | null]];
  const gasFilas = [...gasPartes, ["Otros gastos", otro(gas, gasPartes)] as [string, number | null]];
  const hoy = (v: number) => v * f;
  const todos = [...ingFilas, ...gasFilas].map(([, v]) => (v == null ? 0 : Math.abs(hoy(v)))).filter((v) => v > 0);
  const esc = escalaDe("hoy", Math.max(Math.abs(hoy(ing)), Math.abs(hoy(gas))), todos.length ? Math.min(...todos) : 0);
  const cerrar = (filas: [string, number | null][], tot: number) => {
    const totR = mostrado(esc, hoy(tot)), conDato = filas.map(([, v]) => v != null);
    const vals = repartir(filas.map(([, v]) => esc.a(hoy(v ?? 0))), totR, esc.dec);
    return { totR, filas: filas.map(([nom], k): FilaCuenta => ({ n: nom, txt: conDato[k] ? esc.txt(vals[k]) : "–", sub: true })) };
  };
  const I = cerrar(ingFilas, ing), G = cerrar(gasFilas, gas);
  const res = aDec(I.totR - G.totR, esc.dec);
  return {
    unidad: x.p.def.factor(anio) == null ? `Pesos corrientes de ${anio}` : `Pesos de ${x.p.def.ref} (ajustados por inflación con el IPC)`,
    ingresos: [...I.filas, { n: "Ingresos totales", txt: esc.txt(I.totR) }],
    gastos: [...G.filas, { n: "Gastos totales", txt: esc.txt(G.totR) }],
    resultado: { n: "Resultado financiero (ingresos menos gastos)", txt: `${res > 0 ? "+" : ""}${esc.txt(res)}` },
  };
}

/** Gasto por finalidad de un año, en barras (de mayor a menor). Si el archivo trae finalidades y funciones, solo las finalidades (las que no tienen finalidad madre). */
function finalidadesDe(x: CtxC, e: Ent, anio: number): { barras: BarraFin[]; total: string; nota: string | null } | null {
  const i = x.d.anios.indexOf(anio);
  if (i < 0 || !e.fin.length) return null;
  const esFin = (f: FinalidadC) => !f.f || norm(f.f).trim() === norm(f.n).trim();
  let items: { n: string; v: number }[];
  if (e.fin.some(esFin)) items = e.fin.filter(esFin).flatMap((f) => (f.v[i] != null ? [{ n: f.n, v: f.v[i] as number }] : []));
  else {
    const m = new Map<string, number>();
    for (const f of e.fin) if (f.v[i] != null) m.set(f.f!, (m.get(f.f!) ?? 0) + (f.v[i] as number));
    items = [...m].map(([n, v]) => ({ n, v }));
  }
  items = items.filter((t) => t.v !== 0).sort((a, b) => b.v - a.v);
  const tot = items.reduce((a, t) => a + t.v, 0);
  if (!items.length || !(tot > 0)) return null;
  const f = factor(x, anio), hoy = items.map((t) => t.v * f);
  const esc = escalaDe("hoy", tot * f, Math.min(...hoy.map(Math.abs).filter((v) => v > 0)));
  const totR = mostrado(esc, tot * f), vals = repartir(hoy.map((v) => esc.a(v)), totR, esc.dec);
  const dec = decPctDe(items.map((t) => (t.v / tot) * 100)), partes = repartir(items.map((t) => (t.v / tot) * 100), 100, dec);
  const mayor = Math.max(...items.map((t) => t.v));
  return {
    barras: items.map((t, k) => ({ n: t.n, txt: esc.txt(vals[k]), parte: `${conSigno(partes[k], dec)} %`, ancho: Math.max(0.01, t.v / mayor) })),
    total: esc.txt(totR), nota: notaFinDistinta(tot, e.c.gas_tot?.[i] ?? null),
  };
}
/** La planilla de finalidades y la de cuentas a veces son ediciones distintas (2024: hasta 3,75 %): si los totales no coinciden, se dice. */
const notaFinDistinta = (fin: number, gas: number | null): string | null =>
  gas != null && gas > 0 && Math.abs(fin / gas - 1) > 0.0001
    ? "No coincide exactamente con los gastos totales de arriba: la Dirección Nacional de Asuntos Provinciales publica las dos planillas por separado, y esta es de otra edición."
    : null;

/** Evolución del indicador de una provincia entre 2010 y el último año. null si el indicador no depende del año. */
function evolucionC(x: CtxC, ind: Indicador, e: Ent): EvoC | null {
  if (ind.fijo) return null;
  const anios = aniosC(x), vals = anios.map((a) => valorDe(x, ind, e, a)), mayor = Math.max(...vals.map((v) => Math.abs(v ?? 0)), 0);
  const puntos: PuntoC[] = anios.map((a, k) => ({
    anio: a, valor: vals[k], enCurso: false, txt: vals[k] != null ? txtValor(ind, vals[k]!) : null,
    alto: vals[k] != null && mayor > 0 ? Math.max(0.03, Math.abs(vals[k]!) / mayor) : 0, neg: (vals[k] ?? 0) < 0,
  }));
  const con = puntos.filter((p) => p.valor != null);
  const filas = anios.map((a, k) => ({ anio: a, txt: puntos[k].txt, vari: variDe(x, ind, e, a)?.txt ?? null })).reverse();
  return { puntos, primero: con[0] ?? null, ultimo: con[con.length - 1] ?? null, filas, hayNegativos: puntos.some((p) => p.neg) };
}

export function armarDetalleC(x: CtxC, id: string, anio: number, ind: IdInd): DetalleC | null {
  const e = entidades(x).find((t) => t.id === id);
  if (!e) return null;
  const I = indicadorDe(ind), i = x.d.anios.indexOf(anio), v = valorDe(x, I, e, anio), fin = finalidadesDe(x, e, anio);
  return {
    id, n: e.n, anio, caja: i >= 0 && e.caja[i] === true, valorTxt: v != null ? txtValor(I, v) : null, variTxt: variDe(x, I, e, anio)?.txt ?? null,
    cuentas: cuentasDe(x, e, anio), finalidades: fin?.barras ?? null, finTotal: fin?.total ?? null, finNota: fin?.nota ?? null, evo: evolucionC(x, I, e),
  };
}

// ---------------------------------------------------------------- textos, dirección, imagen y vista previa
export const tituloC = (v: { anio: number; ind: Indicador }) => `${v.ind.n} en las 24 provincias${v.ind.fijo ? "" : `, ${v.anio}`}`;
/** Dirección de la vista (con los parámetros que no son los de defecto). `prov`: el detalle abierto. */
export function hrefC(v: { anio: number; ind: IdInd; orden: OrdenC }, anioDef: number, prov: string | null = null): string {
  const p = new URLSearchParams({ vista: VISTA_CUENTAS });
  if (v.ind !== IND_DEFECTO) p.set("ind", v.ind);
  if (v.anio !== anioDef) p.set("anio", String(v.anio));
  if (v.orden !== ORDEN_C_DEFECTO) p.set("orden", v.orden);
  if (prov) p.set("prov", prov);
  return `${RUTA_C}?${p.toString()}`;
}

/** Imagen para compartir: las 24 en barras con el indicador y el año elegidos, en el orden que se ve. */
export function armarImagenC(v: VistaC, formato: FormatoImg, hoy: Date = new Date()): DatosImagen {
  const filas: FilaBarra[] = v.filas.filter((f) => f.valor != null).map((f, i) => ({
    id: `cta-${i}`, nombre: f.n, valor: f.valor, variacion: f.txt, cls: "neutro", ini: null, fin: null, nota: null,
    detalle: [f.variTxt && (v.ind.tipo === "pesos" ? `${f.variTxt} real vs ${v.anio - 1}` : `${f.variTxt} vs ${v.anio - 1}`), f.caja && "caja de jubilaciones propia"].filter(Boolean).join(" · ") || " ",
  }));
  return {
    formato, titulo: tituloC(v), temporalidad: `${v.ind.explica.replace(/\.$/, "")}. Ordenado de ${v.orden === "desc" ? "mayor a menor" : "menor a mayor"}`,
    cifra: null, frases: [{ texto: `Las 24 juntas: ${v.juntas.txt}`, cls: "neutro" }, ...(v.sinCuentas || filas.length < v.filas.length
      ? [{ texto: v.sinCuentas ?? `Sin dato: ${v.filas.filter((f) => f.valor == null).map((f) => f.n).join(", ")}`, cls: "neutro" as const }] : [])],
    leyenda: null, x: [], series: [], fmtEje: (n) => String(n), fmtEje2: null, franjas: [], inicioTxt: null,
    comentario: "", unidad: v.unidad, fuente: FUENTE_C,
    nota: "Gobiernos provinciales (sin municipios ni empresas). Algunas provincias tienen su propia caja de jubilaciones y otras la transfirieron a la Nación: eso cambia los montos",
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-provincias-cuentas-${v.ind.id}${v.ind.fijo ? "" : `-${v.anio}`}`,
    lienzo: { tipo: "barras", filas, sinDatos: [], enc: { nombre: "Provincia", valor: v.ind.n }, sinTope: true },
    marcaUltimo: false,
  };
}

/** Título y descripción de la vista previa de la vista de cuentas: neutros, sin veredicto. */
export function textosPreviaC(v: VistaC): { titulo: string; descripcion: string } {
  return {
    titulo: `Las cuentas de las 24 provincias, ${v.anio}`,
    descripcion: `Cuánto gasta, cuánto recauda, cuánto recibe de la Nación y cuánto debe cada provincia, con datos oficiales. Por ejemplo: ${v.ind.n.toLowerCase()}, de las 24 jurisdicciones. Fuente: Dirección Nacional de Asuntos Provinciales (Ministerio de Economía).`,
  };
}
