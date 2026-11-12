// En qué gasta la Nación (/gasto/, docs/specs/gasto-nacion.md): todas las cuentas de la página, la imagen para compartir y la vista previa.
// Los datos los escribe pipeline/gasto_nacion.py: un índice chico (`gasto_nacion.json`) y un archivo por año (`gasto_nacion_<AÑO>.json`)
// con los árboles agregados. Montos en millones de pesos corrientes; cada nodo trae las cinco etapas del gasto.
// Pesos de hoy: el monto de cada año por el IPC del último mes sobre el IPC promedio de ese año (el IPC es el que ya carga el sitio en base.json).
// Las cuentas cierran: las barras que se ven más "Otros" dan el total que se ve, con los valores redondeados tal como se muestran.
// Palabras neutras y sin veredicto (D-012).
import type { FormatoImg } from "./config";
import type { DatosImagen, FilaBarra } from "./imagen";
import { MESES, lastIdx, nf1, nfDec, norm, ok, r1, restaLimpia, unidadMontoDe, valorMostrado } from "./formato";

// ---------------------------------------------------------------- formato de los archivos (contrato con el pipeline)
/** [presupuestado, vigente, comprometido, devengado, pagado], en millones de pesos corrientes. */
export type Etapas = [number, number, number, number, number];
export interface Nodo { n: string; v: Etapas; t?: string; h?: Nodo[] }
export type Forma = "para_que" | "quien" | "en_que" | "donde";
export interface ArchivoAnio { anio: number; arboles: Partial<Record<Forma | "fuente", Nodo>> }
export interface AnioGasto { anio: number; en_curso: boolean; actualizado: string | null; pib: number | null; total: Etapas; archivo: string }
export interface SerieLarga {
  anios: number[]; pib: (number | null)[];
  finalidades: { n: string; v: (number | null)[]; h?: { n: string; v: (number | null)[] }[] }[];
}
export interface IndiceGasto { generado: string; fuente: string; anios: AnioGasto[]; serie_larga: SerieLarga | null }

const esEtapas = (v: unknown): v is Etapas => Array.isArray(v) && v.length === 5 && v.every((x) => typeof x === "number" && isFinite(x));

/** Valida el índice y deja los años en orden. null si no trae ningún año usable. */
export function decodificarIndice(c: unknown): IndiceGasto | null {
  if (!c || typeof c !== "object") return null;
  const r = c as Partial<IndiceGasto>;
  const anios = (Array.isArray(r.anios) ? r.anios : [])
    .filter((a) => a && Number.isInteger(a.anio) && esEtapas(a.total) && typeof a.archivo === "string" && /^[\w.-]+\.json$/.test(a.archivo))
    .map((a) => ({ ...a, en_curso: !!a.en_curso, actualizado: typeof a.actualizado === "string" ? a.actualizado : null, pib: ok(a.pib) && a.pib > 0 ? a.pib : null }))
    .sort((a, b) => a.anio - b.anio);
  if (!anios.length) return null;
  const sl = r.serie_larga;
  const serie = sl && Array.isArray(sl.anios) && Array.isArray(sl.finalidades) && Array.isArray(sl.pib) ? sl : null;
  return { generado: typeof r.generado === "string" ? r.generado : "", fuente: typeof r.fuente === "string" ? r.fuente : "", anios, serie_larga: serie };
}

/** Un nodo bien formado (los hijos que no lo están se descartan). */
function nodoValido(x: unknown): Nodo | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Nodo;
  if (typeof o.n !== "string" || !esEtapas(o.v)) return null;
  const h = Array.isArray(o.h) ? o.h.map(nodoValido).filter((y): y is Nodo => !!y) : undefined;
  return { n: o.n, v: o.v, ...(typeof o.t === "string" && o.t ? { t: o.t } : {}), ...(h && h.length ? { h } : {}) };
}
export function decodificarAnio(c: unknown): ArchivoAnio | null {
  if (!c || typeof c !== "object") return null;
  const r = c as ArchivoAnio;
  if (!Number.isInteger(r.anio) || !r.arboles || typeof r.arboles !== "object") return null;
  const arboles: ArchivoAnio["arboles"] = {};
  for (const k of ["para_que", "quien", "en_que", "donde", "fuente"] as const) { const n = nodoValido(r.arboles[k]); if (n) arboles[k] = n; }
  return { anio: r.anio, arboles };
}

