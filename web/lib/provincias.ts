// Cuánto gasta la Nación en cada provincia (/provincias/, docs/specs/provincias.md, fase 1): todas las cuentas de la página, la imagen para compartir y la vista previa.
// Los datos los escribe pipeline/provincias.py: un índice (`provincias.json`) con, por provincia y año, lo devengado (millones de pesos corrientes), la parte de
// Seguridad social y la población, y un archivo por año (`provincias_<AÑO>.json`) con los tres árboles de cada provincia (los mismos `Nodo` de lib/gasto.ts).
// Es el gasto que la Nación declara ubicado en cada provincia: no es el gasto del gobierno provincial ni incluye la coparticipación.
// Pesos de hoy: el mismo deflactor anual que el gasto de la Nación (lib/gasto.ts). Las cuentas cierran: las filas que se ven suman el total que se ve, con los
// valores redondeados como se muestran. Palabras neutras y sin veredicto (D-012).
import type { FormatoImg } from "./config";
import type { DatosImagen, FilaBarra } from "./imagen";
import {
  FUENTE_GASTO, aDec, conSigno, decPctDe, decodificarAnio, escalaDe, fechaCorta, mostrado, repartir,
  type AnioGasto, type ArchivoAnio, type Deflactor, type Etapas, type Nodo,
} from "./gasto";
import { fmtMillones, nf0, nfDec, norm, r1 } from "./formato";
import { txtVariacion, type PuntoEvo } from "./universidades";

// ---------------------------------------------------------------- formato de los archivos (contrato con el pipeline)
export interface ProvIx { id: string; n: string; pob: (number | null)[]; v: (number | null)[]; ss: (number | null)[] }
export interface SinProv { id: string; n: string; v: (number | null)[] }
export interface AnioProv { anio: number; en_curso: boolean; actualizado: string | null; pib: number | null; archivo: string }
export interface SerieAgregada { n: string; v: (number | null)[] }
export interface Agregado { anios: number[]; series: SerieAgregada[] }
export interface DatosProv {
  generado: string; fuente: string; fuentePoblacion: string; fuenteAgregado: string;
  anios: AnioProv[]; provincias: ProvIx[]; sinProvincia: SinProv[]; total: (number | null)[]; agregado: Agregado | null;
}
/** Un archivo anual: los árboles de cada provincia, indexados por su id. */
export interface ArchivoProv { anio: number; provincias: Record<string, ArchivoAnio> }

const numeros = (v: unknown, n: number): (number | null)[] =>
  Array.from({ length: n }, (_, i) => { const x = Array.isArray(v) ? (v[i] as unknown) : null; return typeof x === "number" && isFinite(x) ? x : null; });
const idDe = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x.trim() : typeof x === "number" && Number.isFinite(x) ? String(x) : null);

