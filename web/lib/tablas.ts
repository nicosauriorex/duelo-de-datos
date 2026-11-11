// Reglas comunes de las tablas del sitio: período del mandato, marcas "mejor" / "peor" y barras de magnitud.
// Los componentes solo dibujan lo que sale de acá.
import { fmtMes, nf1, ok } from "./formato";
import { claseVariacion, rankScores, type Pres } from "./estadisticas";

/** "dic-15 a nov-19"; el mandato en curso termina en "hoy". */
// con guion que no corta ("nov‑07" no se parte en dos renglones)
const mesSinCorte = (f: string) => fmtMes(f).replace("-", "‑");
export const periodoMandato = (F: string[], x: Pres): string => `${mesSinCorte(x.ini)} a ${x.i1 >= F.length - 1 ? "hoy" : mesSinCorte(F[x.i1])}`;

/** "datos desde ene-95" cuando la serie empieza después del inicio del mandato; si no, null. */
export function datosDesde(F: string[], arr: ArrayLike<number | null | undefined>, x: Pres): string | null {
  for (let i = x.i0; i <= x.i1 && i < arr.length; i++) if (ok(arr[i])) return i > x.i0 ? `datos desde ${fmtMes(F[i])}` : null;
  return null;
}

export type Tono = "bueno" | "malo" | null;
export type MarcaCol = "mejor" | "peor" | "más alto" | "más bajo" | null;

/** Una columna comparable entre presidentes: tono, largo de barra (0 a 1), marca y puesto de cada fila.
 *  `modo`: "centro" = eje en cero al medio (hay valores positivos y negativos; la barra va a cada lado); "izq" = la barra arranca del borde izquierdo.
 *  `pos`: puesto de 0 (el peor) a 1 (el mejor) según la dirección; null si la variable es neutra o todos valen lo mismo (la barra va en gris).
 *  `igual`: todos los valores de la columna son iguales (o hay uno solo): barras completas en gris y sin marcas. */
export interface ColComp { tono: Tono[]; frac: number[]; marca: MarcaCol[]; modo: "centro" | "izq" | "der"; pos: (number | null)[]; igual: boolean }

/** Largo mínimo de la barra de nivel: el peor de la columna queda con una marca, no vacío. */
export const FRAC_MIN = 0.04;

/** Color de la barra según el puesto (0 = el peor, 1 = el mejor): rojo → amarillo → verde, siempre desde variables CSS del tema. */
export const colorPuesto = (pos: number): string =>
  pos < 0.5 ? `color-mix(in srgb, var(--series-4) ${Math.round(pos * 200)}%, var(--malo))`
    : `color-mix(in srgb, var(--bueno) ${Math.round((pos - 0.5) * 200)}%, var(--series-4))`;

/** Puesto de 0 a 1 de cada valor (los empatados comparten puesto); `dir` 1 = más es mejor, -1 = menos es mejor. */
function puestos(vals: (number | null | undefined)[], dir: number): (number | null)[] {
  const nums = vals.filter(ok) as number[];
  if (!dir || nums.length < 2) return vals.map(() => null);
  return vals.map((v) => {
    if (!ok(v)) return null;
    const peor = nums.filter((x) => (x - v) * dir < 0).length, iguales = nums.filter((x) => x === v).length;
    return (peor + (iguales - 1) / 2) / (nums.length - 1);
  });
}

/** Regla de las tablas por presidente (requisito 14). `dir`: dirección efectiva (1 = más es mejor, -1 = menos es mejor, 0 = neutro). `variacion`: es una variación, así que con valores de los dos signos el eje queda en cero.
 *  Barra: niveles = proporcional entre el menor (largo mínimo `FRAC_MIN`) y el mayor (barra completa) de la columna;
 *  variación con signos mezclados = |valor| / mayor |valor| a cada lado del cero; variación de un solo signo = como un nivel.
 *  Color: `pos` (0 = el peor, 1 = el mejor) para `colorPuesto`. */
