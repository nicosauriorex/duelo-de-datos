// Arma los datos de la imagen de compartir a partir de una vista de Histórico (variables, período, frecuencia). No dibuja: eso es `imagen.ts`.
// Usa las mismas funciones que el gráfico de la página (filasGrafico, statsMandato, franjasPres, contextoDato) para que den lo mismo.
import { baseResumen, aBase100, baseIdx, claseVariacion, crearPres, filasGrafico, franjasPres, statsMandato, type BaseCfg } from "./estadisticas";
import { admiteContexto, contextoDato } from "./contexto-dato";
import type { DesdePref, FormatoImg } from "./config";
import { leerComun, leerGrafico } from "./historico";
import type { DatosImagen, PresImg } from "./imagen";
import { nf0, nf1, fmtNum, norm, ok } from "./formato";
import type { Calculo, Expr, Motor } from "./motor";

/** Lo que muestra un gráfico de Histórico y, por lo tanto, lo que lleva la imagen. */
export interface VistaImg {
  exprs: Expr[]; modo: "valor" | "b100"; eje: "propia" | "misma";
  desde: string; hasta: string; meses: Set<number>; freq: "M" | "T" | "A"; ag: "promedio" | "cierre";
  titulo?: string;      // el de la plantilla, si la vista viene de una
}
export interface OpcionesImg { formato: FormatoImg; comparar: boolean; comentario: string; base: BaseCfg; colPres?: Record<string, string> }

export const MAX_COMENTARIO = 120;
const MAX_TARJETAS = 7;   // más mandatos no entran con números legibles: se muestran los más recientes
/** El comentario va en una sola línea: sin saltos, sin emojis ni caracteres que no se puedan dibujar. */
export const limpiarComentario = (s: string): string =>
  s.replace(/[\p{Extended_Pictographic}\p{C}\p{Cs}‍️]/gu, " ").replace(/\s+/g, " ").trim().slice(0, MAX_COMENTARIO);

/** Formato de los números del eje: porcentajes con %, miles abreviados. */
export const fmtEjeDe = (c: { pct: boolean }) => (v: number) =>
  c.pct ? nf0.format(v) + " %" : (Math.abs(v) >= 1e6 ? nf1.format(v / 1e6) + " M" : Math.abs(v) >= 1e4 ? nf0.format(v / 1e3) + " mil" : fmtNum(v));

/** Título del gráfico según sus variables. */
export const tituloGrafico = (lista: { c: Calculo }[], b100: boolean): string =>
  b100 ? `Comparación en base 100: ${lista.map((o) => o.c.corto).join(", ")}` : lista.length > 2 ? lista.map((o) => o.c.corto).join(", ")
    : lista.length === 2 ? `${lista[0].c.corto} y ${lista[1].c.corto}` : lista[0].c.nombre;

/** Cuando el valor es real, con qué índice se descontó la inflación (vacío si no corresponde). */
export const notaInflacion = (calcs: Calculo[], b100: boolean): string =>
  !b100 && calcs.some((c) => c.serie.id !== "ipc_empalme" && /\$ de [a-z]{3}-\d\d|descontada la inflación|relativo al IPC|% real/.test(c.unidad))
    ? "Inflación descontada con el IPC de INDEC (de 2007 a 2016, con los de San Luis y la Ciudad de Buenos Aires)." : "";

const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/** La vista de un gráfico a partir de parámetros de URL (las plantillas son eso). Null si no tiene variables. */
export function vistaDeParams(m: Motor, p: URLSearchParams, existe: (id: string) => boolean, desdeCfg: DesdePref, titulo?: string): VistaImg | null {
  const g = leerGrafico(p, 0, existe, null);
  if (!g) return null;
  const E = leerComun(p, m.F, desdeCfg);
  return { exprs: g.exprs, modo: g.modo, eje: g.eje, desde: E.desde, hasta: E.hasta, meses: E.meses, freq: E.freq, ag: E.ag, titulo };
}