/** Valida el índice con tolerancia: lo que falta queda en null. null si no trae años ni provincias. */
export function decodificarProv(c: unknown): DatosProv | null {
  if (!c || typeof c !== "object") return null;
  const r = c as Record<string, unknown>;
  const anios: AnioProv[] = (Array.isArray(r.anios) ? r.anios : [])
    .map((a): AnioProv | null => {
      if (!a || typeof a !== "object") return null;
      const o = a as Record<string, unknown>;
      if (!Number.isInteger(o.anio) || typeof o.archivo !== "string" || !/^[\w.-]+\.json$/.test(o.archivo)) return null;
      return {
        anio: o.anio as number, en_curso: !!o.en_curso, actualizado: typeof o.actualizado === "string" ? o.actualizado : null,
        pib: typeof o.pib === "number" && o.pib > 0 ? o.pib : null, archivo: o.archivo,
      };
    })
    .filter((a): a is AnioProv => !!a);
  // el orden de los años del archivo es el de todos los arreglos por año: se conserva (y se exige que estén en orden)
  if (!anios.length || anios.some((a, i) => i > 0 && a.anio <= anios[i - 1].anio) || !Array.isArray(r.provincias)) return null;
  const n = anios.length;
  const provincias: ProvIx[] = [];
  for (const p of r.provincias as unknown[]) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>, id = idDe(o.id);
    if (!id || typeof o.n !== "string" || !o.n) continue;
    provincias.push({ id, n: o.n, pob: numeros(o.pob, n), v: numeros(o.v, n), ss: numeros(o.ss, n) });
  }
  if (!provincias.length) return null;
  const sinProvincia: SinProv[] = [];
  for (const p of Array.isArray(r.sin_provincia) ? (r.sin_provincia as unknown[]) : []) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>, id = idDe(o.id);
    if (id && typeof o.n === "string" && o.n) sinProvincia.push({ id, n: o.n, v: numeros(o.v, n) });
  }
  let agregado: Agregado | null = null;
  const ag = r.agregado as Record<string, unknown> | undefined;
  if (ag && typeof ag === "object" && Array.isArray(ag.anios) && Array.isArray(ag.series)) {
    const as = (ag.anios as unknown[]).filter((a): a is number => Number.isInteger(a));
    const series = (ag.series as unknown[]).flatMap((s): SerieAgregada[] => {
      const o = s as Record<string, unknown> | null;
      return o && typeof o === "object" && typeof o.n === "string" && o.n ? [{ n: o.n, v: numeros(o.v, as.length) }] : [];
    });
    if (as.length >= 2 && series.length) agregado = { anios: as, series };
  }
  return {
    generado: typeof r.generado === "string" ? r.generado : "", fuente: typeof r.fuente === "string" ? r.fuente : "",
    fuentePoblacion: typeof r.fuente_poblacion === "string" ? r.fuente_poblacion : "", fuenteAgregado: typeof r.fuente_agregado === "string" ? r.fuente_agregado : "",
    anios, provincias, sinProvincia, total: numeros(r.total, n), agregado,
  };
}

/** Valida un archivo anual: cada provincia con sus tres árboles (los nodos mal formados se descartan). */
export function decodificarAnioProv(c: unknown): ArchivoProv | null {
  if (!c || typeof c !== "object") return null;
  const r = c as Record<string, unknown>;
  if (!Number.isInteger(r.anio) || !r.provincias || typeof r.provincias !== "object") return null;
  const provincias: Record<string, ArchivoAnio> = {};
  for (const [id, arboles] of Object.entries(r.provincias as Record<string, unknown>)) {
    const a = decodificarAnio({ anio: r.anio, arboles });
    if (a && Object.keys(a.arboles).length) provincias[id] = a;
  }
  return { anio: r.anio as number, provincias };
}

// ---------------------------------------------------------------- opciones de la página (valores de la URL)
export type MedidaP = "hab" | "total" | "pct";
export const MEDIDAS_P: [MedidaP, string][] = [["hab", "Por habitante"], ["total", "Total"], ["pct", "% de lo ubicado"]];
export const MEDIDA_P_DEFECTO: MedidaP = "hab";
export type GastoP = "todo" | "sin_ss";
export const GASTOS_P: [GastoP, string][] = [["todo", "Todo"], ["sin_ss", "Sin jubilaciones ni asignaciones"]];
export const GASTO_P_DEFECTO: GastoP = "todo";
export const esMedidaP = (s: string | null): s is MedidaP => MEDIDAS_P.some((x) => x[0] === s);
export const esGastoP = (s: string | null): s is GastoP => GASTOS_P.some((x) => x[0] === s);
/** Formas del detalle de una provincia (las tres de /gasto/ que se abren por provincia). */
export type FormaP = "para_que" | "quien" | "en_que";
export const FORMAS_P: [FormaP, string][] = [["para_que", "Para qué"], ["quien", "Quién"], ["en_que", "En qué"]];
export const FORMA_P_DEFECTO: FormaP = "para_que";
export const esFormaP = (s: string | null): s is FormaP => FORMAS_P.some((x) => x[0] === s);

export const RUTA_P = "/provincias/";
export const TITULO_P = "Cuánto gasta la Nación en cada provincia";
export const FUENTE_PROV = `${FUENTE_GASTO} (gasto por provincia) e INDEC (proyecciones de población)`;
export const SEG_SOCIAL = "Seguridad social";
export const NOTA_CABA = "En la Ciudad de Buenos Aires figuran las sedes de los organismos nacionales: parte de ese gasto se hace para todo el país.";
export const nombreMedidaP = (m: MedidaP) => MEDIDAS_P.find((x) => x[0] === m)![1];

