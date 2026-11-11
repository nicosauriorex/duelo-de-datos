// Arma los datos de la imagen de compartir a partir de una vista de Histórico (variables, período, frecuencia). No dibuja: eso es `imagen.ts`.
// Usa las mismas funciones que el gráfico de la página (filasGrafico, statsMandato, franjasPres, contextoDato) para que den lo mismo.
import { aBase100, claseVariacion, crearPres, estadisticasRows, filasGrafico, franjasPres, baseIdx, oracionInicio, type BaseCfg, type EstRows, type Fila } from "./estadisticas";
import { admiteContexto, contextoDato } from "./contexto-dato";
import { DATOS_GEN, DATOS_PRES, type DatoGen, type DatoPres, type DesdePref, type FormatoImg, type OpcionesImagen } from "./config";
import { leerComun, leerGrafico, frecuenciaOrigen, textoTemporalidad, TODOS_MESES } from "./historico";
import type { DatosImagen, TarjetaDato, TarjetaImg } from "./imagen";
import { fmtMes, nf0, nf1, fmtNum, norm, ok } from "./formato";
import type { Calculo, Expr, Motor } from "./motor";
import { filasDeTabla, tablaATexto } from "./tabla-texto";
import { variacionMostrada } from "./tablas";

/** Lo que muestra un gráfico de Histórico y, por lo tanto, lo que lleva la imagen. */
export interface VistaImg {
  exprs: Expr[]; modo: "valor" | "b100"; eje: "propia" | "misma";
  desde: string; hasta: string; meses: Set<number>; freq: "M" | "T" | "A"; ag: "promedio" | "cierre";
  titulo?: string;      // el de la plantilla, si la vista viene de una
  tabla?: boolean;      // la vista que se comparte es la Tabla: el panel ofrece copiar la tabla o compartir el gráfico
}
export interface OpcionesImg {
  formato: FormatoImg; comentario: string; base: BaseCfg; colPres?: Record<string, string>;
  personal?: OpcionesImagen;      // lo que eligió quien comparte (ver docs/specs/personalizar-imagen.md); sin esto, la imagen es la simple
  periodoEnTitulo?: boolean;      // el período elegido no es el de toda la serie: el título lo lleva
}

export const MAX_COMENTARIO = 120;
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

