// Ficha del dato: lo que calcula la ficha (componente `FichaDato`) y los links de su "Abrir completo".
// Una variable (`Expr`, la misma de la URL del Histórico) contada en capítulos: ahora, cómo viene, el mismo mes en otros años,
// cada presidente y mes a mes desde que asumió. Funciones puras (sin React): la ficha y las imágenes usan las mismas.
// Ver docs/specs/ajustes-tanda-5.md y docs/specs/remodelacion-fichas.md.
import { calcularMandato, claseVariacion, crearPres, filasGrafico, statsMandato, varNum, type BaseCfg, type Fila, type ModoMandato, type Pres, type StatsM } from "./estadisticas";
import { fmtMes, lastIdx, mesNum, nf1, ok, redondeadoComo, r1 } from "./formato";
import { frecuenciaOrigen, leerComun, type Comun, type FrecOrigen } from "./historico";
import type { DesdePref } from "./config";
import { contextoDato, type ContextoDato } from "./contexto-dato";
import { DATOS_FIJOS, datoFijoDe, mismaVariable } from "./datos-fijos";
import type { Calculo, Expr, Motor, SerieMeta } from "./motor";
import { comparaciones, plantillaSuelta, type Comparacion } from "./plantillas";
import { datosDesde, periodoMandato, variacionMostrada } from "./tablas";
import { TEMAS, hrefDato, principalesDe } from "./temas";
import { encExpr } from "./url";
import type { VelaDato } from "@/components/Velas";
import type { DeltaProps } from "@/components/sistema/Delta";
import type { ColumnaMandato, FilaMandato } from "@/components/sistema/TablaMandatos";

/** Variable por defecto de la ficha (la de la ruta /dato/ sin parámetro o con uno inválido): la inflación mensual. */
export const EXPR_DEFECTO: Expr = { id: "ipc_empalme", med: "vm", rel: null, modo: "compra", esc: "" };
/** Presidentes que muestra por defecto Meses de mandato (única definición: la usan `Mandato.tsx` y la ficha). */
export const PRES_MANDATO_DEF = ["nk", "cfk1", "cfk2", "macri", "af", "milei"];
/** Modo con que abre Meses de mandato (única definición, como `PRES_MANDATO_DEF`). */
export const MODO_MANDATO_DEF: ModoMandato = "teorico";

const menos = (t: string) => t.replace(/^-/, "−");

/** Período del gráfico de la ficha (parámetro `fper`): "" = el de por defecto ("Desde <año>", el de la configuración), 1 o 5 años, o toda la serie. */
export const PERIODOS_FICHA = ["", "1", "5", "todo"] as const;
export type PeriodoFicha = (typeof PERIODOS_FICHA)[number];

/** Período y filas del bloque Histórico de la ficha: el de la vista simple de Histórico (el "desde" de la configuración);
 *  si ahí no hay datos (serie que terminó antes), toda la serie. Lo usan la ficha y las imágenes de vista previa de los links.
 *  `per`: el período elegido en la ficha; 1 y 5 años se cuentan hasta el último dato, "todo" desde el primero. */
export function historicoFicha(m: Motor, c: Calculo, desdeCfg: DesdePref, per: PeriodoFicha = ""): { E: Comun; rows: Fila[] } {
  const F = m.F, col = [{ key: "s0", c, flujo: !!c.flujo, ultimo: !!c.ultimo }];
  let E = leerComun(new URLSearchParams(), F, desdeCfg);
  const u = lastIdx(c.v), i0 = c.v.findIndex((x) => ok(x));
  if (u >= 0 && per === "todo") E = { ...E, desde: F[i0] };
  else if (u >= 0 && (per === "1" || per === "5")) E = { ...E, desde: F[Math.max(i0, u - 12 * Number(per) + 1)], hasta: F[u] };
  const filas = (d: string, h: string) => filasGrafico(F, col, { desde: d, hasta: h, meses: E.meses, freq: "M", cierre: false, banda: false });
  let rows = filas(E.desde, E.hasta);
  if (!rows.some((r) => ok(r.s0)) && E.desde > F[0]) { E = { ...E, desde: F[0] }; rows = filas(F[0], E.hasta); }
  return { E, rows };
}

