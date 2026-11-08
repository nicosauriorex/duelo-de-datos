// Catálogo: orden de categorías, búsqueda con sinónimos, indicadores de Curiosidades.
import { norm } from "./formato";
import type { Expr, Motor, Serie } from "./motor";

export const ORDEN_RAIZ = ["Salarios", "Precios", "Dólar y tipo de cambio", "Mercados", "Tasas de interés", "Dinero y bancos (BCRA)",
  "Actividad", "Empleo, pobreza e ingresos", "Sector externo", "Fiscal", "Opinión pública (UTDT)"];

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
export function textoBusqueda(s: Pick<Serie, "n" | "cat" | "desc" | "id"> & { busca?: string }): string {
  if (s.busca) return s.busca;
  const base = norm(s.n + " " + s.cat.join(" ") + " " + (s.desc || "") + " " + s.id);
  s.busca = base + " " + ALIAS.filter(([re]) => re.test(base)).map((a) => a[1]).join(" ");
  return s.busca;
}

export const grupoDe = (s: { cat: string[] }) => s.cat[1] && s.cat[0] !== "Salarios" ? `${s.cat[0]} › ${s.cat[1]}` : s.cat[0];
export function ordenarGrupos(grupos: string[]): string[] {
  return grupos.slice().sort((a, b) => ORDEN_RAIZ.indexOf(a.split(" › ")[0]) - ORDEN_RAIZ.indexOf(b.split(" › ")[0]) || (a.includes("›") ? 1 : 0) - (b.includes("›") ? 1 : 0));
}
export function medidaPara(s: Serie, med: string): string {
  if (s.tipo === "none" || s.tipo === "tasa") return "asis";
  if (s.tipo === "idx") return s.dir === 1 && med === "real" ? "real" : "corr";
  if (s.tipo === "ars") return med;
  if (s.tipo === "fx") return med.startsWith("usdr") ? "real" : med.startsWith("usd") ? "corr" : med;
  if (s.tipo === "usd") return med === "real" ? "real" : med === "corr" ? "arscorr" : med.startsWith("usdr") ? "usdr" : "corr";
  return "asis";
}

export interface Indic extends Expr { grupo: string; nombre: string }

export function crearIndicadores(m: Motor) {
  const X = (id: string, grupo: string, nombre?: string, extra: Partial<Expr> = {}): Indic | null =>
    m.SER[id] ? { id, grupo, nombre: nombre || m.SER[id].n, med: extra.med || m.medDefault(m.SER[id]), rel: null, modo: "compra", esc: "", ...extra } : null;
  const INDIC = [
    X("sipa_med", "Salarios", "Salario SIPA mediana (real)"), X("sipa_prom", "Salarios", "Salario SIPA promedio (real)"), X("ripte", "Salarios", "RIPTE (real)"),
    X("dg_149_1_tl_indiios_octu_0_21", "Salarios", "Índice de salarios INDEC, total (real)", { med: "real" }),
    X("dg_149_1_sor_priado_octu_0_28", "Salarios", "Salarios informales (real)", { med: "real" }),
    X("jub_min_bono", "Salarios", "Jubilación mínima con bono (real)"), X("smvm", "Salarios", "Salario mínimo (real)"),
    X("sipa_med", "Salarios", "Salario SIPA mediana en dólares blue", { med: "usdr_blue" }),
    X("pp_gba_asado", "Poder de compra", "Kg de asado por salario mediano", { rel: "sipa_med", med: "corr" }),
    X("can_cbt_h2", "Poder de compra", "Canastas de pobreza (hogar de 4) por salario mediano", { rel: "sipa_med", med: "corr" }),
    X("fx_blue", "Poder de compra", "Dólares blue por salario mediano", { rel: "sipa_med", med: "corr" }),
    X("inflacion", "Precios y dólar", "Inflación mensual"), X("fx_oficial", "Precios y dólar", "Dólar oficial (en pesos de hoy)", { med: "real" }),
    X("fx_blue", "Precios y dólar", "Dólar blue (en pesos de hoy)", { med: "real" }), X("brecha_blue", "Precios y dólar", "Brecha blue"),
    X("dg_143_3_no_pr_2004_a_31", "Actividad", "Actividad económica (EMAE)"), X("dg_3_2_ogp_d_2004_t_17", "Actividad", "PIB real"),
    X("dg_3_2_ogp_d_2004_t_17", "Actividad", "PIB real por habitante", { esc: "pc" }),
    X("dg_453_1_serie_deseada_0_0_24_58", "Actividad", "Producción industrial"), X("dg_33_2_isac_sin_edad_0_m_23_56", "Actividad", "Construcción (ISAC)"),
    X("dg_4_4_dgi_2004_t_19_pib", "Actividad", "Inversión (% del PIB)"),
    X("dg_42_3_eph_puntuatal_0_m_30", "Empleo y pobreza", "Desocupación"), X("dg_44_2_ectet_0_t_30", "Empleo y pobreza", "Tasa de empleo"),
    X("dg_52_2_asdj_0_0_37", "Empleo y pobreza", "Informalidad"), X("dg_151_1_aariadotac_2012_m_26", "Empleo y pobreza", "Empleo privado registrado"),
    X("pob_tasa_pobreza_personas", "Empleo y pobreza", "Pobreza"), X("pob_tasa_indigencia_personas", "Empleo y pobreza", "Indigencia"),
    X("bcra_1", "Externo y finanzas", "Reservas del BCRA (dólares de hoy)", { med: "usdr" }), X("riesgo", "Externo y finanzas", "Riesgo país"),
    X("dg_saldo_comercial", "Externo y finanzas", "Saldo comercial (% del PIB)", { esc: "pib" }),
    X("dg_160_2_tl_cuennte_0_t_22", "Externo y finanzas", "Cuenta corriente (% del PIB)", { esc: "pib" }),
    X("mk_merv", "Externo y finanzas", "Merval en dólares CCL", { med: "usdr_ccl" }),
    X("bcra_26", "Externo y finanzas", "Crédito al sector privado (% del PIB)", { esc: "pib" }),
    X("dg_379_9_superavit_017_23_94", "Fiscal", "Resultado primario (% del PIB)", { esc: "pib" }),
    X("dg_379_9_resultado_017_18_38", "Fiscal", "Resultado financiero (% del PIB)", { esc: "pib" }),
    X("bcra_cuasifiscal", "Fiscal", "Déficit cuasifiscal (% del PIB)", { esc: "pib" }),
  ].filter(Boolean) as Indic[];
  const series = Object.values(m.SER);
  const INDIC_IPC: Indic[] = series.filter((s) => s.cat[1] && s.cat[1].startsWith("IPC INDEC") && s.cat[2] === "Nacional" && s.cat.length === 4 && s.id !== "ipc_nacional")
    .map((s) => ({ id: s.id, grupo: "Precios del IPC (contra la inflación)", nombre: s.n.replace(/^IPC /, "").replace(" (Nacional)", "") + " (precio real)", med: "real", forzar: true, rel: null, esc: "" }));
  const INDIC_PP: Indic[] = series.filter((s) => s.id.startsWith("pp_gba_"))
    .map((s) => ({ id: s.id, grupo: "Productos (precio real, GBA)", nombre: s.n.replace(" (GBA)", "") + " (precio real)", med: "real", rel: null, esc: "" }));
  return { X, INDIC, INDIC_IPC, INDIC_PP, GRUPOS_IND: [...new Set(INDIC.map((i) => i.grupo))] };
}
