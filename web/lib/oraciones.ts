// "Preguntale a los datos": oraciones con huecos y los links que arman. Pura lógica, sin React.
import { FX_KEYS, FX_NOM, type Expr, type SerieMeta } from "./motor";
import { PRES_DEF } from "./estadisticas";
import { encExpr } from "./url";
import { todosLosPrincipales, hrefHistorico, type Principal } from "./temas";

export type Opcion = [string, string];
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Cómo se nombra una variable dentro de una oración. */
const ROTULOS: Record<string, string> = {
  sipa_med: "salario mediano", sipa_prom: "salario promedio", smvm: "salario mínimo", jub_min: "jubilación mínima", ripte: "RIPTE",
  ipc_gba_01_1_2_coicop: "la carne", ipc_gba_04_1_1_coicop: "los alquileres",
};
export const rotulo = (id: string, S: Record<string, SerieMeta>): string =>
  ROTULOS[id] ?? (S[id] ? minus(S[id].n.replace(/ \((GBA|Nacional)\)$/, "").replace(/^IPC /, "")) : id);

export const SALARIOS = ["sipa_med", "sipa_prom", "smvm", "jub_min", "ripte"];
const ids = (S: Record<string, SerieMeta>, f: (s: SerieMeta) => boolean) => Object.values(S).filter(f).map((s) => s.id);

/** Qué compra el salario: productos, canastas y dólares. */
export const idsCompra = (S: Record<string, SerieMeta>) =>
  ids(S, (s) => s.id.startsWith("pp_gba_") || s.id.startsWith("can_") || (FX_KEYS as readonly string[]).some((k) => s.id === "fx_" + k));
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
/** ¿Cómo le fue a [indicador] con [presidente]? */
export const hrefPresidente = (p: Principal, presidente: string) =>
  `/presidentes/?${new URLSearchParams({ pv: encExpr(p), pr: presidente }).toString()}`;
/** ¿Cómo cambió [indicador] desde [año]? */
export const hrefDesde = (p: Principal, anio: string) => hrefHistorico(p, { d: `${anio}-01` });
/** ¿Cuánto vale [monto] en [medida]? */
export const hrefMedida = (id: string, med: string) => hrefHistorico(e(id, { med }));
/** ¿Qué subió más: [a] o [b]? Base 100, contra la inflación. */
export const hrefSubio = (a: string, b: string) =>
  `/historico/?${new URLSearchParams({ v: [e(a, { med: "real" }), e(b, { med: "real" })].map(encExpr).join(","), m: "b100" }).toString()}`;

export { todosLosPrincipales };
