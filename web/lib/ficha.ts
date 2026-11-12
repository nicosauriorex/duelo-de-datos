// Ficha del dato: lo que calcula la ficha (componente `FichaDato`) y los links de su "Abrir completo".
// Una variable (`Expr`, la misma de la URL del Histórico) vista de tres formas: Histórico, Por presidente y Meses de mandato.
// Ver docs/specs/ajustes-tanda-5.md.
import { calcularMandato, claseVariacion, varNum, type BaseCfg, type ModoMandato, type Pres, type StatsM } from "./estadisticas";
import { fmtMes, ok } from "./formato";
import type { FrecOrigen } from "./historico";
import type { Calculo, Expr, Motor } from "./motor";
import { datosDesde, variacionMostrada } from "./tablas";
import { encExpr } from "./url";
import type { VelaDato } from "@/components/Velas";

/** Variable por defecto de la ficha (la de la ruta /dato/ sin parámetro o con uno inválido): la inflación mensual. */
export const EXPR_DEFECTO: Expr = { id: "ipc_empalme", med: "vm", rel: null, modo: "compra", esc: "" };
/** Presidentes que muestra por defecto Meses de mandato (única definición: la usan `Mandato.tsx` y la ficha). */
export const PRES_MANDATO_DEF = ["nk", "cfk1", "cfk2", "macri", "af", "milei"];
/** Modo con que abre Meses de mandato (única definición, como `PRES_MANDATO_DEF`). */
export const MODO_MANDATO_DEF: ModoMandato = "teorico";

const menos = (t: string) => t.replace(/^-/, "−");

/** Velas de "Por presidente": una por mandato con datos; los que no tienen, aparte. Lo usan `Presidentes.tsx` y la ficha. */
export function velasDe(m: Motor, c: Calculo, filas: { x: Pres; st: StatsM }[]): { velas: VelaDato[]; sin: string[] } {
  const velas: VelaDato[] = [], sin: string[] = [];
  filas.forEach(({ x, st }) => {
    if (!st.n || st.ini == null || st.fin == null || st.min == null || st.max == null) { sin.push(x.n); return; }
    velas.push({
      id: x.id, nombre: x.n, periodo: `${fmtMes(m.F[st.iniI as number])} a ${fmtMes(m.F[st.finI as number])}`, ini: st.ini, fin: st.fin, min: st.min, max: st.max,
      iniTxt: m.fmtC(c, st.ini), finTxt: m.fmtC(c, st.fin), minTxt: m.fmtC(c, st.min), maxTxt: m.fmtC(c, st.max),
      variacion: varNum(c, st) == null ? "–" : menos(variacionMostrada(m, c, st.ini, st.fin)), cls: claseVariacion(c.dir, c.pct, st.ini, st.fin), nota: datosDesde(m.F, c.v, x),
    });
  });
  return { velas, sin };
}

/** Meses de mandato con los valores por defecto de esa sección, solo con los presidentes que tienen datos.
 *  Si el punto de partida por defecto (mes 0 de Milei) no tiene dato (serie discontinuada), parte del último dato.
 *  Null si no hay ningún presidente con datos desde su mes 0 (serie corta o que no es mensual). */
export function mandatoFicha(m: Motor, PRES: Pres[], PRES_T0: Pres[], e: Expr, b: BaseCfg, extra: string | null) {
  const ids = new Set(PRES_MANDATO_DEF);
  if (extra && PRES_T0.some((x) => x.id === extra)) ids.add(extra);
  const q = { expr: e, modo: MODO_MANDATO_DEF, banda: false, b, presIds: ids, anc: null as string | null, md: null, mh: null };
  let r = calcularMandato(m, PRES, PRES_T0, q);
  if (r && !ok(r.ancla)) { q.anc = "ultimo"; r = calcularMandato(m, PRES, PRES_T0, q); }
  if (!r) return null;
  const conDatos = new Set(r.pres.filter((x) => r!.rows.some((f) => ok(f[x.id]))).map((x) => x.id));
  if (!conDatos.size) return null;
  if (conDatos.size < r.pres.length) { q.presIds = conDatos; r = calcularMandato(m, PRES, PRES_T0, q); if (!r) return null; }
  // Parámetros de /mandato/ para ver lo mismo: solo los que no son los de por defecto
  const mp = [...q.presIds].join(",") === PRES_MANDATO_DEF.join(",") ? null : PRES_T0.filter((x) => q.presIds.has(x.id)).map((x) => x.id).join(",");
  return { ...r, modo: MODO_MANDATO_DEF, ancParam: q.anc, mp };
}

const PLURAL: Record<FrecOrigen, string> = { M: "mensuales", T: "trimestrales", S: "semestrales", A: "anuales" };
/** Por qué no hay gráfico por mes de mandato: desde cuándo hay datos y, si no es mensual, de qué frecuencia. */
export function sinMandatoTxt(m: Motor, c: Calculo, frec: FrecOrigen): string {
  const i0 = c.v.findIndex((x) => ok(x));
  const desde = i0 >= 0 ? `Hay datos desde ${fmtMes(m.F[i0])}` : "No hay datos";
  return frec !== "M"
    ? `${desde} y son ${PLURAL[frec]}: no hay un valor por mes para seguir cada mandato desde su mes 0.`
    : `${desde}: ningún presidente de la comparación tiene dato en su mes 0.`;
}

/** Parámetros del inicio de mandato que trae la URL (para que "Abrir completo" muestre lo mismo). */
export const paramsInicio = (p: URLSearchParams): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const k of ["t0", "t0p"]) { const v = p.get(k); if (v) out[k] = v; }
  return out;
};
const qs = (o: Record<string, string | null | undefined>): string =>
  new URLSearchParams(Object.entries(o).filter((x): x is [string, string] => !!x[1])).toString();

/** "Abrir completo" de Por presidente: la tabla de esa variable (o sus velas). */
export const hrefPresidentesDe = (e: Expr, velas: boolean, inicio: Record<string, string>): string =>
  `/presidentes/?${qs({ pv: encExpr(e), pvista: velas ? "velas" : null, ...inicio })}`;
/** "Abrir completo" de Meses de mandato: la variable y lo que la ficha cambió (presidentes, punto de partida). */
export const hrefMandatoDe = (e: Expr, o: { mp: string | null; anc: string | null }, inicio: Record<string, string>): string =>
  `/mandato/?${qs({ mv: encExpr(e), mp: o.mp, anc: o.anc, ...inicio })}`;
