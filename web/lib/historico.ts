// Cómo se lee Histórico desde la URL: parámetros de cada gráfico y del período. Lo usan la sección y la imagen de compartir.
import { desdePreferido, type DesdePref } from "./config";
import { claseVariacion, etiqueta, type EstRows, type Fila } from "./estadisticas";
import { mesNum, nf0, nf1, ok, redondeadoComo, restaLimpia, rotuloAnterior } from "./formato";
import type { Expr, Motor } from "./motor";
import { decExpr, lista as listaUrl, unoDe } from "./url";

export const TODOS_MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const REFS_VALIDAS = ["ult", "prom", "med", "max", "min", "mk_ult", "mk_max", "mk_min"];
export const REFS_DEF = "ult,prom,mk_ult,mk_max,mk_min";   // sin mediana por defecto; un link con `r=` conserva sus líneas
export const MAX_MISMA_UNIDAD = 4; // en modo valor: hasta 4 variables si todas tienen la misma unidad (si no, 2)

/** Parámetros de cada gráfico. El 1.º usa estos nombres; del 2.º al 4.º llevan el número al final (`v2`, `m2`… `t4`). */
export const PG = ["v", "m", "e", "bd", "ej", "r", "t", "pf"] as const;
export const MAX_GRAFICOS = 4;
export const sfx = (k: number) => (k === 0 ? "" : String(k + 1));

export type Comun = {
  F: string[]; ult: string; desde: string; hasta: string; meses: Set<number>; freq: "M" | "T" | "A"; ag: "promedio" | "cierre";
};
export type GEst = {
  modo: "valor" | "b100"; exprs: Expr[]; todas: Expr[]; escala: "lin" | "log"; banda: "no" | "si"; eje: "propia" | "misma"; refs: Set<string>; tabla: "grafico" | "tabla"; pf: "1" | "0" | "";
};

/** Lee un gráfico de la URL. `null` = ese gráfico no está en el link (el 1.º arranca con `def`; sin `def` y sin variables también da null). */
export function leerGrafico(p: URLSearchParams, k: number, existe: (id: string) => boolean, def: Expr | null): GEst | null {
  const s = sfx(k);
  let exprs = listaUrl(p.get("v" + s)).map((x) => decExpr(x, existe)).filter(Boolean) as Expr[];
  if (!exprs.length) { if (k > 0 || !def) return null; exprs = [def]; }
  const modo = unoDe(p.get("m" + s), ["valor", "b100"] as const, "valor");
  return {
    modo, exprs: modo === "b100" ? exprs.slice(0, 10) : exprs.slice(0, MAX_MISMA_UNIDAD), todas: exprs,
    escala: unoDe(p.get("e" + s), ["lin", "log"] as const, "lin"), banda: unoDe(p.get("bd" + s), ["no", "si"] as const, "no"), eje: unoDe(p.get("ej" + s), ["propia", "misma"] as const, "propia"),
    refs: new Set(listaUrl(p.has("r" + s) ? p.get("r" + s) : REFS_DEF).filter((x) => REFS_VALIDAS.includes(x))),
    tabla: unoDe(p.get("t" + s), ["grafico", "tabla"] as const, "grafico"),
    pf: unoDe(p.get("pf" + s), ["1", "0"] as const, "" as "1" | "0" | ""),
  };
}

/** Período, meses y frecuencia (comunes a todos los gráficos). */
export function leerComun(p: URLSearchParams, F: string[], desdeCfg: DesdePref): Comun {
  const ult = F[F.length - 1];
  let desde = /^\d{4}-\d{2}$/.test(p.get("d") || "") ? (p.get("d") as string) : desdePreferido(desdeCfg, F);
  let hasta = /^\d{4}-\d{2}$/.test(p.get("h") || "") ? (p.get("h") as string) : ult;
  desde = desde < F[0] ? F[0] : desde > ult ? ult : desde;
  hasta = hasta > ult ? ult : hasta < F[0] ? F[0] : hasta;
  if (desde > hasta) desde = hasta; // rango inválido: se corrige al más cercano
  const ms = new Set(listaUrl(p.get("ms")).map(Number).filter((n) => n >= 1 && n <= 12));
  return {
    F, ult, desde, hasta,
    meses: ms.size ? ms : new Set(TODOS_MESES),
    freq: unoDe(p.get("f"), ["M", "T", "A"] as const, "M"), ag: unoDe(p.get("ag"), ["promedio", "cierre"] as const, "promedio"),
  };
}

