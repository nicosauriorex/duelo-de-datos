// Región como filtro: el IPC y los precios promedio vienen una vez por región; el selector lista cada rubro o producto una sola vez
// y la región se elige aparte ("Configurar variable" → Región). La correspondencia sale de los metadatos (`cat` e `id`), sin listas escritas a mano.
import { norm } from "./formato";
import { esOculta, rutaPublica } from "./nombres";
import type { SerieMeta } from "./motor";

/** Orden en que se ofrecen las regiones. La representante de un rubro es la primera que exista (Nacional y, si no, GBA). */
export const REGIONES = ["Nacional", "GBA", "Cuyo", "Noreste", "Noroeste", "Pampeana", "Patagonia"];
/** Subcategorías (`cat[1]`) cuyas series vienen por región: `cat[2]` es la región y el `id` es `<prefijo>_<region>_<resto>`. */
const SUBCATS_REGIONALES = [/^IPC INDEC/, /^Precios promedio por producto/];

export interface MiembroRegion { region: string; id: string }
export interface GrupoRegional {
  clave: string;
  miembros: MiembroRegion[];      // en el orden de REGIONES
  representante: string;          // id de la que se lista
}
export interface Regiones {
  grupoDe: (id: string) => GrupoRegional | undefined;
  regionDe: (id: string) => string | undefined;
}

const ordenRegion = (r: string) => { const i = REGIONES.indexOf(r); return i < 0 ? REGIONES.length : i; };
/** Si la serie es regional: su región y la clave del rubro o producto (igual en todas las regiones). */
function claveRegional(s: SerieMeta): { region: string; clave: string } | null {
  if (s.cat[0] !== "Precios" || s.cat.length < 3 || !SUBCATS_REGIONALES.some((re) => re.test(s.cat[1]))) return null;
  const region = s.cat[2], pref = s.id.split("_")[0] + "_" + norm(region).replace(/[^a-z0-9]+/g, "_") + "_";
  if (!s.id.startsWith(pref)) return null;
  return { region, clave: `${s.cat[1]}|${s.id.slice(pref.length)}` };
}

const cache = new WeakMap<SerieMeta[], Regiones>();
/** Agrupa por rubro o producto las series de `metas` que se repiten por región (el resultado se guarda por lista). */
export function regionesDe(metas: SerieMeta[]): Regiones {
  const hit = cache.get(metas);
  if (hit) return hit;
  const grupos = new Map<string, GrupoRegional>(), porId = new Map<string, GrupoRegional>(), regionDeId = new Map<string, string>();
  for (const s of metas) {
    const k = claveRegional(s);
    if (!k) continue;
    regionDeId.set(s.id, k.region);
    let g = grupos.get(k.clave);
    if (!g) { g = { clave: k.clave, miembros: [], representante: s.id }; grupos.set(k.clave, g); }
    g.miembros.push({ region: k.region, id: s.id });
  }
  for (const g of grupos.values()) {
    g.miembros.sort((a, b) => ordenRegion(a.region) - ordenRegion(b.region));
    g.representante = g.miembros[0].id;
    g.miembros.forEach((m) => porId.set(m.id, g));
  }
  const r: Regiones = { grupoDe: (id) => porId.get(id), regionDe: (id) => regionDeId.get(id) };
  cache.set(metas, r);
  return r;
}

/** Regiones en las que existe esta serie (con ella incluida); vacío si no es regional o si solo está en una. */
export function otrasRegiones(metas: SerieMeta[], id: string): MiembroRegion[] {
  const g = regionesDe(metas).grupoDe(id);
  return g && g.miembros.length > 1 ? g.miembros : [];
}

/** Lo que se lista en el selector: sin las series ocultas (`inflacion`, `inflacion_ia`) y con una sola por rubro o producto. */
export function listables(metas: SerieMeta[]): SerieMeta[] {
  const R = regionesDe(metas);
  return metas.filter((s) => !esOculta(s.id) && (R.grupoDe(s.id)?.representante ?? s.id) === s.id);
}