/** Todo lo que hace falta para calcular: los datos, el deflactor y qué años están en curso. */
export interface Contexto { d: DatosProv; def: Deflactor; enCurso: Set<number>; actualizado: (anio: number) => string | null }
export function crearContexto(d: DatosProv, def: Deflactor): Contexto {
  return { d, def, enCurso: new Set(d.anios.filter((a) => a.en_curso).map((a) => a.anio)), actualizado: (a) => d.anios.find((x) => x.anio === a)?.actualizado ?? null };
}
const indiceDe = (c: Contexto, anio: number) => c.d.anios.findIndex((a) => a.anio === anio);
/** Años con gasto ubicado en alguna provincia. */
export const aniosConDatos = (c: Contexto): number[] => c.d.anios.filter((_, i) => c.d.provincias.some((p) => (p.v[i] ?? 0) > 0)).map((a) => a.anio);
/** Año por defecto: el último cerrado (si no hay ninguno cerrado, el último). */
export function anioDefectoP(c: Contexto): number {
  const todos = aniosConDatos(c), cerrados = todos.filter((a) => !c.enCurso.has(a)), l = cerrados.length ? cerrados : todos;
  return l[l.length - 1] ?? c.d.anios[c.d.anios.length - 1].anio;
}
export const anioValidoP = (c: Contexto, s: string | null): number | null => aniosConDatos(c).find((a) => String(a) === s) ?? null;
export const opcionesAnioP = (c: Contexto): [string, string][] =>
  [...aniosConDatos(c)].reverse().map((a) => {
    const f = fechaCorta(c.actualizado(a));
    return [String(a), c.enCurso.has(a) ? `${a} · en curso${f ? `, datos al ${f}` : ""}` : String(a)];
  });
/** La provincia que pide la URL (por su id; "02" y "2" son la misma). */
export function buscarProv(d: DatosProv, s: string | null): ProvIx | null {
  if (!s) return null;
  const k = Number(s);
  return d.provincias.find((p) => p.id === s || (Number.isFinite(k) && s.trim() !== "" && Number(p.id) === k)) ?? null;
}
export const esCaba = (p: { id: string }) => Number(p.id) === 2;

// ---------------------------------------------------------------- cuentas básicas
/** Millones corrientes de un año según el "Qué gasto" elegido; null si falta el dato (o, sin jubilaciones, si falta la parte de Seguridad social). */
function gastoDe(p: ProvIx, i: number, gasto: GastoP): number | null {
  const v = p.v[i];
  if (v == null) return null;
  if (gasto === "todo") return v;
  const ss = p.ss[i];
  return ss == null ? null : v - ss;
}
const factorDe = (c: Contexto, anio: number) => c.def.factor(anio);
/** Pesos de hoy (millones). Sin inflación del año, se usan los pesos corrientes (la página lo avisa). */
const aHoy = (c: Contexto, anio: number, millones: number) => millones * (factorDe(c, anio) ?? 1);
/** Pesos de hoy por habitante, en pesos enteros; null si falta el gasto o la población. */
function porHabitante(c: Contexto, p: ProvIx, i: number, gasto: GastoP): number | null {
  const g = gastoDe(p, i, gasto), pob = p.pob[i];
  return g != null && pob != null && pob > 0 ? Math.round((aHoy(c, c.d.anios[i].anio, g) * 1e6) / pob) : null;
}
/** Variación real (en %, un decimal) contra el año anterior: por habitante si se ve por habitante y, si no, el total en pesos de hoy.
 *  null si falta algún año o si el año está en curso. */
export function variacionProv(c: Contexto, p: ProvIx, i: number, medida: MedidaP, gasto: GastoP): number | null {
  if (i < 1 || c.enCurso.has(c.d.anios[i].anio)) return null;
  const f = (k: number) => (medida === "hab" ? porHabitante(c, p, k, gasto) : (() => { const g = gastoDe(p, k, gasto); return g != null ? aHoy(c, c.d.anios[k].anio, g) : null; })());
  const a = f(i - 1), b = f(i);
  return a != null && b != null && a > 0 ? r1((b / a - 1) * 100) : null;
}
export const txtPesosHab = (pesos: number): string => `$ ${nf0.format(pesos)}`;

