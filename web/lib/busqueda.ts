// Orden de los resultados del buscador (portada y buscador global). Funciones puras, sin React.
// Un solo orden: datos principales, variables del catálogo, gráficos listos, temas y secciones.
import { buscarSeries, palabrasBusqueda, textoBusqueda } from "./catalogo";
import { hrefFijo, mismaVariable } from "./datos-fijos";
import { norm } from "./formato";
import type { Expr, SerieMeta } from "./motor";
import { SINONIMOS, rutaPublica } from "./nombres";
import { filtrar, hrefPlantilla, MIN_BUSQUEDA, type Plantilla } from "./plantillas";
import { GRUPOS_SECCIONES, SECCIONES } from "./secciones";
import { TEMAS, hrefDato, hrefHistorico, principalesDe } from "./temas";

export interface ResultadoBusqueda {
  tipo: "principal" | "variable" | "grafico" | "seccion";
  titulo: string;
  /** Línea gris: la ruta ("Precios › Indicadores de inflación") o el grupo. */
  detalle: string;
  href: string;
  /** Para la cifra en vivo del primer resultado. */
  e?: Expr;
  plantilla?: Plantilla;
}

export interface ContextoBusqueda {
  metas: SerieMeta[];
  S: Record<string, SerieMeta>;
  plantillas: Plantilla[];
  /** Medida con la que se abre una variable (la preferida del usuario para las de pesos). */
  medidaDe: (s: SerieMeta) => string;
}

/** Máximo de cada grupo. */
export const MAX_GRUPO = { principal: 3, variable: 4, grafico: 3, seccion: 2 } as const;

/** Los cinco que se sugieren sin escribir. Cada slug es un dato fijo de `lib/datos-fijos.ts`. */
export const MAS_BUSCADOS: { titulo: string; slug: string }[] = [
  { titulo: "Inflación", slug: "inflacion-mensual" },
  { titulo: "Dólar blue", slug: "dolar-blue" },
  { titulo: "Salario", slug: "salario-mediano-real" },
  { titulo: "Pobreza", slug: "pobreza" },
  { titulo: "Riesgo país", slug: "riesgo-pais" },
];
export const hrefMasBuscado = (slug: string): string => hrefFijo(slug);

/** Cada palabra tiene que empezar una palabra del texto ("asado" no encuentra "pasado"). */
const empieza = (texto: string, w: string): boolean => new RegExp("(^|[^a-z0-9])" + w.replace(/[^a-z0-9]/g, (c) => "\\" + c)).test(texto);
/** Cuántas palabras de la búsqueda aparecen en el texto. */
const cuantas = (texto: string, ws: string[]): number => ws.filter((w) => empieza(texto, w)).length;

/** Hay búsqueda cuando se escribieron al menos dos caracteres. */
export const hayBusqueda = (q: string): boolean => norm(q).trim().length >= MIN_BUSQUEDA && palabrasBusqueda(q).length > 0;

export function buscar(q: string, ctx: ContextoBusqueda): ResultadoBusqueda[] {
  if (!hayBusqueda(q)) return [];
  const ws = palabrasBusqueda(q);
  const out: ResultadoBusqueda[] = [];

  // 1. Datos principales: por nombre, nombre corto o sinónimos de su serie. Los que tienen la palabra en el nombre, primero; empate: orden de los temas.
  const filas = TEMAS.flatMap((t) => principalesDe(t, ctx.S).map((p) => {
    const nombre = norm(p.nombre + " " + p.corto), extra = norm((SINONIMOS[p.id] ?? "") + " " + (ctx.S[p.id]?.nTecnico ?? ""));
    return { p, tema: t.nombre, enNombre: cuantas(nombre, ws), enTodo: cuantas(nombre + " " + extra, ws) };
  }));
  let sel = filas.filter((f) => f.enTodo === ws.length);
  if (!sel.length && ws.length > 1) sel = filas.filter((f) => f.enTodo > 0).sort((a, b) => b.enTodo - a.enTodo);
  sel = sel.map((f, i) => ({ f, i })).sort((a, b) => (b.f.enNombre === ws.length ? 1 : 0) - (a.f.enNombre === ws.length ? 1 : 0) || a.i - b.i).map((x) => x.f);
  const principales = sel.slice(0, MAX_GRUPO.principal);
  principales.forEach((f) => out.push({ tipo: "principal", titulo: f.p.nombre, detalle: ctx.S[f.p.id] ? rutaPublica(ctx.S[f.p.id].cat).join(" › ") : f.tema, href: hrefDato(f.p), e: f.p }));

  // 2. Variables del catálogo, sin repetir las que ya salieron como principal (misma serie)
  const usadas = new Set(principales.map((f) => f.p.id));
  // Como en `filtrar`: cada palabra tiene que empezar una palabra del texto ("asado" no encuentra "pasado")
  const inicios = palabrasBusqueda(q).map((w) => new RegExp("(^|[^a-z0-9])" + w.replace(/[^a-z0-9]/g, (c) => "\\" + c)));
  const empiezaPalabra = (s: SerieMeta) => { const t = textoBusqueda(s as SerieMeta & { busca?: string }); return inicios.every((re) => re.test(t)); };
  buscarSeries(ctx.metas, q, 16).filter((s) => !usadas.has(s.id) && empiezaPalabra(s)).slice(0, MAX_GRUPO.variable).forEach((s) => {
    const e: Expr = { id: s.id, med: ctx.medidaDe(s), rel: null, modo: "compra", esc: "" };
    out.push({ tipo: "variable", titulo: s.n, detalle: rutaPublica(s.cat).join(" › "), href: hrefHistorico(e), e });
  });

  // 3. Gráficos listos (sin los propios)
  filtrar(ctx.plantillas.filter((p) => !p.propia && !principales.some((f) => p.e && mismaVariable(f.p, p.e))), q, ctx.S).slice(0, MAX_GRUPO.grafico).forEach((p) =>
    out.push({ tipo: "grafico", titulo: p.titulo, detalle: p.grupo, href: hrefPlantilla(p), ...(p.e ? { e: p.e, plantilla: p } : {}) }));

  // 4. Temas y secciones cuyo nombre coincida
  const nombres: ResultadoBusqueda[] = [
    ...TEMAS.map((t) => ({ tipo: "seccion" as const, titulo: t.nombre, detalle: "Tema", href: `/tema/${t.slug}/` })),
    ...SECCIONES.map((s) => ({ tipo: "seccion" as const, titulo: s.nombre, detalle: GRUPOS_SECCIONES.find((g) => g.id === s.grupo)?.titulo ?? "Sección", href: `/${s.carpeta}/` })),
  ];
  nombres.filter((r) => cuantas(norm(r.titulo), ws) === ws.length).slice(0, MAX_GRUPO.seccion).forEach((r) => out.push(r));
  return out;
}
