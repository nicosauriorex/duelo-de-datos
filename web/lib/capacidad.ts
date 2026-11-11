// Capacidad de gobierno (bloque 6d): bancas propias y aliadas, leyes del Ejecutivo, DNU y vetos por presidente.
// Una sola fuente de verdad para la sección de Presidentes, el recuadro del mandato y las plantillas.
// Los datos vienen de capacidad.json (cargados a mano en datos/manual/, D-009). No se aplica la configuración de inicio (T±N): un DNU es de quien lo firmó.
import { PRES_DEF } from "./estadisticas";
import { nf0, nf1, ok } from "./formato";

export type Camara = "dip" | "sen";
export interface Banca { fecha: string; camara: Camara; pres: string; propios: number; aliados: number; total: number; nota?: string }
export interface Bloque { b: string; n: number; rol: "propio" | "aliado" | "otro" }
export interface DatosCap {
  bancas: Banca[];
  bloques: Record<string, Bloque[]>;                                  // "AAAA-MM-DD|cam" -> bloques del corte
  leyes: Record<string, { enviadas: number; aprobadas: number; nota?: string }>;
  dnu: Record<string, Record<string, number>>;                        // presidente -> año -> cantidad
  vetos: Record<string, Record<string, { t: number | null; p: number | null; i: number }>>;   // t y p null = sin fuente de totales: solo se conocen los insistidos
  ultima_carga: string | null;
  fuentes: Record<"bancas" | "leyes" | "dnu" | "vetos", string[]>;
  notas: Record<string, string>;
}
export type Indicador = "bancas" | "leyes" | "dnu" | "vetos";
export const INDICADORES: [Indicador, string][] = [["bancas", "Bancas"], ["leyes", "Leyes"], ["dnu", "DNU"], ["vetos", "Vetos"]];
export const CAMARAS: [Camara, string][] = [["dip", "Diputados"], ["sen", "Senado"]];

/** Meses "AAAA-MM" entre dos fechas (inclusive el primero, sin el último). */
const meses = (a: string, b: string) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
/** Último mes con dato del mandato en curso (para "hasta <mes-año>"): lo da el motor (F). */
export interface Mandato { id: string; n: string; ini: string; fin: string | null; anios: number; enCurso: boolean }

/** Mandatos desde PRES_DEF. `ultimo` = último mes con datos ("AAAA-MM"); el mandato en curso se cuenta hasta ahí. */
export function mandatos(ultimo: string): Mandato[] {
  return PRES_DEF.map((p, k) => {
    const sig = PRES_DEF[k + 1];
    const fin = sig ? sig.ini : null;
    const dur = meses(p.ini, fin ?? ultimo) + (fin ? 0 : 1);
    return { id: p.id, n: p.n, ini: p.ini, fin, anios: Math.max(dur, 1) / 12, enCurso: !sig };
  });
}

const pct = (n: number, t: number) => (t > 0 ? (n / t) * 100 : null);
export const bancasDe = (d: DatosCap, pres: string, cam: Camara) => d.bancas.filter((b) => b.pres === pres && b.camara === cam);
export const pctOficialismo = (b: Banca) => pct(b.propios + b.aliados, b.total);
export const pctPropios = (b: Banca) => pct(b.propios, b.total);
export const pctAliados = (b: Banca) => pct(b.aliados, b.total);

export interface ResBancas { alEmpezar: number | null; fechaInicio: string | null; promedio: number | null; cortes: number }
/** % propios + aliados al empezar (corte de la asunción, el primero del mandato) y promedio de todos los cortes. */
export function resumenBancas(d: DatosCap, pres: string, cam: Camara): ResBancas {
  const bs = bancasDe(d, pres, cam);
  if (!bs.length) return { alEmpezar: null, fechaInicio: null, promedio: null, cortes: 0 };
  const ps = bs.map((b) => pctOficialismo(b) as number);
  return { alEmpezar: ps[0], fechaInicio: bs[0].fecha, promedio: ps.reduce((a, c) => a + c, 0) / ps.length, cortes: bs.length };
}

export interface ResLeyes { enviadas: number; aprobadas: number; pct: number | null }
export function resumenLeyes(d: DatosCap, pres: string): ResLeyes | null {
  const l = d.leyes[pres];
  return l ? { ...l, pct: pct(l.aprobadas, l.enviadas) } : null;
}

export interface ResDnu { total: number; porAnio: number | null; anios: number }
export function resumenDnu(d: DatosCap, pres: string, m: Mandato): ResDnu | null {
  const x = d.dnu[pres];
  if (!x) return null;
  const total = Object.values(x).reduce((a, c) => a + c, 0);
  return { total, porAnio: total / m.anios, anios: Object.keys(x).length };
}

export interface ResVetos { totales: number | null; parciales: number | null; total: number | null; insistidos: number; porAnio: number | null; insistidosPorAnio: number }
/** Totales y parciales solo si hay dato de todos los años cargados; los insistidos se muestran siempre. */
export function resumenVetos(d: DatosCap, pres: string, m: Mandato): ResVetos | null {
  const x = d.vetos[pres];
  if (!x) return null;
  const v = Object.values(x);
  const insistidos = v.reduce((a, c) => a + c.i, 0);
  const completo = v.every((c) => c.t != null && c.p != null);
  const totales = completo ? v.reduce((a, c) => a + (c.t as number), 0) : null, parciales = completo ? v.reduce((a, c) => a + (c.p as number), 0) : null;
  const total = totales != null && parciales != null ? totales + parciales : null;
  return { totales, parciales, total, insistidos, porAnio: total != null ? total / m.anios : null, insistidosPorAnio: insistidos / m.anios };
}