// ---------------------------------------------------------------- la tabla
export interface FilaP {
  id: string; n: string; pos: number | null; caba: boolean; sinDato: boolean;
  raw: number | null;                // millones corrientes (según "Qué gasto")
  valor: number;                     // el valor de la medida, como se muestra (para las barras de la imagen)
  txt: string;                       // la medida, como se muestra
  otraTxt: string | null;            // la otra cifra: el total (si se ve por habitante) o por habitante (si se ve el total)
  vari: number | null; variTxt: string | null;
}
export interface Masa { ubicado: string; caba: string; resto: string }
export interface SinProvincia { filas: { n: string; txt: string; parte: string }[]; total: string; parte: string }
export interface VistaP {
  anio: number; i: number; enCurso: boolean; medida: MedidaP; gasto: GastoP; aviso: string | null; ref: string; unidad: string;
  filas: FilaP[]; total: string; totalOtro: string | null; totalHab: string | null; sinProvincia: SinProvincia | null; masa: Masa | null; actualizado: string | null;
}

/** Arma la tabla de las 24 jurisdicciones de un año, ordenada por la medida elegida (mayor a menor; sin dato al final). */
export function armarVistaP(c: Contexto, o: { anio: number; medida: MedidaP; gasto: GastoP }): VistaP | null {
  const { d } = c, i = indiceDe(c, o.anio);
  if (i < 0) return null;
  const items = d.provincias.map((p) => ({ p, raw: gastoDe(p, i, o.gasto), hab: porHabitante(c, p, i, o.gasto) }));
  const con = items.filter((x) => x.raw != null);
  if (!con.length) return null;
  const aviso = factorDe(c, o.anio) == null ? `No hay inflación para ${o.anio}: se muestra en pesos corrientes.` : null;
  const hoy = (raw: number) => aHoy(c, o.anio, raw);
  const totalRaw = con.reduce((a, x) => a + (x.raw as number), 0);

  // lo que se muestra de cada fila en la medida elegida, con las cuentas cerradas
  let txts = new Map<string, { valor: number; txt: string }>(), totalTxt = "";
  if (o.medida === "hab") {
    for (const x of items) if (x.hab != null) txts.set(x.p.id, { valor: x.hab, txt: txtPesosHab(x.hab) });
    const pobT = con.reduce((a, x) => a + (x.p.pob[i] ?? 0), 0), todas = con.every((x) => (x.p.pob[i] ?? 0) > 0);
    totalTxt = todas && pobT > 0 ? txtPesosHab(Math.round((hoy(totalRaw) * 1e6) / pobT)) : "";
  } else if (o.medida === "total") {
    const medidos = con.map((x) => hoy(x.raw as number)), minimo = Math.min(...medidos.map(Math.abs).filter((x) => x > 0), Math.abs(hoy(totalRaw)) || Infinity);
    const esc = escalaDe("hoy", hoy(totalRaw), isFinite(minimo) ? minimo : 0), totalR = mostrado(esc, hoy(totalRaw));
    const vals = repartir(medidos.map((x) => esc.a(x)), totalR, esc.dec);
    con.forEach((x, k) => txts.set(x.p.id, { valor: vals[k], txt: esc.txt(vals[k]) }));
    totalTxt = esc.txt(totalR);
  } else {
    const partes = con.map((x) => ((x.raw as number) / totalRaw) * 100), dec = decPctDe(partes), vals = repartir(partes, 100, dec);
    con.forEach((x, k) => txts.set(x.p.id, { valor: vals[k], txt: `${conSigno(vals[k], dec)} %` }));
    totalTxt = `${conSigno(100, dec)} %`;
  }
  const clave = (x: (typeof items)[number]) => (o.medida === "hab" ? x.hab : x.raw);
  const orden = [...items].sort((a, b) => {
    const x = clave(a), y = clave(b);
    if (x == null && y == null) return a.p.n.localeCompare(b.p.n, "es");
    if (x == null) return 1;
    if (y == null) return -1;
    return y - x || a.p.n.localeCompare(b.p.n, "es");
  });
  // la columna del total (cuando se ve por habitante) va toda en la misma unidad, con las cuentas cerradas como en la medida "total"
  const otraTotal = new Map<string, string>();
  let otraTotalSuma = fmtMillones(hoy(totalRaw));
  if (o.medida === "hab") {
    const medidos = con.map((x) => hoy(x.raw as number)), minimo = Math.min(...medidos.map(Math.abs).filter((x) => x > 0), Math.abs(hoy(totalRaw)) || Infinity);
    const esc = escalaDe("hoy", hoy(totalRaw), isFinite(minimo) ? minimo : 0), totalR = mostrado(esc, hoy(totalRaw));
    const vals = repartir(medidos.map((x) => esc.a(x)), totalR, esc.dec);
    con.forEach((x, k) => otraTotal.set(x.p.id, esc.txt(vals[k])));
    otraTotalSuma = esc.txt(totalR);
  }
  let pos = 0;
  const filas: FilaP[] = orden.map((x) => {
    const t = txts.get(x.p.id) ?? null, vari = variacionProv(c, x.p, i, o.medida, o.gasto);
    const otra = o.medida === "hab" ? (otraTotal.get(x.p.id) ?? null) : x.hab != null ? txtPesosHab(x.hab) : null;
    return {
      id: x.p.id, n: x.p.n, pos: t ? ++pos : null, caba: esCaba(x.p), sinDato: !t, raw: x.raw, valor: t?.valor ?? 0, txt: t?.txt ?? "Sin dato",
      otraTxt: otra, vari, variTxt: vari != null ? txtVariacion(vari) : null,
    };
  });
  const pobTodas = con.every((x) => (x.p.pob[i] ?? 0) > 0) ? con.reduce((a, x) => a + (x.p.pob[i] as number), 0) : 0;
  return {
    anio: o.anio, i, enCurso: c.enCurso.has(o.anio), medida: o.medida, gasto: o.gasto, aviso, ref: c.def.ref,
    unidad: o.medida === "pct" ? `% de lo que la Nación gastó en las 24 jurisdicciones en ${o.anio}`
      : factorDe(c, o.anio) == null ? `Pesos corrientes de ${o.anio}${o.medida === "hab" ? " por habitante" : ""}` : `Pesos de ${c.def.ref}${o.medida === "hab" ? " por habitante" : ""} (ajustados por inflación con el IPC)`,
    filas, total: totalTxt, totalOtro: o.medida === "hab" ? otraTotalSuma : pobTodas > 0 ? txtPesosHab(Math.round((hoy(totalRaw) * 1e6) / pobTodas)) : null, totalHab: o.medida !== "hab" && pobTodas > 0 ? txtPesosHab(Math.round((hoy(totalRaw) * 1e6) / pobTodas)) : null,
    sinProvincia: armarSinProvincia(c, i), masa: armarMasa(c, i), actualizado: c.actualizado(o.anio),
  };
}

