// Configuración global del usuario (D-005): se guarda en el navegador (localStorage), sin cuentas.
// Acá vive la lectura, la validación y la escritura; el contexto de React está en components/ConfigProvider.tsx.
import { FX_KEYS } from "./motor";

export const CLAVE = "pld:config";
export const VERSION = 2;
export const T_MIN = -12, T_MAX = 24;

export type Dolar = (typeof FX_KEYS)[number];
export type MedidaPref = "real" | "corr" | "usdr" | "usd";
export type DesdePref = "todo" | "1995" | "2003" | "2011" | "2017" | "2023" | "ultimo";
export type TemaPref = "auto" | "claro" | "oscuro";
export type FormatoImg = "1x1" | "4x5" | "16x9";

export interface Config {
  v: number;
  t0: number;                    // desplazamiento para todos (T+k)
  t0p: Record<string, number>;   // excepciones por presidente
  dolar: Dolar;
  medida: MedidaPref;
  desde: DesdePref;
  tema: TemaPref;
  franjas: boolean;              // franjas de presidentes en todos los gráficos
  colPres: Record<string, string>; // color elegido por presidente (id → #rrggbb)
  personalizar: boolean;         // Histórico: el panel "Personalizar" de la vista simple quedó abierto
  formatoImagen: FormatoImg;     // último formato elegido para la imagen de compartir
}
export const DEFECTO: Config = { v: VERSION, t0: -1, t0p: {}, dolar: "oficial", medida: "real", desde: "2003", tema: "oscuro", franjas: false, colPres: {}, personalizar: false, formatoImagen: "1x1" };

export const DOLARES: [Dolar, string][] = [["oficial", "Oficial"], ["blue", "Blue"], ["mep", "MEP"], ["ccl", "CCL"]];
export const MEDIDAS: [MedidaPref, string][] = [["real", "Pesos reales"], ["corr", "Pesos corrientes"], ["usdr", "Dólares reales"], ["usd", "Dólares corrientes"]];
export const DESDES: [DesdePref, string][] = [["todo", "Todo"], ["1995", "1995"], ["2003", "2003"], ["2011", "2011"], ["2017", "2017"], ["2023", "2023"], ["ultimo", "Último año"]];
export const TEMAS: [TemaPref, string][] = [["oscuro", "Oscuro"], ["claro", "Claro"], ["auto", "Automático"]];
export const FORMATOS_IMG: [FormatoImg, string][] = [["1x1", "Cuadrada 1:1"], ["4x5", "Vertical 4:5"], ["16x9", "Horizontal 16:9"]];

const unoDe = <T extends string>(x: unknown, validos: readonly [T, string][], def: T): T =>
  validos.some((v) => v[0] === x) ? (x as T) : def;
const entero = (x: unknown): number | null =>
  typeof x === "number" && Number.isFinite(x) ? Math.max(T_MIN, Math.min(T_MAX, Math.round(x))) : null;

/** Convierte cualquier cosa leída del almacenamiento en una configuración válida: lo que no se entiende cae al valor por defecto. */
export function normalizar(raw: unknown): Config {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t0p: Record<string, number> = {};
  if (r.t0p && typeof r.t0p === "object") {
    for (const [id, k] of Object.entries(r.t0p as Record<string, unknown>)) { const n = entero(k); if (n != null) t0p[id] = n; }
  }
  const colPres: Record<string, string> = {};
  if (r.colPres && typeof r.colPres === "object") {
    for (const [id, c] of Object.entries(r.colPres as Record<string, unknown>)) if (/^[a-z0-9]+$/.test(id) && typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) colPres[id] = c.toLowerCase();
  }
  return {
    franjas: r.franjas === true, colPres, personalizar: r.personalizar === true, formatoImagen: unoDe(r.formatoImagen, FORMATOS_IMG, DEFECTO.formatoImagen),
    v: VERSION, t0: entero(r.t0) ?? DEFECTO.t0, t0p,
    dolar: unoDe(r.dolar, DOLARES, DEFECTO.dolar), medida: unoDe(r.medida, MEDIDAS, DEFECTO.medida),
    desde: unoDe(r.desde, DESDES, DEFECTO.desde), tema: unoDe(r.tema, TEMAS, DEFECTO.tema),
  };
}

/** Lee lo guardado. `ok` es false si el almacenamiento no está disponible. */
export function leer(): { config: Config; ok: boolean } {
  try {
    const s = window.localStorage.getItem(CLAVE);
    return { config: s ? normalizar(JSON.parse(s)) : DEFECTO, ok: true };
  } catch {
    // Almacenamiento bloqueado o JSON roto: si se puede leer la clave pero está rota, igual se puede escribir.
    try { window.localStorage.getItem(CLAVE); return { config: DEFECTO, ok: true }; } catch { return { config: DEFECTO, ok: false }; }
  }
}
export function guardar(c: Config): boolean {
  try { window.localStorage.setItem(CLAVE, JSON.stringify(c)); return true; } catch { return false; }
}

