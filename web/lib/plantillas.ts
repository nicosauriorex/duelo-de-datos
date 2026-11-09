// Plantillas: gráficos ya armados de Histórico. Las curadas se escriben a mano (o vienen de Datos curiosos y de los indicadores);
// las generadas salen solas del catálogo. Una plantilla es un conjunto de parámetros de Histórico (`vista`) más texto para buscarla.
import { fmtMes, lastIdx, norm, ok } from "./formato";
import { crearIndicadoresDe, textoBusqueda } from "./catalogo";
import { defCurios, type DefCurio } from "./curiosidades";
import { claseVariacion } from "./estadisticas";
import { FX_KEYS, FX_NOM, type Expr, type Motor, type SerieMeta, type Vals } from "./motor";
import { decExpr, encExpr, lista as listaUrl } from "./url";
import { PM_RUBROS } from "./preciosMundo";

export const GRUPOS = ["Mis plantillas", "Destacadas", "Poder de compra", "Precios contra la inflación", "Salarios", "Dólar y mercados",
  "Actividad", "Empleo y pobreza", "Sector externo", "Fiscal", "En el mundo", "Gobierno y Congreso"] as const;
export type Vista = Record<string, string>;

export interface Plantilla {
  id: string; titulo: string; desc: string; grupo: string; etiquetas: string[];
  vista: Vista; curada: boolean;
  e: Expr | null;          // el primer gráfico: de ahí salen el valor, el minigráfico y los datos que hay que bajar
  ids: string[];           // series cuyos datos hacen falta para la tarjeta
  def?: DefCurio;          // dato curioso: arma su propio texto
  href?: string;           // si abre otra sección en vez de Histórico (ej. Precios en el mundo)
  propia?: boolean; fecha?: string;
}

