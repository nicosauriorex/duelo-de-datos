// Contexto automático de un dato: la cifra de hoy y frases neutras que la ubican en su historia.
// Se calcula sobre toda la serie mensual con la medida elegida (no sobre el período visible), salvo las frases
// "contra el promedio / el inicio del período", que usan el período que se pasa en `periodo`.
// Devuelve TODAS las frases calculables (cada una con su clave) y cuáles son las dos que salen solas.
// Reutiliza `distanciaRecord` e `interanualTxt` (los mismos números de la portada y de las plantillas).
import { fmtMes, lastIdx, mesNum, nf1, ok, redondeadoComo, restaLimpia } from "./formato";
import { claseVariacion } from "./estadisticas";
import type { ClaveFrase } from "./config";
import type { Expr, Motor } from "./motor";
import { distanciaRecord, interanualTxt } from "./plantillas";

export interface Frase { texto: string; cls: "bueno" | "malo" | "neutro" | null; clave?: ClaveFrase }
export interface ContextoDato {
  valor: string;                // último dato, formateado
  mes: string;                  // mes del último dato (ej. "oct-26")
  fecha: string;                // el mismo mes como "2026-10"
  ultimoDisponible: boolean;    // la fuente dejó de publicar hace más de 6 meses
  frases: Frase[];              // las que se muestran: las elegidas o, sin elección, las dos por defecto (0 a 2)
  todas: Frase[];               // todas las que se pueden calcular para este dato, en orden fijo (cada una con su clave)
  defecto: ClaveFrase[];        // las dos que salen solas, por orden de prioridad
}

/** ¿Tiene sentido calcular frases para esta vista? No con más de una variable, en base 100 ni por trimestre o año. */
export const admiteContexto = (o: { variables: number; modo: string; freq: string }): boolean =>
  o.variables === 1 && o.modo !== "b100" && o.freq === "M";

const MIN_MESES = 24;      // con menos datos no hay historia que contar
const MIN_DESDE = 12;      // "el más alto desde…" solo si pasaron 12 meses o más
const MAX_FRASES = 2;
/** Orden en que se listan todas las frases (el de la lista del panel de compartir). */
const ORDEN: ClaveFrase[] = ["desde", "record", "minimo", "anio", "promedio", "inicio"];

export interface OpcionesContexto {
  periodo?: { desde: string; hasta: string };   // para las frases contra el promedio y el inicio del período
  elegidas?: ClaveFrase[] | null;               // las que quiere quien comparte (hasta 2); sin esto, las de por defecto
}

