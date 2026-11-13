// Cómo viene el año en curso (/gasto/?vista=mes, docs/specs/gasto-nacion.md, fase 2): el gasto mes a mes contra el mismo período del año anterior.
// Los datos los escribe pipeline/gasto_mensual.py (`gasto_nacion_mensual.json`). Montos en millones de pesos corrientes.
// Pesos de hoy con un deflactor MENSUAL (cada mes, con el IPC de su mes); los meses sin IPC publicado usan el último publicado y se dice.
// Solo cuentan los meses completos; el mes parcial se muestra aparte y no entra en ninguna cuenta.
// Las cuentas cierran con los valores redondeados que se ven. Sin veredicto (D-012): el gasto que sube no es bueno ni malo.
import type { FormatoImg } from "./config";
import type { DatosImagen, FilaBarra, TarjetaImg } from "./imagen";
import { MESES, lastIdx, norm, ok, r1, valorMostrado } from "./formato";
import { FUENTE_GASTO, NIVELES, aDec, conSigno, escalaDe, escribirRuta, fechaLarga, mostrado, nombreForma, repartir, type Forma } from "./gasto";

// ---------------------------------------------------------------- formato del archivo (contrato con el pipeline)
export interface NodoM {
  n: string; t?: string;
  d: number[]; a: number[]; vd: number[]; va: number[];   // devengado y vigente al cierre de cada mes: A (hasta el último con datos) y A-1 (12)
  p: number; pa: number;
  h?: NodoM[];
}
export type FormaM = "para_que" | "quien" | "en_que";
export interface ArchivoMensual {
  generado: string; fuente: string; anio: number; anio_ant: number; actualizado: string | null;
  meses_completos: number; mes_parcial: number | null;
  total: NodoM; arboles: Partial<Record<FormaM, NodoM>>;
}

const esNum = (x: unknown): x is number => typeof x === "number" && isFinite(x);
const lista = (x: unknown, n: number): number[] | null => (Array.isArray(x) && x.length === n && x.every(esNum) ? (x as number[]) : null);

/** Un nodo bien formado; si el nodo o cualquiera de sus hijos no lo está, null (con hijos de menos las cuentas no cerrarían). */
function nodoM(x: unknown, largo: number): NodoM | null {
  if (!x || typeof x !== "object") return null;
  const o = x as NodoM;
  const d = lista(o.d, largo), a = lista(o.a, 12), vd = lista(o.vd, largo), va = lista(o.va, 12);
  if (typeof o.n !== "string" || !d || !a || !vd || !va) return null;
  let h: NodoM[] | undefined;
  if (Array.isArray(o.h) && o.h.length) {
    h = [];
    for (const y of o.h) { const z = nodoM(y, largo); if (!z) return null; h.push(z); }
  }
  return { n: o.n, ...(typeof o.t === "string" && o.t ? { t: o.t } : {}), d, a, vd, va, p: esNum(o.p) ? o.p : 0, pa: esNum(o.pa) ? o.pa : 0, ...(h ? { h } : {}) };
}

/** Valida el archivo mensual. null si falta algo esencial: en ese caso la vista no aparece. */
export function decodificarMensual(c: unknown): ArchivoMensual | null {
  if (!c || typeof c !== "object") return null;
  const r = c as ArchivoMensual;
  const k = r.meses_completos, par = r.mes_parcial ?? null;
  if (!Number.isInteger(r.anio) || !Number.isInteger(r.anio_ant) || !Number.isInteger(k) || k < 1 || k > 12) return null;
  if (par != null && par !== k + 1) return null;
  const largo = k + (par != null ? 1 : 0);
  const total = nodoM(r.total, largo);
  if (!total || !r.arboles || typeof r.arboles !== "object") return null;
  const arboles: ArchivoMensual["arboles"] = {};
  for (const f of ["para_que", "quien", "en_que"] as const) { const n = nodoM(r.arboles[f], largo); if (n) arboles[f] = n; }
  if (!Object.keys(arboles).length) return null;
  return {
    generado: typeof r.generado === "string" ? r.generado : "", fuente: typeof r.fuente === "string" ? r.fuente : "",
    anio: r.anio, anio_ant: r.anio_ant, actualizado: typeof r.actualizado === "string" ? r.actualizado : null,
    meses_completos: k, mes_parcial: par, total, arboles,
  };
}

