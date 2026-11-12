// Catálogo: orden de categorías, búsqueda con sinónimos, indicadores de Curiosidades.
import { norm } from "./formato";
import { medDefaultDe, type Expr, type Motor, type Serie, type SerieMeta } from "./motor";
import { NOMBRES, SINONIMOS, catPublica, esOculta, rutaPublica } from "./nombres";
import { colapsarRegiones } from "./regiones";

export const ORDEN_RAIZ = ["Salarios", "Precios", "Dólar y tipo de cambio", "Mercados", "Tasas de interés", "Dinero y bancos (BCRA)",
  "Actividad", "Empleo, pobreza e ingresos", "Sector externo", "Fiscal", "Opinión pública (UTDT)", "Contexto internacional"];

// Sinónimos coloquiales para la búsqueda
const ALIAS: [RegExp, string][] = [
  [/prendas|calzado|vestir/, "ropa vestimenta zapatillas zapatos indumentaria"], [/electricidad/, "luz energia tarifas"], [/gas/, "tarifas garrafa"],
  [/combustible/, "nafta gasoil"], [/transporte publico/, "colectivo tren subte boleto"], [/medicinal|salud/, "remedios medicamentos farmacia"],
  [/prepaga/, "obra social medicina"], [/telefonia|comunicacion/, "celular internet"], [/alimentos/, "comida supermercado"],
  [/alquiler/, "renta vivienda inquilino"], [/restaurantes/, "comer afuera delivery"], [/educacion/, "colegio escuela universidad cuotas"],
  [/sipa|ripte|salario|jubilacion/, "sueldo ingreso"], [/fx_|dolar/, "dolar divisa cambio"], [/riesgo/, "embi bonos"],
  [/reservas/, "bcra dolares"], [/pobreza|indigencia/, "pobres"], [/emae|pib/, "crecimiento actividad economia"],
  [/desocupacion/, "desempleo paro"], [/recaudacion/, "impuestos afip arca"], [/resultado/, "deficit superavit fiscal"],
  [/carnes|asado|nalga|cuadril|paleta|picada/, "carne vaca vacio"], [/bebidas alcoholicas/, "vino cerveza alcohol"], [/tabaco/, "cigarrillos"],
];
/** Texto en el que se busca una serie: nombre público, nombre técnico, categoría, descripción, id y sinónimos. */
export function textoBusqueda(s: Pick<Serie, "n" | "cat" | "desc" | "id"> & { busca?: string; nTecnico?: string }): string {
  if (s.busca) return s.busca;
  const base = norm(s.n + " " + (s.nTecnico || "") + " " + s.cat.join(" ") + " " + rutaPublica(s.cat).join(" ") + " " + (s.desc || "") + " " + s.id);
  s.busca = base + " " + ALIAS.filter(([re]) => re.test(base)).map((a) => a[1]).join(" ") + " " + (SINONIMOS[s.id] || "");
  return s.busca;
}

export const grupoDe = (s: { cat: string[] }) => s.cat[1] && s.cat[0] !== "Salarios" ? `${s.cat[0]} › ${catPublica(s.cat[1])}` : s.cat[0];
export function ordenarGrupos(grupos: string[]): string[] {
  return grupos.slice().sort((a, b) => ORDEN_RAIZ.indexOf(a.split(" › ")[0]) - ORDEN_RAIZ.indexOf(b.split(" › ")[0]) || (a.includes("›") ? 1 : 0) - (b.includes("›") ? 1 : 0));
}

export interface Indic extends Expr { grupo: string; nombre: string }

/** Nombre que tenía cada indicador antes de los nombres públicos. El id de la plantilla (`pl=` en los links) se arma con ese nombre: no cambia. */
export const NOMBRE_LEGADO: Record<string, string> = {
  "Salario mediano (trabajadores registrados), real": "Salario SIPA mediana (real)",
  "Salario promedio (trabajadores registrados), real": "Salario SIPA promedio (real)",
  "Salario promedio de empleos estables (RIPTE), real": "RIPTE (real)",
  "Índice de salarios (todos los trabajadores), real": "Índice de salarios INDEC, total (real)",
  "Índice de salarios informales, real": "Salarios informales (real)",
  "Jubilación mínima con bono, real": "Jubilación mínima con bono (real)",
  "Salario mínimo, real": "Salario mínimo (real)",
  "Salario mediano (trabajadores registrados) en dólares blue": "Salario SIPA mediana en dólares blue",
  "Líneas de pobreza (familia de 4) por salario mediano": "Canastas de pobreza (hogar de 4) por salario mediano",
  "Dólar oficial (en pesos de hoy)": "Dólar oficial (en pesos de hoy)",
  "PIB (producción total del país)": "PIB real",
  "PIB por habitante": "PIB real por habitante",
  "Construcción": "Construcción (ISAC)",
  "Trabajo informal (asalariados sin aportes)": "Informalidad",
  "Reservas del Banco Central (dólares de hoy)": "Reservas del BCRA (dólares de hoy)",
  "Saldo comercial (% del PIB)": "Saldo comercial (% del PIB)",
  "Merval (bolsa argentina) en dólares CCL": "Merval en dólares CCL",
  "Resultado fiscal primario (% del PIB)": "Resultado primario (% del PIB)",
  "Resultado fiscal financiero (% del PIB)": "Resultado financiero (% del PIB)",
  "Déficit cuasifiscal del Banco Central (% del PIB)": "Déficit cuasifiscal (% del PIB)",
};