/** Las variables que entran en un gráfico: en modo valor, 2, o hasta 4 si todas tienen la misma unidad (con la medida aplicada). */
export function exprsUsadas(m: Motor, g: Pick<GEst, "modo" | "exprs">): Expr[] {
  if (g.modo === "b100" || g.exprs.length <= 2) return g.exprs;
  const cargadas = g.exprs.every((e) => m.SER[e.id] && (!e.rel || m.SER[e.rel]));
  const igual = cargadas && new Set(g.exprs.map((e) => m.calc(e).unidad)).size === 1;
  return igual ? g.exprs : g.exprs.slice(0, 2);
}

const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export type FrecOrigen = "M" | "T" | "S" | "A";
const PLURAL_ORIGEN: Record<FrecOrigen, string> = { M: "mensuales", T: "trimestrales", S: "semestrales", A: "anuales" };
/** Cada cuántos meses trae datos la serie original (mensual, trimestral, semestral, anual), por la separación típica de sus últimos datos. */
export function frecuenciaOrigen(vals: (number | null)[]): FrecOrigen {
  const pos: number[] = [];
  vals.forEach((v, i) => { if (v != null && Number.isFinite(v)) pos.push(i); });
  const ult = pos.slice(-37), gaps = ult.slice(1).map((p, i) => p - ult[i]).sort((x, y) => x - y);
  if (!gaps.length) return "M";
  const g = gaps[Math.floor(gaps.length / 2)];
  return g >= 11 ? "A" : g >= 5 ? "S" : g >= 2.5 ? "T" : "M";
}
/** Qué se está viendo, en una línea: "Datos mensuales", "Promedio de cada año (datos mensuales)", "Solo los meses de marzo"…
 *  La usan el gráfico de Histórico y la imagen compartible. `suma` = la serie es un flujo que se suma al agrupar.
 *  `origen` = frecuencia de la serie original (por defecto mensual): cambia "datos mensuales" por "trimestrales", etc. */
export function textoTemporalidad(o: { freq: "M" | "T" | "A"; ag: "promedio" | "cierre"; meses: Set<number>; suma?: boolean; origen?: FrecOrigen }): string {
  const per = o.freq === "A" ? "año" : "trimestre", datos = PLURAL_ORIGEN[o.origen ?? "M"];
  const base = o.freq === "M" ? `Datos ${datos}`
    : o.suma ? `Suma de cada ${per}`
    : o.ag === "cierre" ? `Último dato de cada ${per}`
    : `Promedio de cada ${per} (datos ${datos})`;
  if (o.meses.size >= 12) return base;
  const ms = [...o.meses].sort((a, b) => a - b).map((k) => NOMBRE_MES[k - 1]);
  const lista = ms.length === 1 ? ms[0] : ms.slice(0, -1).join(", ") + " y " + ms[ms.length - 1];
  return `${base}. Solo los meses de ${lista}`;
}

/** La frase de las tarjetas de resumen: cuánto está el último dato por encima o por debajo de `desde`.
 *  "El último está 7,2 % abajo" (o "2,1 puntos arriba" si el dato es un porcentaje). Vacía si falta algún dato.
 *  `mostrado` dice cómo se ve cada valor en pantalla (por ejemplo `(v) => m.fmtC(c, v)`): la cuenta se hace con esos valores
 *  redondeados, para que cierre con lo que se lee (1,9 y 2,1 → "0,2 puntos"). Si la diferencia es cero ya redondeada: "El último es igual". */
export function fraseUltimoVs(pct: boolean, desde: number | null | undefined, hasta: number | null | undefined, mostrado?: (v: number) => string): string {
  if (!ok(desde) || !ok(hasta)) return "";
  const d = mostrado ? redondeadoComo(mostrado, desde) : desde, h = mostrado ? redondeadoComo(mostrado, hasta) : hasta;
  const igual = "El último es igual";
  // contra un valor cero o negativo (un déficit) el porcentaje no dice nada: solo se informa si está arriba o abajo
  if (!pct && d <= 0) return h === d ? igual : `El último está ${h > d ? "arriba" : "abajo"}`;
  const mag = pct ? Math.abs(restaLimpia(h, d)) : Math.abs(h / d - 1) * 100;
  const txtMag = pct ? nf1.format(mag) : mag >= 1000 ? nf0.format(mag) : nf1.format(mag);
  if (h === d || /^0(,0)?$/.test(txtMag)) return igual;
  const dir = h > d ? "arriba" : "abajo";
  const txt = pct ? `${txtMag} ${txtMag === "1,0" ? "punto" : "puntos"}` : `${txtMag} %`;
  return `El último está ${txt} ${dir}`;
}