/** Opciones de período que tienen sentido para esta serie (sin dos que muestren lo mismo): "Desde <año>" siempre;
 *  "5 años" y "Todo" solo si agregan meses. */
export function periodosFicha(m: Motor, c: Calculo, desdeCfg: DesdePref): [PeriodoFicha, string][] {
  const def = historicoFicha(m, c, desdeCfg).E.desde;
  const u = lastIdx(c.v), i0 = c.v.findIndex((x) => ok(x));
  const out: [PeriodoFicha, string][] = [["", `Desde ${def.slice(0, 4)}`], ["1", "1 año"]];
  if (u < 0) return out.slice(0, 1);
  const meses = u - i0 + 1;
  if (meses > 12) out.push(["5", "5 años"]);
  if (m.F[i0] < def && meses > 60) out.push(["todo", "Todo"]);
  return out;
}

/** Velas de "Por presidente": una por mandato con datos; los que no tienen, aparte. Lo usan `Presidentes.tsx` y la ficha. */
export function velasDe(m: Motor, c: Calculo, filas: { x: Pres; st: StatsM }[]): { velas: VelaDato[]; sin: string[] } {
  const velas: VelaDato[] = [], sin: string[] = [];
  filas.forEach(({ x, st }) => {
    if (!st.n || st.ini == null || st.fin == null || st.min == null || st.max == null) { sin.push(x.n); return; }
    velas.push({
      id: x.id, nombre: x.n, periodo: `${fmtMes(m.F[st.iniI as number])} a ${fmtMes(m.F[st.finI as number])}`, ini: st.ini, fin: st.fin, min: st.min, max: st.max,
      iniTxt: m.fmtC(c, st.ini), finTxt: m.fmtC(c, st.fin), minTxt: m.fmtC(c, st.min), maxTxt: m.fmtC(c, st.max),
      variacion: varNum(c, st) == null ? "–" : menos(variacionMostrada(m, c, st.ini, st.fin)), cls: claseVariacion(c.dir, c.pct, st.ini, st.fin), nota: datosDesde(m.F, c.v, x),
    });
  });
  return { velas, sin };
}

/** Meses de mandato con los valores por defecto de esa sección, solo con los presidentes que tienen datos.
 *  Si el punto de partida por defecto (mes 0 de Milei) no tiene dato (serie discontinuada), parte del último dato.
 *  Null si no hay ningún presidente con datos desde su mes 0 (serie corta o que no es mensual). */
export function mandatoFicha(m: Motor, PRES: Pres[], PRES_T0: Pres[], e: Expr, b: BaseCfg, extra: string | null) {
  const ids = new Set(PRES_MANDATO_DEF);
  if (extra && PRES_T0.some((x) => x.id === extra)) ids.add(extra);
  // con una tasa, el valor real de cada mes (C1): no hay "mismo punto de partida"
  const modo: ModoMandato = m.SER[e.id] && m.calc(e).pct ? "valor" : MODO_MANDATO_DEF;
  const q = { expr: e, modo, banda: false, b, presIds: ids, anc: null as string | null, md: null, mh: null };
  let r = calcularMandato(m, PRES, PRES_T0, q);
  if (r && !ok(r.ancla)) { q.anc = "ultimo"; r = calcularMandato(m, PRES, PRES_T0, q); }
  if (!r) return null;
  const conDatos = new Set(r.pres.filter((x) => r!.rows.some((f) => ok(f[x.id]))).map((x) => x.id));
  if (!conDatos.size) return null;
  if (conDatos.size < r.pres.length) { q.presIds = conDatos; r = calcularMandato(m, PRES, PRES_T0, q); if (!r) return null; }
  // Parámetros de /mandato/ para ver lo mismo: solo los que no son los de por defecto
  const mp = [...q.presIds].join(",") === PRES_MANDATO_DEF.join(",") ? null : PRES_T0.filter((x) => q.presIds.has(x.id)).map((x) => x.id).join(",");
  return { ...r, modo: (r.modo ?? modo) as ModoMandato, ancParam: q.anc, mp };
}