/** "De cada $100…": lo que figura en una provincia (sin la Ciudad de Buenos Aires), en la Ciudad de Buenos Aires y sin provincia. Siempre con todo el gasto. Suman 100. */
function armarMasa(c: Contexto, i: number): Masa | null {
  const { d } = c;
  const caba = d.provincias.find(esCaba)?.v[i] ?? null;
  const prov = d.provincias.filter((p) => !esCaba(p)).reduce((a, p) => a + (p.v[i] ?? 0), 0);
  const resto = d.sinProvincia.reduce((a, p) => a + (p.v[i] ?? 0), 0);
  const suma = prov + (caba ?? 0) + resto;
  if (!(suma > 0) || caba == null) return null;
  const [a, b, z] = repartir([(prov / suma) * 100, (caba / suma) * 100, (resto / suma) * 100], 100, 1);
  const t = (x: number) => nfDec(1).format(x);
  return { ubicado: t(a), caba: t(b), resto: t(z) };
}

/** Lo que no tiene provincia (Interprovincial, Nacional, Binacional, No clasificado), en pesos de hoy y con su parte del gasto total. Las partes suman lo que se ve. */
function armarSinProvincia(c: Contexto, i: number): SinProvincia | null {
  const { d } = c, anio = d.anios[i].anio;
  const items = d.sinProvincia.filter((p) => p.v[i] != null).map((p) => ({ n: p.n, v: p.v[i] as number }));
  const suma = items.reduce((a, x) => a + x.v, 0);
  const tot = d.provincias.reduce((a, p) => a + (p.v[i] ?? 0), 0) + suma;
  if (!items.length || !(tot > 0)) return null;
  const hoy = items.map((x) => aHoy(c, anio, x.v)), minimo = Math.min(...hoy.map(Math.abs).filter((x) => x > 0), Math.abs(aHoy(c, anio, suma)) || Infinity);
  const esc = escalaDe("hoy", aHoy(c, anio, suma), isFinite(minimo) ? minimo : 0), totalR = mostrado(esc, aHoy(c, anio, suma));
  const vals = repartir(hoy.map((x) => esc.a(x)), totalR, esc.dec);
  const partes = items.map((x) => (x.v / tot) * 100), pt = (suma / tot) * 100, dec = 2;   // dos decimales: Binacional pesa centésimas
  const ps = repartir(partes, aDec(pt, dec), dec);
  return {
    filas: items.map((x, k) => ({ n: x.n, txt: esc.txt(vals[k]), parte: `${conSigno(ps[k], dec)} %` })),
    total: esc.txt(totalR), parte: `${conSigno(aDec(pt, dec), dec)} %`,
  };
}