// ---------------------------------------------------------------- opciones de la página (valores de la URL)
export const FORMAS: [Forma, string][] = [["para_que", "Para qué"], ["quien", "Quién"], ["en_que", "En qué"], ["donde", "Dónde"]];
export const FORMA_DEFECTO: Forma = "para_que";
export type Medida = "hoy" | "pct" | "pib";
export const MEDIDAS: [Medida, string][] = [["hoy", "Pesos de hoy"], ["pct", "% del total"], ["pib", "% del PIB"]];
export const MEDIDA_DEFECTO: Medida = "hoy";
export type Etapa = "dev" | "pres" | "vig";
export const ETAPAS: [Etapa, string][] = [["dev", "Gastado (devengado)"], ["pres", "Presupuestado"], ["vig", "Vigente"]];
export const ETAPA_DEFECTO: Etapa = "dev";
const IDX: Record<Etapa, number> = { pres: 0, vig: 1, dev: 3 };
const IDX_VIGENTE = 1, IDX_DEVENGADO = 3;
/** Separador de la ruta en la URL (`ruta=Servicios sociales~Salud`). */
export const SEP_RUTA = "~";

/** Qué es cada nivel de cada forma (para las migas y los textos). */
export const NIVELES: Record<Forma, string[]> = {
  para_que: ["Finalidad", "Función"],
  quien: ["Ministerio u organismo", "Entidad", "Programa", "Universidad"],
  en_que: ["Tipo de gasto", "Partida"],
  donde: ["Provincia"],
};
/** Bajada de cada forma de mirar. */
export const BAJADA_FORMA: Record<Forma, string> = {
  para_que: "Para qué se gasta: salud, educación, jubilaciones, deuda… Tocá una barra para ver en qué se divide.",
  quien: "Quién gasta: cada ministerio u organismo, sus entidades y sus programas. Tocá una barra para ver en qué se divide.",
  en_que: "En qué se gasta: sueldos, bienes y servicios, transferencias, obras, intereses… Tocá una barra para ver en qué se divide.",
  donde: "Dónde se gasta: por provincia, según la ubicación que declara cada partida.",
};
export const NOTA_DONDE = "La provincia es la que declara cada partida del presupuesto, no dónde vive quien recibe el gasto. Mucho gasto figura en la Ciudad de Buenos Aires (donde están las sedes de los organismos) o como “Nacional” (sin una provincia).";

export const esForma = (s: string | null): s is Forma => FORMAS.some((f) => f[0] === s);
export const esMedida = (s: string | null): s is Medida => MEDIDAS.some((f) => f[0] === s);
export const esEtapa = (s: string | null): s is Etapa => ETAPAS.some((f) => f[0] === s);
export const nombreForma = (f: Forma) => FORMAS.find((x) => x[0] === f)![1];
export const nombreEtapa = (e: Etapa) => ({ dev: "Gastado", pres: "Presupuestado", vig: "Vigente" })[e];

/** Año por defecto: el último cerrado (si no hay ninguno cerrado, el último). */
export function anioDefecto(ix: IndiceGasto): AnioGasto {
  const cerrados = ix.anios.filter((a) => !a.en_curso);
  return (cerrados.length ? cerrados : ix.anios)[(cerrados.length ? cerrados : ix.anios).length - 1];
}
export const anioDe = (ix: IndiceGasto, s: string | null): AnioGasto | null => ix.anios.find((a) => String(a.anio) === s) ?? null;

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** "2025-07-01" → "1 de julio de 2025". */
export function fechaLarga(iso: string | null): string | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m && +m[2] >= 1 && +m[2] <= 12 ? `${+m[3]} de ${MESES_LARGOS[+m[2] - 1]} de ${m[1]}` : null;
}
/** "2026-11-10" → "10-nov-26" (corto, para el selector de año). */
export function fechaCorta(iso: string | null): string | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m && +m[2] >= 1 && +m[2] <= 12 ? `${+m[3]}-${MESES[+m[2] - 1]}-${m[1].slice(2)}` : null;
}
/** Opciones del selector de año, de la más nueva a la más vieja; el año en curso dice hasta cuándo trae datos. */
export const opcionesAnio = (ix: IndiceGasto): [string, string][] =>
  [...ix.anios].reverse().map((a) => {
    const f = fechaCorta(a.actualizado);
    return [String(a.anio), a.en_curso ? `${a.anio} · en curso${f ? `, datos al ${f}` : ""}` : String(a.anio)];
  });

// ---------------------------------------------------------------- pesos de hoy
export interface Deflactor { ref: string; factor: (anio: number) => number | null }
/** `F`: meses del catálogo ("AAAA-MM"); `IPC`: el IPC empalmado de base.json, mes a mes. Factor de un año = IPC del último mes / IPC promedio del año
 *  (con los meses que haya: el año en curso, con los publicados). */