/** Resultados de una búsqueda (ya ordenados) sin repetir el rubro o producto: queda la representante si salió y, si no, la que salió primero (ej. "patagonia"). */
export function colapsarRegiones(res: SerieMeta[], metas: SerieMeta[]): SerieMeta[] {
  const R = regionesDe(metas), lugar = new Map<string, number>(), out: SerieMeta[] = [];
  for (const s of res) {
    if (esOculta(s.id)) continue;
    const g = R.grupoDe(s.id);
    if (!g) { out.push(s); continue; }
    const i = lugar.get(g.clave);
    if (i === undefined) { lugar.set(g.clave, out.length); out.push(s); }
    else if (s.id === g.representante) out[i] = s;
  }
  return out;
}

/** Series de IPC que son "indicadores de inflación" (Bienes, Servicios, Estacional, Núcleo y Regulados): se muestran junto con la inflación y no entre los rubros. */
const ES_INDICADOR_IPC = /^ipc_[a-z]+_(?:[bs]_bienes|[enr]_estaci)$/;
export const esIndicadorIpc = (id: string): boolean => ES_INDICADOR_IPC.test(id);
const ORDEN_INDICADORES_IPC = ["_b_bienes", "_s_bienes", "_e_estaci", "_n_estaci", "_r_estaci"];
const posIndicador = (id: string): number => (ES_INDICADOR_IPC.test(id) ? 1 + ORDEN_INDICADORES_IPC.findIndex((k) => id.endsWith(k)) : 0);
/** El IPC nivel general es lo mismo que "Inflación" (`ipc_empalme`): no se lista aparte. Su link viejo sigue funcionando. */
export const esNivelGeneralIpc = (id: string): boolean => /^ipc_[a-z]+_0_ipc$/.test(id);

/** Categoría tal como se muestra en las listas: sin el nivel de región (las series regionales se listan una sola vez, no por región),
 *  con los nombres públicos y con los indicadores de inflación dentro de su grupo. */
export const catListado = (s: SerieMeta, metas: SerieMeta[]): string[] =>
  ES_INDICADOR_IPC.test(s.id) ? [s.cat[0], "Indicadores de inflación"]
    : rutaPublica(regionesDe(metas).regionDe(s.id) ? [...s.cat.slice(0, 2), ...s.cat.slice(3)] : s.cat);

/** Código de un rubro del IPC a partir del id (`ipc_gba_01_1_2_coicop` → [1, 1, 2]); null si no es de un rubro. */
const codigoRubro = (id: string): number[] | null => {
  const m = /^ipc_[a-z]+_(\d+(?:_\d+)*)_coicop$/.exec(id);
  return m ? m[1].split("_").map(Number) : null;
};
const cmpCodigo = (a: number[], b: number[]): number => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
};
/** Orden de las listas: se mantiene el de siempre (grupos en el orden en que aparecen), salvo dentro de tres grupos:
 *  los rubros del IPC por su código (01, 01.1, 01.1.1, 02…), los precios promedio por categoría y luego por nombre, y los indicadores de inflación con los cinco nuevos al final. */
export function ordenarListado(ss: SerieMeta[], cat: (s: SerieMeta) => string[]): SerieMeta[] {
  const grupo = (s: SerieMeta) => cat(s).slice(0, 2).join("›");
  const primero = new Map<string, number>();
  ss.forEach((s, i) => { const g = grupo(s); if (!primero.has(g)) primero.set(g, i); });
  return ss.slice().sort((a, b) => {
    const ga = grupo(a), gb = grupo(b);
    if (ga !== gb) return primero.get(ga)! - primero.get(gb)!;
    const ca = codigoRubro(a.id), cb = codigoRubro(b.id);
    if (ca || cb) return ca && cb ? cmpCodigo(ca, cb) : ca ? 1 : -1;      // lo que no es un rubro (nivel general) va primero
    const ia = posIndicador(a.id), ib = posIndicador(b.id);
    if (ia || ib) return ia - ib;
    if (a.id.startsWith("pp_") && b.id.startsWith("pp_")) return (cat(a)[2] ?? "").localeCompare(cat(b)[2] ?? "", "es") || a.n.localeCompare(b.n, "es");
    return 0;
  });
}