/** Las cuentas de la tabla, como se leen: la suma de las filas contra el total (solo si se ve el total o el %). Lo usan los chequeos. */
export function cuentasCierranP(v: VistaP): boolean {
  if (v.medida === "hab") return true;
  const suma = v.filas.reduce((a, f) => Math.round((a + f.valor) * 1e9) / 1e9, 0);
  const total = Number(v.total.replace(/[^\d,-]/g, "").replace(",", "."));
  return Math.abs(suma - total) < 1e-6;
}

// ---------------------------------------------------------------- detalle de una provincia
/** Los árboles de una provincia para un año. Sin jubilaciones: Para qué pierde la función Seguridad social (de Servicios sociales); Quién y En qué siguen enteros. */
export function arbolesDe(a: ArchivoAnio, gasto: GastoP): ArchivoAnio {
  const raiz = a.arboles.para_que;
  if (gasto !== "sin_ss" || !raiz) return a;
  return { anio: a.anio, arboles: { ...a.arboles, para_que: sinSeguridadSocial(raiz) } };
}
const resta = (x: Etapas, y: Etapas): Etapas => x.map((v, k) => Math.round((v - y[k]) * 10) / 10) as Etapas;
function sinSeguridadSocial(raiz: Nodo): Nodo {
  const fin = norm("Servicios sociales"), fun = norm(SEG_SOCIAL);
  let quitado: Etapas | null = null;
  const h: Nodo[] = [];
  for (const f of raiz.h ?? []) {
    const q = norm(f.n).trim() === fin ? f.h?.find((x) => norm(x.n).trim() === fun) : undefined;
    if (!q) { h.push(f); continue; }
    quitado = quitado ? (quitado.map((v, k) => v + q.v[k]) as Etapas) : q.v;
    const resto = (f.h ?? []).filter((x) => x !== q), v = resta(f.v, q.v);
    if (resto.length || v.some((x) => x !== 0)) h.push({ n: f.n, v, ...(f.t ? { t: f.t } : {}), ...(resto.length ? { h: resto } : {}) });
  }
  if (!quitado) return raiz;
  return { n: raiz.n, v: resta(raiz.v, quitado), ...(raiz.t ? { t: raiz.t } : {}), ...(h.length ? { h } : {}) };
}
/** El año como lo pide `armarVista` de lib/gasto.ts (solo usa el año, si está en curso y el PIB). */
export const anioGastoDe = (a: AnioProv): AnioGasto => ({ anio: a.anio, en_curso: a.en_curso, actualizado: a.actualizado, pib: a.pib, total: [0, 0, 0, 0, 0], archivo: a.archivo });