export function crearDeflactor(F: string[], IPC: (number | null)[]): Deflactor {
  const ref = lastIdx(IPC), cache = new Map<number, number | null>();
  const refTxt = ref >= 0 ? `${MESES[+F[ref].slice(5, 7) - 1]}-${F[ref].slice(2, 4)}` : "";
  return {
    ref: refTxt,
    factor: (anio) => {
      if (cache.has(anio)) return cache.get(anio)!;
      let s = 0, n = 0;
      F.forEach((f, i) => { const x = IPC[i]; if (f.startsWith(`${anio}-`) && ok(x) && x > 0) { s += x; n++; } });
      const r = n && ref >= 0 ? (IPC[ref] as number) / (s / n) : null;
      cache.set(anio, r);
      return r;
    },
  };
}

// ---------------------------------------------------------------- árbol
/** Busca una ruta de nombres desde la raíz (sin importar mayúsculas ni tildes). Devuelve los nodos encontrados, raíz incluida; corta en el primero que no está. */
export function recorrer(raiz: Nodo, ruta: string[]): Nodo[] {
  const camino = [raiz];
  for (const n of ruta) {
    const k = norm(n).trim(), sig = camino[camino.length - 1].h?.find((x) => norm(x.n).trim() === k);
    if (!sig) break;
    camino.push(sig);
  }
  return camino;
}
export const leerRuta = (s: string | null): string[] => (s ? s.split(SEP_RUTA).map((x) => x.trim()).filter(Boolean) : []);
export const escribirRuta = (ruta: string[]): string | null => (ruta.length ? ruta.join(SEP_RUTA) : null);

// ---------------------------------------------------------------- la vista (lista de barras)
/** Escala con la que se muestra una lista entera: misma unidad y decimales para todas sus filas. */
interface Escala { a: (x: number) => number; txt: (u: number) => string; dec: number }
const decPct = (minimo: number) => (minimo >= 1 ? 1 : minimo >= 0.1 ? 2 : 3);
/** Decimales de una lista de porcentajes (según el menor distinto de cero), los mismos que usa la lista de barras. */
export const decPctDe = (valores: (number | null)[]): number => {
  const xs = valores.filter((x): x is number => x != null && isFinite(x) && x !== 0).map(Math.abs);
  return decPct(xs.length ? Math.min(...xs) : 1);
};
/** Valor ya en la unidad que se muestra, redondeado como se muestra (para que las cuentas cierren con lo que se lee). */
const mostrado = (e: Escala, x: number) => (valorMostrado(nfDec(e.dec).format(e.a(x))) ?? 0) || 0;
/** Redondeo a `dec` decimales sin ruido de coma flotante ni cero negativo (para restas entre valores ya redondeados). */
const aDec = (x: number, dec: number) => Math.round(x * 10 ** dec) / 10 ** dec || 0;
/** Número con su signo ("−" solo si lo que se lee no es cero: `u` ya viene redondeado). */
const conSigno = (u: number, dec: number) => `${u < 0 ? "−" : ""}${nfDec(dec).format(Math.abs(u))}`;

function escalaDe(medida: Medida, total: number, minimo: number): Escala {
  if (medida !== "hoy") {
    const dec = decPct(Math.abs(minimo));
    return { a: (x) => x, dec, txt: (u) => `${conSigno(u, dec)} %` };
  }
  const un = unidadMontoDe(total, minimo);   // la misma regla que fmtMillones (formato.ts)
  return { a: (x) => x / un.div, dec: un.dec, txt: (u) => `$ ${conSigno(u, un.dec)} ${un.nombre}` };
}

export interface Barra {
  tipo: "nodo" | "otros" | "redondeo";
  n: string; t?: string;
  nodo: Nodo | null;
  txt: string;              // el monto o porcentaje, como se muestra
  parte: string | null;     // % del nivel abierto
  ejec: string | null;      // % ejecutado (devengado / vigente)
  ancho: number;            // largo de la barra, de 0 a 1
  cuantos?: number;         // "otros": cuántas partidas agrupa
}
export interface Vista {
  forma: Forma; anio: AnioGasto; medida: Medida; etapa: Etapa;
  /** Medida pedida o, si no se puede (sin PIB del año), la que se usa. */
  medidaUsada: Medida; aviso: string | null;
  camino: Nodo[];          // raíz → nodo abierto
  ruta: string[];          // nombres del camino (sin la raíz)
  nodo: Nodo;
  total: string; totalEjec: string | null;
  barras: Barra[];
  unidad: string;          // "Pesos de oct-26 (ajustados por inflación)"
  etapaTxt: string;        // "Gastado en 2024"
  encParte: string;        // encabezado de la columna de la derecha: "% del total · % ejecutado"
  ref: string;
}