/** Indicadores principales. Funciona con los metadatos del catálogo (no hace falta tener los datos cargados). */
export function crearIndicadores(m: Motor) { return crearIndicadoresDe(m.SER); }
export function crearIndicadoresDe(SER: Record<string, SerieMeta>) {
  const X = (id: string, grupo: string, nombre?: string, extra: Partial<Expr> = {}): Indic | null =>
    SER[id] ? { id, grupo, nombre: nombre || SER[id].n, med: extra.med || medDefaultDe(SER[id]), rel: null, modo: "compra", esc: "", ...extra } : null;
  const N = (id: string) => NOMBRES[id];
  const INDIC = [
    X("sipa_med", "Salarios", `${N("sipa_med")}, real`), X("sipa_prom", "Salarios", `${N("sipa_prom")}, real`), X("ripte", "Salarios", `${N("ripte")}, real`),
    X("dg_149_1_tl_indiios_octu_0_21", "Salarios", `${N("dg_149_1_tl_indiios_octu_0_21")}, real`, { med: "real" }),
    X("dg_149_1_sor_priado_octu_0_28", "Salarios", `${N("dg_149_1_sor_priado_octu_0_28")}, real`, { med: "real" }),
    X("jub_min_bono", "Salarios", `${N("jub_min_bono")}, real`), X("smvm", "Salarios", `${N("smvm")}, real`),
    X("sipa_med", "Salarios", `${N("sipa_med")} en dólares blue`, { med: "usdr_blue" }),
    X("pp_gba_asado", "Poder de compra", "Kg de asado por salario mediano", { rel: "sipa_med", med: "corr" }),
    X("can_cbt_h2", "Poder de compra", "Líneas de pobreza (familia de 4) por salario mediano", { rel: "sipa_med", med: "corr" }),
    X("fx_blue", "Poder de compra", "Dólares blue por salario mediano", { rel: "sipa_med", med: "corr" }),
    X("ipc_empalme", "Precios y dólar", "Inflación mensual", { med: "vm" }), X("fx_oficial", "Precios y dólar", `${N("fx_oficial")} (en pesos de hoy)`, { med: "real" }),
    X("fx_blue", "Precios y dólar", "Dólar blue (en pesos de hoy)", { med: "real" }), X("brecha_blue", "Precios y dólar", "Brecha blue"),
    X("dg_143_3_no_pr_2004_a_31", "Actividad", N("dg_143_3_no_pr_2004_a_31")), X("dg_3_2_ogp_d_2004_t_17", "Actividad", `${N("dg_3_2_ogp_d_2004_t_17")}`),
    X("dg_3_2_ogp_d_2004_t_17", "Actividad", "PIB por habitante", { esc: "pc" }),
    X("dg_453_1_serie_deseada_0_0_24_58", "Actividad", N("dg_453_1_serie_deseada_0_0_24_58")), X("dg_33_2_isac_sin_edad_0_m_23_56", "Actividad", N("dg_33_2_isac_sin_edad_0_m_23_56")),
    X("dg_4_4_dgi_2004_t_19_pib", "Actividad", "Inversión (% del PIB)"),
    X("dg_42_3_eph_puntuatal_0_m_30", "Empleo y pobreza", "Desocupación"), X("dg_44_2_ectet_0_t_30", "Empleo y pobreza", "Tasa de empleo"),
    X("dg_52_2_asdj_0_0_37", "Empleo y pobreza", N("dg_52_2_asdj_0_0_37")), X("dg_151_1_aariadotac_2012_m_26", "Empleo y pobreza", N("dg_151_1_aariadotac_2012_m_26")),
    X("pob_tasa_pobreza_personas", "Empleo y pobreza", "Pobreza"), X("pob_tasa_indigencia_personas", "Empleo y pobreza", "Indigencia"),
    X("bcra_1", "Externo y finanzas", `${N("bcra_1")} (dólares de hoy)`, { med: "usdr" }), X("riesgo", "Externo y finanzas", "Riesgo país"),
    X("dg_saldo_comercial", "Externo y finanzas", `${N("dg_saldo_comercial")} (% del PIB)`, { esc: "pib" }),
    X("dg_160_2_tl_cuennte_0_t_22", "Externo y finanzas", `${N("dg_160_2_tl_cuennte_0_t_22")} (% del PIB)`, { esc: "pib" }),
    X("mk_merv", "Externo y finanzas", `${N("mk_merv")} en dólares CCL`, { med: "usdr_ccl" }),
    X("bcra_26", "Externo y finanzas", `${N("bcra_26")} (% del PIB)`, { esc: "pib" }),
    X("dg_379_9_superavit_017_23_94", "Fiscal", `${N("dg_379_9_superavit_017_23_94")} (% del PIB)`, { esc: "pib" }),
    X("dg_379_9_resultado_017_18_38", "Fiscal", `${N("dg_379_9_resultado_017_18_38")} (% del PIB)`, { esc: "pib" }),
    X("bcra_cuasifiscal", "Fiscal", `${N("bcra_cuasifiscal")} (% del PIB)`, { esc: "pib" }),
  ].filter(Boolean) as Indic[];
  const series = Object.values(SER);
  const INDIC_IPC: Indic[] = series.filter((s) => s.cat[1] && s.cat[1].startsWith("IPC INDEC") && s.cat[2] === "Nacional" && s.cat.length === 4 && s.id !== "ipc_nacional")
    .map((s) => ({ id: s.id, grupo: "Precios del IPC (contra la inflación)", nombre: s.n.replace(/^IPC /, "").replace(" (Nacional)", "") + " (precio real)", med: "real", forzar: true, rel: null, esc: "" }));
  const INDIC_PP: Indic[] = series.filter((s) => s.id.startsWith("pp_gba_"))
    .map((s) => ({ id: s.id, grupo: "Productos (precio real, GBA)", nombre: s.n.replace(" (GBA)", "") + " (precio real)", med: "real", rel: null, esc: "" }));
  return { X, INDIC, INDIC_IPC, INDIC_PP, GRUPOS_IND: [...new Set(INDIC.map((i) => i.grupo))] };
}

