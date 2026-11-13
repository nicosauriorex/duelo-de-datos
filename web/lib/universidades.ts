// Cuánto reciben las universidades (/universidades/, docs/specs/gasto-nacion.md, fase 3): todas las cuentas de la página, la imagen para compartir y la vista previa.
// Los datos los escribe pipeline/universidades.py (`universidades.json`): por universidad y año, lo transferido por el programa "Desarrollo de la Educación Superior"
// (millones de pesos corrientes, devengado y vigente) y, solo para 2023 y 2024, los estudiantes de pregrado y grado del Portal de Información Universitaria.
// Pesos de hoy: el mismo deflactor anual que el gasto de la Nación (lib/gasto.ts). Las cuentas cierran: las filas que se ven (con "Sin asignar" y "Otros gastos
// del programa") suman el total que se ve, con los valores redondeados como se muestran. Palabras neutras y sin veredicto (D-012).
import type { FormatoImg } from "./config";
import type { DatosImagen, FilaBarra } from "./imagen";
import { FUENTE_GASTO, SIGLAS, aDec, conSigno, decPctDe, escalaDe, fechaLarga, mostrado, repartir, type Deflactor, type Escala, type Medida } from "./gasto";
import { fmtMillones, nfDec, norm, r1, restaLimpia, unidadMontoDe, valorMostrado } from "./formato";

// ---------------------------------------------------------------- formato del archivo (contrato con el pipeline)
export interface Par { dev: (number | null)[]; vig: (number | null)[] }
export interface Est { total: number | null; nuevos: number | null }
export interface Univ { n: string; dev: (number | null)[]; vig: (number | null)[]; est: Record<number, Est> | null }
export interface DatosUniv {
  generado: string; fuente: string; anios: number[]; pib: (number | null)[]; enCurso: number[];
  universidades: Univ[]; sinAsignar: Par; otrosPrograma: Par; programa: Par; estudiantes61: Record<number, number>;
}

const numeros = (v: unknown, n: number): (number | null)[] =>
  Array.from({ length: n }, (_, i) => { const x = Array.isArray(v) ? (v[i] as unknown) : null; return typeof x === "number" && isFinite(x) ? x : null; });
const parDe = (v: unknown, n: number): Par => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { dev: numeros(o.dev, n), vig: numeros(o.vig, n) };
};
const aEntero = (k: string) => (/^\d{4}$/.test(k) ? Number(k) : null);

/** Valida el archivo con tolerancia: lo que falta queda en null. null si no trae años ni universidades. */
export function decodificarUniv(c: unknown): DatosUniv | null {
  if (!c || typeof c !== "object") return null;
  const r = c as Record<string, unknown>;
  const anios = (Array.isArray(r.anios) ? r.anios : []).filter((a): a is number => Number.isInteger(a));
  if (!anios.length || !Array.isArray(r.universidades)) return null;
  const n = anios.length;
  const universidades: Univ[] = [];
  for (const u of r.universidades as unknown[]) {
    if (!u || typeof u !== "object") continue;
    const o = u as Record<string, unknown>;
    if (typeof o.n !== "string" || !o.n) continue;
    let est: Record<number, Est> | null = null;
    if (o.est && typeof o.est === "object") {
      for (const [k, v] of Object.entries(o.est as Record<string, unknown>)) {
        const y = aEntero(k), e = v as Record<string, unknown> | null;
        if (y == null || !e || typeof e !== "object") continue;
        const total = typeof e.total === "number" && e.total > 0 ? e.total : null, nuevos = typeof e.nuevos === "number" && e.nuevos >= 0 ? e.nuevos : null;
        if (total != null) (est ??= {})[y] = { total, nuevos };
      }
    }
    universidades.push({ n: o.n, dev: numeros(o.dev, n), vig: numeros(o.vig, n), est });
  }
  if (!universidades.length) return null;
  const e61: Record<number, number> = {};
  if (r.estudiantes_61 && typeof r.estudiantes_61 === "object") {
    for (const [k, v] of Object.entries(r.estudiantes_61 as Record<string, unknown>)) { const y = aEntero(k); if (y != null && typeof v === "number" && v > 0) e61[y] = v; }
  }
  const ec = r.en_curso;
  const enCurso = (Array.isArray(ec) ? ec : typeof ec === "number" ? [ec] : []).filter((x): x is number => Number.isInteger(x));
  return {
    generado: typeof r.generado === "string" ? r.generado : "", fuente: typeof r.fuente === "string" ? r.fuente : "", anios, pib: numeros(r.pib, n), enCurso,
    universidades, sinAsignar: parDe(r.sin_asignar, n), otrosPrograma: parDe(r.otros_programa, n), programa: parDe(r.programa, n), estudiantes61: e61,
  };
}