/** Atributo `data-theme` de <html> para un tema: "dark" (el de fábrica), "light" o "auto" (sigue al dispositivo). */
export const atributoTema = (t: TemaPref): string => (t === "claro" ? "light" : t === "auto" ? "auto" : "dark");
export function aplicarTema(t: TemaPref) {
  document.documentElement.setAttribute("data-theme", atributoTema(t));
}
/** Aplica los colores elegidos de los presidentes: pisan las variables `--pres-<id>` (el color de fábrica está en globals.css). */
export function aplicarColPres(col: Record<string, string>) {
  const st = document.documentElement.style;
  for (let i = st.length - 1; i >= 0; i--) { const n = st.item(i); if (n.startsWith("--pres-")) st.removeProperty(n); }
  for (const [id, c] of Object.entries(col)) st.setProperty(`--pres-${id}`, c);
}
/** Script chico para el <head>: aplica el tema guardado antes de pintar (sin nada guardado queda el oscuro que ya trae el HTML). Debe seguir en sintonía con `atributoTema`. */
export const SCRIPT_TEMA = `try{var c=JSON.parse(localStorage.getItem("${CLAVE}")||"{}");var t=c.tema==="claro"?"light":c.tema==="auto"?"auto":"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

// ---------------------------------------------------------------- Inicio del mandato
/** Cómo se cuenta el inicio de cada mandato: `t0` para todos y excepciones por presidente. */
export interface BaseCfg { t0: number; t0p: Record<string, number> }
export const kDe = (b: BaseCfg, id: string): number => b.t0p[id] ?? b.t0;
export const txtT = (k: number): string => (k === 0 ? "T" : k > 0 ? `T+${k}` : `T${k}`);
export const txtTLargo = (k: number): string => (k === 0 ? "T (mes de asunción)" : txtT(k));

/** Saca las excepciones que valen lo mismo que "para todos" o que apuntan a un presidente que ya no existe. */
export function limpiarBase(b: BaseCfg, ids: readonly string[]): BaseCfg {
  const t0p: Record<string, number> = {};
  for (const id of ids) if (b.t0p[id] != null && b.t0p[id] !== b.t0) t0p[id] = b.t0p[id];
  return { t0: b.t0, t0p };
}
export const baseDeConfig = (c: Config, ids: readonly string[]): BaseCfg => limpiarBase({ t0: c.t0, t0p: c.t0p }, ids);
export const mismaBase = (a: BaseCfg, b: BaseCfg, ids: readonly string[]): boolean => {
  const x = limpiarBase(a, ids), y = limpiarBase(b, ids);
  return x.t0 === y.t0 && ids.every((id) => x.t0p[id] === y.t0p[id]);
};
export const esBaseDeFabrica = (b: BaseCfg, ids: readonly string[]): boolean => mismaBase(b, { t0: DEFECTO.t0, t0p: {} }, ids);

export const encT0p = (t0p: Record<string, number>): string => Object.entries(t0p).map(([id, k]) => `${id}:${k}`).join(",");
export function decT0p(s: string | null | undefined): Record<string, number> {
  const o: Record<string, number> = {};
  (s ? s.split(",") : []).forEach((par) => {
    const [id, v] = par.split(":");
    const n = v === undefined || v.trim() === "" ? NaN : Number(v);
    if (id && Number.isFinite(n)) o[id] = Math.max(T_MIN, Math.min(T_MAX, Math.round(n)));
  });
  return o;
}
/** Inicio de mandato que trae la URL (`t0`/`t0p`, o los viejos `b`/`n`), o null si no trae ninguno. */
export function baseDeUrl(p: URLSearchParams): BaseCfg | null {
  const num = (s: string | null) => (s == null || s === "" || !Number.isFinite(Number(s)) ? null : Math.max(T_MIN, Math.min(T_MAX, Math.round(Number(s)))));
  if (p.has("t0") || p.has("t0p")) return { t0: num(p.get("t0")) ?? DEFECTO.t0, t0p: decT0p(p.get("t0p")) };
  const b = p.get("b");
  if (b === "prev") return { t0: -1, t0p: {} };
  if (b === "asume") return { t0: 0, t0p: {} };
  if (b === "mas") return { t0: num(p.get("n")) ?? 1, t0p: {} };
  return null;
}
export const PARAMS_BASE = ["t0", "t0p", "b", "n"] as const;

/** Medida inicial de un monto en pesos, según la medida y el dólar preferidos. */
export const medidaPreferida = (c: Pick<Config, "medida" | "dolar">): string =>
  c.medida === "real" || c.medida === "corr" ? c.medida : `${c.medida}_${c.dolar}`;

/** Valor de un parámetro de la URL: se omite solo si es el de fábrica y la configuración también lo es (así un link compartido muestra lo mismo a cualquiera). */
export const paramSi = (valor: string, fabrica: string, porConfig: string): string | null =>
  valor === fabrica && porConfig === fabrica ? null : valor;

/** Medida con la que entra una variable al agregarla o cambiarla: los montos en pesos usan la preferida; el resto, la suya. */
export const medidaInicial = (tipo: string, porDefecto: string, c: Pick<Config, "medida" | "dolar">): string =>
  tipo === "ars" ? medidaPreferida(c) : porDefecto;

/** Primer mes del "Desde" por defecto de Histórico, dentro de las fechas disponibles. */
export function desdePreferido(d: DesdePref, F: string[]): string {
  if (d === "todo") return F[0];
  if (d === "ultimo") return F[Math.max(0, F.length - 12)];
  const m = `${d}-01`;
  return m < F[0] ? F[0] : m > F[F.length - 1] ? F[F.length - 1] : m;
}
