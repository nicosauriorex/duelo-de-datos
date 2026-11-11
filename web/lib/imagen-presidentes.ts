// Datos de la imagen de compartir para las secciones de presidentes (Por presidente, Meses de mandato y Ranking). No dibuja: eso es `imagen.ts`.
// Usa los mismos cálculos que la página (statsMandato, claseVariacion, calcularMandato, rankingPresidentes) para que den lo mismo.
import {
  baseIdx, baseTxt, oracionInicio, calcularMandato, claseVariacion, crearPres, rankingPresidentes, statsMandato, TITULOS_MANDATO, nombreCorto, varNum,
  type BaseCfg, type CritRk, type IndRk, type ModoMandato,
} from "./estadisticas";
import type { DatosImagen, FilaBarra, FilaRank, FilaVariable } from "./imagen";
import type { FormatoImg } from "./config";
import { fuenteLegible, fuentesTxt, limpiarComentario, notaInflacion, slug, tituloVariable } from "./imagen-datos";
import { fmtMes, lastIdx, ok } from "./formato";
import type { Expr, Motor } from "./motor";
import { grupoDe } from "./catalogo";

/** Lo que muestra una sección de presidentes y, por lo tanto, lo que lleva la imagen. Todo viene tal como está en pantalla. */
export type VistaPres =
  | { tipo: "barras"; expr: Expr; presIds: string[]; base: BaseCfg }                  // presIds en el orden en que está la tabla
  | { tipo: "variables"; presId: string; exprs: Expr[]; base: BaseCfg }
  | { tipo: "mandato"; expr: Expr; modo: ModoMandato; presIds: string[]; anc: string | null; md: string | null; mh: string | null; valorFinal?: boolean; base: BaseCfg }
  | { tipo: "ranking"; crit: CritRk; inds: IndRk[]; usaVars: boolean; base: BaseCfg };
export interface OpcionesPres { formato: FormatoImg; comentario: string }

export const esVistaPres = (v: unknown): v is VistaPres => !!v && typeof v === "object" && "tipo" in v;
/** Ids de series que hay que tener cargadas para armar la imagen. */
export const idsDeVistaPres = (v: VistaPres): string[] =>
  v.tipo === "barras" || v.tipo === "mandato" ? (v.expr.rel ? [v.expr.id, v.expr.rel] : [v.expr.id])
    : v.tipo === "variables" ? v.exprs.flatMap((e) => (e.rel ? [e.id, e.rel] : [e.id]))
      : v.inds.flatMap((i) => (i.ind.rel ? [i.ind.id, i.ind.rel] : [i.ind.id]));

const CRIT_NOMBRE: Record<CritRk, string> = {
  mejora: "Mejora (cuánto cambió cada indicador del inicio al cierre del mandato)",
  nivel: "Nivel promedio (el promedio de cada indicador durante el mandato)",
  ambos: "Ambos (el promedio de la mejora y del nivel promedio)",
};
const neutro = (texto: string) => ({ texto, cls: "neutro" as const });

/** Marca de datos parciales de un mandato: la serie empieza después del inicio, o termina antes del cierre de un mandato ya cerrado. */
function notaParcial(F: string[], st: ReturnType<typeof statsMandato>, bi: number, i1: number): string | null {
  const desde = st.iniI != null && st.iniI > bi, hasta = st.finI != null && st.finI < i1 - 2 && i1 !== F.length - 1;
  if (desde && hasta) return `datos de ${fmtMes(F[st.iniI as number])} a ${fmtMes(F[st.finI as number])}`;
  return desde ? `datos desde ${fmtMes(F[st.iniI as number])}` : hasta ? `datos hasta ${fmtMes(F[st.finI as number])}` : null;
}

function esqueleto(m: Motor, o: OpcionesPres, base: BaseCfg, titulo: string, ultimo: string): DatosImagen {
  return {
    formato: o.formato, titulo, cifra: null, frases: [], leyenda: null, x: [], series: [], fmtEje: (v) => String(v), fmtEje2: null, franjas: [], presidentes: null,
    inicioTxt: oracionInicio(base), comentario: limpiarComentario(o.comentario), unidad: "", fuente: "", nota: "",
    fecha: new Date().toLocaleDateString("es-AR"), archivo: `primerolosdatos-${slug(titulo)}-${ultimo.slice(0, 7)}`,
  };
}