// ---------------------------------------------------------------- opciones de la página (valores de la URL)
export const FORMAS_M: [FormaM, string][] = [["para_que", "Para qué"], ["quien", "Quién"], ["en_que", "En qué"]];
export const esFormaM = (s: string | null): s is FormaM => FORMAS_M.some((f) => f[0] === s);
/** La forma pedida si el archivo la trae; si no, la primera que tenga (Dónde no existe en la vista mensual). */
export function formaMDe(ar: ArchivoMensual, s: string | null): FormaM {
  if (esFormaM(s) && ar.arboles[s]) return s;
  return FORMAS_M.find((f) => ar.arboles[f[0]])![0];
}
export type Orden = "monto" | "subio" | "bajo";
export const ORDENES: [Orden, string][] = [["monto", "Más gastó"], ["subio", "Más subió"], ["bajo", "Más bajó"]];
export const ORDEN_DEFECTO: Orden = "monto";
export const esOrden = (s: string | null): s is Orden => ORDENES.some((o) => o[0] === s);
export const MAX_FILAS_M = 10;
export const opcionesVista = (ar: ArchivoMensual): [string, string][] => [["anio", "Año completo"], ["mes", `Cómo viene ${ar.anio}`]];
/** Umbral de la base de comparación: por debajo de este % del total de lo que se está mirando, la variación no se muestra. */
const BASE_INFIMA = 0.1;

// ---------------------------------------------------------------- pesos de hoy, mes a mes
export interface DeflactorMensual {
  ref: string;   // "oct-26": el último mes con IPC publicado
  /** Factor para llevar un mes a pesos de hoy. `estimado`: ese mes no tiene IPC y se usó el último publicado. null si no hay IPC. */
  factor: (anio: number, mes: number) => { f: number; estimado: boolean } | null;
}
/** `F`: meses del catálogo ("AAAA-MM"); `IPC`: el IPC empalmado de base.json, mes a mes. */
export function crearDeflactorMensual(F: string[], IPC: (number | null)[]): DeflactorMensual {
  const ref = lastIdx(IPC), idx = new Map<string, number>();
  F.forEach((f, i) => idx.set(f.slice(0, 7), i));
  return {
    ref: ref >= 0 ? `${MESES[+F[ref].slice(5, 7) - 1]}-${F[ref].slice(2, 4)}` : "",
    factor: (anio, mes) => {
      if (ref < 0) return null;
      const i = idx.get(`${anio}-${String(mes).padStart(2, "0")}`);
      if (i == null || i > ref) return { f: 1, estimado: true };   // todavía sin IPC: ya está expresado en pesos del último mes publicado
      for (let j = i; j >= 0; j--) { const x = IPC[j]; if (ok(x) && x > 0) return { f: (IPC[ref] as number) / x, estimado: j !== i }; }
      return null;
    },
  };
}

// ---------------------------------------------------------------- árbol
/** Camino de nombres desde la raíz (sin importar mayúsculas ni tildes); corta en el primero que no está. */
function recorrerM(raiz: NodoM, ruta: string[]): NodoM[] {
  const camino = [raiz];
  for (const n of ruta) {
    const k = norm(n).trim(), sig = camino[camino.length - 1].h?.find((x) => norm(x.n).trim() === k);
    if (!sig) break;
    camino.push(sig);
  }
  return camino;
}