const PLURAL: Record<FrecOrigen, string> = { M: "mensuales", T: "trimestrales", S: "semestrales", A: "anuales" };
/** Por qué no hay gráfico por mes de mandato: desde cuándo hay datos y, si no es mensual, de qué frecuencia. */
export function sinMandatoTxt(m: Motor, c: Calculo, frec: FrecOrigen): string {
  const i0 = c.v.findIndex((x) => ok(x));
  const desde = i0 >= 0 ? `Hay datos desde ${fmtMes(m.F[i0])}` : "No hay datos";
  return frec !== "M"
    ? `${desde} y son ${PLURAL[frec]}: no hay un valor por mes para seguir cada mandato desde su mes 0.`
    : `${desde}: ningún presidente de la comparación tiene dato en su mes 0.`;
}

/** Parámetros del inicio de mandato que trae la URL (para que "Abrir completo" muestre lo mismo). */
export const paramsInicio = (p: URLSearchParams): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const k of ["t0", "t0p"]) { const v = p.get(k); if (v) out[k] = v; }
  return out;
};
const qs = (o: Record<string, string | null | undefined>): string =>
  new URLSearchParams(Object.entries(o).filter((x): x is [string, string] => !!x[1])).toString();

/** "Abrir completo" de Por presidente: la tabla de esa variable (o sus velas). */
export const hrefPresidentesDe = (e: Expr, velas: boolean, inicio: Record<string, string>): string =>
  `/presidentes/?${qs({ pv: encExpr(e), pvista: velas ? "velas" : null, ...inicio })}`;
/** "Abrir completo" de Meses de mandato: la variable y lo que la ficha cambió (presidentes, punto de partida). */
export const hrefMandatoDe = (e: Expr, o: { mp: string | null; anc: string | null }, inicio: Record<string, string>): string =>
  `/mandato/?${qs({ mv: encExpr(e), mp: o.mp, anc: o.anc, ...inicio })}`;

// ------------------------------------------------------------ Capítulo "Ahora": la cabecera de la ficha
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** Dirección de un texto de variación ya formateado: "+0,3 p.p." sube, "−1,2 %" baja, "0,0" igual. */
const dirDe = (t: string): 1 | -1 | 0 => (/^\+/.test(t) ? 1 : /^[−-]/.test(t) ? -1 : 0);
const deltaDe = (c: Comparacion | null, rotulo: string): DeltaProps | null =>
  c ? { texto: menos(c.variacion), tono: c.cls, dir: dirDe(c.variacion), contra: `vs ${c.fecha}`, etiqueta: `${rotulo} (${c.fecha}): ${c.valor}. Cambio: ${menos(c.variacion)}` } : null;

/** "El valor más bajo desde <mes>": el último mes con un valor igual o menor que el de hoy, si fue hace 12 meses o más. */
function masBajoDesde(m: Motor, c: Calculo): string | null {
  const u = lastIdx(c.v);
  if (u < 0) return null;
  const hoy = c.v[u] as number;
  for (let k = u - 1; k >= 0; k--) {
    const x = c.v[k];
    if (ok(x) && x <= hoy) return mesNum(m.F[u]) - mesNum(m.F[k]) >= 12 ? `El valor más bajo desde ${fmtMes(m.F[k])}.` : null;
  }
  return null;   // es el mínimo de la serie: eso ya lo dice "desde que hay datos"
}

export interface CabeceraFicha {
  cifra: string; fecha: string; deltas: DeltaProps[]; secundarias: { rotulo: string; valor: string }[]; frase?: string; ultimoDisponible: boolean;
}
/** Lo que muestra la apertura de la ficha: la cifra con su fecha, hasta dos cambios (contra el período anterior y contra un año atrás),
 *  el interanual si la cifra es una variación mensual, y un hecho que los cambios no dicen (nunca un adjetivo, D-012). Null sin datos. */