/** % ejecutado = devengado / vigente. Lo gastado no puede pasar el crédito vigente: si lo pasa (más de medio punto), ese nivel no trae el vigente
 *  completo en la fuente (pasa con cada universidad, que es un detalle de las transferencias) y no se muestra. */
const pctEjec = (v: Etapas) => {
  if (!(v[IDX_VIGENTE] > 0) || v[IDX_DEVENGADO] > v[IDX_VIGENTE] * 1.005) return null;
  return `${conSigno(r1((v[IDX_DEVENGADO] / v[IDX_VIGENTE]) * 100), 1)} %`;
};

export const MAX_BARRAS = 10;

/** Redondea cada valor a `dec` decimales y reparte la diferencia con `objetivo` (ya redondeado) entre los de mayor resto,
 *  para que la suma de lo que se ve dé el total que se ve (método del mayor resto). Solo corrige diferencias de redondeo. */
function repartir(vals: number[], objetivo: number, dec: number): number[] {
  const u = Math.pow(10, dec), crudos = vals.map((x) => x * u), base = crudos.map((x) => Math.round(x));
  let falta = Math.round(objetivo * u) - base.reduce((a, b) => a + b, 0);
  if (Math.abs(falta) > vals.length) return base.map((x) => x / u);   // no es redondeo: no se toca
  const orden = crudos.map((x, i) => [x - base[i], i] as [number, number]).sort((a, b) => (falta > 0 ? b[0] - a[0] : a[0] - b[0]));
  for (const [, i] of orden) { if (!falta) break; const paso = Math.sign(falta); base[i] += paso; falta -= paso; }
  return base.map((x) => x / u);
}