/** Cifra de hoy y, si `conFrases` y la serie alcanza, el contexto. Devuelve null si no hay ningún dato. */
export function contextoDato(m: Motor, e: Expr, conFrases = true, opc: OpcionesContexto = {}): ContextoDato | null {
  const c = m.calc(e), F = m.F, u = lastIdx(c.v);
  if (u < 0) return null;
  const ultV = c.v[u] as number;
  // Las diferencias se calculan con los valores redondeados como se muestran (R1: 1,9 y 2,1 → 0,2 y nunca "0,0")
  const red = (x: number) => redondeadoComo((v) => m.fmtC(c, v), x);
  const out: ContextoDato = {
    valor: m.fmtC(c, ultV), mes: fmtMes(F[u]), fecha: F[u],
    ultimoDisponible: mesNum(F[F.length - 1]) - mesNum(F[u]) > 6, frases: [], todas: [], defecto: [],
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
  const agregar = (clave: ClaveFrase, texto: string, cls: Frase["cls"] = null) => frases.push({ texto, cls, clave });

  // 1. máximo o mínimo de toda la serie
  if (esMax !== esMin) agregar("desde", `El valor más ${esMax ? "alto" : "bajo"} desde que hay datos (${fmtMes(F[idx[0]])}).`);
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
    if (cand.length) agregar("desde", `El valor más ${cand[0].t} desde ${fmtMes(F[cand[0].j])}.`);
    // 3. distancia al récord
    if (c.pct) {
      const dif = restaLimpia(red(max), red(ultV));
      if (dif >= 0.05) agregar("record", `${nf1.format(dif)} p.p. por debajo de su récord de ${fmtMes(F[iMax])}.`);
    } else if (min > 0) {
      const dif = distanciaRecord(m, e) == null ? null : red(ultV) / red(max) - 1;
      if (dif != null && dif <= -0.005) agregar("record", `${nf1.format(-dif * 100)} % por debajo de su récord de ${fmtMes(F[iMax])}.`);
    } else {
      agregar("record", `Máximo: ${m.fmtC(c, max)} (${fmtMes(F[iMax])}). Mínimo: ${m.fmtC(c, min)} (${fmtMes(F[iMin])}).`);
    }
  }
  // 4. contra hace un año (la inflación mensual cuenta su interanual, como la portada)
  if (e.id === "ipc_empalme" && !e.rel && (e.med ?? m.medDefault(c.serie)) === "vm") {
    const t = interanualTxt(m);
    if (t) agregar("anio", `Interanual: ${t}.`);
  } else {
    const antes = c.v[u - 12];
    if (u >= 12 && ok(antes)) {
      const v = m.variacionTxt(c, antes, ultV);
      if (v !== "–") agregar("anio", `${v} contra hace un año.`, claseVariacion(c.dir, c.pct, antes, ultV));
    }
  }
  // las dos que salen solas son las dos primeras de esa lista (lo que ya veían la vista simple, la portada y la imagen)
  out.defecto = frases.slice(0, MAX_FRASES).map((f) => f.clave!);

  // Las demás, que solo se ofrecen al elegir las frases de la imagen.
  // 5. contra su mínimo (si el último no es el mínimo)
  if (!esMin) {
    if (c.pct) {
      const dif = restaLimpia(red(ultV), red(min));
      if (dif >= 0.05) agregar("minimo", `${nf1.format(dif)} p.p. por encima de su mínimo de ${fmtMes(F[iMin])}.`);
    } else if (min > 0 && red(min) > 0 && (red(ultV) / red(min) - 1) * 100 >= 0.05) {
      agregar("minimo", `${nf1.format((red(ultV) / red(min) - 1) * 100)} % por encima de su mínimo de ${fmtMes(F[iMin])}.`);
    }
  }
  // 6 y 7. contra el promedio y contra el inicio del período elegido
  if (opc.periodo) {
    const iD = F.findIndex((f) => f >= opc.periodo!.desde);
    let iH = -1;
    for (let i = F.length - 1; i >= 0; i--) if (F[i] <= opc.periodo.hasta) { iH = i; break; }
    const idxP = iD < 0 ? [] : idx.filter((i) => i >= iD && i <= iH);
    if (idxP.length >= 2) {
      const prom = idxP.reduce((a, i) => a + (c.v[i] as number), 0) / idxP.length, ini = c.v[idxP[0]] as number;
      const rango = `${fmtMes(F[idxP[0]])} a ${fmtMes(F[idxP[idxP.length - 1]])}`;
      const contra = (ref: number, que: string, igual: string, clave: ClaveFrase) => {
        if (!c.pct && ref <= 0) return;   // contra un valor cero o negativo el porcentaje no dice nada
        if (!c.pct && red(ref) <= 0) return;
        const mag = c.pct ? Math.abs(restaLimpia(red(ultV), red(ref))) : Math.abs(red(ultV) / red(ref) - 1) * 100;
        const cls = claseVariacion(c.dir, c.pct, red(ref), red(ultV));
        if (mag < 0.05 || red(ultV) === red(ref)) { agregar(clave, `${igual}.`, cls); return; }
        const t = c.pct ? `${nf1.format(mag)} ${nf1.format(mag) === "1,0" ? "punto" : "puntos"}` : `${nf1.format(mag)} %`;
        agregar(clave, `${t} por ${red(ultV) > red(ref) ? "encima" : "debajo"} ${que}.`, cls);
      };
      contra(prom, `del promedio del período (${rango})`, `Igual al promedio del período (${rango})`, "promedio");
      contra(ini, `del valor de ${fmtMes(F[idxP[0]])}, inicio del período`, `Igual al valor de ${fmtMes(F[idxP[0]])}, inicio del período`, "inicio");
    }
  }

  out.todas = ORDEN.map((k) => frases.find((f) => f.clave === k)).filter((f): f is Frase => !!f);
  const elegidas = opc.elegidas ? out.todas.filter((f) => opc.elegidas!.includes(f.clave!)).slice(0, MAX_FRASES) : null;
  // sin elección (o con elecciones que este dato no puede calcular): las de por defecto; una lista vacía es "ninguna"
  out.frases = elegidas && (elegidas.length > 0 || opc.elegidas!.length === 0) ? elegidas : out.todas.filter((f) => out.defecto.includes(f.clave!));
  return out;
}