// ---------------------------------------------------------------- opciones de la página (valores de la URL)
export type MedidaU = "hoy" | "pib";
export const MEDIDAS_U: [MedidaU, string][] = [["hoy", "Pesos de hoy"], ["pib", "% del PIB"]];
export const MEDIDA_U_DEFECTO: MedidaU = "hoy";
export type OrdenU = "monto" | "var" | "est";
export const ORDENES_U: [OrdenU, string][] = [["monto", "Monto"], ["var", "Variación"], ["est", "Por estudiante"]];
export const ORDEN_U_DEFECTO: OrdenU = "monto";
export const esMedidaU = (s: string | null): s is MedidaU => MEDIDAS_U.some((x) => x[0] === s);
export const esOrdenU = (s: string | null): s is OrdenU => ORDENES_U.some((x) => x[0] === s);

export const RUTA_U = "/universidades/";
export const NOMBRE_PROGRAMA = "Desarrollo de la Educación Superior";
export const esProgramaU = (n: string) => norm(n).trim() === norm(NOMBRE_PROGRAMA);
export const FUENTE_UNIV = `${FUENTE_GASTO} (transferencias a cada universidad) y Portal de Información Universitaria de la Auditoría General de la Nación (estudiantes)`;
export const SIN_ASIGNAR = "Sin asignar a una universidad";
export const OTROS_PROGRAMA = "Otros gastos del programa";

/** Todo lo que hace falta para calcular: los datos, el deflactor, qué años están en curso y el PIB (el del archivo o, si falta, el del índice del gasto). */
export interface Contexto { d: DatosUniv; def: Deflactor; enCurso: Set<number>; pibDe: (anio: number) => number | null; actualizado: (anio: number) => string | null }
export function crearContexto(d: DatosUniv, def: Deflactor, o: { enCurso?: number[]; pib?: Map<number, number>; actualizado?: Map<number, string> } = {}): Contexto {
  const enCurso = new Set([...d.enCurso, ...(o.enCurso ?? [])]);
  return {
    d, def, enCurso,
    pibDe: (a) => { const i = d.anios.indexOf(a), v = i >= 0 ? d.pib[i] : null; return v != null && v > 0 ? v : o.pib?.get(a) ?? null; },
    actualizado: (a) => o.actualizado?.get(a) ?? null,
  };
}
/** Años que ya tienen total transferido. */
export const aniosConTotal = (c: Contexto): number[] => c.d.anios.filter((a, i) => (c.d.programa.dev[i] ?? 0) > 0);
/** Año por defecto: el último cerrado (si no hay ninguno cerrado, el último). */
export function anioDefectoU(c: Contexto): number {
  const todos = aniosConTotal(c), cerrados = todos.filter((a) => !c.enCurso.has(a));
  return (cerrados.length ? cerrados : todos)[(cerrados.length ? cerrados : todos).length - 1] ?? c.d.anios[c.d.anios.length - 1];
}
export const anioValidoU = (c: Contexto, s: string | null): number | null => aniosConTotal(c).find((a) => String(a) === s) ?? null;
export const opcionesAnioU = (c: Contexto): [string, string][] =>
  [...aniosConTotal(c)].reverse().map((a) => [String(a), c.enCurso.has(a) ? `${a} · en curso` : String(a)]);

