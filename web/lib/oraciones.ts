// "Preguntale a los datos": oraciones con huecos y los links que arman. Pura lógica, sin React.
import { FX_KEYS, FX_NOM, type Expr, type SerieMeta } from "./motor";
import { PRES_DEF } from "./estadisticas";
import { encExpr } from "./url";
import { todosLosPrincipales, hrefHistorico, type Principal } from "./temas";

export type Opcion = [string, string];
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Cómo se nombra una variable dentro de una oración. */
const ROTULOS: Record<string, string> = {
  sipa_med: "salario mediano", sipa_prom: "salario promedio", smvm: "salario mínimo", jub_min: "jubilación mínima", ripte: "salario promedio de empleos estables (RIPTE)",
  ipc_gba_01_1_2_coicop: "la carne", ipc_gba_04_1_1_coicop: "los alquileres",
};
export const rotulo = (id: string, S: Record<string, SerieMeta>): string =>
  ROTULOS[id] ?? (S[id] ? minus(S[id].n.replace(/ \((GBA|Nacional)\)$/, "").replace(/^IPC /, "")) : id);

/** Preposición + texto con la contracción que corresponde: "a" + "el riesgo país" → "al riesgo país", "de" + "el salario" → "del salario" (nunca "a el" ni "de el"). */
export const contraer = (prep: "a" | "de", texto: string): string => {
  const t = texto.trim();
  if (/^el(\s|$)/i.test(t)) return (prep === "a" ? "al" : "del") + t.slice(2);
  return `${prep} ${t}`;
};

export const SALARIOS = ["sipa_med", "sipa_prom", "smvm", "jub_min", "ripte"];
const ids = (S: Record<string, SerieMeta>, f: (s: SerieMeta) => boolean) => Object.values(S).filter(f).map((s) => s.id);

/** Qué compra el salario: productos, canastas y dólares. */
export const idsCompra = (S: Record<string, SerieMeta>) =>
  ids(S, (s) => s.id.startsWith("pp_gba_") || s.id.startsWith("can_") || (FX_KEYS as readonly string[]).some((k) => s.id === "fx_" + k));
/** Los ítems de "¿Cuánto … compra un …?" ya ordenados y con sus separadores: Canastas, Precios promedio (una sección por categoría) y Dólares. */
export interface SeccionCompra { grupo: "Canastas" | "Precios promedio" | "Dólares"; categoria?: string; ids: string[] }
export function seccionesCompra(S: Record<string, SerieMeta>, ids: string[]): SeccionCompra[] {
  const nombre = (id: string) => rotulo(id, S);
  const porNombre = (a: string, b: string) => nombre(a).localeCompare(nombre(b), "es");
  const out: SeccionCompra[] = [];
  const canastas = ids.filter((i) => i.startsWith("can_") && S[i]).sort(porNombre);
  if (canastas.length) out.push({ grupo: "Canastas", ids: canastas });
  const cats = new Map<string, string[]>();
  ids.filter((i) => i.startsWith("pp_gba_") && S[i]).forEach((i) => { const c = S[i].cat[3] ?? "Otros"; if (!cats.has(c)) cats.set(c, []); cats.get(c)!.push(i); });
  [...cats].sort((a, b) => a[0].localeCompare(b[0], "es")).forEach(([c, v]) => out.push({ grupo: "Precios promedio", categoria: c.replace(/^\d+\s+/, ""), ids: v.sort(porNombre) }));
  const dolares = (FX_KEYS as readonly string[]).map((k) => "fx_" + k).filter((i) => ids.includes(i) && S[i]);
  if (dolares.length) out.push({ grupo: "Dólares", ids: dolares });
  return out;
}
/** Montos en pesos: salarios, canastas y productos. */
export const idsMontos = (S: Record<string, SerieMeta>) =>
  [...SALARIOS.filter((i) => S[i]), ...ids(S, (s) => s.id.startsWith("can_") || s.id.startsWith("pp_gba_"))];
/** Precios para comparar: productos y rubros del IPC (nacional y GBA). */
export const idsPrecios = (S: Record<string, SerieMeta>) =>
  ids(S, (s) => s.id.startsWith("pp_gba_") || (s.tipo === "idx" && s.cat[1]?.startsWith("IPC INDEC") && (s.cat[2] === "Nacional" || s.cat[2] === "GBA") && s.id !== "ipc_nacional"));

export const MEDIDAS_DOLAR: Opcion[] = [["real", "pesos de hoy"], ...FX_KEYS.map((k) => ["usdr_" + k, `dólares ${FX_NOM[k]}`] as Opcion)];
export const PRESIDENTES: Opcion[] = PRES_DEF.slice().reverse().map((p) => [p.id, p.n]);
export const anios = (hasta: number): Opcion[] => Array.from({ length: hasta - 1995 + 1 }, (_, k) => String(1995 + k)).map((a) => [a, a]);

const e = (id: string, extra: Partial<Expr> = {}): Expr => ({ id, rel: null, modo: "compra", esc: "", ...extra });

// ---- los links de cada oración
/** ¿Cuánto [producto] compra un [salario]? */
export const hrefCompra = (producto: string, salario: string) =>
  hrefHistorico(e(producto, { rel: salario, med: "corr" }));
/** Mes anterior a uno "AAAA-MM". */
const mesAntes = (m: string): string => { const [a, k] = m.split("-").map(Number); return k === 1 ? `${a - 1}-12` : `${a}-${String(k - 1).padStart(2, "0")}`; };
/** Período de un mandato: desde su primer mes hasta el mes anterior al del siguiente presidente (el último llega hasta el último dato: sin `h`). */
export function periodoDe(presidente: string): { d: string; h?: string } {
  const k = PRES_DEF.findIndex((p) => p.id === presidente);
  if (k < 0) return { d: "" };
  const sig = PRES_DEF[k + 1];
  return sig ? { d: PRES_DEF[k].ini, h: mesAntes(sig.ini) } : { d: PRES_DEF[k].ini };
}
/** ¿Cómo le fue a [indicador] con [presidente]? Histórico de esa variable recortado a su mandato, con las franjas de presidentes. */
export const hrefPresidente = (p: Principal, presidente: string) => {
  const { d, h } = periodoDe(presidente);
  return hrefHistorico(p, { ...(d ? { d } : {}), ...(h ? { h } : {}), pf: "1" });
};
/** Enlace de acompañamiento: la tabla por presidente de ese indicador. */
export const hrefTablaPresidente = (p: Principal, presidente: string) =>
  `/presidentes/?${new URLSearchParams({ pv: encExpr(p), pr: presidente }).toString()}`;
/** ¿Cómo cambió [indicador] desde [año]? */
export const hrefDesde = (p: Principal, anio: string) => hrefHistorico(p, { d: `${anio}-01` });
/** ¿Cómo evolucionó [monto] en [medida]? */
export const hrefMedida = (id: string, med: string) => hrefHistorico(e(id, { med }));
/** ¿Qué subió más: [a] o [b]? Base 100, contra la inflación. */
export const hrefSubio = (a: string, b: string) =>
  `/historico/?${new URLSearchParams({ v: [e(a, { med: "real" }), e(b, { med: "real" })].map(encExpr).join(","), m: "b100" }).toString()}`;

export { todosLosPrincipales };