export interface EvoProv {
  puntos: PuntoEvo[]; primero: PuntoEvo | null; ultimo: PuntoEvo | null; hayEnCurso: boolean;
  filas: { anio: number; enCurso: boolean; hab: string | null; total: string | null; vari: string | null }[];
}
/** Evolución del gasto por habitante, en pesos de hoy, en todos los años del archivo. Los años sin dato quedan en null; el año en curso va marcado. */
export function evolucionProv(c: Contexto, p: ProvIx, gasto: GastoP): EvoProv {
  const vals = c.d.anios.map((_, i) => porHabitante(c, p, i, gasto)), mayor = Math.max(...vals.map((x) => x ?? 0), 0);
  const puntos: PuntoEvo[] = c.d.anios.map((a, i) => ({
    anio: a.anio, valor: vals[i], enCurso: c.enCurso.has(a.anio), txt: vals[i] != null ? txtPesosHab(vals[i]!) : null,
    alto: vals[i] != null && mayor > 0 ? Math.max(0.03, vals[i]! / mayor) : 0,
  }));
  const con = puntos.filter((x) => x.valor != null);
  const filas = c.d.anios.map((a, i) => {
    const g = gastoDe(p, i, gasto), vari = variacionProv(c, p, i, "hab", gasto);
    return { anio: a.anio, enCurso: c.enCurso.has(a.anio), hab: puntos[i].txt, total: g != null ? fmtMillones(aHoy(c, a.anio, g)) : null, vari: vari != null ? txtVariacion(vari) : null };
  }).reverse();
  return { puntos, primero: con[0] ?? null, ultimo: con[con.length - 1] ?? null, hayEnCurso: puntos.some((x) => x.enCurso && x.valor != null), filas };
}

// ---------------------------------------------------------------- el agregado de todas las provincias (% del PIB)
export interface LineaAgregada { n: string; v: (number | null)[]; ultimo: { anio: number; valor: number; txt: string } | null; total: boolean }
export interface GraficoAgregado { anios: number[]; lineas: LineaAgregada[]; max: number; ultimoAnio: number }
/** El agregado de todas las provincias juntas en % del PIB: una línea por serie (la primera es el total) con su último valor. */
export function armarAgregado(ag: Agregado): GraficoAgregado {
  const lineas: LineaAgregada[] = ag.series.map((s, k) => {
    let ult: LineaAgregada["ultimo"] = null;
    s.v.forEach((x, i) => { if (x != null && ag.anios[i] != null) ult = { anio: ag.anios[i], valor: x, txt: `${nfDec(1).format(x)} %` }; });
    return { n: s.n, v: s.v, ultimo: ult, total: k === 0 };
  });
  const max = Math.max(...lineas.flatMap((l) => l.v.filter((x): x is number => x != null)), 0);
  const ultimoAnio = Math.max(...lineas.map((l) => l.ultimo?.anio ?? 0), 0);
  return { anios: ag.anios, lineas, max, ultimoAnio };
}

// ---------------------------------------------------------------- textos, imagen y vista previa
/** Título de la vista: "Cuánto gasta la Nación en cada provincia en 2024". */
export const tituloP = (v: VistaP) => `${TITULO_P} en ${v.anio}${v.enCurso ? " (en curso)" : ""}`;
/** Dirección de la vista (con los parámetros que no son los de defecto). `prov`, `forma` y `ruta`: el detalle abierto. */
export function hrefP(v: { anio: number; medida: MedidaP; gasto: GastoP }, anioDef: number, det: { prov?: string | null; forma?: FormaP; ruta?: string | null } = {}): string {
  const p = new URLSearchParams();
  if (v.anio !== anioDef) p.set("anio", String(v.anio));
  if (v.medida !== MEDIDA_P_DEFECTO) p.set("medida", v.medida);
  if (v.gasto !== GASTO_P_DEFECTO) p.set("gasto", v.gasto);
  if (det.prov) {
    p.set("prov", det.prov);
    if (det.forma && det.forma !== FORMA_P_DEFECTO) p.set("forma", det.forma);
    if (det.ruta) p.set("ruta", det.ruta);
  }
  const q = p.toString();
  return RUTA_P + (q ? "?" + q : "");
}