// Palabras que no nombran un dato: vacías del español, valoraciones y relleno de las frases que se copian de las redes.
const PALABRAS_VACIAS = new Set((
  "el la los las lo un una unos unas de del al en con sin sobre entre por para a y e o u ni que cual cuales quien cuanto cuanta cuantos cuantas " +
  "como cuando donde porque se me te nos su sus mi mis tu tus este esta estos estas ese esa eso esto mas menos muy tan tanto ya aun todo toda todos todas " +
  "fue fueron es son era eran ser sera hay hubo ha han he esta estan estuvo tiene tienen tuvo sigue desde hasta durante segun " +
  "peor peores mejor mejores mayor mayores menor menores alto alta altos altas bajo baja bajos bajas historia historico historica historicos record " +
  "gobierno presidente pais argentina argentino argentinos hoy ahora actual actualmente subio subieron sube suben bajaron aumento aumentaron aumenta " +
  "cayo cayeron cae caen nunca siempre veces vez algo mucho poco demasiado verdad dicen"
).split(" "));

/** Plurales simples: "salarios" → "salario", "jubilaciones" → "jubilacion", "dolares" → "dolar". Solo con 5 letras o más y siempre se
 *  queda un prefijo de la palabra original (con "es" solo tras l, n, r, d), así que nunca encuentra menos que la palabra escrita. */
const singular = (w: string): string => {
  if (w.length < 5 || !w.endsWith("s")) return w;
  if (/[lnrd]es$/.test(w) && w.length >= 6) return w.slice(0, -2);
  return /[aeiou]s$/.test(w) ? w.slice(0, -1) : w;
};

/** Palabras que cuentan al buscar: normalizadas, sin vacías ni valoraciones, con plurales reducidos. Si no queda ninguna, las originales. */
export function palabrasBusqueda(q: string): string[] {
  const todas = norm(q).split(/[^a-z0-9ñ]+/).filter(Boolean);
  const utiles = todas.filter((w) => !PALABRAS_VACIAS.has(w));
  return [...new Set((utiles.length ? utiles : todas).map(singular))];
}

/** Busca series por texto (sin tildes, con sinónimos, ignorando palabras de relleno): primero las que tienen todas las palabras;
 *  si no hay ninguna y se escribieron varias, las que tienen al menos una (más palabras primero). Primero las que tienen la palabra en el nombre. */
export function buscarSeries(metas: SerieMeta[], q: string, max: number): SerieMeta[] {
  const toks = palabrasBusqueda(q);
  if (!toks.length) return [];
  const filas = metas.filter((s) => !esOculta(s.id)).map((s) => {
    const t = textoBusqueda(s as SerieMeta & { busca?: string }), nombre = norm(s.n + " " + (s.nTecnico || ""));   // el nombre técnico también cuenta como "en el nombre"
    return {
      s, n: toks.filter((k) => t.includes(k)).length,
      puntaje: toks.reduce((a, k) => a + (nombre.includes(k) ? 2 : 0) + (nombre.startsWith(k) ? 1 : 0) + (SINONIMOS[s.id]?.includes(k) ? 2 : 0), 0),   // un sinónimo explícito pesa como el nombre
    };
  });
  let res = filas.filter((f) => f.n === toks.length);
  if (!res.length && toks.length > 1) res = filas.filter((f) => f.n > 0);
  // cada rubro o producto una sola vez (la región se elige después); con "patagonia" sale la versión de Patagonia
  return colapsarRegiones(res.sort((a, b) => b.n - a.n || b.puntaje - a.puntaje || a.s.n.length - b.s.n.length).map((f) => f.s), metas).slice(0, max);
}