// ---------------------------------------------------------------- cuentas básicas
const factorDe = (c: Contexto, anio: number) => c.def.factor(anio);
/** El monto (millones corrientes de un año) en la medida elegida; null si no se puede (sin dato, sin inflación o sin PIB). */
function medir(c: Contexto, medida: MedidaU, anio: number, v: number | null): number | null {
  if (v == null) return null;
  if (medida === "pib") { const p = c.pibDe(anio); return p ? (v / p) * 100 : null; }
  const f = factorDe(c, anio);
  return f != null ? v * f : null;
}
/** Variación real (en %, un decimal) contra el año anterior, con el monto en pesos de hoy; null si falta algún año o el año está en curso. */
export function variacionReal(c: Contexto, dev: (number | null)[], i: number): number | null {
  if (i < 1 || c.enCurso.has(c.d.anios[i])) return null;
  const a = medir(c, "hoy", c.d.anios[i - 1], dev[i - 1]), b = medir(c, "hoy", c.d.anios[i], dev[i]);
  return a != null && b != null && a > 0 ? r1((b / a - 1) * 100) : null;
}
export const txtVariacion = (v: number): string => `${v > 0 ? "+" : ""}${conSigno(v, 1)} %`;
/** Pesos por estudiante: "$ 1,9 millones". */
export const txtPorEstudiante = (pesos: number): string => `$ ${nfDec(1).format(pesos / 1e6)} millones`;
/** Transferido (devengado, en pesos de hoy) por estudiante de pregrado y grado: `millones` de pesos corrientes del año / estudiantes. */
function porEstudiante(c: Contexto, anio: number, dev: number | null, estudiantes: number | null | undefined): number | null {
  const m = medir(c, "hoy", anio, dev);
  return m != null && estudiantes && estudiantes > 0 ? (m * 1e6) / estudiantes : null;
}
export const aniosConEstudiantes = (c: Contexto): number[] =>
  Object.keys(c.d.estudiantes61).map(Number).filter((a) => c.d.anios.includes(a)).sort((x, y) => x - y);

// ---------------------------------------------------------------- la lista
export interface FilaU {
  clave: string; tipo: "univ" | "sin" | "otros" | "redondeo";
  n: string; u: Univ | null;
  raw: number;                       // millones corrientes
  txt: string;                       // el monto o % como se muestra
  valor: number;                     // el mismo, como número
  parte: string | null;              // % del total del programa
  vari: number | null; variTxt: string | null;
  porEst: number | null; porEstTxt: string | null; estudiantes: number | null;
  sinEst: boolean;                   // tiene que decir "sin dato de estudiantes"
  ancho: number;
}
export interface Sistema { anio: number; transferido: number; estudiantes61: number; porEst: number; conArchivo: number; sinArchivo: number; estudiantesConArchivo: number }
export interface VistaU {
  anio: number; i: number; enCurso: boolean; medida: MedidaU; medidaUsada: MedidaU; aviso: string | null; orden: OrdenU; ordenUsado: OrdenU;
  total: string; totalHoy: string | null; totalPib: string | null; varTotal: string | null; anterior: number | null;
  esc: Escala; filas: FilaU[]; cantidad: number; unidad: string; ref: string; hayEstudiantes: boolean; sistema: Sistema | null; actualizado: string | null;
}