// ---------------------------------------------------------------- la vista
export interface FilaM {
  tipo: "nodo" | "otros" | "redondeo";
  n: string; t?: string; nodo: NodoM | null;
  txt: string;               // lo gastado en los meses completos, en pesos de hoy
  ancho: number;             // largo de la barra, de 0 a 1
  varTxt: string | null;     // "Variación real: +3,2 %", "Nuevo en 2026"…
  nota: string | null;       // explicación cuando no hay variación numérica
  ejec: string | null;       // "78,4 % del vigente (2025: 75,0 %)"
  cuantos?: number;
}
export interface MesM { mes: number; nombre: string; a: number; b: number | null; aTxt: string; bTxt: string | null; varTxt: string | null; parcial: boolean }
export interface VistaM {
  forma: FormaM; ruta: string[]; camino: NodoM[]; nodo: NodoM; orden: Orden;
  anio: number; anioAnt: number; k: number;
  periodo: string;           // "ene–oct"
  ref: string;               // "oct-26"
  tarjetas: { gastado: { valor: string; sub: string }; variacion: { valor: string; sub: string }; ejecutado: { valor: string; sub: string | null } };
  meses: MesM[];             // los meses completos
  parcial: MesM | null;      // el mes parcial, aparte
  parcialTxt: string | null; // "parcial, al 11-11"
  totalTxt: string; totalAntTxt: string; varTotalTxt: string;
  maxMes: number;
  filas: FilaM[];
  unidad: string;
  ipcAviso: string | null;
  sinIpc: boolean;
}

const pctTxt = (r: number) => `${conSigno(r, 1)} %`;
/** Variación con signo explícito: "+3,2 %", "−1,0 %", "0,0 %". */
const varSigno = (r: number) => `${r > 0 ? "+" : ""}${conSigno(r, 1)} %`;
/** Porcentaje de lo gastado sobre el vigente al cierre del último mes completo; lo gastado no puede pasar el vigente (más de medio punto). */
const pctVigente = (gastado: number, vigente: number): number | null => (vigente > 0 && gastado >= 0 && gastado <= vigente * 1.005 ? r1((gastado / vigente) * 100) : null);
const diaMes = (iso: string | null): string | null => { const m = iso ? /^\d{4}-(\d{2})-(\d{2})/.exec(iso) : null; return m ? `${m[2]}-${m[1]}` : null; };

interface Met { gA: number; gA1: number; dA: number; dA1: number; vA: number; vA1: number; a12: number }
type Var = { tipo: "num"; pct: number } | { tipo: "nuevo" | "sinDato" | "infima" | "vacio" };

