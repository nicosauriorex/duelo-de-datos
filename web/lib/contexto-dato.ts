// Contexto automático de un dato: la cifra de hoy y hasta dos frases neutras que la ubican en su historia.
// Se calcula sobre toda la serie mensual con la medida elegida (no sobre el período visible).
// Reutiliza `distanciaRecord` e `interanualTxt` (los mismos números de la portada y de las plantillas).
import { fmtMes, lastIdx, mesNum, nf1, ok } from "./formato";
import { claseVariacion } from "./estadisticas";
import type { Expr, Motor } from "./motor";
import { distanciaRecord, interanualTxt } from "./plantillas";

export interface Frase { texto: string; cls: "bueno" | "malo" | "neutro" | null }
export interface ContextoDato {
  valor: string;                // último dato, formateado
  mes: string;                  // mes del último dato (ej. "oct-26")
  fecha: string;                // el mismo mes como "2026-10"
  ultimoDisponible: boolean;    // la fuente dejó de publicar hace más de 6 meses
  frases: Frase[];              // 0 a 2 frases, por orden de prioridad
}

/** ¿Tiene sentido calcular frases para esta vista? No con más de una variable, en base 100 ni por trimestre o año. */
export const admiteContexto = (o: { variables: number; modo: string; freq: string }): boolean =>
  o.variables === 1 && o.modo !== "b100" && o.freq === "M";

const MIN_MESES = 24;      // con menos datos no hay historia que contar
const MIN_DESDE = 12;      // "el más alto desde…" solo si pasaron 12 meses o más
const MAX_FRASES = 2;

/** Cifra de hoy y, si `conFrases` y la serie alcanza, el contexto. Devuelve null si no hay ningún dato. */
export function contextoDato(m: Motor, e: Expr, conFrases = true): ContextoDato | null {
  const c = m.calc(e), F = m.F, u = lastIdx(c.v);
  if (u < 0) return null;
  const ultV = c.v[u] as number;
  const out: ContextoDato = {
    valor: m.fmtC(c, ultV), mes: fmtMes(F[u]), fecha: F[u],
    ultimoDisponible: mesNum(F[F.length - 1]) - mesNum(F[u]) > 6, frases: [],
  };
  const idx: number[] = [];
  c.v.forEach((x, i) => { if (ok(x)) idx.push(i); });
  const tramo = idx[idx.length - 1] - idx[0] + 1;
  // poca historia, o una serie que no es mensual (trimestral, anual: con huecos entre dato y dato)
  if (!conFrases || idx.length < MIN_MESES || idx.length / tramo < 0.8) return out;

  let max = -Infinity, min = Infinity, iMax = idx[0], iMin = idx[0];
  for (const i of idx) {
    const x = c.v[i] as number;
    if (x >= max) { max = x; iMax = i; }
    if (x <= min) { min = x; iMin = i; }
  }
  const esMax = ultV >= max, esMin = ultV <= min;
  const frases: Frase[] = [];
  const neutra = (texto: string) => frases.push({ texto, cls: null });

  // 1. máximo o mínimo de toda la serie
  if (esMax !== esMin) neutra(`El valor más ${esMax ? "alto" : "bajo"} desde que hay datos (${fmtMes(F[idx[0]])}).`);
  else if (!esMax) {
    // 2. "el más alto / más bajo desde": el último mes en que la serie estuvo igual o por encima (o por debajo) del valor de hoy; gana el que va más atrás
    let altoDesde = -1, bajoDesde = -1;
    for (let k = idx.length - 2; k >= 0 && (altoDesde < 0 || bajoDesde < 0); k--) {
      const x = c.v[idx[k]] as number;
      if (altoDesde < 0 && x >= ultV) altoDesde = idx[k];
      if (bajoDesde < 0 && x <= ultV) bajoDesde = idx[k];
    }
    const cand = [{ j: altoDesde, t: "alto" }, { j: bajoDesde, t: "bajo" }].filter((x) => x.j >= 0 && mesNum(F[u]) - mesNum(F[x.j]) >= MIN_DESDE);
    cand.sort((a, b) => a.j - b.j);
    if (cand.length) neutra(`El valor más ${cand[0].t} desde ${fmtMes(F[cand[0].j])}.`);
    // 3. distancia al récord
    if (c.pct) {
      if (max - ultV >= 0.05) neutra(`${nf1.format(max - ultV)} p.p. por debajo de su récord de ${fmtMes(F[iMax])}.`);
    } else if (min > 0) {
      const dif = distanciaRecord(m, e);
      if (dif != null && dif <= -0.005) neutra(`${nf1.format(-dif * 100)} % por debajo de su récord de ${fmtMes(F[iMax])}.`);
    } else {
      neutra(`Máximo: ${m.fmtC(c, max)} (${fmtMes(F[iMax])}). Mínimo: ${m.fmtC(c, min)} (${fmtMes(F[iMin])}).`);
    }
  }
  // 4. contra hace un año (la inflación mensual cuenta su interanual, como la portada)
  if (e.id === "ipc_empalme" && !e.rel && (e.med ?? m.medDefault(c.serie)) === "vm") {
    const t = interanualTxt(m);
    if (t) neutra(`Interanual: ${t}.`);
  } else {
    const antes = c.v[u - 12];
    if (u >= 12 && ok(antes)) {
      const v = m.variacionTxt(c, antes, ultV);
      if (v !== "–") frases.push({ texto: `${v} contra hace un año.`, cls: claseVariacion(c.dir, c.pct, antes, ultV) });
    }
  }
  out.frases = frases.slice(0, MAX_FRASES);
  return out;
}