export function cabeceraFicha(m: Motor, e: Expr): CabeceraFicha | null {
  const ctx: ContextoDato | null = contextoDato(m, e);
  if (!ctx) return null;
  const c = m.calc(e);
  const comp = comparaciones(m, plantillaSuelta("ficha", c.corto, e));
  const deltas = [deltaDe(comp?.anterior ?? null, comp?.anterior?.rotulo ?? "Período anterior"), deltaDe(comp?.anio ?? null, "Un año atrás")].filter((x): x is DeltaProps => !!x);
  const secundarias: { rotulo: string; valor: string }[] = [];
  if (esVariacionMensual(m, e) && m.medidasDe(c.serie).some((o) => o[0] === "via")) {
    const ia = contextoDato(m, { ...e, med: "via" }, false);
    if (ia) secundarias.push({ rotulo: "Interanual", valor: ia.valor });
  }
  // Orden de preferencia: "desde", récord, mínimo. Donde más es peor (C5), "el más bajo desde…" antes que la distancia al récord.
  const de = (k: string) => ctx.todas.find((f) => f.clave === k)?.texto;
  const desde = de("desde");
  const bajo = c.dir < 0 && ctx.todas.length > 0 && !/desde que hay datos/.test(desde ?? "") ? masBajoDesde(m, c) : null;
  // C5: si más es peor, la distancia al récord no es la referencia natural: no se usa
  const frase = bajo ?? desde ?? (c.dir < 0 ? null : de("record")) ?? de("minimo");
  return { cifra: ctx.valor, fecha: ctx.mes, deltas, secundarias, frase, ultimoDisponible: ctx.ultimoDisponible };
}

/** ¿Es la variación mensual de un índice (se puede acumular)? */
export const esVariacionMensual = (m: Motor, e: Expr): boolean => {
  if (!m.SER[e.id]) return false;
  const c = m.calc(e);
  return c.pct && (e.med ?? m.medDefault(c.serie)) === "vm";
};

// ------------------------------------------------------------ Capítulo "¿Cómo fue <mes> en otros años?"
export interface MesesIguales {
  mes: string;                  // "octubre"
  filas: { anio: string; valor: number; texto: string; actual: boolean; ref: boolean }[];
  puesto: number; de: number; sentido: "bajo" | "alto";
  /** "El más bajo (o alto) desde <año>": el último año anterior con un valor igual o más bajo (o alto), el que va más atrás de los dos.
   *  Null si el de hoy es el récord de todos los años o si los dos son el año anterior (empate). */
  desde: { anio: string; texto: string; sentido: "bajo" | "alto"; igual: boolean } | null;
  frase: string;
}
const MIN_MESES_IGUALES = 10;
/** Todos los valores del mismo mes calendario que el último dato, del más viejo al más nuevo, y en qué puesto queda el de hoy.
 *  El puesto se cuenta con los valores redondeados como se muestran (empates: mismo puesto). Null si la serie no es mensual o hay menos de 10. */