export function columnaPresidentes(vals: (number | null | undefined)[], dir: number, variacion: boolean): ColComp {
  const nums = vals.filter(ok) as number[];
  const mx = nums.length ? Math.max(...nums) : 0, mn = nums.length ? Math.min(...nums) : 0;
  const tope = Math.max(0, ...nums.map(Math.abs));
  const igual = nums.length > 0 && mx === mn;
  const modo: ColComp["modo"] = variacion && nums.some((v) => v > 0) && nums.some((v) => v < 0) ? "centro" : "izq";
  const hayExtremos = nums.length >= 2 && mx > mn;   // sin marcas si todos valen lo mismo o hay un solo dato
  const marcaDe = (v: number): MarcaCol => {
    if (!hayExtremos) return null;
    if (v === mx) return dir > 0 ? "mejor" : dir < 0 ? "peor" : "más alto";
    if (v === mn) return dir > 0 ? "peor" : dir < 0 ? "mejor" : "más bajo";
    return null;
  };
  const fracDe = (v: number) => igual ? 1 : modo === "centro" ? Math.min(1, Math.abs(v) / tope) : FRAC_MIN + (1 - FRAC_MIN) * ((v - mn) / (mx - mn));
  const pos = puestos(vals, igual ? 0 : dir);
  return {
    tono: pos.map((q) => (q == null || q === 0.5 ? null : q > 0.5 ? "bueno" : "malo")),
    frac: vals.map((v) => (ok(v) ? fracDe(v) : 0)),
    marca: vals.map((v) => (ok(v) ? marcaDe(v) : null)),
    modo, pos, igual,
  };
}

/** Versión simple (la usan Ranking y Contexto): un solo tono según la mitad de la columna y barra proporcional al mayor valor absoluto.
 *  `centrada`: la barra siempre sale del centro (variaciones). */
export function columnaComparable(vals: (number | null | undefined)[], dir: number, centrada: boolean): ColComp {
  const nums = vals.filter(ok) as number[];
  const tope = Math.max(0, ...nums.map(Math.abs));
  const hayPos = nums.some((v) => v > 0), hayNeg = nums.some((v) => v < 0);
  const modo: ColComp["modo"] = centrada || (hayPos && hayNeg) ? "centro" : hayNeg ? "der" : "izq";
  const sc = rankScores(vals, dir);
  const mx = nums.length ? Math.max(...nums) : 0, mn = nums.length ? Math.min(...nums) : 0;
  const hayExtremos = nums.length >= 2 && mx > mn;
  const marcaDe = (v: number): MarcaCol => {
    if (!hayExtremos) return null;
    if (v === mx) return dir > 0 ? "mejor" : dir < 0 ? "peor" : "más alto";
    if (v === mn) return dir > 0 ? "peor" : dir < 0 ? "mejor" : "más bajo";
    return null;
  };
  return {
    tono: vals.map((v, i) => (!ok(v) || !dir || sc[i] === 0 ? null : sc[i] > 0 ? "bueno" : "malo")),
    frac: vals.map((v) => (ok(v) && tope > 0 ? Math.min(1, Math.abs(v) / tope) : 0)),
    marca: vals.map((v) => (ok(v) ? marcaDe(v) : null)),
    modo, pos: vals.map(() => null), igual: false,
  };
}

/** Texto para quien no ve el color: en qué mitad de la columna cae el valor. */
export const lecturaTono = (t: Tono): string => (t === "bueno" ? "en la mitad mejor" : t === "malo" ? "en la mitad peor" : "");

/** Variación entre dos valores tal como se muestran: es `variacionTxt` del motor (una sola cuenta para todo el sitio), aceptando datos faltantes. */
export const variacionMostrada = (m: { variacionTxt: (c: { pct: boolean }, a: number | null, b: number | null) => string }, c: { pct: boolean }, ini: number | null | undefined, fin: number | null | undefined): string =>
  m.variacionTxt(c, ini ?? null, fin ?? null);
/** Tono de la variación entre dos valores, con el mismo redondeo que el texto: si se lee "0,0", no lleva color. */
export const tonoDeVariacion = (c: { dir?: number | null; pct: boolean }, ini: number | null | undefined, fin: number | null | undefined): Tono => {
  const k = claseVariacion(c.dir, c.pct, ini, fin);
  return k === "neutro" ? null : k;
};