/** Arma la lista de barras del nodo abierto. `ruta`: nombres desde la raíz (si alguno no está en este año, se corta ahí). */
export function armarVista(o: {
  archivo: ArchivoAnio; anio: AnioGasto; forma: Forma; ruta: string[]; medida: Medida; etapa: Etapa; deflactor: Deflactor; max?: number;
}): Vista | null {
  const raiz = o.archivo.arboles[o.forma];
  if (!raiz) return null;
  const camino = recorrer(raiz, o.ruta), nodo = camino[camino.length - 1], k = IDX[o.etapa], max = o.max ?? MAX_BARRAS;
  const factor = o.deflactor.factor(o.anio.anio);
  let medida = o.medida, aviso: string | null = null;
  if (medida === "pib" && !o.anio.pib) { medida = "hoy"; aviso = `El PIB de ${o.anio.anio} todavía no está publicado: se muestra en pesos de hoy.`; }
  if (medida === "pct" && !(raiz.v[k] > 0)) { medida = "hoy"; aviso = "No hay un total para calcular porcentajes: se muestra en pesos de hoy."; }
  const enPesosCorrientes = medida === "hoy" && factor == null;
  if (enPesosCorrientes) aviso = `No hay inflación para ${o.anio.anio}: se muestra en pesos corrientes.`;
  const medir = (v: number) => (medida === "hoy" ? v * (factor ?? 1) : medida === "pct" ? (v / raiz.v[k]) * 100 : (v / (o.anio.pib as number)) * 100);

  const hijos = [...(nodo.h ?? [])].sort((a, b) => b.v[k] - a.v[k]);
  const vistos = hijos.length > max + 1 ? hijos.slice(0, max) : hijos;   // si sobra uno solo, se muestra en lugar de "Otros (1)"
  const resto = hijos.slice(vistos.length);
  const totalM = medir(nodo.v[k]);
  // "Otros" también es una barra visible: si es muy chica, en pesos pide millones (así no se lee "$ 0,00 billones")
  const sumaResto = resto.reduce((a, h) => a + h.v[k], 0);
  const minimo = Math.min(...vistos.map((h) => Math.abs(medir(h.v[k]))).filter((x) => x > 0), Math.abs(totalM) || Infinity,
    ...(medida === "hoy" && sumaResto !== 0 ? [Math.abs(medir(sumaResto))] : []));
  const esc = escalaDe(medida, totalM, isFinite(minimo) ? minimo : 0);
  const totalR = mostrado(esc, totalM);
  const sinResto = hijos.length === vistos.length;
  const filasR = sinResto ? repartir(vistos.map((h) => esc.a(medir(h.v[k]))), totalR, esc.dec) : vistos.map((h) => mostrado(esc, medir(h.v[k])));
  const otrosR = aDec(totalR - filasR.reduce((a, b) => a + b, 0), esc.dec);
  // % del nivel abierto: cada fila redondeada a un decimal; "Otros" es lo que falta para 100
  // con "% del total" en el total del año, la parte sería el mismo número: no se repite
  const base = medida === "pct" && camino.length === 1 ? 0 : nodo.v[k];
  const partes: (number | null)[] = base > 0
    ? (sinResto ? repartir(vistos.map((h) => (h.v[k] / base) * 100), 100, 1) : vistos.map((h) => r1((h.v[k] / base) * 100)))
    : vistos.map(() => null);
  const otrosParte = base > 0 ? aDec(100 - partes.reduce<number>((a, b) => a + (b ?? 0), 0), 1) : null;
  const txtParte = (p: number | null) => (p == null ? null : `${conSigno(p, 1)} %`);

  const barras: Barra[] = vistos.map((h, i) => ({
    tipo: "nodo", n: h.n, ...(h.t ? { t: h.t } : {}), nodo: h, txt: esc.txt(filasR[i]), parte: txtParte(partes[i]), ejec: pctEjec(h.v), ancho: 0,
  }));
  if (resto.length) {
    const suma = resto.reduce((a, h) => a.map((x, j) => x + h.v[j]) as Etapas, [0, 0, 0, 0, 0] as Etapas);
    barras.push({ tipo: "otros", n: `Otros (${resto.length})`, nodo: null, txt: esc.txt(otrosR), parte: txtParte(otrosParte), ejec: pctEjec(suma), ancho: 0, cuantos: resto.length });
  } else if (vistos.length && (otrosR !== 0 || (otrosParte != null && otrosParte !== 0))) {
    // sin partidas escondidas: lo que falte es redondeo (o una diferencia de la fuente); se muestra para que la suma cierre
    barras.push({ tipo: "redondeo", n: "Diferencia por redondeo", nodo: null, txt: esc.txt(otrosR), parte: txtParte(otrosParte), ejec: null, ancho: 0 });
  }
  const largos = barras.map((b) => Math.max(0, valorMostrado(b.txt) ?? 0));
  const mayor = Math.max(...largos, 0);
  barras.forEach((b, i) => { b.ancho = mayor > 0 ? largos[i] / mayor : 0; });

  const unidad = medida === "hoy"
    ? (enPesosCorrientes ? `Pesos corrientes de ${o.anio.anio}` : `Pesos de ${o.deflactor.ref} (ajustados por inflación con el IPC)`)
    : medida === "pct" ? `% del gasto total de ${o.anio.anio}` : `% del PIB de ${o.anio.anio}`;
  const etapaTxt = `${nombreEtapa(o.etapa)} en ${o.anio.anio}${o.anio.en_curso && o.etapa === "dev" ? " (hasta la fecha)" : ""}`;
  return {
    forma: o.forma, anio: o.anio, medida: o.medida, etapa: o.etapa, medidaUsada: medida, aviso,
    camino, ruta: camino.slice(1).map((x) => x.n), nodo,
    total: esc.txt(totalR), totalEjec: pctEjec(nodo.v), barras, unidad, etapaTxt, ref: o.deflactor.ref,
    encParte: [base > 0 ? (camino.length === 1 ? "% del total" : "% de este nivel") : null, "% ejecutado"].filter(Boolean).join(" · "),
  };
}

/** Las cuentas de una vista, como se leen: la suma de las barras (con "Otros") contra el total. Lo usan los chequeos. */
export function cuentasCierran(v: Vista): boolean {
  if (!v.barras.length) return true;
  const suma = v.barras.reduce((a, b) => restaLimpia(a + (valorMostrado(b.txt) ?? 0), 0), 0);
  const partes = v.barras.every((b) => b.parte != null) ? v.barras.reduce((a, b) => restaLimpia(a + (valorMostrado(b.parte!) ?? 0), 0), 0) : 100;
  return suma === (valorMostrado(v.total) ?? 0) && partes === 100;
}