/** Arma la lista de todas las universidades de un año (más "Sin asignar" y "Otros gastos del programa"), ordenada. El buscador filtra después con `filtrar`. */
export function armarVistaU(c: Contexto, o: { anio: number; medida: MedidaU; orden: OrdenU }): VistaU | null {
  const { d } = c, i = d.anios.indexOf(o.anio);
  if (i < 0) return null;
  const total = d.programa.dev[i];
  if (total == null || !(total > 0)) return null;
  let medida = o.medida, aviso: string | null = null;
  if (medida === "pib" && !c.pibDe(o.anio)) { medida = "hoy"; aviso = `El PIB de ${o.anio} todavía no está publicado: se muestra en pesos de hoy.`; }
  if (medida === "hoy" && factorDe(c, o.anio) == null) return null;
  const m = (v: number | null) => medir(c, medida, o.anio, v);
  const items: { tipo: FilaU["tipo"]; n: string; u: Univ | null; dev: (number | null)[]; v: number }[] = [];
  for (const u of d.universidades) { const v = u.dev[i]; if (v != null) items.push({ tipo: "univ", n: u.n, u, dev: u.dev, v }); }
  const sin = d.sinAsignar.dev[i], otros = d.otrosPrograma.dev[i];
  if (sin != null && sin !== 0) items.push({ tipo: "sin", n: SIN_ASIGNAR, u: null, dev: d.sinAsignar.dev, v: sin });
  if (otros != null && otros !== 0) items.push({ tipo: "otros", n: OTROS_PROGRAMA, u: null, dev: d.otrosPrograma.dev, v: otros });
  const totalM = m(total)!, medidos = items.map((x) => m(x.v)!);
  const minimo = Math.min(...medidos.map(Math.abs).filter((x) => x > 0), Math.abs(totalM) || Infinity);
  const esc = escalaDe(medida as Medida, totalM, isFinite(minimo) ? minimo : 0);
  const totalR = mostrado(esc, totalM);
  const valores = repartir(medidos.map((x) => esc.a(x)), totalR, esc.dec);
  const partes = repartir(items.map((x) => (x.v / total) * 100), 100, 1);
  const sumaRaw = items.reduce((a, x) => a + x.v, 0);
  const estAnio = d.estudiantes61[o.anio] != null;

  const filas: FilaU[] = items.map((x, k) => {
    const vari = variacionReal(c, x.dev, i);
    const estu = x.u?.est?.[o.anio]?.total ?? null;
    const pe = estu ? porEstudiante(c, o.anio, x.v, estu) : null;
    return {
      clave: `${x.tipo}|${norm(x.n)}`, tipo: x.tipo, n: x.n, u: x.u, raw: x.v, txt: esc.txt(valores[k]), valor: valores[k], parte: `${conSigno(partes[k], 1)} %`,
      vari, variTxt: vari != null ? txtVariacion(vari) : null, porEst: pe, porEstTxt: pe != null ? txtPorEstudiante(pe) : null, estudiantes: estu,
      sinEst: x.tipo === "univ" && estAnio && estu == null, ancho: 0,
    };
  });
  const dif = aDec(totalR - valores.reduce((a, b) => a + b, 0), esc.dec), difParte = aDec(100 - partes.reduce((a, b) => a + b, 0), 1);
  const aparte: FilaU[] = [];
  if (dif !== 0 || difParte !== 0) {
    const grande = Math.abs(total - sumaRaw) > Math.abs(total) * 1e-4;
    aparte.push({
      clave: "redondeo", tipo: "redondeo", n: grande ? "Diferencia con el total del programa" : "Diferencia por redondeo", u: null, raw: total - sumaRaw,
      txt: esc.txt(dif), valor: dif, parte: `${conSigno(difParte, 1)} %`, vari: null, variTxt: null, porEst: null, porEstTxt: null, estudiantes: null, sinEst: false, ancho: 0,
    });
  }
  // orden: las universidades según lo elegido; después "Sin asignar", "Otros gastos del programa" y la diferencia, siempre al final
  const hayEst = d.universidades.some((u) => u.est?.[o.anio]?.total);
  const ordenUsado: OrdenU = o.orden === "est" && !hayEst ? "monto" : o.orden;
  const clave = (f: FilaU) => (ordenUsado === "var" ? f.vari : ordenUsado === "est" ? f.porEst : f.raw);
  const univ = filas.filter((f) => f.tipo === "univ").sort((a, b) => {
    const x = clave(a), y = clave(b);
    if (x == null && y == null) return b.raw - a.raw;
    if (x == null) return 1;
    if (y == null) return -1;
    return y - x || b.raw - a.raw;
  });
  const resto = filas.filter((f) => f.tipo === "sin").concat(filas.filter((f) => f.tipo === "otros"), aparte);
  const todas = [...univ, ...resto];
  const largos = todas.map((f) => Math.max(0, f.valor)), mayor = Math.max(...largos, 0);
  todas.forEach((f, k) => { f.ancho = mayor > 0 ? largos[k] / mayor : 0; });

  const ant = i > 0 ? medir(c, "hoy", d.anios[i - 1], d.programa.dev[i - 1]) : null, act = medir(c, "hoy", o.anio, total);
  const vt = variacionReal(c, d.programa.dev, i);
  const pib = c.pibDe(o.anio), f = factorDe(c, o.anio);
  const hoyTxt = f != null ? fmtMillones(total * f) : null;
  const pibTxt = pib ? `${nfDec(2).format((total / pib) * 100)} %` : null;

  let sistema: Sistema | null = null;
  const e61 = d.estudiantes61[o.anio];
  if (e61) {
    const conArchivo = d.universidades.filter((u) => u.dev[i] != null && u.est?.[o.anio]?.total);
    const suma = d.universidades.reduce((a, u) => a + (u.dev[i] ?? 0), 0) + (sin ?? 0);
    const pe = porEstudiante(c, o.anio, suma, e61);
    if (pe != null) {
      sistema = {
        anio: o.anio, transferido: suma, estudiantes61: e61, porEst: pe, conArchivo: conArchivo.length,
        sinArchivo: d.universidades.filter((u) => u.dev[i] != null).length - conArchivo.length,
        estudiantesConArchivo: conArchivo.reduce((a, u) => a + (u.est![o.anio].total ?? 0), 0),
      };
    }
  }
  const enCurso = c.enCurso.has(o.anio);
  return {
    anio: o.anio, i, enCurso, medida: o.medida, medidaUsada: medida, aviso, orden: o.orden, ordenUsado,
    total: esc.txt(totalR), totalHoy: hoyTxt, totalPib: pibTxt, varTotal: vt != null ? txtVariacion(vt) : null, anterior: ant != null && act != null ? ant : null,
    esc, filas: todas, cantidad: univ.length,
    unidad: medida === "hoy" ? `Pesos de ${c.def.ref} (ajustados por inflación con el IPC)` : `% del PIB de ${o.anio}`,
    ref: c.def.ref, hayEstudiantes: hayEst, sistema, actualizado: c.actualizado(o.anio),
  };
}