/** Arma la vista del nodo abierto (`ruta`): tarjetas, meses, y las filas de su nivel siguiente. */
export function armarMensual(o: { archivo: ArchivoMensual; forma: FormaM; ruta: string[]; orden: Orden; deflactor: DeflactorMensual; todas?: boolean }): VistaM | null {
  const ar = o.archivo, raiz = ar.arboles[o.forma];
  if (!raiz) return null;
  const k = ar.meses_completos, A = ar.anio, B = ar.anio_ant, largo = k + (ar.mes_parcial != null ? 1 : 0), def = o.deflactor;
  const camino = recorrerM(raiz, o.ruta), nodo = camino[camino.length - 1];
  const sinIpc = !def.ref;
  const fA = Array.from({ length: 12 }, (_, i) => (sinIpc ? 1 : def.factor(A, i + 1)?.f ?? 1));
  const fB = Array.from({ length: 12 }, (_, i) => (sinIpc ? 1 : def.factor(B, i + 1)?.f ?? 1));
  // solo los meses completos: el parcial no entra en ninguna cuenta y ya se marca aparte
  const sinPublicar = sinIpc ? [] : Array.from({ length: k }, (_, i) => i + 1).filter((m) => def.factor(A, m)?.estimado);
  const suma = (xs: number[], f: number[] | null) => { let s = 0; for (let i = 0; i < k; i++) s += xs[i] * (f ? f[i] : 1); return s; };
  const met = (n: NodoM): Met => ({
    gA: suma(n.d, fA), gA1: suma(n.a, fB), dA: suma(n.d, null), dA1: suma(n.a, null), vA: n.vd[k - 1], vA1: n.va[k - 1], a12: n.a.reduce((x, y) => x + y, 0),
  });
  const mN = met(nodo);

  // ----- variación real de una fila (la base chica y los nodos sin año anterior no dan un porcentaje)
  const umbral = Math.abs(mN.gA1) * BASE_INFIMA / 100;
  const variacion = (m: Met): Var => {
    if (m.gA1 <= 0) return m.a12 > 0 ? { tipo: "sinDato" } : m.gA !== 0 ? { tipo: "nuevo" } : { tipo: "vacio" };
    // base chica Y porcentaje disparado (más del doble): un organismo chico pero estable sí muestra su variación
    if (m.gA1 < umbral && m.gA > 2 * m.gA1) return { tipo: "infima" };
    return { tipo: "num", pct: (m.gA / m.gA1 - 1) * 100 };
  };
  const textoVar = (v: Var): { varTxt: string; nota: string | null } => {
    switch (v.tipo) {
      case "num": return { varTxt: `Variación real: ${varSigno(r1(v.pct))}`, nota: null };
      case "nuevo": return { varTxt: `Nuevo en ${A}`, nota: `No figura con este nombre en ${B}: es nuevo o cambió de nombre.` };
      case "sinDato": return { varTxt: `Sin dato de ${B}`, nota: `En los mismos meses de ${B} no hay gasto con este nombre.` };
      case "infima": return { varTxt: "Variación real: —", nota: `En los mismos meses de ${B} gastó menos de ${nfPct(BASE_INFIMA)} % del total de este nivel: sobre una base tan chica, el porcentaje exagera.` };
      default: return { varTxt: "Variación real: —", nota: null };
    }
  };
  const ejecTxt = (m: Met): string | null => {
    const e = pctVigente(m.dA, m.vA), e1 = pctVigente(m.dA1, m.vA1);
    return e == null ? null : `${pctTxt(e)} del vigente${e1 != null ? ` (${B}: ${pctTxt(e1)})` : ""}`;
  };

  // ----- hijos: orden, diez filas y "Otros"
  type Cand = { n: NodoM; m: Met; v: Var };
  const cands: Cand[] = (nodo.h ?? []).map((n) => { const m = met(n); return { n, m, v: variacion(m) }; });
  const porMonto = (x: Cand, y: Cand) => y.m.gA - x.m.gA;
  const num = (c: Cand) => (c.v.tipo === "num" ? c.v.pct : null);
  const ordenados = [...cands].sort(o.orden === "monto" ? porMonto : (x, y) => {
    const a = num(x), b = num(y);
    if (a == null || b == null) return a == null && b == null ? porMonto(x, y) : a == null ? 1 : -1;
    return (o.orden === "subio" ? b - a : a - b) || porMonto(x, y);
  });
  const max = o.todas ? Infinity : MAX_FILAS_M;
  const vistos = ordenados.length > max + 1 ? ordenados.slice(0, max) : ordenados;   // si sobra uno solo, se muestra en lugar de "Otros (1)"
  const resto = ordenados.slice(vistos.length);
  const sumaMet = (xs: Met[]): Met => xs.reduce((s, x) => ({
    gA: s.gA + x.gA, gA1: s.gA1 + x.gA1, dA: s.dA + x.dA, dA1: s.dA1 + x.dA1, vA: s.vA + x.vA, vA1: s.vA1 + x.vA1, a12: s.a12 + x.a12,
  }), { gA: 0, gA1: 0, dA: 0, dA1: 0, vA: 0, vA1: 0, a12: 0 });
  const mResto = sumaMet(resto.map((c) => c.m));

  // ----- meses (en pesos de hoy)
  const hoyA = nodo.d.map((x, i) => x * fA[i]), hoyB = nodo.a.map((x, i) => x * fB[i]);
  // ----- una sola escala para tarjetas, meses y filas (así las cuentas se pueden seguir)
  const positivos = [...vistos.map((c) => c.m.gA), ...(resto.length ? [mResto.gA] : []), mN.gA, mN.gA1, ...hoyA, ...hoyB.slice(0, k)].map(Math.abs).filter((x) => x > 0);
  const esc = escalaDe("hoy", Math.max(Math.abs(mN.gA), Math.abs(mN.gA1)), positivos.length ? Math.min(...positivos) : 0);
  const totalR = mostrado(esc, mN.gA), totalR1 = mostrado(esc, mN.gA1);

  const aR = repartir(hoyA.slice(0, k).map(esc.a), totalR, esc.dec), bR = repartir(hoyB.slice(0, k).map(esc.a), totalR1, esc.dec);
  const nombreMes = (i: number) => MESES[i];
  // con los montos redondeados que se ven en la fila (las cuentas cierran)
  const varMes = (a: number, b: number) => (b > 0 ? varSigno(r1((a / b - 1) * 100)) : "—");
  const meses: MesM[] = Array.from({ length: k }, (_, i) => ({
    mes: i + 1, nombre: nombreMes(i), a: hoyA[i], b: hoyB[i], aTxt: esc.txt(aR[i]), bTxt: esc.txt(bR[i]), varTxt: varMes(aR[i], bR[i]), parcial: false,
  }));
  const parcial: MesM | null = ar.mes_parcial != null
    ? { mes: k + 1, nombre: nombreMes(k), a: hoyA[k], b: null, aTxt: esc.txt(mostrado(esc, hoyA[k])), bTxt: null, varTxt: null, parcial: true } : null;
  const dia = diaMes(ar.actualizado);

  // ----- filas
  const filasR = resto.length ? vistos.map((c) => mostrado(esc, c.m.gA)) : repartir(vistos.map((c) => esc.a(c.m.gA)), totalR, esc.dec);
  const otrosR = aDec(totalR - filasR.reduce((a, b) => a + b, 0), esc.dec);
  const filas: FilaM[] = vistos.map((c, i) => ({
    tipo: "nodo", n: c.n.n, ...(c.n.t ? { t: c.n.t } : {}), nodo: c.n, txt: esc.txt(filasR[i]), ancho: 0, ...textoVar(c.v), ejec: ejecTxt(c.m),
  }));
  if (resto.length) filas.push({ tipo: "otros", n: `Otros (${resto.length})`, nodo: null, txt: esc.txt(otrosR), ancho: 0, ...textoVar(variacion(mResto)), ejec: ejecTxt(mResto), cuantos: resto.length });
  else if (vistos.length && otrosR !== 0) filas.push({ tipo: "redondeo", n: "Diferencia por redondeo", nodo: null, txt: esc.txt(otrosR), ancho: 0, varTxt: null, nota: null, ejec: null });
  const largos = filas.map((f) => Math.max(0, valorMostrado(f.txt) ?? 0)), mayor = Math.max(...largos, 0);
  filas.forEach((f, i) => { f.ancho = mayor > 0 ? largos[i] / mayor : 0; });

  // ----- tarjetas (la variación se calcula con los montos redondeados que se ven)
  const vPrecisa = mN.gA1 > 0 ? (mN.gA / mN.gA1 - 1) * 100 : null;
  const vTarj = totalR1 > 0 ? (totalR / totalR1 - 1) * 100 : vPrecisa;
  const periodo = k === 1 ? nombreMes(0) : `${nombreMes(0)}–${nombreMes(k - 1)}`;
  const e = pctVigente(mN.dA, mN.vA), e1 = pctVigente(mN.dA1, mN.vA1);
  return {
    forma: o.forma, ruta: camino.slice(1).map((x) => x.n), camino, nodo, orden: o.orden, anio: A, anioAnt: B, k, periodo, ref: def.ref,
    tarjetas: {
      gastado: { valor: esc.txt(totalR), sub: `${periodo} de ${A}${sinIpc ? ", en pesos corrientes" : `, en pesos de ${def.ref}`}` },
      variacion: { valor: vTarj == null ? "—" : varSigno(r1(vTarj)), sub: vTarj == null ? `Sin gasto en ${periodo} de ${B}` : `contra ${periodo} de ${B} (${esc.txt(totalR1)}), con inflación descontada` },
      ejecutado: { valor: e == null ? "—" : pctTxt(e), sub: e == null ? "no se puede calcular: sin crédito vigente o con más gasto que crédito" : e1 != null ? `en ${B} a esta altura: ${pctTxt(e1)}` : null },
    },
    meses, parcial, parcialTxt: ar.mes_parcial != null ? `parcial${dia ? `, al ${dia}` : ""}` : null,
    totalTxt: esc.txt(totalR), totalAntTxt: esc.txt(totalR1), varTotalTxt: vTarj == null ? "—" : varSigno(r1(vTarj)),
    maxMes: Math.max(0, ...hoyA, ...hoyB.slice(0, k)),
    filas,
    unidad: sinIpc ? `Pesos corrientes de cada mes (todavía no hay inflación cargada)` : `Pesos de ${def.ref}: cada mes se ajusta con el IPC de ese mes`,
    ipcAviso: sinPublicar.length
      ? `El IPC de ${sinPublicar.map((m) => `${MESES[m - 1]}-${String(A).slice(2)}`).join(" y ")} ${sinPublicar.length === 1 ? "todavía no se publicó" : "todavía no se publicaron"}: ${sinPublicar.length === 1 ? "ese mes se ajusta" : "esos meses se ajustan"} con el del último mes publicado (${def.ref}).`
      : null,
    sinIpc,
  };
}
const nfPct = (x: number) => String(x).replace(".", ",");