export function mesesIguales(m: Motor, e: Expr): MesesIguales | null {
  if (!m.SER[e.id] || (e.rel && !m.SER[e.rel])) return null;
  const c = m.calc(e), F = m.F, u = lastIdx(c.v);
  if (u < 0 || frecuenciaOrigen(c.v) !== "M") return null;
  const mm = F[u].slice(5, 7);
  const fmt = (v: number) => m.fmtC(c, v);
  const filas: MesesIguales["filas"] = [];
  for (let i = 0; i <= u; i++) {
    const x = c.v[i];
    if (F[i].slice(5, 7) === mm && ok(x)) filas.push({ anio: F[i].slice(0, 4), valor: x, texto: fmt(x).replace(/^-/, "−"), actual: i === u, ref: false });
  }
  if (filas.length < MIN_MESES_IGUALES) return null;
  const red = filas.map((f) => redondeadoComo(fmt, f.valor)), hoy = red[red.length - 1];
  const abajo = 1 + red.filter((v) => v < hoy).length, arriba = 1 + red.filter((v) => v > hoy).length;
  const sentido = abajo <= arriba ? "bajo" : "alto", puesto = sentido === "bajo" ? abajo : arriba;
  const mes = MESES_LARGOS[Number(mm) - 1], de = filas.length, desde = filas[0].anio;
  const actual = filas[filas.length - 1];
  const plural = `${mes}s`;
  // "El más bajo / alto desde <año>" (con los valores como se muestran): el último año con un valor igual o más bajo, y el último
  // con uno igual o más alto; gana el que va más atrás. Si el de hoy es el récord, lo dice el puesto (1.º) y no hay año de referencia.
  let iBajo = -1, iAlto = -1;
  for (let k = red.length - 2; k >= 0 && (iBajo < 0 || iAlto < 0); k--) {
    if (iBajo < 0 && red[k] <= hoy) iBajo = k;
    if (iAlto < 0 && red[k] >= hoy) iAlto = k;
  }
  let ref: MesesIguales["desde"] = null;
  if (iBajo >= 0 && iAlto >= 0 && iBajo !== iAlto) {
    const k = Math.min(iBajo, iAlto), s = k === iBajo ? "bajo" : "alto";   // todos los años del medio quedaron por encima (o por debajo): el de hoy es el más bajo (o alto) desde ese año
    // Solo si dice algo: que haya al menos un año en el medio
    if (k <= red.length - 3) { filas[k].ref = true; ref = { anio: filas[k].anio, texto: filas[k].texto, sentido: s, igual: red[k] === hoy }; }
  }
  const fraseDesde = ref
    ? (ref.igual ? `Es el ${mes} más ${ref.sentido} desde ${ref.anio}, cuando también fue ${ref.texto}. ` : `Es el ${mes} más ${ref.sentido} desde ${ref.anio} (${ref.texto}). `)
    : "";
  const frase = `${mes[0].toUpperCase()}${mes.slice(1)} de ${actual.anio}: ${actual.texto}. ` + fraseDesde + (puesto === 1
    ? `Es el más ${sentido} de los ${de} ${plural} desde ${desde}.`
    : `Entre los ${de} ${plural} desde ${desde}, es el ${puesto}.º más ${sentido}.`);
  return { mes, filas, puesto, de, sentido, desde: ref, frase };
}

// ------------------------------------------------------------ Capítulo "¿Cómo le fue con cada presidente?"
export interface TablaFicha { filas: FilaMandato[]; columnas: ColumnaMandato[]; visibles: string[]; extras: string[]; tasa: boolean }
/** Filas y columnas de `TablaMandatos` de la ficha: una fila por presidente con datos.
 *  Tasa (C2): Inicio, Cierre y Promedio (principal, sin tono); Mediana, Mínimo, Máximo y, si es variación mensual, Acumulada, aparte.
 *  Serie en nivel: Inicio, Cierre y Variación (principal, con tono); Promedio, Mínimo y Máximo aparte. */
export function filasMandatosFicha(m: Motor, e: Expr, b: BaseCfg): TablaFicha {
  const F = m.F, c = m.calc(e), tasa = c.pct, vm = esVariacionMensual(m, e);
  // con "−" y nunca "−0,0" (un cero redondeado va sin signo)
  const t = (v: number | null | undefined) => menos(m.fmtC(c, v).replace(/^-(?=0(?:,0+)?(?![\d,]))/, ""));
  const filas: FilaMandato[] = [];
  for (const x of crearPres(F)) {
    const st = statsMandato(F, c.v, x, b);
    if (!st.n) continue;
    const desde = datosDesde(F, c.v, x);
    const celdas: FilaMandato["celdas"] = {
      ini: { texto: t(st.ini), valor: st.ini ?? null }, fin: { texto: t(st.fin), valor: st.fin ?? null },
      prom: { texto: t(st.prom), valor: st.prom ?? null }, min: { texto: t(st.min), valor: st.min ?? null }, max: { texto: t(st.max), valor: st.max ?? null },
    };
    if (tasa) {
      celdas.med = { texto: t(st.med), valor: st.med ?? null };
      if (vm) { const a = acumulada(c.v, st); celdas.acum = { texto: a == null ? "–" : `${menos(nf1.format(r1(a)))} %`, valor: a }; }
    } else {
      const cls = claseVariacion(c.dir, c.pct, st.ini, st.fin);
      celdas.var = { texto: varNum(c, st) == null ? "–" : menos(variacionMostrada(m, c, st.ini, st.fin)), valor: varNum(c, st), tono: cls === "neutro" ? null : cls };
    }
    filas.push({ id: x.id, nombre: x.corto, periodo: periodoMandato(F, x) + (desde ? ` (${desde})` : ""), color: x.color, celdas });
  }
  if (tasa) {
    return {
      tasa, filas, visibles: ["ini", "fin", "prom"], extras: ["med", "min", "max", ...(vm ? ["acum"] : [])],
      columnas: [{ clave: "ini", titulo: "Inicio" }, { clave: "fin", titulo: "Cierre" }, { clave: "prom", titulo: "Promedio", principal: true },
        { clave: "med", titulo: "Mediana" }, { clave: "min", titulo: "Mínimo" }, { clave: "max", titulo: "Máximo" }, ...(vm ? [{ clave: "acum", titulo: "Acumulada" }] : [])],
    };
  }
  return {
    tasa, filas, visibles: ["ini", "fin", "var"], extras: ["prom", "min", "max"],
    columnas: [{ clave: "ini", titulo: "Inicio" }, { clave: "fin", titulo: "Cierre" }, { clave: "var", titulo: "Variación", principal: true },
      { clave: "prom", titulo: "Promedio" }, { clave: "min", titulo: "Mínimo" }, { clave: "max", titulo: "Máximo" }],
  };
}
/** Variación acumulada en el mandato de una variación mensual, en %: (Π (1 + vᵢ/100) − 1) × 100 sobre los meses iniI + 1 … finI,
 *  así es igual al índice del cierre sobre el del mes 0, menos 1. Null si falta algún mes. */