/** Las filas que coinciden con lo escrito en el buscador (todas las palabras; entiende UBA y UTN). Vacío = todas. */
export function filtrar(filas: FilaU[], q: string): FilaU[] {
  const palabras = norm(q).split(/\s+/).filter(Boolean);
  if (!palabras.length) return filas;
  return filas.filter((f) => {
    const t = norm(f.n);
    return palabras.every((p) => t.includes(p) || (SIGLAS[p] != null && t.includes(SIGLAS[p])));
  });
}

/** Las cuentas de la lista, como se leen: la suma de las filas contra el total. Lo usan los chequeos. */
export function cuentasCierranU(v: VistaU): boolean {
  const suma = v.filas.reduce((a, f) => restaLimpia(a + f.valor, 0), 0), partes = v.filas.reduce((a, f) => restaLimpia(a + (valorMostrado(f.parte ?? "0") ?? 0), 0), 0);
  return suma === (valorMostrado(v.total) ?? 0) && partes === 100;
}

// ---------------------------------------------------------------- evolución 2018-2026 (el conjunto o una universidad)
export interface PuntoEvo { anio: number; valor: number | null; enCurso: boolean; txt: string | null; alto: number }
export interface Evolucion {
  puntos: PuntoEvo[]; medida: MedidaU; primero: PuntoEvo | null; ultimo: PuntoEvo | null; hayEnCurso: boolean;
  filas: { anio: number; txt: string | null; parte: string | null; vari: string | null; enCurso: boolean }[];
}
/** Serie de un conjunto de montos anuales (`dev`, millones corrientes) en la medida elegida. Los años sin dato quedan en null. */
export function armarEvolucion(c: Contexto, medida: MedidaU, dev: (number | null)[]): Evolucion {
  const { d } = c;
  const usada: MedidaU = medida === "pib" && d.anios.some((a, i) => dev[i] != null && c.pibDe(a)) ? "pib" : "hoy";
  const vals = d.anios.map((a, i) => medir(c, usada, a, dev[i]));
  const mayor = Math.max(...vals.map((x) => x ?? 0), 0);
  const dec = decPctDe(vals.filter((x): x is number => x != null));
  // una sola unidad para toda la serie (no "billones" en un año y "millones" en otro)
  const enPesos = d.anios.map((a, i) => (dev[i] == null ? null : (dev[i] as number) * (factorDe(c, a) ?? 1))).filter((x): x is number => x != null && x !== 0);
  const unidad = unidadMontoDe(enPesos.length ? Math.max(...enPesos.map(Math.abs)) : 0, enPesos.length ? Math.min(...enPesos.map(Math.abs)) : 0);
  const txt = (a: number, v: number | null, i: number) => (v == null ? null : usada === "hoy" ? fmtMillones((dev[i] as number) * (factorDe(c, a) ?? 1), unidad) : `${nfDec(dec).format(v)} %`);
  const puntos: PuntoEvo[] = d.anios.map((a, i) => ({ anio: a, valor: vals[i], enCurso: c.enCurso.has(a), txt: txt(a, vals[i], i), alto: vals[i] != null && mayor > 0 ? Math.max(0.03, vals[i]! / mayor) : 0 }));
  const con = puntos.filter((p) => p.valor != null);
  const filas = d.anios.map((a, i) => ({
    anio: a, enCurso: c.enCurso.has(a), txt: puntos[i].txt,
    parte: dev[i] != null && (d.programa.dev[i] ?? 0) > 0 ? `${nfDec(2).format(((dev[i] as number) / (d.programa.dev[i] as number)) * 100)} %` : null,
    vari: (() => { const v = variacionReal(c, dev, i); return v != null ? txtVariacion(v) : null; })(),
  })).reverse();
  return { puntos, medida: usada, primero: con[0] ?? null, ultimo: con[con.length - 1] ?? null, hayEnCurso: puntos.some((p) => p.enCurso && p.valor != null), filas };
}
/** "2018: $ 5,1 billones" para el pie del gráfico. */
export const extremoTxt = (p: PuntoEvo) => `${p.anio}${p.enCurso ? " (en curso)" : ""}: ${p.txt}`;
/** Texto del año en curso: "Todavía no terminó: datos hasta el 10 de noviembre de 2026". */
export function enCursoTxt(c: Contexto, anio: number): string {
  const f = fechaLarga(c.actualizado(anio));
  return `${anio} está en curso: todavía no terminó${f ? ` y los datos llegan hasta el ${f}` : ""}, por eso no se compara con el año anterior.`;
}