/** Datos de la imagen. Null si todavía faltan datos cargados o no hay nada que dibujar. */
export function armarImagen(m: Motor, v: VistaImg, o: OpcionesImg): DatosImagen | null {
  if (!v.exprs.length || v.exprs.some((e) => !m.SER[e.id] || (e.rel && !m.SER[e.rel]))) return null;
  const b100 = v.modo === "b100", F = m.F;
  const calcs = v.exprs.map((e) => m.calc(e));
  const unEje = calcs.length > 2;
  const lista = calcs.map((c, k) => ({ c, key: "s" + k, k, axis: (!b100 && !unEje && k === 1 && v.eje !== "misma" ? 1 : 0) as 0 | 1, flujo: !!c.flujo, ultimo: !!c.ultimo }));
  const rows = filasGrafico(F, lista, { desde: v.desde, hasta: v.hasta, meses: v.meses, freq: v.freq, cierre: v.ag === "cierre", banda: false });
  if (!rows.length) return null;
  if (b100) aBase100(rows, lista.map((x) => x.key));
  const unico = lista.length === 1, fmtDe = (c: Calculo) => (b100 ? (x: number) => nf1.format(x) : (x: number) => m.fmtC(c, x));
  const ultimaFila = (key: string) => { for (let i = rows.length - 1; i >= 0; i--) if (ok(rows[i][key])) return rows[i][key] as number; return null; };

  const ctx = unico && !b100 ? contextoDato(m, v.exprs[0], admiteContexto({ variables: 1, modo: v.modo, freq: v.freq })) : null;
  const titulo = v.titulo ?? (unico && !v.exprs[0].rel && !v.exprs[0].esc && !b100
    ? (() => { const r = m.resumenMedida(calcs[0].serie, v.exprs[0].med ?? m.medDefault(calcs[0].serie)); return r ? `${calcs[0].nombre} (${r})` : calcs[0].nombre; })()
    : tituloGrafico(lista, b100));

  const comparar = o.comparar && unico && !b100;
  let presidentes: PresImg[] | null = null, franjas: DatosImagen["franjas"] = [];
  if (comparar) {
    const c = calcs[0];
    franjas = franjasPres(F, o.base).map((f) => ({ ini: f.ini, fin: f.fin, id: f.color.replace("--pres-", ""), nombre: f.nombre }));
    presidentes = crearPres(F).filter((p) => F[p.i1] >= v.desde && F[p.i0] <= v.hasta).slice(-MAX_TARJETAS).map((p): PresImg => {
      const st = statsMandato(F, c.v, p, o.base), bi = baseIdx(F, p, o.base);
      const ini = st.n && st.iniI === bi && ok(st.ini) ? st.ini : null;                       // sin dato en el mes de inicio: sin datos
      // sin dato al cierre: la serie termina antes del fin de un mandato ya cerrado (en el mandato en curso vale el último dato)
      const fin = st.n && ok(st.fin) && ((st.finI as number) >= p.i1 - 2 || p.i1 === F.length - 1) ? st.fin : null;
      const dosDatos = ini != null && fin != null;
      return {
        id: p.id, nombre: p.n, ini: ini == null ? null : m.fmtC(c, ini), fin: fin == null ? null : m.fmtC(c, fin),
        variacion: dosDatos ? m.variacionTxt(c, ini, fin) : null, cls: dosDatos ? claseVariacion(c.dir, c.pct, ini, fin) : "neutro",
      };
    });
  }

  const hoy = new Date();
  const mesUlt = ctx?.fecha ?? rows[rows.length - 1].fecha;
  return {
    formato: o.formato, titulo,
    cifra: ctx ? { valor: ctx.valor, mes: ctx.mes, aviso: ctx.ultimoDisponible } : null,
    frases: ctx?.frases ?? [],
    leyenda: ctx ? null : lista.map((x) => { const u = ultimaFila(x.key); return { nombre: x.c.corto, valor: u == null ? "–" : fmtDe(x.c)(u), color: x.k }; }),
    x: rows.map((r) => +r.fecha.slice(0, 4) * 12 + (+r.fecha.slice(5, 7) - 1)),
    series: lista.map((x) => ({ nombre: x.c.corto, color: x.k, axis: x.axis, v: rows.map((r) => (ok(r[x.key]) ? (r[x.key] as number) : null)) })),
    fmtEje: b100 ? (x) => nf0.format(x) : fmtEjeDe(calcs[0]),
    fmtEje2: !b100 && lista.length === 2 && v.eje !== "misma" ? fmtEjeDe(calcs[1]) : null,
    franjas, presidentes, inicioTxt: presidentes ? `Inicio de mandato: ${baseResumen(o.base)}` : null,
    comentario: limpiarComentario(o.comentario),
    unidad: b100 ? "Base 100: primer dato del período = 100" : [...new Set(calcs.map((c) => c.unidad))].join(" · "),
    fuente: [...new Set(calcs.map((c) => c.serie.fuente))].join("; "), nota: notaInflacion(calcs, b100),
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-${slug(titulo)}-${mesUlt.slice(0, 7)}`,
  };
}