// ---------------------------------------------------------------- búsqueda
/** Siglas que la gente busca y que el presupuesto escribe completas (en minúscula y sin tildes, como las compara `norm`). */
export const SIGLAS: Record<string, string> = {
  anses: "administracion nacional de la seguridad social",
  conicet: "consejo nacional de investigaciones cientificas y tecnicas",
  inta: "instituto nacional de tecnologia agropecuaria",
  inti: "instituto nacional de tecnologia industrial",
  conae: "comision nacional de actividades espaciales",
  enacom: "ente nacional de comunicaciones",
  uba: "universidad de buenos aires",
  utn: "universidad tecnologica nacional",
  dnv: "direccion nacional de vialidad",
  senasa: "servicio nacional de sanidad y calidad agroalimentaria",
  inaes: "instituto nacional de asociativismo y economia social",
  incaa: "instituto nacional de cine y artes audiovisuales",
};
/** `anio` y `ruta`: a dónde lleva el resultado (el último año cerrado donde aparece; si solo está en el año en curso, ese). */
export interface Resultado { forma: Forma; ruta: string[]; n: string; t?: string; anios: number[]; nivel: string; donde: string; anio: number }
/** Busca por nombre (y por nombre técnico) en todos los niveles de las cuatro formas y en todos los años cargados. Todas las palabras tienen que estar.
 *  Un mismo organismo en varios años sale una sola vez, con sus años; primero los de mayor gasto en su último año. */
export function buscar(archivos: ArchivoAnio[], q: string, max = 30, enCurso: Set<number> = new Set()): Resultado[] {
  const palabras = norm(q).split(/\s+/).filter((p) => p.length >= 2);
  if (!palabras.length) return [];
  const porClave = new Map<string, Omit<Resultado, "anio"> & { peso: number; ultimo: number; rutas: Map<number, string[]> }>();
  const ordenados = [...archivos].sort((a, b) => a.anio - b.anio);
  for (const ar of ordenados) {
    for (const [forma] of FORMAS) {
      const raiz = ar.arboles[forma];
      if (!raiz) continue;
      const visitar = (n: Nodo, ruta: string[]) => {
        for (const h of n.h ?? []) {
          const r = [...ruta, h.n], texto = norm(`${h.n} ${h.t ?? ""}`);
          if (palabras.every((p) => texto.includes(p) || (SIGLAS[p] != null && texto.includes(SIGLAS[p])))) {
            const clave = forma + "|" + r.map((x) => norm(x).trim()).join(SEP_RUTA);
            const previo = porClave.get(clave);
            if (previo) { previo.anios.push(ar.anio); previo.peso = h.v[IDX_DEVENGADO]; previo.ultimo = ar.anio; previo.ruta = r; previo.n = h.n; previo.rutas.set(ar.anio, r); }
            else porClave.set(clave, {
              forma, ruta: r, n: h.n, ...(h.t ? { t: h.t } : {}), anios: [ar.anio], nivel: NIVELES[forma][r.length - 1] ?? "Partida",
              donde: ruta.length ? ruta.join(" › ") : nombreForma(forma), peso: h.v[IDX_DEVENGADO], ultimo: ar.anio, rutas: new Map([[ar.anio, r]]),
            });
          }
          visitar(h, r);
        }
      };
      visitar(raiz, []);
    }
  }
  return [...porClave.values()].sort((a, b) => b.ultimo - a.ultimo || b.peso - a.peso).slice(0, max)
    .map(({ peso: _p, ultimo: _u, rutas, ...r }) => {   // eslint-disable-line @typescript-eslint/no-unused-vars
      const cerrados = r.anios.filter((a) => !enCurso.has(a)), anio = Math.max(...(cerrados.length ? cerrados : r.anios));
      return { ...r, anio, ruta: rutas.get(anio) ?? r.ruta };
    });
}
/** "2018 a 2025" / "2019, 2021 y 2024" / "2024". */
export function aniosTxt(a: number[]): string {
  const s = [...new Set(a)].sort((x, y) => x - y);
  if (s.length <= 1) return s.map(String).join("");
  if (s[s.length - 1] - s[0] === s.length - 1) return `${s[0]} a ${s[s.length - 1]}`;
  return s.slice(0, -1).join(", ") + " y " + s[s.length - 1];
}

// ---------------------------------------------------------------- comparar años
export interface PuntoSerie { anio: number; hoy: number | null; pib: number | null }
/** `otraUbicacion`: años en que el nodo figuraba bajo otro ministerio u organismo (se sigue por su nombre), con el camino de ese año. */
export interface SerieNodo { nombre: string; puntos: PuntoSerie[]; larga: boolean; ref: string; otraUbicacion: { anio: number; donde: string }[] }