/** Una comparación de la cabecera del dato: el último dato contra otro valor (mes anterior, un año atrás, promedio…). */
export interface Comparacion { clave: string; titulo: string; valor: number; fecha?: string; frase: string; cls: "bueno" | "malo" | "neutro" }

const ANTERIOR: Record<FrecOrigen, string> = { M: "Mes anterior", T: "Trimestre anterior", S: "Semestre anterior", A: "Año anterior" };

/** Las comparaciones de la cabecera del dato, en este orden: período anterior, un año atrás, inicio del período, promedio, mediana, máximo y mínimo.
 *  - `rows`: las filas que se ven (período, meses y frecuencia elegidos); de ahí salen el último dato y las estadísticas (`est`).
 *  - `hist`: la misma serie y frecuencia con toda la historia hasta el fin del período y todos los meses, para el período anterior y el año atrás
 *    aunque el filtro de fechas los deje afuera.
 *  Las cuentas usan los valores como se muestran (`mostrado`), igual que el resumen que reemplazan. Si no hay dato anterior o de hace un año,
 *  esa comparación no se incluye (con frecuencia anual, "un año atrás" es el período anterior y no se repite). */
export function comparacionesCabecera(o: {
  rows: Fila[]; hist: Fila[]; key: string; est: EstRows; freq: "M" | "T" | "A"; origen: FrecOrigen; meses: Set<number>;
  dir: number | null | undefined; pct: boolean; mostrado: (v: number) => string;
}): Comparacion[] {
  const { rows, hist, key, est, freq, origen, meses, dir, pct, mostrado } = o;
  const hasta = est.ult[0];
  const fila = (valor: number, clave: string, titulo: string, fecha?: string): Comparacion | null => {
    const frase = fraseUltimoVs(pct, valor, hasta, mostrado);
    return frase ? { clave, titulo, valor, fecha, frase, cls: claseVariacionMostrada(dir, pct, valor, hasta, mostrado) } : null;
  };
  const out: (Comparacion | null)[] = [];
  const ultima = [...rows].reverse().find((r) => ok(r[key]));
  const i = ultima ? hist.findIndex((r) => r.fecha === ultima.fecha) : -1;
  // Con un filtro de meses sueltos, `hist` (todos los meses) y `rows` agregan distinto: no se compara contra el período anterior ni contra un año atrás.
  if (ultima && i >= 0 && meses.size >= 12) {
    let j = i - 1;
    while (j >= 0 && !ok(hist[j][key])) j--;
    const normal = freq === "A" ? ANTERIOR.A : freq === "T" ? ANTERIOR.T : ANTERIOR[origen];
    const paso = freq === "A" ? 12 : freq === "T" ? 3 : { M: 1, T: 3, S: 6, A: 12 }[origen];
    if (j >= 0) out.push(fila(hist[j][key], "anterior", rotuloAnterior(hist[j].fecha, ultima.fecha, normal, paso), etiqueta(hist[j])));
    if (freq !== "A") {
      const hace = hist.find((r) => mesNum(r.fecha) === mesNum(ultima.fecha) - 12 && ok(r[key]));
      if (hace) out.push(fila(hace[key], "anio", "Un año atrás", etiqueta(hace)));
    }
  }
  out.push(fila(est.pri[0], "inicio", "Inicio del período", est.pri[1]));
  out.push(fila(est.prom, "prom", "Promedio"));
  out.push(fila(est.med, "med", "Mediana"));
  out.push(fila(est.max[0], "max", "Máximo", est.max[1]));
  out.push(fila(est.min[0], "min", "Mínimo", est.min[1]));
  return out.filter((c): c is Comparacion => !!c);
}

/** Clase de color (bueno / malo / neutro) del cambio entre dos valores tal como se ven: si redondeados son iguales, neutro. */
export function claseVariacionMostrada(dir: number | null | undefined, pct: boolean, desde: number | null | undefined, hasta: number | null | undefined, mostrado: (v: number) => string): "bueno" | "malo" | "neutro" {
  if (!ok(desde) || !ok(hasta)) return "neutro";
  return claseVariacion(dir, pct, redondeadoComo(mostrado, desde), redondeadoComo(mostrado, hasta));
}