/** Imagen para compartir: las 24 jurisdicciones en barras, en el orden y la medida que se ven. */
export function armarImagenP(v: VistaP, formato: FormatoImg, hoy: Date = new Date()): DatosImagen {
  const filas: FilaBarra[] = v.filas.filter((f) => !f.sinDato).map((f, i) => ({
    id: `prov-${i}`, nombre: f.n, valor: Math.max(0, f.valor), variacion: f.txt, cls: "neutro", ini: null, fin: null, nota: null,
    detalle: [f.otraTxt && (v.medida === "hab" ? `${f.otraTxt} en total` : `${f.otraTxt} por habitante`), f.variTxt && `${f.variTxt} real vs ${v.anio - 1}`].filter(Boolean).join(" · ") || " ",
  }));
  const queGasto = v.gasto === "sin_ss" ? "sin jubilaciones ni asignaciones" : "todo el gasto";
  return {
    formato, titulo: tituloP(v), temporalidad: `Gastado (devengado) en ${v.anio}${v.enCurso ? " (hasta la fecha)" : ""}, ${queGasto}, ordenado de mayor a menor`,
    cifra: null, frases: [{ texto: fraseJuntas(v), cls: "neutro" }],
    leyenda: null, x: [], series: [], fmtEje: (x) => String(x), fmtEje2: null, franjas: [], inicioTxt: null,
    comentario: "", unidad: v.unidad, fuente: `${FUENTE_PROV}${v.actualizado ? `, gasto actualizado al ${v.actualizado}` : ""}`,
    nota: "Gasto que la Nación declara ubicado en cada provincia: no es el gasto del gobierno provincial ni incluye la coparticipación",
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-provincias-${v.anio}-${v.medida}${v.gasto === "sin_ss" ? "-sin-jubilaciones" : ""}`,
    lienzo: { tipo: "barras", filas, sinDatos: [], enc: { nombre: "Provincia", valor: v.medida === "pct" ? "Porcentaje" : v.medida === "hab" ? "Por habitante" : "Monto" }, sinTope: true },
    marcaUltimo: false,
  };
}

/** Título y descripción de la vista previa de /provincias/. `hab`: la vista de entrada (último año cerrado, por habitante, todo el gasto); `total`: la misma en total
 *  (de ahí sale la cifra del título). Sin veredicto: solo se nombran las tres con más gasto por habitante sin contar la Ciudad de Buenos Aires. */
export function textosPreviaP(hab: VistaP, total: VistaP): { titulo: string; descripcion: string } {
  const top = hab.filas.filter((f) => !f.sinDato && !f.caba).slice(0, 3).map((f) => `${f.n} (${f.txt})`);
  return {
    titulo: `${TITULO_P}: ${total.total} en ${total.anio}`,
    descripcion: [
      top.length ? `Por habitante, en pesos de hoy, sin contar la Ciudad de Buenos Aires: ${top.join(", ")}.` : "",
      `Es el gasto que la Nación declara ubicado en cada provincia (jubilaciones, asignaciones, universidades, obras y transferencias), no el de los gobiernos provinciales. Fuente: ${FUENTE_GASTO}.`,
    ].filter(Boolean).join(" "),
  };
}

/** Texto que termina con un solo punto (las fuentes del pipeline ya traen el suyo). */
export const conPunto = (s: string): string => `${s.trim().replace(/\.+$/, "")}.`;

/** La línea de las 24 juntas en la imagen, con la unidad dicha en cada cifra (por habitante, en total). */
function fraseJuntas(v: VistaP): string {
  const partes = v.medida === "hab" ? [v.total && `${v.total} por habitante`, v.totalOtro && `${v.totalOtro} en total`]
    : v.medida === "total" ? [v.total && `${v.total} en total`, v.totalHab && `${v.totalHab} por habitante`]
    : [v.totalOtro && `${v.totalOtro} por habitante`];
  const txt = partes.filter(Boolean).join(" · ");
  return txt ? `Las 24 jurisdicciones juntas: ${txt}` : "Las 24 jurisdicciones";
}