/** Datos de la imagen. Null si faltan datos cargados o no hay nada que dibujar. */
export function armarImagenPres(m: Motor, v: VistaPres, o: OpcionesPres): DatosImagen | null {
  const F = m.F, PRES = crearPres(F), b = v.base;
  if (idsDeVistaPres(v).some((id) => !m.SER[id])) return null;

  if (v.tipo === "barras") {
    const c = m.calc(v.expr), titulo = tituloVariable(m, v.expr, c);
    const filas: FilaBarra[] = [], sin: string[] = [];
    v.presIds.forEach((id) => {
      const p = PRES.find((x) => x.id === id); if (!p) return;
      const st = statsMandato(F, c.v, p, b);
      if (!st.n || st.iniI === st.finI) { sin.push(p.n); return; }
      const ini = st.ini as number, fin = st.fin as number;
      filas.push({
        id: p.id, nombre: p.n, valor: varNum(c, st), variacion: m.variacionTxt(c, ini, fin), cls: claseVariacion(c.dir, c.pct, ini, fin),
        ini: m.fmtC(c, ini), fin: m.fmtC(c, fin), nota: notaParcial(F, st, baseIdx(F, p, b), p.i1),
      });
    });
    if (!filas.length) return null;
    const d = esqueleto(m, o, b, titulo, F[lastIdx(c.v)] ?? F[F.length - 1]);
    // palabras neutras (D-012): el color se explica por lo que hizo el dato, según qué dirección es favorable para ese dato
    const color = !c.dir ? "Sin colores: para este dato no se califica si subir o bajar es favorable." : c.dir > 0 ? "Verde: subió; rojo: bajó." : "Verde: bajó; rojo: subió.";
    d.frases = [neutro(`Del inicio al cierre de cada mandato. ${color}`)];
    d.lienzo = { tipo: "barras", filas, sinDatos: sin };
    d.unidad = c.unidad; d.fuente = "Fuente: " + fuenteLegible(c.serie.fuente); d.nota = notaInflacion([c], false);
    return d;
  }

  if (v.tipo === "variables") {
    const p = PRES.find((x) => x.id === v.presId);
    if (!p || !v.exprs.length) return null;
    const bi = baseIdx(F, p, b), calcs = v.exprs.map((e) => m.calc(e));
    const filas: FilaVariable[] = calcs.map((c): FilaVariable => {
      const st = statsMandato(F, c.v, p, b), sinDatos = !st.n || st.iniI === st.finI;
      const nombre = c.corto, unidad = c.unidad;
      if (sinDatos) return { nombre, unidad, ini: null, fin: null, variacion: null, cls: "neutro", nota: null, spark: [] };
      const ini = st.ini as number, fin = st.fin as number, desde = ok(c.v[bi]) ? bi : (st.iniI as number);
      return {
        nombre, unidad, ini: m.fmtC(c, ini), fin: m.fmtC(c, fin), variacion: m.variacionTxt(c, ini, fin), cls: claseVariacion(c.dir, c.pct, ini, fin),
        nota: notaParcial(F, st, bi, p.i1), spark: c.v.slice(desde, p.i1 + 1),
      };
    });
    // con un solo presidente se dice el mes exacto (no la oración general del inicio de mandato)
    const fin = Math.min(p.i1, F.length - 1);
    const d = esqueleto(m, o, b, `${p.n}: de ${fmtMes(F[bi])} (mes inicial) ${p.i1 < F.length - 1 ? `a ${fmtMes(F[fin])} (fin del mandato)` : "a hoy (último dato de cada variable)"}`, F[fin]);
    d.inicioTxt = null;
    d.frases = [neutro("Si los datos de una variable no cubren todo el período, la fila lo indica.")];
    d.lienzo = { tipo: "variables", filas, presId: p.id };
    d.unidad = "Valor al inicio y al cierre, y variación en % (en puntos si el dato ya es un porcentaje)";
    const f = fuentesTxt(calcs.map((c) => c.serie.fuente));
    d.fuente = f.fuente; d.fuenteCorta = f.fuenteCorta; d.nota = notaInflacion(calcs, false);
    return d;
  }

  if (v.tipo === "mandato") {
    const PRES_T0 = PRES.filter((x) => m.idxDe(x.ini) > 0);
    const D = calcularMandato(m, PRES, PRES_T0, { expr: v.expr, modo: v.modo, banda: false, b, presIds: new Set(v.presIds), anc: v.anc, md: v.md, mh: v.mh });
    if (!D || !D.pres.length || !D.rows.length) return null;
    const titulo = `${D.c.corto}: ${TITULOS_MANDATO[v.modo]} por mes de mandato`;
    const d = esqueleto(m, o, b, titulo, F[lastIdx(D.c.v)] ?? F[F.length - 1]);
    // la explicación va en letra chica y en dos renglones como máximo: el eje y la unidad (pie) y, si es teórico, el valor de partida (junto a la fuente)
    const recorte = D.desde > 0 || D.hasta < D.maxMes ? ` (meses ${D.desde} a ${D.hasta})` : "";
    d.frases = [];
    d.x = D.rows.map((r) => r.t as number);
    d.series = D.pres.map((x) => {
      // con la opción, cada línea lleva el valor del último mes visible de ese presidente (el último con dato)
      let ult: number | null = null;
      for (let i = D.rows.length - 1; i >= 0 && ult == null; i--) { const y = D.rows[i][x.id]; if (ok(y)) ult = y as number; }
      return {
        nombre: x.n, color: 0, axis: 0 as const, presId: x.id, etiqueta: v.valorFinal && ult != null ? `${nombreCorto(x.n)} ${D.fmtTip(ult)}` : x.n,
        trazo: D.teo ? "largo" as const : x.dash ? "corto" as const : "continuo" as const,
        v: D.rows.map((r) => (ok(r[x.id]) ? (r[x.id] as number) : null)),
      };
    });
    d.fmtEje = D.fmtAxis; d.ejeX = "mes"; d.log = D.usarLog; d.refLinea = D.ref;
    const unidadDato = v.modo === "indice" ? "índice, mes 0 = 100" : v.modo === "var" && !D.c.pct ? "variación en %, desde el mes 0" : D.c.unidad;
    d.unidad = `Eje horizontal: meses desde el inicio de cada mandato${recorte} · ${unidadDato}`;
    d.fuente = "Fuente: " + fuenteLegible(D.c.serie.fuente);
    d.nota = [D.teo ? `Punteadas: precio teórico, partiendo de ${m.fmtC(D.c, D.ancla)} (${D.ancTxt}).` : "", notaInflacion([D.c], false)].filter(Boolean).join(" ");
    return d;
  }

  // ranking
  const res = rankingPresidentes(m, F, PRES, v.inds, v.crit, b);
  if (!res.filas.length) return null;
  const d = esqueleto(m, o, b, "Ranking de presidentes", F[F.length - 1]);
  const nombres = v.inds.map((i) => i.nombre), n = v.inds.length;
  const grupos = [...new Set(v.inds.map((i) => i.grupo))];
  const gruposVars = [...new Set(v.inds.map((i) => grupoDe(m.SER[i.ind.id])))];
  const incluye = v.usaVars ? (n > 6 ? `${n} variables de ${gruposVars.length} ${gruposVars.length === 1 ? "grupo" : "grupos"}: ${gruposVars.join(", ")}` : `${n} ${n === 1 ? "variable" : "variables"}: ${nombres.join(", ")}`) : `${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"}: ${grupos.join(", ")}`;
  d.frases = [neutro(`Criterio: ${CRIT_NOMBRE[v.crit]}.`), neutro(`Incluye ${incluye}.`), neutro("Puntaje armado con los indicadores elegidos por quien comparte.")];
  // el mismo aviso que muestra la página
  d.frases.push(neutro(`Menem, De la Rúa y Duhalde se evalúan con pocos indicadores (muchos datos empiezan en 2003, 2012 o 2016); Milei, con un mandato en curso; el contexto internacional y la herencia de cada uno no entran en el número.${res.incompletas && v.usaVars ? " Algunas variables no tienen datos para todos los presidentes." : ""}`));
  const filas: FilaRank[] = res.filas.map((f, k) => ({ puesto: k + 1, id: f.p.id, nombre: f.p.n, score: f.score as number, indicadores: f.items.length }));
  d.lienzo = { tipo: "ranking", filas, sinDatos: PRES.filter((p) => !res.filas.some((f) => f.p.id === p.id)).map((p) => p.n) };
  d.unidad = "Puntaje de 0 (el peor) a 100 (el mejor), por presidente";
  const f = fuentesTxt(res.filas.flatMap((fl) => fl.items.map((i) => i.c.serie.fuente)));
  d.fuente = f.fuente; d.fuenteCorta = f.fuenteCorta;
  return d;
}