/** Título de una imagen de una sola variable: el nombre y, entre paréntesis, cómo se mide. */
export function tituloVariable(m: Motor, e: Expr, c: Calculo): string {
  if (e.rel || e.esc) return c.nombre;
  const r = m.resumenMedida(c.serie, e.med ?? m.medDefault(c.serie));
  return r ? `${c.nombre} (${r})` : c.nombre;
}
/** Texto de fuentes de una imagen con varias variables: la lista sin repetir y, si no entra, una versión corta con el enlace al detalle. */
/** Algunas series traen "ver Fuentes" como fuente (el detalle está en la página de fuentes): en la imagen, que no tiene botones, va la dirección. */
export const fuenteLegible = (f: string): string => (/^ver fuentes$/i.test(f.trim()) ? `ver ${SITIO_FUENTES}` : f);
export function fuentesTxt(fuentes: string[]): { fuente: string; fuenteCorta: string } {
  const u = [...new Set(fuentes.filter(Boolean).map(fuenteLegible))];
  // instituciones: cada fuente puede traer varias separadas por ";" y aclaraciones ("INDEC (IPC)", "… vía datos.gob.ar", "de 2007 a 2016, …")
  const inst0 = [...new Set(u.flatMap((f) => f.split(";")).map((x) => x.trim()).filter((x) => /^[A-ZÁÉÍÓÚÑ]/.test(x)).map((x) => x.replace(/\s*(\(| vía |,| - | – ).*$/, "")))];
  const inst = inst0.length ? inst0 : u;
  return {
    fuente: `${u.length > 1 ? "Fuentes" : "Fuente"}: ${u.join("; ")}`,
    fuenteCorta: `Fuentes: ${inst.length > 2 ? `${inst[0]}, ${inst[1]} y otras` : inst.join(" y ")}; detalle en ${SITIO_FUENTES}`,
  };
}
const SITIO_FUENTES = "primerolosdatos.com.ar/fuentes";

export const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/** La vista de un gráfico a partir de parámetros de URL (las plantillas son eso). Null si no tiene variables. */
export function vistaDeParams(m: Motor, p: URLSearchParams, existe: (id: string) => boolean, desdeCfg: DesdePref, titulo?: string): VistaImg | null {
  const g = leerGrafico(p, 0, existe, null);
  if (!g) return null;
  const E = leerComun(p, m.F, desdeCfg);
  return { exprs: g.exprs, modo: g.modo, eje: g.eje, desde: E.desde, hasta: E.hasta, meses: E.meses, freq: E.freq, ag: E.ag, titulo };
}


/** Las variables de la vista ya calculadas, listas para armar las filas del gráfico. Null si falta alguna serie. */
function preparar(m: Motor, v: Pick<VistaImg, "exprs" | "modo" | "eje">) {
  if (!v.exprs.length || v.exprs.some((e) => !m.SER[e.id] || (e.rel && !m.SER[e.rel]))) return null;
  const b100 = v.modo === "b100";
  const calcs = v.exprs.map((e) => m.calc(e));
  const unEje = calcs.length > 2;
  const lista = calcs.map((c, k) => ({ c, key: "s" + k, k, axis: (!b100 && !unEje && k === 1 && v.eje !== "misma" ? 1 : 0) as 0 | 1, flujo: !!c.flujo, ultimo: !!c.ultimo }));
  return { b100, calcs, lista };
}

/** Los meses con datos de la serie (o de alguna, si son varias): los que se pueden elegir como principio y fin del período. */
export function mesesDisponibles(m: Motor, v: Pick<VistaImg, "exprs" | "modo" | "eje">): { fecha: string; etq: string }[] {
  const p = preparar(m, v);
  if (!p) return [];
  const rows = filasGrafico(m.F, p.lista, { desde: m.F[0], hasta: m.F[m.F.length - 1], meses: new Set(TODOS_MESES), freq: "M", cierre: false, banda: false });
  return rows.map((r) => ({ fecha: r.fecha as string, etq: fmtMes(r.fecha) }));
}

/** El texto tabulado de la tabla de una vista de Histórico (mismos números que en pantalla), con la dirección `url` como última fila. Null si falta algo cargado o no hay filas. */
export function tablaTextoDeVista(m: Motor, v: VistaImg, url: string): string | null {
  const prep = preparar(m, v);
  if (!prep) return null;
  const rows = filasGrafico(m.F, prep.lista, { desde: v.desde, hasta: v.hasta, meses: v.meses, freq: v.freq, cierre: v.ag === "cierre", banda: false });
  if (!rows.length) return null;
  if (prep.b100) aBase100(rows, prep.lista.map((x) => x.key));
  const cols = prep.lista.map((x) => ({ key: x.key, name: x.c.corto, unidad: prep.b100 ? "base 100" : x.c.unidad, fmt: prep.b100 ? (n: number) => nf1.format(n) : (n: number) => m.fmtC(x.c, n) }));
  return tablaATexto(cols, filasDeTabla(rows, cols), url);
}

/** ¿La imagen puede llevar líneas, marcadores de extremos, presidentes y tarjetas? Solo con una variable en valores (no base 100). */
export const admitePersonalizar = (v: Pick<VistaImg, "exprs" | "modo">): boolean => v.exprs.length === 1 && v.modo !== "b100";

const signo = (d: number) => (d > 0 ? "+" : d < 0 ? "−" : "");
/** Variación entre dos datos: en % (en puntos si el dato es un porcentaje); con valores negativos, la diferencia sin porcentaje. */
function variacionDe(m: Motor, c: Calculo, ini: number | null, fin: number | null, conNegativos: boolean): string | null {
  if (ini == null || fin == null) return null;
  if (!c.pct && conNegativos) { const d = fin - ini; return `${signo(d)}${m.fmtC(c, Math.abs(d))}`; }
  const t = variacionMostrada(m, c, ini, fin);
  return t === "–" ? null : t;
}
const mesesIdx = (F: string[], desde: string, hasta: string) => {
  const iD = F.findIndex((f) => f >= desde);
  let iH = -1;
  for (let i = F.length - 1; i >= 0; i--) if (F[i] <= hasta) { iH = i; break; }
  return { iD, iH };
};

/** Un dato de la tarjeta de un presidente o de las generales. */
const dato = (rotulo: string, valor: string | null, cls: TarjetaDato["cls"] = "neutro", sub: string | null = null): TarjetaDato => ({ rotulo, valor: valor ?? "–", cls, sub });

/** Tarjetas por presidente: cada uno con los meses del mandato que caen dentro del período. */
function tarjetasPres(m: Motor, c: Calculo, o: { base: BaseCfg; desde: string; hasta: string; datos: DatoPres[]; conNegativos: boolean }): TarjetaImg[] {
  const F = m.F, N = F.length, { iD, iH } = mesesIdx(F, o.desde, o.hasta);
  return crearPres(F).filter((p) => p.i1 >= iD && p.i0 <= iH).map((p): TarjetaImg => {
    const lo = Math.max(p.i0, iD), hi = Math.min(p.i1, iH), bi = baseIdx(F, p, o.base);
    let ultDato = -1; for (let i = N - 1; i >= 0; i--) if (ok(c.v[i])) { ultDato = i; break; }
    // parcial "hasta": el período corta el mandato antes de su cierre (no cuenta que la serie todavía no tenga los últimos meses)
    // parcial "desde": el mandato empezó antes del período. Si empieza dentro, "Recibió" es su mes inicial (aunque T-1 caiga un mes antes del período), igual que en Por presidente
    const desdeParcial = bi < iD && p.i0 < iD, hastaParcial = p.i1 > iH && iH < ultDato;
    const vals: number[] = [];
    let primero: number | null = null, ultimo: number | null = null, ultimoI = -1;
    for (let i = lo; i <= hi; i++) { const x = c.v[i]; if (ok(x)) { vals.push(x); if (primero == null) primero = x; ultimo = x; ultimoI = i; } }
    // Recibió: el valor del mes inicial del mandato (sin dato ese mes: sin dato); si el mandato empieza antes del período, el primer dato del período
    const ini = desdeParcial ? primero : ok(c.v[bi]) ? (c.v[bi] as number) : null;   // el mes inicial puede ser el último del antecesor (T-1)
    // Entregó: el último dato; en un mandato ya cerrado, solo si cae a menos de 3 meses del cierre
    const fin = ultimo != null && (ultimoI >= hi - 2 || hi === N - 1) ? ultimo : null;
    const sigue = p.i1 === N - 1 && !hastaParcial;   // mandato en curso: el último dato es "Hoy", aunque la serie venga atrasada
    const vr = variacionDe(m, c, ini, fin, o.conNegativos);
    const ord = [...vals].sort((a, b) => a - b), h = Math.floor(ord.length / 2);
    const media = ord.length ? ord.reduce((a, b) => a + b, 0) / ord.length : null;
    const mediana = !ord.length ? null : ord.length % 2 ? ord[h] : (ord[h - 1] + ord[h]) / 2;
    const f = (x: number | null) => (x == null ? null : m.fmtC(c, x));
    const por: Record<DatoPres, TarjetaDato> = {
      recibio: dato("Recibió", f(ini)), entrego: dato(sigue ? "Hoy" : "Entregó", f(fin)),
      variacion: dato("Variación", vr, ini != null && fin != null && vr ? claseVariacion(c.dir, c.pct, ini, fin) : "neutro"),
      promedio: dato("Promedio", f(media)), mediana: dato("Mediana", f(mediana)),
      maximo: dato("Máximo", f(ord.length ? ord[ord.length - 1] : null)), minimo: dato("Mínimo", f(ord.length ? ord[0] : null)),
    };
    const nota = desdeParcial && hastaParcial ? `${fmtMes(F[lo])} a ${fmtMes(F[hi])}` : desdeParcial ? `desde ${fmtMes(F[lo])}` : hastaParcial ? `hasta ${fmtMes(F[hi])}` : null;
    return { id: p.id, nombre: p.n, nota, datos: DATOS_PRES.map((d) => d[0]).filter((d) => o.datos.includes(d)).map((d) => por[d]) };
  });
}

/** Tarjetas generales: números de todo el período elegido. */
function tarjetasGen(m: Motor, c: Calculo, est: EstRows, datos: DatoGen[], conNegativos: boolean): TarjetaImg[] {
  const f = (x: number) => m.fmtC(c, x), vr = variacionDe(m, c, est.pri[0], est.ult[0], conNegativos);
  const por: Record<DatoGen, TarjetaDato> = {
    ultimo: dato("Último", f(est.ult[0]), "neutro", est.ult[1]), inicio: dato("Inicio del período", f(est.pri[0]), "neutro", est.pri[1]),
    variacion: dato("Variación del período", vr, vr ? claseVariacion(c.dir, c.pct, est.pri[0], est.ult[0]) : "neutro", `${est.pri[1]} a ${est.ult[1]}`),
    promedio: dato("Promedio", f(est.prom)), mediana: dato("Mediana", f(est.med)),
    maximo: dato("Máximo", f(est.max[0]), "neutro", est.max[1]), minimo: dato("Mínimo", f(est.min[0]), "neutro", est.min[1]),
  };
  return DATOS_GEN.map((d) => d[0]).filter((d) => datos.includes(d)).map((d) => ({ nombre: por[d].rotulo, datos: [por[d]] }));
}

const mesDeFila = (r: Fila): number => +r.fecha.slice(0, 4) * 12 + (+r.fecha.slice(5, 7) - 1);

/** Datos de la imagen. Null si todavía faltan datos cargados, no hay nada que dibujar o (con `personal`) el período no tiene al menos dos datos. */
export function armarImagen(m: Motor, v: VistaImg, o: OpcionesImg): DatosImagen | null {
  const prep = preparar(m, v);
  if (!prep) return null;
  const { b100, calcs, lista } = prep, F = m.F, pers = o.personal ?? null;
  const rows = filasGrafico(F, lista, { desde: v.desde, hasta: v.hasta, meses: v.meses, freq: v.freq, cierre: v.ag === "cierre", banda: false });
  if (!rows.length) return null;
  if (pers && !lista.some((x) => rows.filter((r) => ok(r[x.key])).length >= 2)) return null;
  if (b100) aBase100(rows, lista.map((x) => x.key));
  const unico = lista.length === 1, fmtDe = (c: Calculo) => (b100 ? (x: number) => nf1.format(x) : (x: number) => m.fmtC(c, x));
  const ultimaFila = (key: string) => { for (let i = rows.length - 1; i >= 0; i--) if (ok(rows[i][key])) return rows[i][key] as number; return null; };

  const ctx = unico && !b100 ? contextoDato(m, v.exprs[0], admiteContexto({ variables: 1, modo: v.modo, freq: v.freq }), { periodo: { desde: v.desde, hasta: v.hasta }, elegidas: pers?.frases ?? null }) : null;
  const tituloBase = v.titulo ?? (unico && !b100 ? tituloVariable(m, v.exprs[0], calcs[0]) : tituloGrafico(lista, b100));
  const titulo = o.periodoEnTitulo ? `${tituloBase} · ${fmtMes(v.desde)} a ${fmtMes(v.hasta)}` : tituloBase;

  // ----- lo personalizable (solo con una variable en valores)
  const simple = unico && !b100, c0 = calcs[0];
  const est = simple && pers ? estadisticasRows(rows, "s0") : null;
  const conNegativos = rows.some((r) => ok(r.s0) && (r.s0 as number) < 0);
  const fmt0 = (x: number) => m.fmtC(c0, x);
  const lineasRef: NonNullable<DatosImagen["lineasRef"]> = [];
  if (est && pers) {
    if (pers.promedio) lineasRef.push({ tipo: "prom", valor: est.prom, texto: `Promedio ${fmt0(est.prom)}` });
    if (pers.mediana) lineasRef.push({ tipo: "med", valor: est.med, texto: `Mediana ${fmt0(est.med)}` });
    if (pers.lineaUltimo) lineasRef.push({ tipo: "ult", valor: est.ult[0], texto: `Último ${fmt0(est.ult[0])}` });
  }
  const marcasExt: NonNullable<DatosImagen["marcasExt"]> = [];
  if (est && pers?.marcaExtremos) {
    const en = (val: number) => { const r = rows.find((x) => x.s0 === val); return r ? mesDeFila(r) : null; };
    const xMax = en(est.max[0]), xMin = en(est.min[0]);
    if (xMax != null) marcasExt.push({ tipo: "max", x: xMax, valor: est.max[0], texto: `Máximo ${fmt0(est.max[0])}` });
    if (xMin != null && xMin !== xMax) marcasExt.push({ tipo: "min", x: xMin, valor: est.min[0], texto: `Mínimo ${fmt0(est.min[0])}` });
  }
  let franjas: DatosImagen["franjas"] = [], tarjetas: DatosImagen["tarjetas"];
  const conPres = !!(est && pers && (pers.resaltar || pers.tarjetas === "pres"));
  if (est && pers) {
    if (pers.resaltar) {
      const { iD, iH } = mesesIdx(F, v.desde, v.hasta), enPeriodo = new Set(crearPres(F).filter((p) => p.i1 >= iD && p.i0 <= iH).map((p) => p.id));
      franjas = franjasPres(F, o.base).map((f) => ({ ini: f.ini, fin: f.fin, id: f.color.replace("--pres-", ""), nombre: f.nombre })).filter((f) => enPeriodo.has(f.id));
    }
    if (pers.tarjetas === "pres") {
      const items = tarjetasPres(m, c0, { base: o.base, desde: v.desde, hasta: v.hasta, datos: pers.datosPres, conNegativos });
      if (items.length) tarjetas = { tipo: "pres", items };
    } else if (pers.tarjetas === "gen") tarjetas = { tipo: "gen", items: tarjetasGen(m, c0, est, pers.datosGen, conNegativos) };
  }

  const hoy = new Date();
  const mesUlt = ctx?.fecha ?? rows[rows.length - 1].fecha;
  return {
    formato: o.formato, titulo,
    temporalidad: textoTemporalidad({ freq: v.freq, ag: v.ag, meses: v.meses, suma: lista.some((x) => !!x.flujo), origen: frecuenciaOrigen(lista[0].c.v) }),   // el mismo texto que el gráfico
    cifra: ctx ? { valor: ctx.valor, mes: ctx.mes, aviso: ctx.ultimoDisponible } : null,
    frases: ctx?.frases ?? [],
    leyenda: ctx ? null : lista.map((x) => { const u = ultimaFila(x.key); return { nombre: x.c.corto, valor: u == null ? "–" : fmtDe(x.c)(u), color: x.k }; }),
    x: rows.map((r) => mesDeFila(r)),
    series: lista.map((x) => ({ nombre: x.c.corto, color: x.k, axis: x.axis, v: rows.map((r) => (ok(r[x.key]) ? (r[x.key] as number) : null)) })),
    fmtEje: b100 ? (x) => nf0.format(x) : fmtEjeDe(calcs[0]),
    fmtEje2: !b100 && lista.length === 2 && v.eje !== "misma" ? fmtEjeDe(calcs[1]) : null,
    franjas, tarjetas, lineasRef, marcasExt, marcaUltimo: pers ? pers.marcaUltimo : true,
    inicioTxt: conPres ? `${oracionInicio(o.base)} T = mes de asunción.` : null,
    comentario: limpiarComentario(o.comentario),
    unidad: b100 ? "Base 100: primer dato del período = 100" : [...new Set(calcs.map((c) => c.unidad))].join(" · "),
    fuente: "Fuente: " + [...new Set(calcs.map((c) => fuenteLegible(c.serie.fuente)))].join("; "), nota: notaInflacion(calcs, b100),
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-${slug(tituloBase)}-${mesUlt.slice(0, 7)}`,
  };
}
