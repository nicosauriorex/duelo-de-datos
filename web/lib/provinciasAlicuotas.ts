// Cuánto cobra cada provincia de Ingresos Brutos (/provincias/?vista=cuentas, docs/specs/provincias.md, fase 3): la alícuota TEÓRICA de la ley por actividad,
// de las 24 jurisdicciones, según la Dirección Nacional de Asuntos Provinciales (DNAP, planilla "<año>_ib.xlsx", marcada por ella como provisoria).
// El archivo `provincias_alicuotas.json` lo escribe pipeline/provincias_dnap.py. Sin ranking ni colores de bueno o malo (D-012): el orden es el de la alícuota y se puede invertir.
import { restaLimpia } from "./formato";
import { buscarProv, type Contexto } from "./provincias";

// ---------------------------------------------------------------- formato del archivo (contrato con el pipeline)
/** Una alícuota: porcentaje (1,5 = 1,5 %), el texto de la planilla ("exenta", "1,70% - 2,21% -2,50%") o null si no hay dato. */
export type ValorA = number | string | null;
export interface FuenteA { pagina: string | null; archivo: string | null; fecha: string | null }
export interface AperturaA { n: string; tope: ValorA[]; prov: Record<string, ValorA[]> }
export interface ActividadA { n: string; slug: string; tope: ValorA[]; prov: Record<string, ValorA[]>; aperturas: AperturaA[] }
export interface DatosAlicuotas {
  generado: string; fuente: string; aviso: string; fuentes: Record<string, FuenteA>; anios: number[]; actividades: ActividadA[];
}

const valor = (x: unknown): ValorA => {
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  if (typeof x === "string") { const t = x.replace(/\s+/g, " ").trim(); return t || null; }
  return null;
};
const valores = (v: unknown, n: number): ValorA[] => Array.from({ length: n }, (_, i) => valor(Array.isArray(v) ? (v[i] as unknown) : null));
const mapa = (o: unknown, n: number): Record<string, ValorA[]> => {
  const r: Record<string, ValorA[]> = {};
  if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o as Record<string, unknown>)) r[String(Number(k))] = valores(v, n);
  return r;
};
/** Identificador estable para la URL: "Industria Manufacturera" → "industria-manufacturera". */
export const slugDe = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Valida el archivo con tolerancia: lo que falta queda en null o vacío. null si no trae años ni actividades. */
export function decodificarAlicuotas(c: unknown): DatosAlicuotas | null {
  if (!c || typeof c !== "object") return null;
  const r = c as Record<string, unknown>;
  const anios = (Array.isArray(r.anios) ? r.anios : []).filter((a): a is number => Number.isInteger(a));
  if (!anios.length || anios.some((a, i) => i > 0 && a <= anios[i - 1]) || !Array.isArray(r.actividades)) return null;
  const n = anios.length, actividades: ActividadA[] = [], vistos = new Set<string>();
  for (const a of r.actividades as unknown[]) {
    if (!a || typeof a !== "object") continue;
    const o = a as Record<string, unknown>;
    if (typeof o.n !== "string" || !o.n.trim()) continue;
    const nombre = o.n.replace(/\s+/g, " ").trim(), slug = slugDe(nombre);
    if (!slug || vistos.has(slug)) continue;
    vistos.add(slug);
    const aperturas: AperturaA[] = (Array.isArray(o.aperturas) ? (o.aperturas as unknown[]) : []).flatMap((q): AperturaA[] => {
      const p = q as Record<string, unknown> | null;
      return p && typeof p === "object" && typeof p.n === "string" && p.n.trim() ? [{ n: p.n.replace(/\s+/g, " ").trim(), tope: valores(p.tope, n), prov: mapa(p.prov, n) }] : [];
    });
    actividades.push({ n: nombre, slug, tope: valores(o.tope, n), prov: mapa(o.prov, n), aperturas });
  }
  if (!actividades.length) return null;
  const fuentes: Record<string, FuenteA> = {};
  if (r.fuentes && typeof r.fuentes === "object") {
    for (const [k, v] of Object.entries(r.fuentes as Record<string, unknown>)) {
      const o = v as Record<string, unknown> | null, s = (x: unknown) => (typeof x === "string" && x ? x : null);
      if (o && typeof o === "object") fuentes[k] = { pagina: s(o.pagina), archivo: s(o.archivo), fecha: s(o.fecha) ?? s(o.bajado) };
    }
  }
  const t = (x: unknown) => (typeof x === "string" ? x : "");
  return { generado: t(r.generado), fuente: t(r.fuente), aviso: t(r.aviso), fuentes, anios, actividades };
}

