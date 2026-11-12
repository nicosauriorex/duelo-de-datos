// Parte diario del Banco Central (docs/specs/parte-diario-bcra.md): decodifica `diario_bcra.json` y calcula todo lo que muestran la página /bcra/,
// la imagen para compartir, el texto para copiar y la vista previa en redes. Funciones puras, sin React ni acceso al DOM.
// Regla "las cuentas cierran": toda diferencia, porcentaje o acumulado se calcula con los valores ya redondeados como se muestran.
import { MESES, nf0, nf1, nf2, redondeadoComo, restaLimpia, r1 } from "./formato";

// ---------------------------------------------------------------- datos crudos (formato del pipeline)
export const CLAVES = ["compras", "reservas", "minorista", "mayorista", "tamar", "badlar", "base", "depositos"] as const;
export type ClaveDiario = (typeof CLAVES)[number];
export type ClsDiario = "bueno" | "malo" | "neutro";

export interface SerieCruda { id: number; f0: string; d: number[]; v: number[] }
export interface DiarioCrudo { actualizado: string; series: Partial<Record<ClaveDiario, SerieCruda>> }
/** Una serie ya decodificada: `dias` son días enteros desde 1970-01-01 (UTC), crecientes; `v`, el valor de cada día con dato. */
export interface SerieDiaria { clave: ClaveDiario; dias: number[]; v: number[] }
export interface Diario { actualizado: string; series: Partial<Record<ClaveDiario, SerieDiaria>> }

const MS_DIA = 86_400_000;
export const diaDe = (iso: string): number => Math.round(Date.parse(iso + "T00:00:00Z") / MS_DIA);
/** Con un día inválido (NaN, undefined, fuera de rango) devuelve "" en vez de tirar RangeError. */
export const isoDeDia = (dia: number): string => {
  const f = new Date(dia * MS_DIA);
  return Number.isFinite(f.getTime()) ? f.toISOString().slice(0, 10) : "";
};
const anioDe = (dia: number): number => new Date(dia * MS_DIA).getUTCFullYear();