// ---------------------------------------------------------------- textos, dirección e imagen
export const tituloMensual = (v: VistaM): string => {
  const base = `Cómo viene el gasto de la Nación en ${v.anio} (${v.periodo})`;
  return v.ruta.length ? `${v.ruta[v.ruta.length - 1]}: ${base.charAt(0).toLowerCase()}${base.slice(1)}` : base;
};
/** Dirección de la vista: siempre con `vista=mes` y los parámetros que no son los de defecto. */
export function hrefMensual(v: VistaM, ruta = "/gasto/"): string {
  const p = new URLSearchParams({ vista: "mes" });
  if (v.forma !== "para_que") p.set("forma", v.forma);
  if (v.orden !== ORDEN_DEFECTO) p.set("orden", v.orden);
  const r = escribirRuta(v.ruta); if (r) p.set("ruta", r);
  return `${ruta}?${p.toString()}`;
}
export const fuenteMensual = (ar: ArchivoMensual): string => {
  const f = fechaLarga(ar.actualizado);
  return `${FUENTE_GASTO}, ejecución mensual${f ? `, actualizada al ${f}` : ""}`;
};

/** Imagen para compartir: las tres cifras y las filas que se ven (sobre el lienzo de barras de imagen.ts). */
export function armarImagenMensual(v: VistaM, ar: ArchivoMensual, formato: FormatoImg, hoy: Date = new Date()): DatosImagen {
  const filas: FilaBarra[] = v.filas.map((f, i) => ({
    id: `gasto-mes-${i}`, nombre: f.n, valor: Math.max(0, valorMostrado(f.txt) ?? 0), variacion: f.txt, cls: "neutro", ini: null, fin: null, nota: null,
    detalle: [f.varTxt?.replace("Variación real: ", "Real: "), f.ejec].filter(Boolean).join(" · ") || " ",
  }));
  const t = v.tarjetas;
  const items: TarjetaImg[] = [
    { nombre: "Gastado", datos: [{ rotulo: "Gastado", valor: t.gastado.valor, cls: "neutro", sub: t.gastado.sub }] },
    { nombre: "Variación real", datos: [{ rotulo: "Variación real", valor: t.variacion.valor, cls: "neutro", sub: `contra ${v.periodo} de ${v.anioAnt}` }] },
    { nombre: "Del vigente", datos: [{ rotulo: "Del crédito vigente", valor: t.ejecutado.valor, cls: "neutro", sub: t.ejecutado.sub }] },
  ];
  const camino = v.ruta.length ? `${nombreForma(v.forma as Forma)}: ${v.ruta.join(" › ")}` : nombreForma(v.forma as Forma);
  return {
    formato, titulo: tituloMensual(v),
    temporalidad: `Meses completos (${v.periodo}). ${camino}`,
    cifra: null, frases: [], tarjetas: { tipo: "gen", items },
    leyenda: null, x: [], series: [], fmtEje: (x) => String(x), fmtEje2: null, franjas: [], inicioTxt: null,
    comentario: "", unidad: v.unidad, fuente: fuenteMensual(ar), nota: `Solo la Administración Nacional.${ar.mes_parcial != null ? " El mes en curso no cuenta: está incompleto" : ""}`,
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-gasto-nacion-${v.anio}-mes-${v.forma.replace("_", "-")}${v.ruta.length ? "-" + norm(v.ruta[v.ruta.length - 1]).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) : ""}`,
    lienzo: { tipo: "barras", filas, sinDatos: [], enc: { nombre: NIVELES[v.forma][v.ruta.length] ?? "Partida", valor: "Gastado" }, sinTope: true },
    marcaUltimo: false,
  };
}