// ---------------------------------------------------------------- parámetros de la URL
export const ACTIVIDAD_DEFECTO_N = "industria manufacturera";
export type OrdenA = "desc" | "asc";
export const ORDENES_A: [OrdenA, string][] = [["desc", "De mayor a menor"], ["asc", "De menor a mayor"]];
export const ORDEN_A_DEFECTO: OrdenA = "desc";
export const esOrdenA = (s: string | null): s is OrdenA => ORDENES_A.some((o) => o[0] === s);
/** La actividad por defecto: Industria manufacturera si está; si no, la primera. */
export const actividadDefecto = (d: DatosAlicuotas): ActividadA => d.actividades.find((a) => a.slug === slugDe(ACTIVIDAD_DEFECTO_N)) ?? d.actividades[0];
export const actividadValida = (d: DatosAlicuotas, s: string | null): ActividadA | null => d.actividades.find((a) => a.slug === s) ?? null;
export const anioDefectoA = (d: DatosAlicuotas): number => d.anios[d.anios.length - 1];
export const anioValidoA = (d: DatosAlicuotas, s: string | null): number | null => d.anios.find((a) => String(a) === s) ?? null;
export const opcionesActividadA = (d: DatosAlicuotas): [string, string][] => d.actividades.map((a) => [a.slug, a.n]);
export const opcionesAnioA = (d: DatosAlicuotas): [string, string][] => [...d.anios].reverse().map((a) => [String(a), String(a)]);

// ---------------------------------------------------------------- la vista
const nfA = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const redondeo2 = (v: number) => Math.round(v * 100) / 100;
/** "1,5 %"; el texto de la planilla tal cual; "Sin dato" si falta. */
export const txtAlicuota = (v: ValorA): string => (typeof v === "number" ? `${nfA.format(redondeo2(v))} %` : v ?? "Sin dato");
/** Diferencia con el tope en puntos, con los valores redondeados que se ven: "−0,5 p.p.", "+0,3 p.p.", "igual". null si alguno no es número. */
export function difConTope(v: ValorA, tope: ValorA): string | null {
  if (typeof v !== "number" || typeof tope !== "number") return null;
  const d = restaLimpia(redondeo2(v), redondeo2(tope));
  if (d === 0) return "igual";
  return `${d < 0 ? "−" : "+"}${nfA.format(Math.abs(d))} p.p.`;
}

export interface AperturaFila { n: string; txt: string }
export interface FilaA {
  id: string; n: string; num: number | null; txt: string; dif: string | null;
  /** Aperturas con dato en el año elegido (vacío si no tiene). */
  aperturas: AperturaFila[];
}
export interface VistaA {
  actividad: ActividadA; anio: number; orden: OrdenA; tope: string; filas: FilaA[];
  /** true si ninguna provincia tiene dato general ni aperturas ese año (la planilla de 2024 puede traer una actividad vacía). */
  vacia: boolean;
}

/** Las 24 filas para una actividad, año y orden. Los textos y los "Sin dato" van al final en los dos sentidos; empates por nombre. */
export function armarVistaA(d: DatosAlicuotas, c: Contexto, o: { actividad: ActividadA; anio: number; orden: OrdenA }): VistaA | null {
  const j = d.anios.indexOf(o.anio);
  if (j < 0) return null;
  const { actividad: a } = o, tope = a.tope[j] ?? null;
  const filas: FilaA[] = c.d.provincias.map((p) => {
    const k = String(Number(p.id)), v = a.prov[k]?.[j] ?? null;
    const aperturas = a.aperturas.flatMap((q): AperturaFila[] => { const w = q.prov[k]?.[j] ?? null; return w == null ? [] : [{ n: q.n, txt: txtAlicuota(w) }]; });
    return { id: p.id, n: buscarProv(c.d, p.id)?.n ?? p.n, num: typeof v === "number" ? v : null, txt: txtAlicuota(v), dif: difConTope(v, tope), aperturas };
  });
  const sg = o.orden === "desc" ? -1 : 1;
  filas.sort((x, y) => {
    if (x.num != null && y.num != null && redondeo2(x.num) !== redondeo2(y.num)) return sg * (x.num - y.num);
    if ((x.num != null) !== (y.num != null)) return x.num != null ? -1 : 1;
    return x.n.localeCompare(y.n, "es");
  });
  return { actividad: a, anio: o.anio, orden: o.orden, tope: tope == null ? "Sin dato" : txtAlicuota(tope), filas, vacia: filas.every((f) => f.num == null && f.txt === "Sin dato" && !f.aperturas.length) };
}