/** Valor que se dibuja en la barra del celular para cada indicador (null = sin dato). */
export function valorIndicador(d: DatosCap, pres: string, m: Mandato, ind: Indicador): { v: number; txt: string } | null {
  const nf = (x: number, dec = 0) => (dec ? nf1 : nf0).format(x);
  if (ind === "bancas") {
    const r = resumenBancas(d, pres, "dip");
    return ok(r.alEmpezar) ? { v: r.alEmpezar as number, txt: `${nf(r.alEmpezar as number)} %` } : null;
  }
  if (ind === "leyes") {
    const r = resumenLeyes(d, pres);
    return r && ok(r.pct) ? { v: r.pct as number, txt: `${nf(r.aprobadas)} de ${nf(r.enviadas)} (${nf(r.pct as number)} %)` } : null;
  }
  if (ind === "dnu") {
    const r = resumenDnu(d, pres, m);
    return r && ok(r.porAnio) ? { v: r.porAnio, txt: `${nf(r.total)} (${nf(r.porAnio, 1)} por año)` } : null;
  }
  const r = resumenVetos(d, pres, m);
  if (!r) return null;
  return ok(r.porAnio) ? { v: r.porAnio, txt: `${nf(r.total as number)} (${nf(r.porAnio, 1)} por año)` } : { v: r.insistidosPorAnio, txt: `${nf(r.insistidos)} insistidos (${nf(r.insistidosPorAnio, 1)} por año)` };
}

/** Línea del recuadro "Contexto del mandato"; null si no hay ningún dato del presidente. */
export function lineaContexto(d: DatosCap, pres: string, m: Mandato): string | null {
  const nf = (x: number) => nf0.format(x);
  const partes: string[] = [];
  const dip = resumenBancas(d, pres, "dip"), sen = resumenBancas(d, pres, "sen");
  if (ok(dip.alEmpezar) && ok(sen.alEmpezar)) partes.push(`${nf(dip.alEmpezar as number)} % de Diputados y ${nf(sen.alEmpezar as number)} % del Senado propios o aliados al empezar`);
  else if (ok(dip.alEmpezar)) partes.push(`${nf(dip.alEmpezar as number)} % de Diputados propios o aliados al empezar`);
  else if (ok(sen.alEmpezar)) partes.push(`${nf(sen.alEmpezar as number)} % del Senado propios o aliados al empezar`);
  const l = resumenLeyes(d, pres);
  if (l) partes.push(`${nf(l.aprobadas)} de ${nf(l.enviadas)} leyes del Ejecutivo aprobadas`);
  const n = resumenDnu(d, pres, m);
  if (n) partes.push(`${nf(n.total)} DNU`);
  const v = resumenVetos(d, pres, m);
  if (v) partes.push(v.total != null ? `${nf(v.total)} vetos` : `${nf(v.insistidos)} vetos insistidos por el Congreso`);
  return partes.length ? `En el Congreso: ${partes.join("; ")}.` : null;
}

export const hayDatos = (d: DatosCap, pres: string) =>
  d.bancas.some((b) => b.pres === pres) || !!d.leyes[pres] || !!d.dnu[pres] || !!d.vetos[pres];

/** Quórum = mitad más uno del total de la cámara, en porcentaje. */
export const quorumPct = (total: number) => (Math.floor(total / 2) + 1) / total * 100;

// ---- Qué indicadores tienen datos cargados (página de Congreso)
/** ¿Algún presidente tiene dato de este indicador? Los vetos con solo insistidos cuentan como dato. */
export const presConDato = (d: DatosCap, ind: Indicador, M: Mandato[]): Mandato[] => M.filter((m) => valorIndicador(d, m.id, m, ind) != null);
export const indicadorTieneDatos = (d: DatosCap, ind: Indicador, M: Mandato[]) => presConDato(d, ind, M).length > 0;
/** Primer indicador con datos cargados (si no hay ninguno, "bancas"). */
export const primerIndicadorConDatos = (d: DatosCap, M: Mandato[]): Indicador =>
  INDICADORES.map((x) => x[0]).find((i) => indicadorTieneDatos(d, i, M)) ?? "bancas";
/** "Qué hay cargado": una oración con los indicadores y presidentes que tienen datos. */
export function queHayCargado(d: DatosCap, M: Mandato[]): string {
  const nombres: Record<Indicador, string> = { bancas: "bancas", leyes: "leyes del Ejecutivo", dnu: "DNU", vetos: "vetos" };
  const con: string[] = [], sin: string[] = [];
  INDICADORES.forEach(([i]) => {
    const ps = presConDato(d, i, M);
    if (!ps.length) { sin.push(nombres[i]); return; }
    const de = ps.length === M.length ? "todos los presidentes" : ps.length <= 4 ? ps.map((x) => x.n).join(", ") : `${ps.length} de ${M.length} presidentes`;
    const parcial = i === "vetos" && ps.some((x) => resumenVetos(d, x.id, x)?.total == null);
    con.push(`${i === "vetos" && parcial ? "vetos insistidos" : nombres[i]} (${de})`);
  });
  return `Hay cargado: ${con.length ? con.join("; ") : "nada todavía"}.${sin.length ? ` Todavía sin datos: ${sin.join(" y ")}.` : ""}`;
}