const DINAMICAS = ["producto-que-mas-subio", "rubro-ipc-que-mas-subio"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const unaVista = (...es: Expr[]): Vista => ({ v: es.map(encExpr).join(",") });
/** Clave para detectar dos plantillas que muestran lo mismo. */
const claveVista = (v: Vista) => `${v.v ?? ""}|${v.m ?? ""}`;

export function crearPlantillas(metas: SerieMeta[]): Plantilla[] {
  const S: Record<string, SerieMeta> = Object.fromEntries(metas.map((s) => [s.id, s]));
  const { X, INDIC, INDIC_IPC } = crearIndicadoresDe(S);
  const out: Plantilla[] = [];
  const vistas = new Set<string>();
  const ids = new Set<string>();
  const nueva = (p: Omit<Plantilla, "ids" | "e" | "curada"> & { e: Expr; ids?: string[]; curada: boolean }) => {
    const k = claveVista(p.vista);
    const dinamica = DINAMICAS.includes(p.id);             // su vista de reserva es un placeholder: no tapa a ninguna generada
    if ((!dinamica && vistas.has(k)) || ids.has(p.id)) return;           // si una curada y una generada muestran lo mismo, queda la curada
    if (!dinamica) vistas.add(k);
    ids.add(p.id);
    out.push({ ...p, ids: p.ids ?? [p.e.id, ...(p.e.rel ? [p.e.rel] : [])] });
  };
  const fuente = (id: string) => `Fuente: ${S[id]?.fuente ?? "–"}`;

  // ---- curadas: datos curiosos (Destacadas)
  defCurios(S).forEach((d) => nueva({
    id: d.id, titulo: d.k, desc: "Dato curioso con la serie completa", grupo: "Destacadas", etiquetas: [...d.etiquetas, "curioso", "destacada"],
    vista: unaVista(d.e), e: d.e, ids: d.ids, def: d, curada: true,
  }));

  // ---- curadas: indicadores principales
  const GRUPO_DE: Record<string, string> = {
    "Salarios": "Salarios", "Poder de compra": "Poder de compra", "Precios y dólar": "Dólar y mercados", "Actividad": "Actividad",
    "Empleo y pobreza": "Empleo y pobreza", "Externo y finanzas": "Sector externo", "Fiscal": "Fiscal",
  };
  const GRUPO_ID: Record<string, string> = { inflacion: "Precios contra la inflación", riesgo: "Dólar y mercados", mk_merv: "Dólar y mercados" };
  INDIC.forEach((i) => nueva({
    id: "i-" + slug(i.nombre), titulo: i.nombre, desc: fuente(i.id), grupo: GRUPO_ID[i.id] ?? GRUPO_DE[i.grupo] ?? "Destacadas",
    etiquetas: [i.grupo], vista: unaVista(i), e: i, curada: true,
  }));

  // ---- curadas: a mano
  const E = (id: string, extra: Partial<Expr> = {}): Expr | null => X(id, "", "", extra);
  const manual = (id: string, titulo: string, grupo: string, desc: string, etiquetas: string[], es: (Expr | null)[], extraVista: Vista = {}) => {
    const xs = es.filter(Boolean) as Expr[];
    if (xs.length !== es.length) return;                  // falta alguna serie en el catálogo
    nueva({ id, titulo, desc, grupo, etiquetas, vista: { ...unaVista(...xs), ...extraVista }, e: xs[0], ids: xs.flatMap((x) => [x.id, ...(x.rel ? [x.rel] : [])]), curada: true });
  };
  manual("cuatro-dolares", "Los cuatro dólares en pesos de hoy", "Dólar y mercados", "Oficial, blue, MEP y CCL en pesos de hoy, en un solo eje", ["dolar", "cotizacion", "cepo"],
    FX_KEYS.map((k) => E("fx_" + k, { med: "real" })));
  manual("brechas-blue-mep-ccl", "Brecha blue, MEP y CCL", "Dólar y mercados", "Cuánto más caros que el oficial mayorista, en un solo eje", ["dolar", "cepo", "contado con liqui"],
    ["blue", "mep", "ccl"].map((k) => E("brecha_" + k)));
  manual("soja-productor-cuatro-dolares", "Soja: lo que recibe el productor, a los cuatro dólares", "Sector externo", "Precio en Rosario como % de Chicago, según el dólar", ["campo", "retenciones", "productor"],
    FX_KEYS.map((k) => E("soja_ratio_" + k)));
  manual("brecha-mep", "Brecha MEP", "Dólar y mercados", "Cuánto más caro que el oficial mayorista", ["dolar", "cepo"], [E("brecha_mep")]);
  manual("brecha-ccl", "Brecha CCL", "Dólar y mercados", "Cuánto más caro que el oficial mayorista", ["dolar", "cepo", "contado con liqui"], [E("brecha_ccl")]);
  manual("soja-rosario-chicago-oficial", "Soja: lo que recibe el productor (al dólar oficial)", "Sector externo", "Precio en Rosario como % de Chicago", ["campo", "retenciones", "productor"], [E("soja_ratio_oficial")]);
  manual("soja-rosario-chicago-blue", "Soja: lo que recibe el productor (al dólar blue)", "Sector externo", "Precio en Rosario como % de Chicago", ["campo", "retenciones", "productor"], [E("soja_ratio_blue")]);
  manual("soja-chicago-vs-rosario", "Soja: Chicago contra Rosario", "Sector externo", "US$ por tonelada, Rosario al dólar oficial", ["campo", "cosecha", "precio internacional"],
    [E("soja_chi", { med: "corr" }), E("soja_ros", { med: "usd_oficial" })], { ej: "misma" });
  manual("salario-minimo-vs-canasta", "Cuántas canastas de pobreza compra un salario mínimo", "Poder de compra", "Salario mínimo, vital y móvil sobre la canasta total de un hogar de 4",
    ["smvm", "sueldo minimo", "linea de pobreza"], [E("can_cbt_h2", { rel: "smvm", med: "corr" })]);

  // ---- generadas
  const tieneSal = !!S.sipa_med;
  Object.values(S).filter((s) => s.id.startsWith("pp_gba_")).forEach((s) => {
    const nom = s.n.replace(" (GBA)", ""), base = s.id.slice(7);
    if (tieneSal) {
      const e = E(s.id, { rel: "sipa_med", med: "corr" })!;
      nueva({ id: "g-compra-" + base, titulo: `Cuánto ${minus(nom)} compra un salario mediano`, desc: "Poder de compra del salario, precios de GBA", grupo: "Poder de compra", etiquetas: [nom], vista: unaVista(e), e, curada: false });
    }
    const r = E(s.id, { med: "real" })!;
    nueva({ id: "g-real-" + base, titulo: `${cap(nom)} contra la inflación`, desc: "Precio real (en pesos de hoy), GBA", grupo: "Precios contra la inflación", etiquetas: [nom], vista: unaVista(r), e: r, curada: false });
  });
  INDIC_IPC.forEach((i) => nueva({
    id: "g-ipc-" + i.id, titulo: `${cap(i.nombre.replace(" (precio real)", ""))} contra la inflación`, desc: "Rubro del IPC nacional relativo al IPC general", grupo: "Precios contra la inflación",
    etiquetas: ["ipc", "rubro"], vista: unaVista(i), e: i, curada: false,
  }));
  if (tieneSal) {
    Object.values(S).filter((s) => s.id.startsWith("can_")).forEach((s) => {
      const e = E(s.id, { rel: "sipa_med", med: "corr" })!;
      nueva({ id: "g-" + s.id, titulo: `Cuántas canastas compra un salario mediano: ${minus(s.n.replace(/^Canasta /, ""))}`, desc: "Salario SIPA mediano sobre el valor de la canasta (GBA)", grupo: "Poder de compra",
        etiquetas: ["canasta", "pobreza", "indigencia"], vista: unaVista(e), e, curada: false });
    });
    FX_KEYS.forEach((k) => {
      const e = E("fx_" + k, { rel: "sipa_med", med: "corr" });
      if (e) nueva({ id: "g-dolares-" + k, titulo: `Cuántos dólares ${FX_NOM[k]} compra un salario mediano`, desc: "Salario SIPA mediano sobre la cotización", grupo: "Poder de compra", etiquetas: ["dolar", "sueldo"], vista: unaVista(e), e, curada: false });
    });
  }
  // ---- Precios en el mundo (bloque 6c): una por rubro, abre el detalle en Contexto
  PM_RUBROS.forEach(([rid, nombre]) => out.push({
    id: "pm-" + rid, titulo: `${nombre}: Argentina contra el mundo, en dólares`, desc: "Nivel de precios contra el promedio del mundo (= 100), medido y estimado",
    grupo: "En el mundo", etiquetas: ["mundo", "afuera", "dolares", "precios", "exterior", "caro", "barato", "icp"], vista: {}, e: null, ids: [], curada: true,
    href: `/contexto/?pmr=${rid}#precios-mundo`,
  }));
  // ---- Gobierno y Congreso (bloque 6d): una por indicador, abre la sección en Presidentes
  ([
    ["bancas", "Bancas del oficialismo por presidente", "Bancas propias y aliadas en Diputados y Senado, en % de la cámara"],
    ["leyes", "Leyes del Ejecutivo aprobadas por presidente", "Proyectos del Ejecutivo aprobados sobre enviados"],
    ["dnu", "DNU por presidente", "Decretos de necesidad y urgencia, total y por año de mandato"],
    ["vetos", "Vetos por presidente", "Vetos totales y parciales, y cuántas veces el Congreso insistió"],
  ] as const).forEach(([ind, titulo, desc]) => out.push({
    id: "cg-" + ind, titulo, desc, grupo: "Gobierno y Congreso",
    etiquetas: ["congreso", "diputados", "senado", "bancas", "mayoria", "leyes", "decretos", "dnu", "vetos", "oficialismo"], vista: {}, e: null, ids: [], curada: true,
    href: `/presidentes/?cgi=${ind}#congreso`,
  }));
  return out;
}

/** Plantilla propia (guardada en el navegador o venida por link) como una más de la lista. */
export function plantillaPropia(p: { id: string; nombre: string; vista: Vista; fecha: string }, S: Record<string, SerieMeta>): Plantilla {
  const existe = (id: string) => !!S[id];
  const es = listaUrl(p.vista.v).map((s) => decExpr(s, existe)).filter(Boolean) as Expr[];
  const todas = Object.entries(p.vista).filter(([k]) => /^v\d?$/.test(k)).flatMap(([, s]) => listaUrl(s).map((x) => decExpr(x, existe)).filter(Boolean) as Expr[]);
  const primera = es[0] ?? todas[0];
  return {
    id: p.id, titulo: p.nombre, desc: "Mi plantilla", grupo: "Mis plantillas", etiquetas: [], vista: p.vista, curada: false, propia: true, fecha: p.fecha,
    e: primera ?? null, ids: primera ? [primera.id, ...(primera.rel ? [primera.rel] : [])] : [],
    // para buscar: todas las variables de todos los gráficos
    ...(todas.length ? { etiquetas: [...new Set(todas.flatMap((x) => [x.id, ...(x.rel ? [x.rel] : [])]))] } : {}),
  };
}

// ------------------------------------------------------------ búsqueda
export const MIN_BUSQUEDA = 2;
const cacheBusca = new WeakMap<Plantilla, string>();
function textoDe(p: Plantilla, S: Record<string, SerieMeta>): string {
  let t = cacheBusca.get(p);
  if (t == null) {
    // las etiquetas de las propias son ids de series: se buscan por el texto de la serie
    const deSeries = (p.propia ? p.etiquetas : DINAMICAS.includes(p.id) ? [] : p.ids).map((id) => (S[id] ? textoBusqueda(S[id]) : "")).join(" ");
    t = norm([p.titulo, p.desc, p.propia ? "" : p.etiquetas.join(" "), p.grupo].join(" ")) + " " + deSeries;
    cacheBusca.set(p, t);
  }
  return t;
}
/** Sin importar mayúsculas ni tildes; con varias palabras, la plantilla tiene que tener todas. Con menos de 2 caracteres no filtra. */
export function filtrar(lista: Plantilla[], q: string, S: Record<string, SerieMeta>): Plantilla[] {
  const palabras = norm(q).split(/\s+/).filter(Boolean);
  if (norm(q).trim().length < MIN_BUSQUEDA || !palabras.length) return lista;
  // cada palabra tiene que empezar una palabra del texto ("asado" no encuentra "pasado")
  const res = palabras.map((w) => new RegExp("(^|[^a-z0-9])" + w.replace(/[^a-z0-9]/g, (c) => "\\" + c)));
  return lista.filter((p) => { const t = textoDe(p, S); return res.every((re) => re.test(t)); });
}

// ------------------------------------------------------------ links a Histórico
export function hrefPlantilla(p: Plantilla, vista?: Vista): string {
  if (p.href) return p.href;
  const q = new URLSearchParams(vista ?? p.vista);
  if (p.propia) q.set("pn", p.titulo); else q.set("pl", p.id);
  return `/historico/?${q.toString()}`;
}

// ------------------------------------------------------------ tarjeta
export interface Evaluada { v: Vals; val: string; fecha: string; texto: string; cls: "bueno" | "malo" | "neutro" | null; unidad?: string; vista?: Vista }
/** Calcula lo que muestra una tarjeta. Devuelve null si faltan datos. */
export function evaluar(m: Motor, p: Plantilla): Evaluada | null {
  const e = p.e;
  if (!e || !m.SER[e.id] || (e.rel && !m.SER[e.rel])) return null;
  try {
    const c = m.calc(e), u = lastIdx(c.v);
    if (u < 0) return null;
    const fecha = fmtMes(m.F[u]);
    if (p.def) {
      const r = p.def.ev(m, c);
      if (r) return { v: r.v ?? c.v, val: r.val, fecha, texto: r.d, cls: null, vista: r.e ? unaVista(r.e) : undefined };
    }
    const antes = c.v[u - 12], ahora = c.v[u];
    const tiene = u >= 12 && ok(antes) && ok(ahora);
    return {
      v: c.v, val: m.fmtC(c, ahora), fecha, unidad: c.unidad,
      texto: tiene ? `${m.variacionTxt(c, antes, ahora)} contra hace un año` : "Sin variación contra hace un año",
      cls: tiene ? claseVariacion(c.dir, c.pct, antes, ahora) : "neutro",
    };
  } catch { return null; }
}

// ------------------------------------------------------------ para la portada y los temas
/** La plantilla cuyo primer gráfico es exactamente esta expresión. */
export const plantillaDeExpr = (pls: Plantilla[], e: Expr): Plantilla | undefined =>
  pls.find((p) => p.e && p.e.id === e.id && (e.med == null || (p.e.med ?? "") === e.med) && (p.e.rel ?? null) === (e.rel ?? null) && (p.e.esc ?? "") === (e.esc ?? ""));
/** Plantilla suelta para una expresión (cuando ninguna curada coincide): sirve para calcular la tarjeta. */
export const plantillaSuelta = (id: string, titulo: string, e: Expr): Plantilla => ({
  id, titulo, desc: "", grupo: "", etiquetas: [], vista: unaVista(e), curada: true, e, ids: [e.id, ...(e.rel ? [e.rel] : [])],
});
/** Plantillas de un tema: las de sus grupos y, si `porCat`, solo las de una categoría del tema. Primero las curadas. */
export function plantillasDeTema(pls: Plantilla[], S: Record<string, SerieMeta>, t: { cats: string[]; grupos: string[]; porCat?: boolean }): Plantilla[] {
  const deCat = (p: Plantilla) => !!p.e && !!S[p.e.id] && t.cats.includes(S[p.e.id].cat[0]);
  return pls.filter((p) => !p.propia && (t.porCat ? deCat(p) && (!t.grupos.length || t.grupos.includes(p.grupo)) : t.grupos.includes(p.grupo)))
    .sort((a, b) => Number(b.curada) - Number(a.curada));
}

// ------------------------------------------------------------ líneas de contexto de las cifras de la portada
/** Inflación interanual (último dato), como texto. */
export function interanualTxt(m: Motor): string | null {
  const c = m.calc({ id: "ipc_empalme", med: "via", rel: null, modo: "compra", esc: "" }), u = lastIdx(c.v);
  return u >= 0 && ok(c.v[u]) ? m.fmtC(c, c.v[u]) : null;
}
/** Qué tan lejos está el último dato de su récord (fracción negativa o 0), o null si no se puede calcular. */
export function distanciaRecord(m: Motor, e: Expr): number | null {
  const c = m.calc(e), u = lastIdx(c.v), vals = c.v.filter(ok) as number[];
  return u < 0 || !vals.length ? null : (c.v[u] as number) / Math.max(...vals) - 1;
}