export function acumulada(v: ArrayLike<number | null | undefined>, st: StatsM): number | null {
  if (st.iniI == null || st.finI == null) return null;
  let p = 1;
  for (let i = st.iniI + 1; i <= st.finI; i++) { const x = v[i]; if (!ok(x)) return null; p *= 1 + x / 100; }
  return (p - 1) * 100;
}

// ------------------------------------------------------------ "Ver también"
const NOMBRE_COMPONENTE: [string, string][] = [
  ["ipc_nacional_n_estaci", "Inflación núcleo"], ["ipc_nacional_r_estaci", "Inflación de precios regulados"], ["ipc_nacional_e_estaci", "Inflación de precios estacionales"],
];
const MAX_RELACIONADAS = 5;
/** Nombre público de una variable para un link: el de un principal de los temas si es exactamente esa variable; si no, el de la serie. */
function nombreDe(e: Expr, S: Record<string, SerieMeta>): string {
  for (const t of TEMAS) { const p = principalesDe(t, S).find((x) => mismaVariable(x, e)); if (p) return p.nombre; }
  const n = S[e.id]?.n ?? e.id;
  return e.med === "via" ? `${n}, interanual` : e.med === "vm" ? `${n}, mensual` : n;
}
/** Hasta 5 links "Ver también": la otra medida de la misma serie si es un dato fijo; para la inflación, núcleo, regulados y estacionales;
 *  y los otros principales del tema. Sin la variable misma ni repetidos. */
/** `sinTema`: dentro de la página de un tema, sus principales ya están arriba como tarjetas: no se repiten. */
export function relacionadasDe(e: Expr, S: Record<string, SerieMeta>, sinTema = false): { nombre: string; href: string }[] {
  const out: { nombre: string; href: string }[] = [], vistos = new Set<string>([hrefDato(e)]);
  const sumar = (x: Expr, nombre?: string) => {
    const href = hrefDato(x);
    if (vistos.has(href) || !S[x.id]) return;
    vistos.add(href); out.push({ nombre: nombre ?? nombreDe(x, S), href });
  };
  const propio = datoFijoDe(e);
  if (propio) DATOS_FIJOS.filter((d) => d !== propio && d.e.id === e.id && (d.e.rel ?? "") === (e.rel ?? "") && (d.e.esc ?? "") === (e.esc ?? "")).forEach((d) => sumar(d.e));
  if (e.id === "ipc_empalme") NOMBRE_COMPONENTE.forEach(([id, n]) => sumar({ id, med: "vm", rel: null, modo: "compra", esc: "" }, n));
  const cat = S[e.id]?.cat[0];
  const tema = TEMAS.find((t) => cat && t.cats.includes(cat));
  if (tema && !sinTema) principalesDe(tema, S).forEach((p) => sumar(p, p.nombre));
  return out.slice(0, MAX_RELACIONADAS);
}