/** Nodos con ese nombre a esa profundidad, en cualquier rama (para seguir a un organismo que cambió de ministerio). */
function porNombre(raiz: Nodo, nombre: string, prof: number): { nodo: Nodo; camino: string[] }[] {
  const k = norm(nombre).trim(), out: { nodo: Nodo; camino: string[] }[] = [];
  const ir = (n: Nodo, camino: string[]) => {
    for (const h of n.h ?? []) {
      if (camino.length + 1 === prof) { if (norm(h.n).trim() === k) out.push({ nodo: h, camino }); }
      else ir(h, [...camino, h.n]);
    }
  };
  ir(raiz, []);
  return out;
}

/** Gasto (devengado) de un nodo en cada año cerrado: en pesos de hoy y en % del PIB. Para Para qué hasta la función (y el total), desde 2004
 *  con la serie larga; el resto, con los archivos de cada año (2018 en adelante). `archivos`: los años ya cargados. */
export function serieNodo(ix: IndiceGasto, archivos: Map<number, ArchivoAnio>, forma: Forma, ruta: string[], d: Deflactor): SerieNodo {
  const porAnio = new Map<number, { v: number | null; pib: number | null }>();
  const sl = ix.serie_larga;
  let larga = false;
  const otraUbicacion: SerieNodo["otraUbicacion"] = [];
  if (forma === "para_que" && ruta.length <= 2 && sl) {
    const valorLargo = (i: number): number | null => {
      if (!ruta.length) { const xs = sl.finalidades.map((f) => f.v[i]); return xs.every(ok) ? (xs as number[]).reduce((a, b) => a + b, 0) : null; }
      const fin = sl.finalidades.find((f) => norm(f.n).trim() === norm(ruta[0]).trim());
      if (!fin) return null;
      if (ruta.length === 1) return ok(fin.v[i]) ? fin.v[i] : null;
      const fun = fin.h?.find((f) => norm(f.n).trim() === norm(ruta[1]).trim());
      return fun && ok(fun.v[i]) ? fun.v[i] : null;
    };
    // la serie larga solo completa los años anteriores al primer archivo anual: desde ahí manda el archivo (así el gráfico coincide con la barra de cada año)
    const primero = ix.anios.length ? ix.anios[0].anio : Infinity;
    sl.anios.forEach((a, i) => { if (a >= primero) return; const v = valorLargo(i); if (v != null) { porAnio.set(a, { v, pib: ok(sl.pib[i]) && (sl.pib[i] as number) > 0 ? sl.pib[i] : null }); larga = true; } });
  }
  for (const a of ix.anios) {
    if (a.en_curso || porAnio.has(a.anio)) continue;
    const ar = archivos.get(a.anio), raiz = ar?.arboles[forma];
    if (!raiz) continue;
    const c = recorrer(raiz, ruta);
    if (c.length === ruta.length + 1) { porAnio.set(a.anio, { v: c[c.length - 1].v[IDX_DEVENGADO], pib: a.pib }); continue; }
    // no está en el mismo lugar: si ese año hay un solo nodo con su nombre en el mismo nivel, es el mismo organismo en otro ministerio
    const otros = ruta.length > 1 ? porNombre(raiz, ruta[ruta.length - 1], ruta.length) : [];
    if (otros.length === 1) {
      porAnio.set(a.anio, { v: otros[0].nodo.v[IDX_DEVENGADO], pib: a.pib });
      otraUbicacion.push({ anio: a.anio, donde: otros[0].camino.join(" › ") });
    }
  }
  const puntos = [...porAnio.entries()].sort((x, y) => x[0] - y[0]).map(([anio, { v, pib }]) => {
    const f = d.factor(anio);
    return { anio, hoy: v != null && f != null ? v * f : null, pib: v != null && pib ? (v / pib) * 100 : null };
  });
  return { nombre: ruta.length ? ruta[ruta.length - 1] : "Gasto total", puntos, larga, ref: d.ref, otraUbicacion };
}

/** "En 2018 a 2023 figuraba en Ministerio de Trabajo…; en 2019, en …" (agrupa los años con la misma ubicación). */
export function otraUbicacionTxt(s: SerieNodo): string | null {
  if (!s.otraUbicacion.length) return null;
  const grupos = new Map<string, number[]>();
  s.otraUbicacion.forEach((o) => grupos.set(o.donde, [...(grupos.get(o.donde) ?? []), o.anio]));
  return `Cambió de lugar en el presupuesto y se sigue por su nombre: ${[...grupos.entries()].map(([d, a]) => `en ${aniosTxt(a)} figuraba en ${d}`).join("; ")}.`;
}