/** Fecha corta "04-nov"; con año, "04-nov-25". */
export function fmtDia(dia: number, conAnio = false): string {
  const iso = isoDeDia(dia);
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${MESES[+m - 1]}${conAnio ? "-" + y.slice(2) : ""}`;
}
/** "nov-26" */
const fmtMesDia = (dia: number): string => (isoDeDia(dia) ? `${MESES[new Date(dia * MS_DIA).getUTCMonth()]}-${String(anioDe(dia)).slice(2)}` : "");

/** Decodifica el JSON del pipeline. Las series vacías o con largos distintos se descartan. */
export function decodificar(c: DiarioCrudo): Diario {
  const series: Diario["series"] = {};
  for (const clave of CLAVES) {
    const s = c.series?.[clave];
    if (!s || !Array.isArray(s.d) || !Array.isArray(s.v) || !s.d.length || s.d.length !== s.v.length) continue;
    const d0 = diaDe(s.f0);
    if (!Number.isFinite(d0)) continue;
    series[clave] = { clave, dias: s.d.map((x) => d0 + x), v: s.v };
  }
  return { actualizado: c.actualizado, series };
}

// ---------------------------------------------------------------- definición de las variables
export type TipoDiario = "nivel" | "flujo" | "tasa";
interface Def {
  nombre: string;       // nombre público (título de la tarjeta)
  corto: string;        // para la imagen y el texto
  que: string;          // qué es, en una línea
  unidad: string;       // como se muestra bajo el nombre
  tipo: TipoDiario;
  dir: boolean;         // subir es verde (solo reservas y compras, spec); el resto no se califica
  esc: number;          // divisor: el valor se muestra en `valor / esc` (millones de $ → billones)
  nf: Intl.NumberFormat; dec: number;
  pref: string; suf: string;
  sinMaximo?: boolean;  // valor en pesos corrientes: casi siempre está en su máximo, así que "el más alto desde…" no informa y no se dice nunca
}
const DEFS: Record<ClaveDiario, Def> = {
  compras: { nombre: "Compra de dólares del Banco Central", corto: "Compra de dólares", que: "Dólares que el Banco Central compró o vendió en el día", unidad: "millones de US$ por día", tipo: "flujo", dir: true, esc: 1, nf: nf0, dec: 0, pref: "US$ ", suf: " millones" },
  reservas: { nombre: "Reservas internacionales", corto: "Reservas", que: "Reservas brutas del Banco Central", unidad: "millones de US$", tipo: "nivel", dir: true, esc: 1, nf: nf0, dec: 0, pref: "US$ ", suf: " millones" },
  minorista: { nombre: "Dólar minorista", corto: "Dólar minorista", que: "Promedio de lo que cobran los bancos por vender un dólar", unidad: "$ por US$", tipo: "nivel", dir: false, esc: 1, nf: nf2, dec: 2, pref: "$ ", suf: "", sinMaximo: true },
  mayorista: { nombre: "Dólar mayorista", corto: "Dólar mayorista", que: "Cotización de referencia entre bancos", unidad: "$ por US$", tipo: "nivel", dir: false, esc: 1, nf: nf2, dec: 2, pref: "$ ", suf: "", sinMaximo: true },
  tamar: { nombre: "Tasa de plazo fijo TAMAR", corto: "Tasa TAMAR", que: "Tasa que pagan los bancos privados por plazos fijos grandes (más de $ 1.000 millones)", unidad: "% nominal anual", tipo: "tasa", dir: false, esc: 1, nf: nf2, dec: 2, pref: "", suf: " %" },
  badlar: { nombre: "Tasa de plazo fijo BADLAR", corto: "Tasa BADLAR", que: "Tasa que pagan los bancos privados por plazos fijos de más de $ 1 millón", unidad: "% nominal anual", tipo: "tasa", dir: false, esc: 1, nf: nf2, dec: 2, pref: "", suf: " %" },
  base: { nombre: "Base monetaria", corto: "Base monetaria", que: "Billetes y monedas en circulación más los depósitos de los bancos en el Banco Central", unidad: "billones de $", tipo: "nivel", dir: false, esc: 1e6, nf: nf2, dec: 2, pref: "$ ", suf: " billones", sinMaximo: true },
  depositos: { nombre: "Depósitos en los bancos", corto: "Depósitos", que: "Depósitos en pesos en efectivo en el sistema bancario", unidad: "billones de $", tipo: "nivel", dir: false, esc: 1e6, nf: nf2, dec: 2, pref: "$ ", suf: " billones", sinMaximo: true },
};
export const tipoDiario = (c: ClaveDiario): TipoDiario => DEFS[c].tipo;
export const esClaveDiario = (s: string | null | undefined): s is ClaveDiario => !!s && (CLAVES as readonly string[]).includes(s);

const signo = (d: number): string => (d > 0 ? "+" : d < 0 ? "−" : "");
/** El valor como lo muestra la página, redondeado (1572,918 → 1572,92). Con él se hacen todas las cuentas. */
const mostrado = (c: ClaveDiario, v: number): number => redondeadoComo((x) => DEFS[c].nf.format(x), v / DEFS[c].esc) || 0;
/** Redondeo barato (sin Intl) para recorrer miles de datos buscando extremos; coincide con `mostrado` salvo en empates exactos de redondeo. */
const redondeo = (d: Def, v: number): number => { const f = 10 ** d.dec; return Math.round((v / d.esc) * f) / f || 0; };
/** El valor con su unidad, para frases ("US$ 50.437 millones", "$ 1.572,92", "24,13 %"). */
export function valorDiario(c: ClaveDiario, v: number): string {
  const d = DEFS[c];
  return `${d.pref}${d.nf.format(Math.abs(v / d.esc))}${d.suf}`;
}
/** El valor sin unidad ("50.437", "1.572,92"); las tasas llevan su %. */
export function valorCorto(c: ClaveDiario, v: number): string {
  const d = DEFS[c];
  const x = v / d.esc;
  const t = d.nf.format(Math.abs(x));
  return `${x < 0 && /[1-9]/.test(t) ? "−" : ""}${t}${DEFS[c].tipo === "tasa" ? " %" : ""}`;   // sin "−0"
}
/** Una diferencia ya calculada entre valores mostrados, con signo y sin unidad ("+139", "−0,15"; las tasas en puntos). */
function difTxt(c: ClaveDiario, dif: number): string {
  const d = DEFS[c];
  if (dif === 0) return "sin cambios";
  return `${signo(dif)}${d.nf.format(Math.abs(dif))}${d.tipo === "tasa" ? " puntos" : ""}`;
}
const clsDe = (dir: boolean, dif: number): ClsDiario => (!dir || dif === 0 ? "neutro" : dif > 0 ? "bueno" : "malo");
function pctTxt(a: number, b: number): string | null {
  if (a === 0) return null;
  const p = r1((b / a - 1) * 100);
  return `${p === 0 ? "" : signo(p)}${nf1.format(Math.abs(p))} %`;
}

// ---------------------------------------------------------------- resumen de una variable
export interface FilaCambio {
  rotulo: string;       // "Hace una semana"
  nota: string;         // "04-nov · 50.123": la fecha y el valor con el que se compara
  valor: string;        // "+314"
  sub: string | null;   // "+0,6 %"
  cls: ClsDiario;
}
export interface ResumenVariable {
  clave: ClaveDiario; nombre: string; corto: string; que: string; unidad: string; tipo: TipoDiario;
  dia: number; fechaTxt: string; atrasada: boolean;
  valor: string;                // "US$ 50.437 millones"; en compras sin operaciones, "Sin compras ni ventas"
  valorCorto: string;           // sin unidad
  valorTexto: string;           // para frases: "compró US$ 96 millones"
  etiqueta: string | null;      // compras: "Compró" / "Vendió"
  cls: ClsDiario;               // color del valor principal (solo compras)
  filas: FilaCambio[];
  frases: string[];
  destacado: string | null;     // lo más llamativo, corto, para el texto de redes ("la mayor compra desde el 22-oct-26")
  difAnterior: string | null;   // diferencia con el dato anterior ("+139"); null en compras (un flujo no se resta del anterior)
  pctAnterior: string | null; clsAnterior: ClsDiario;
  anteriorCorto: string | null; // valor del dato anterior, sin unidad
  spark: number[];              // últimos 90 datos
}

export const DATOS_SPARK = 90;

/** Último índice con dato en o antes de `dia` (-1 si no hay). */
export function idxHasta(dias: number[], dia: number): number {
  let lo = 0, hi = dias.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (dias[m] <= dia) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}
/** Hace `m` meses (el día se recorta al último del mes: 31-mar menos un mes es 28-feb). */
function restarMeses(dia: number, m: number): number {
  const f = new Date(dia * MS_DIA), y = f.getUTCFullYear(), mo = f.getUTCMonth() - m, d = f.getUTCDate();
  const ult = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return Math.round(Date.UTC(y, mo, Math.min(d, ult)) / MS_DIA);
}

/** Dónde dejó de valer "es el más alto/bajo": la fecha del último dato mayor (menor) que el de hoy; sin ninguno, "de toda la serie". */
function desdeExtremo(def: Def, s: SerieDiaria, hoy: number, mayor: boolean): { idx: number } {
  for (let i = s.v.length - 2; i >= 0; i--) {
    const x = redondeo(def, s.v[i]);
    if (mayor ? x > hoy : x < hoy) return { idx: i };
  }
  return { idx: -1 };
}
const MIN_DIAS_EXTREMO = 14;   // un "más alto desde hace 3 días" no dice nada

function fraseExtremo(def: Def, s: SerieDiaria): string | null {
  const n = s.v.length, hoy = redondeo(def, s.v[n - 1]), ultimo = s.dias[n - 1];
  const alto = desdeExtremo(def, s, hoy, true), bajo = desdeExtremo(def, s, hoy, false);
  if (alto.idx === -1 && bajo.idx === -1) return null;       // la serie es constante
  // Quien nunca fue superado es el extremo de toda la serie; si no, se elige el que viene de más lejos (el índice menor es la fecha más lejana)
  const esAlto = def.sinMaximo ? false : alto.idx === -1 ? true : bajo.idx === -1 ? false : alto.idx <= bajo.idx;
  const idx = esAlto ? alto.idx : bajo.idx, palabra = esAlto ? "el más alto" : "el más bajo";
  if (idx === -1) {
    if (ultimo - s.dias[0] < MIN_DIAS_EXTREMO) return null;
    return `Es ${palabra} de toda la serie (datos desde el ${fmtDia(s.dias[0], true)})`;
  }
  if (ultimo - s.dias[idx] < MIN_DIAS_EXTREMO) return null;
  const f = fmtDia(s.dias[idx], true);
  return `Es ${palabra} desde el ${f}`;
}

function resumirCompras(s: SerieDiaria, anioParte: number): Pick<ResumenVariable, "valor" | "valorTexto" | "etiqueta" | "cls" | "filas" | "frases" | "destacado"> {
  const def = DEFS.compras, n = s.v.length, ultimo = s.dias[n - 1];
  const m = (i: number) => redondeo(def, s.v[i]);
  const hoy = m(n - 1), abs = valorDiario("compras", s.v[n - 1]);
  const conAnio = (d: number) => anioDe(d) !== anioParte;
  const frases: string[] = [];
  let destacado: string | null = null;
  const etqSigno = (x: number) => (x > 0 ? "compró" : x < 0 ? "vendió" : "sin operaciones");

  if (hoy !== 0) {
    // la mayor compra (venta) desde: la fecha del último día con una compra (venta) mayor
    let j = -1;
    for (let i = n - 2; i >= 0; i--) { const x = m(i); if (hoy > 0 ? x > hoy : x < hoy) { j = i; break; } }
    const palabra = hoy > 0 ? "la mayor compra" : "la mayor venta";
    if (j === -1) { if (ultimo - s.dias[0] >= MIN_DIAS_EXTREMO) { frases.push(`Es ${palabra} de toda la serie (datos desde el ${fmtDia(s.dias[0], true)})`); destacado = `${palabra} de toda la serie`; } }
    else if (ultimo - s.dias[j] >= MIN_DIAS_EXTREMO) { const f = fmtDia(s.dias[j], true); frases.push(`Es ${palabra} desde el ${f}`); destacado = `${palabra} desde el ${f}`; }
    // racha de ruedas seguidas del mismo signo
    let k = 0;
    for (let i = n - 1; i >= 0 && (hoy > 0 ? m(i) > 0 : m(i) < 0); i--) k++;
    if (k >= 2) frases.push(`${k} ruedas seguidas ${hoy > 0 ? "comprando" : "vendiendo"}`);
  } else {
    let k = 0;
    for (let i = n - 1; i >= 0 && m(i) === 0; i--) k++;
    if (k >= 2) frases.push(`${k} ruedas seguidas sin compras ni ventas`);
    for (let i = n - 2; i >= 0; i--) if (m(i) !== 0) { frases.push(`La última rueda con ${m(i) > 0 ? "compras" : "ventas"} fue el ${fmtDia(s.dias[i], conAnio(s.dias[i]))}`); break; }
  }

  const fila = (rotulo: string, nota: string, x: number): FilaCambio => ({ rotulo, nota, valor: x === 0 ? "0" : `${signo(x)}${nf0.format(Math.abs(x))}`, sub: etqSigno(x), cls: clsDe(true, x) });
  const filas: FilaCambio[] = [];
  if (n >= 2) filas.push(fila("Rueda anterior", fmtDia(s.dias[n - 2], conAnio(s.dias[n - 2])), m(n - 2)));
  // acumulados del mes y del año del último dato: la suma de los valores mostrados
  const f = new Date(ultimo * MS_DIA), mes = f.getUTCMonth(), anio = f.getUTCFullYear();
  let sMes = 0, nMes = 0, sAnio = 0, nAnio = 0;
  for (let i = n - 1; i >= 0; i--) {
    const g = new Date(s.dias[i] * MS_DIA);
    if (g.getUTCFullYear() !== anio) break;
    sAnio += m(i); nAnio++;
    if (g.getUTCMonth() === mes) { sMes += m(i); nMes++; }
  }
  filas.push(fila(`Acumulado de ${fmtMesDia(ultimo)}`, `${nMes} ${nMes === 1 ? "rueda" : "ruedas"}`, sMes));
  if (nAnio > nMes) filas.push(fila(`Acumulado de ${anio}`, `${nAnio} ruedas`, sAnio));

  return {
    valor: hoy === 0 ? "Sin compras ni ventas" : abs,
    valorTexto: hoy === 0 ? "sin compras ni ventas" : `${hoy > 0 ? "compró" : "vendió"} ${abs}`,
    etiqueta: hoy === 0 ? null : hoy > 0 ? "Compró" : "Vendió",
    cls: clsDe(true, hoy), filas, frases, destacado,
  };
}

function resumirNivel(clave: ClaveDiario, s: SerieDiaria, anioParte: number): Pick<ResumenVariable, "valor" | "valorTexto" | "etiqueta" | "cls" | "filas" | "frases" | "destacado"> {
  const def = DEFS[clave], n = s.v.length, ultimo = s.dias[n - 1], hoyM = mostrado(clave, s.v[n - 1]);
  const conAnio = (d: number) => anioDe(d) !== anioParte;
  const refs: [string, number][] = [];
  if (n >= 2) refs.push(["Día anterior", n - 2]);
  const porFecha = (rotulo: string, dia: number) => { const j = idxHasta(s.dias, dia); if (j >= 0 && j < n - 1) refs.push([rotulo, j]); };
  porFecha("Hace una semana", ultimo - 7);
  porFecha("Hace un mes", restarMeses(ultimo, 1));
  porFecha("Hace un año", restarMeses(ultimo, 12));
  const vistos = new Set<number>();
  const filas: FilaCambio[] = [];
  for (const [rotulo, j] of refs) {
    if (vistos.has(j)) continue;       // dos comparaciones que caen en el mismo dato no se repiten
    vistos.add(j);
    const antes = mostrado(clave, s.v[j]), dif = restaLimpia(hoyM, antes);
    filas.push({
      rotulo, nota: `${fmtDia(s.dias[j], conAnio(s.dias[j]))} · ${valorCorto(clave, s.v[j])}`, valor: difTxt(clave, dif),
      sub: def.tipo === "tasa" ? null : pctTxt(antes, hoyM), cls: clsDe(def.dir, dif),
    });
  }
  const e = fraseExtremo(def, s);
  const v = valorDiario(clave, s.v[n - 1]);
  return { valor: v, valorTexto: v, etiqueta: null, cls: "neutro", filas, frases: e ? [e] : [], destacado: null };
}

export function resumirVariable(clave: ClaveDiario, s: SerieDiaria, diaParte: number): ResumenVariable {
  const def = DEFS[clave], n = s.v.length, dia = s.dias[n - 1], anioParte = anioDe(diaParte);
  const cuerpo = def.tipo === "flujo" ? resumirCompras(s, anioParte) : resumirNivel(clave, s, anioParte);
  let difAnterior: string | null = null, pctAnterior: string | null = null, clsAnterior: ClsDiario = "neutro", anteriorCorto: string | null = null;
  if (n >= 2) {
    anteriorCorto = valorCorto(clave, s.v[n - 2]);
    if (def.tipo !== "flujo") {
      const a = mostrado(clave, s.v[n - 2]), b = mostrado(clave, s.v[n - 1]), dif = restaLimpia(b, a);
      difAnterior = difTxt(clave, dif); clsAnterior = clsDe(def.dir, dif); pctAnterior = def.tipo === "tasa" ? null : pctTxt(a, b);
    }
  }
  return {
    clave, nombre: def.nombre, corto: def.corto, que: def.que, unidad: def.unidad, tipo: def.tipo,
    dia, fechaTxt: fmtDia(dia, anioDe(dia) !== anioParte), atrasada: dia < diaParte,
    valorCorto: valorCorto(clave, s.v[n - 1]), ...cuerpo,
    difAnterior, pctAnterior, clsAnterior, anteriorCorto,
    spark: s.v.slice(-DATOS_SPARK).map((x) => x / def.esc),
  };
}

// ---------------------------------------------------------------- el parte completo
export interface Parte {
  dia: number; fechaTxt: string;     // la del dato más nuevo entre todas las variables
  actualizado: string;
  variables: ResumenVariable[];      // en el orden de la página
  atrasadas: ClaveDiario[];          // las que no tienen dato de la fecha del parte
}

/** Null si no hay ninguna serie con datos. */
export function armarParte(d: Diario): Parte | null {
  const series = CLAVES.map((c) => d.series[c]).filter((s): s is SerieDiaria => !!s && s.v.length > 0);
  if (!series.length) return null;
  const dia = Math.max(...series.map((s) => s.dias[s.dias.length - 1]));
  const variables = series.map((s) => resumirVariable(s.clave, s, dia));
  return { dia, fechaTxt: fmtDia(dia, true), actualizado: d.actualizado, variables, atrasadas: variables.filter((v) => v.atrasada).map((v) => v.clave) };
}

export const variableDe = (p: Parte, c: ClaveDiario): ResumenVariable | undefined => p.variables.find((v) => v.clave === c);

// ---------------------------------------------------------------- textos para compartir
export const URL_PARTE = "primerolosdatos.com.ar/bcra/";
/** Las variables que van al texto para redes y a la vista previa. */
const EN_TEXTO: ClaveDiario[] = ["compras", "reservas", "minorista", "mayorista"];

/** Una línea del texto: nombre, fecha si es anterior a la del parte, valor y diferencia con el dato anterior. */
function lineaTexto(v: ResumenVariable): string {
  const al = v.atrasada ? ` (al ${v.fechaTxt})` : "";
  if (v.clave === "compras") {
    const base = v.etiqueta ? `El Banco Central ${v.valorTexto}${v.atrasada ? ` el ${v.fechaTxt}` : ""}` : `Sin compras ni ventas de dólares${v.atrasada ? ` (último dato: ${v.fechaTxt})` : ""}`;
    return base + (v.destacado ? ` (${v.destacado})` : "");
  }
  return `${v.corto}${al}: ${v.valor}${v.difAnterior && v.difAnterior !== "sin cambios" ? ` (${v.difAnterior})` : ""}`;
}

/** Texto corto para pegar en redes, con las cifras del día y el link. Las variables atrasadas llevan su fecha. */
export function textoParte(p: Parte): string {
  const lineas = EN_TEXTO.map((c) => variableDe(p, c)).filter((v): v is ResumenVariable => !!v).map(lineaTexto);
  return [`Parte del Banco Central del ${p.fechaTxt}`, ...lineas, URL_PARTE].join("\n");
}

/** Título y descripción de la vista previa en redes. */
export function textosPreviaParte(p: Parte): { titulo: string; descripcion: string } {
  const lineas = EN_TEXTO.map((c) => variableDe(p, c)).filter((v): v is ResumenVariable => !!v).map(lineaTexto);
  return { titulo: `Parte del Banco Central del ${p.fechaTxt}`, descripcion: lineas.join(". ") + "." };
}

// ---------------------------------------------------------------- gráfico grande
export type PeriodoDiario = "1m" | "3m" | "1a" | "5a" | "todo";
export const PERIODOS_DIARIO: [PeriodoDiario, string][] = [["1m", "1 mes"], ["3m", "3 meses"], ["1a", "1 año"], ["5a", "5 años"], ["todo", "Todo"]];
export const PERIODO_DEFECTO: PeriodoDiario = "3m";
const MESES_DE: Record<PeriodoDiario, number> = { "1m": 1, "3m": 3, "1a": 12, "5a": 60, todo: 0 };
export const esPeriodoDiario = (s: string | null | undefined): s is PeriodoDiario => !!s && s in MESES_DE;

export interface Tramo { dias: number[]; v: number[] }
/** Los datos del período, contado hacia atrás desde el último dato de la serie; los valores ya en la escala de la tarjeta (billones). */
export function recorte(clave: ClaveDiario, s: SerieDiaria, per: PeriodoDiario): Tramo {
  const esc = DEFS[clave].esc, n = s.v.length;
  const desde = per === "todo" ? s.dias[0] : restarMeses(s.dias[n - 1], MESES_DE[per]);
  let i0 = per === "todo" ? 0 : idxHasta(s.dias, desde - 1) + 1;
  if (n - i0 < 2) i0 = Math.max(0, n - 2);          // siempre al menos dos puntos
  return { dias: s.dias.slice(i0), v: s.v.slice(i0).map((x) => x / esc) };
}
/** Reduce a unos `max` puntos conservando, en cada tramo, el mínimo y el máximo (la forma no se pierde). */
export function reducir(t: Tramo, max: number): Tramo {
  const n = t.v.length;
  if (n <= max) return t;
  const cubos = Math.max(1, Math.floor(max / 2)), dias: number[] = [], v: number[] = [];
  for (let c = 0; c < cubos; c++) {
    const a = Math.floor((c * n) / cubos), b = Math.floor(((c + 1) * n) / cubos);
    if (b <= a) continue;
    let imin = a, imax = a;
    for (let i = a; i < b; i++) { if (t.v[i] < t.v[imin]) imin = i; if (t.v[i] > t.v[imax]) imax = i; }
    for (const i of imin === imax ? [imin] : imin < imax ? [imin, imax] : [imax, imin]) { dias.push(t.dias[i]); v.push(t.v[i]); }
  }
  return { dias, v };
}
/** Marcas "redondas" del eje vertical. */
export function marcasY(min: number, max: number, n = 4): { marcas: number[]; paso: number } {
  const span = max - min || Math.abs(max) || 1, paso0 = span / n, mag = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((p) => span / p <= n) || mag * 10;
  const marcas: number[] = [];
  for (let x = Math.floor(min / paso) * paso; x < max + paso * 0.999; x += paso) marcas.push(+x.toPrecision(12));
  return { marcas, paso };
}
/** Número del eje con los decimales que pide el paso entre marcas. */
export function fmtEjeY(v: number, paso: number): string {
  const dec = paso >= 1 ? 0 : paso >= 0.1 ? 1 : 2;
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}
/** Días de las marcas del eje horizontal (repartidas parejo) y su texto: con año si el rango pasa de un año. */
export function marcasX(d0: number, d1: number, n: number): { dia: number; txt: string }[] {
  const largo = d1 - d0 > 400;
  return Array.from({ length: n }, (_, k) => {
    const dia = Math.round(d0 + ((d1 - d0) * k) / (n - 1));
    return { dia, txt: largo ? fmtMesDia(dia) : fmtDia(dia) };
  });
}
/** Índice del dato más cercano al día `dia`. */
export function masCercano(dias: number[], dia: number): number {
  const i = idxHasta(dias, dia);
  if (i < 0) return 0;
  return i + 1 < dias.length && dias[i + 1] - dia < dia - dias[i] ? i + 1 : i;
}
/** Texto de un punto del gráfico (fecha completa y valor con su unidad). `v` viene en la escala de la tarjeta. */
export function puntoTxt(clave: ClaveDiario, dia: number, v: number): { fecha: string; valor: string } {
  const d = DEFS[clave];
  const t = d.nf.format(Math.abs(v));
  return { fecha: fmtDia(dia, true), valor: `${v < 0 && /[1-9]/.test(t) ? "−" : ""}${d.pref}${t}${d.suf}` };   // sin "−0"
}
/** El valor más alto y el más bajo de un tramo (con su fecha), ya con su unidad, para el pie del gráfico grande. */
export function extremosTramo(clave: ClaveDiario, t: Tramo): { alto: { fecha: string; valor: string }; bajo: { fecha: string; valor: string } } {
  let imax = 0, imin = 0;
  t.v.forEach((x, i) => { if (x > t.v[imax]) imax = i; if (x < t.v[imin]) imin = i; });
  return { alto: puntoTxt(clave, t.dias[imax], t.v[imax]), bajo: puntoTxt(clave, t.dias[imin], t.v[imin]) };
}
