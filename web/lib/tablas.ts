// Reglas comunes de las tablas del sitio: período del mandato, marcas "mejor" / "peor" y barras de magnitud.
// Los componentes solo dibujan lo que sale de acá.
import { fmtMes, ok } from "./formato";
import { rankScores, type Pres } from "./estadisticas";

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
/** Tono de una variación: verde si mejoró según la dirección efectiva de la serie, rojo si empeoró, ninguno si no hay dirección. */
export const tonoDeCambio = (dir: number | null | undefined, cambio: number | null | undefined): Tono =>
  !dir || !ok(cambio) || cambio === 0 ? null : cambio * dir > 0 ? "bueno" : "malo";

/** Una columna comparable entre presidentes: tono, largo de barra (0 a 1) y marca de cada fila.
 *  `modo`: "centro" = la barra sale del medio (a la derecha si sube, a la izquierda si baja); "izq" / "der" = arranca de un borde (niveles). */
export interface ColComp { tono: Tono[]; frac: number[]; marca: MarcaCol[]; modo: "centro" | "izq" | "der" }

/** `dir`: dirección efectiva (1 = más es mejor, -1 = menos es mejor, 0 = neutro). `centrada`: la barra siempre sale del centro (variaciones). */
export function columnaComparable(vals: (number | null | undefined)[], dir: number, centrada: boolean): ColComp {
  const nums = vals.filter(ok) as number[];
  const tope = Math.max(0, ...nums.map(Math.abs));
  const hayPos = nums.some((v) => v > 0), hayNeg = nums.some((v) => v < 0);
  const modo: ColComp["modo"] = centrada || (hayPos && hayNeg) ? "centro" : hayNeg ? "der" : "izq";
  const sc = rankScores(vals, dir);
  const mx = nums.length ? Math.max(...nums) : 0, mn = nums.length ? Math.min(...nums) : 0;
  const hayExtremos = nums.length >= 2 && mx > mn;   // sin marcas si todos valen lo mismo o hay un solo dato
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
    modo,
  };
}

/** Texto para quien no ve el color: en qué mitad de la columna cae el valor. */
export const lecturaTono = (t: Tono): string => (t === "bueno" ? "en la mitad mejor" : t === "malo" ? "en la mitad peor" : "");