// ---------------------------------------------------------------- textos, imagen y vista previa
export const FUENTE_GASTO = "Presupuesto Abierto (Ministerio de Economía)";
export function fuenteTxt(a: AnioGasto): string {
  const f = fechaLarga(a.actualizado);
  return `${FUENTE_GASTO}${f ? `, actualizado al ${f}` : ""}`;
}
/** Título de la vista: "En qué gasta la Nación en 2024" o, con un nivel abierto, "Servicios sociales: en qué gasta la Nación en 2024". */
export function tituloVista(v: Vista): string {
  const base = `En qué gasta la Nación en ${v.anio.anio}${v.anio.en_curso ? " (en curso)" : ""}`;
  return v.ruta.length ? `${v.ruta[v.ruta.length - 1]}: ${base.charAt(0).toLowerCase()}${base.slice(1)}` : base;
}
/** Dirección de la vista (con los parámetros que no son los de defecto). */
export function hrefVista(v: Vista, anioDef: number, ruta = "/gasto/"): string {
  const p = new URLSearchParams();
  if (v.anio.anio !== anioDef) p.set("anio", String(v.anio.anio));
  if (v.forma !== FORMA_DEFECTO) p.set("forma", v.forma);
  if (v.medida !== MEDIDA_DEFECTO) p.set("med", v.medida);
  if (v.etapa !== ETAPA_DEFECTO) p.set("etapa", v.etapa);
  const r = escribirRuta(v.ruta); if (r) p.set("ruta", r);
  const q = p.toString();
  return ruta + (q ? "?" + q : "");
}

/** Imagen para compartir: las diez barras principales (y "Otros") con su monto y su %, sobre el lienzo de barras de imagen.ts. */
export function armarImagenGasto(v: Vista, formato: FormatoImg, hoy: Date = new Date()): DatosImagen {
  const filas: FilaBarra[] = v.barras.map((b, i) => ({
    id: `gasto-${i}`, nombre: b.n, valor: Math.max(0, valorMostrado(b.txt) ?? 0), variacion: b.txt, cls: "neutro", ini: null, fin: null, nota: null,
    detalle: [b.parte && (v.ruta.length ? `${b.parte} de este nivel` : `${b.parte} del total`), b.ejec && `${b.ejec} ejecutado`].filter(Boolean).join(" · ") || " ",
  }));
  const camino = v.ruta.length ? `${nombreForma(v.forma)}: ${v.ruta.join(" › ")}` : nombreForma(v.forma);
  return {
    formato, titulo: tituloVista(v),
    temporalidad: `${v.etapaTxt}. ${camino}`,
    cifra: null, frases: [{ texto: `Total: ${v.total}${v.totalEjec ? ` · ${v.totalEjec} ejecutado` : ""}`, cls: "neutro" }],
    leyenda: null, x: [], series: [], fmtEje: (x) => String(x), fmtEje2: null, franjas: [], inicioTxt: null,
    comentario: "", unidad: v.unidad, fuente: fuenteTxt(v.anio), nota: "Solo la Administración Nacional: sin empresas públicas ni fondos fiduciarios",
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-gasto-nacion-${v.anio.anio}-${v.forma.replace("_", "-")}${v.ruta.length ? "-" + norm(v.ruta[v.ruta.length - 1]).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) : ""}`,
    lienzo: { tipo: "barras", filas, sinDatos: [], enc: { nombre: NIVELES[v.forma][v.ruta.length] ?? "Partida", valor: v.medidaUsada === "hoy" ? "Monto" : "Porcentaje" }, sinTope: true },
    marcaUltimo: false,
  };
}

/** Título y descripción de la vista previa de /gasto/ (vista de entrada: último año cerrado, Para qué, gastado, pesos de hoy). */
export function textosPreviaGasto(v: Vista): { titulo: string; descripcion: string } {
  const top = v.barras.filter((b) => b.tipo === "nodo").slice(0, 3).map((b) => `${b.n} (${b.parte ?? b.txt})`);
  const titulo = `En qué gasta la Nación: ${v.total} en ${v.anio.anio}`;
  const descripcion = [
    top.length ? `Las finalidades con más gasto: ${top.join(", ")}.` : "",
    `${v.unidad.replace(/ \(ajustados por inflación con el IPC\)/, ", ajustados por inflación")}. Por finalidad, organismo, tipo de gasto y provincia, año por año. Fuente: ${FUENTE_GASTO}.`,
  ].filter(Boolean).join(" ");
  return { titulo, descripcion };
}