// ---------------------------------------------------------------- textos, imagen y vista previa
/** Título de la vista: "Cuánto reciben las universidades en 2024". */
export const tituloU = (v: VistaU) => `Cuánto reciben las universidades en ${v.anio}${v.enCurso ? " (en curso)" : ""}`;
/** Dirección de la vista (con los parámetros que no son los de defecto). */
export function hrefU(v: VistaU, anioDef: number, u: string | null): string {
  const p = new URLSearchParams();
  if (v.anio !== anioDef) p.set("anio", String(v.anio));
  if (v.medida !== MEDIDA_U_DEFECTO) p.set("med", v.medida);
  if (v.orden !== ORDEN_U_DEFECTO) p.set("orden", v.orden);
  if (u) p.set("u", u);
  const q = p.toString();
  return RUTA_U + (q ? "?" + q : "");
}

const MAX_IMG = 10;
/** Imagen para compartir: las diez primeras universidades de la lista (en el orden que se ve), "Otras N universidades" con el resto, "Sin asignar" y "Otros gastos
 *  del programa". Los valores son los mismos redondeados de la página, así que suman el total. */
export function armarImagenU(v: VistaU, formato: FormatoImg, hoy: Date = new Date()): DatosImagen {
  const univ = v.filas.filter((f) => f.tipo === "univ"), resto = v.filas.filter((f) => f.tipo !== "univ");
  const vistas = univ.length > MAX_IMG + 1 ? univ.slice(0, MAX_IMG) : univ, otras = univ.slice(vistas.length);
  const detalle = (f: FilaU) => [f.parte && `${f.parte} del total`, f.variTxt && `${f.variTxt} real vs ${v.anio - 1}`, f.porEstTxt && `${f.porEstTxt} por estudiante`].filter(Boolean).join(" · ") || " ";
  const filas: FilaBarra[] = vistas.concat(resto).map((f, i) => ({ id: `univ-${i}`, nombre: f.n, valor: Math.max(0, f.valor), variacion: f.txt, cls: "neutro", ini: null, fin: null, nota: null, detalle: detalle(f) }));
  if (otras.length) {
    const suma = aDec(otras.reduce((a, f) => a + f.valor, 0), v.esc.dec), partes = aDec(otras.reduce((a, f) => a + (valorMostrado(f.parte ?? "0") ?? 0), 0), 1);
    filas.splice(vistas.length, 0, { id: "univ-otras", nombre: `Otras ${otras.length} universidades`, valor: Math.max(0, suma), variacion: v.esc.txt(suma), cls: "neutro", ini: null, fin: null, nota: null, detalle: `${conSigno(partes, 1)} % del total` });
  }
  const orden = { monto: "ordenadas por monto", var: "ordenadas por variación real", est: "ordenadas por lo transferido por estudiante" }[v.ordenUsado];
  return {
    formato, titulo: tituloU(v), temporalidad: `Gastado (devengado) en ${v.anio}${v.enCurso ? " (hasta la fecha)" : ""}, ${orden}`,
    cifra: null, frases: [{ texto: `Total del programa: ${v.total}${v.totalPib && v.medidaUsada === "hoy" ? ` · ${v.totalPib} del PIB` : ""}`, cls: "neutro" }],
    leyenda: null, x: [], series: [], fmtEje: (x) => String(x), fmtEje2: null, franjas: [], inicioTxt: null,
    comentario: "", unidad: v.unidad, fuente: `${FUENTE_GASTO}${v.actualizado ? `, actualizado al ${fechaLarga(v.actualizado)}` : ""}`,
    nota: "Transferencias del programa Desarrollo de la Educación Superior; no es el costo de un estudiante",
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-universidades-${v.anio}${v.medida === "pib" ? "-pib" : ""}`,
    lienzo: { tipo: "barras", filas, sinDatos: [], enc: { nombre: "Universidad", valor: v.medidaUsada === "hoy" ? "Monto" : "Porcentaje" }, sinTope: true },
    marcaUltimo: false,
  };
}

/** Título y descripción de la vista previa de /universidades/ (vista de entrada: último año cerrado, pesos de hoy, por monto). */
export function textosPreviaU(v: VistaU): { titulo: string; descripcion: string } {
  const top = v.filas.filter((f) => f.tipo === "univ").slice(0, 3).map((f) => `${f.n} (${f.parte})`);
  const total = v.totalHoy ?? v.total;
  return {
    titulo: `Cuánto reciben las universidades: ${total} en ${v.anio}`,
    descripcion: [
      top.length ? `Las que más recibieron: ${top.join(", ")}.` : "",
      `${v.totalPib ? `${v.totalPib} del PIB. ` : ""}Transferencias de la Nación a cada universidad nacional desde 2018, ajustadas por inflación, y control y rendición de cuentas. Fuente: ${FUENTE_GASTO}.`,
    ].filter(Boolean).join(" "),
  };
}

/** Las cuentas de la serie de una universidad, por si hace falta chequearlas fuera de la página. */
export const buscarUniv = (d: DatosUniv, nombre: string | null): Univ | null => (nombre ? d.universidades.find((u) => norm(u.n).trim() === norm(nombre).trim()) ?? null : null);
