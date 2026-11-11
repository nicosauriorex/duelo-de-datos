// Temas de la portada y de /tema/<slug>/: se definen acá, en un solo lugar.
// Cada tema junta categorías del catálogo (`cat[0]`), tiene indicadores principales y los grupos de plantillas que le corresponden.
import { INFO_CAT, INFO_CORTA } from "./info";
import { medDefaultDe, type Expr, type SerieMeta } from "./motor";
import { esIndicadorIpc } from "./regiones";
import { rutaPublica } from "./nombres";
import { encExpr } from "./url";

interface DefPrincipal { id: string; nombre: string; corto: string; med?: string; esc?: string }
export interface Principal extends Expr { nombre: string; corto: string }
export interface Tema {
  slug: string; nombre: string; cats: string[];
  corto: string;              // texto corto (de INFO_CORTA)
  largo: string;              // texto largo (de INFO_CAT), HTML
  principales: DefPrincipal[];
  grupos: string[];           // grupos de plantillas
  porCat?: boolean;           // además, la plantilla tiene que ser de una categoría del tema
  q: string;                  // búsqueda para "Ver todas" en /plantillas/
  desc: string;               // descripción para buscadores
}

const largoDe = (...cats: string[]) => cats.map((c) => INFO_CAT[c]).filter(Boolean).join("<br><br>");

export const TEMAS: Tema[] = [
  { slug: "precios", nombre: "Precios e inflación", cats: ["Precios"], corto: INFO_CORTA["Precios"].texto, largo: largoDe("Precios"),
    principales: [
      { id: "ipc_empalme", nombre: "Inflación mensual", corto: "la inflación", med: "vm" },
      { id: "ipc_empalme", nombre: "Inflación interanual", corto: "la inflación interanual", med: "via" },
    ], grupos: ["Precios contra la inflación"], q: "inflación", desc: "Inflación mensual e interanual, índices por rubro y región, y precio de productos concretos en Argentina." },
  { slug: "salarios", nombre: "Salarios y jubilaciones", cats: ["Salarios"], corto: INFO_CORTA["Salarios"].texto, largo: largoDe("Salarios"),
    principales: [
      { id: "sipa_med", nombre: "Salario mediano real (trabajadores registrados)", corto: "el salario real" },
      { id: "smvm", nombre: "Salario mínimo real", corto: "el salario mínimo real" },
      { id: "jub_min_bono", nombre: "Jubilación mínima con bono real", corto: "la jubilación mínima" },
      { id: "dg_149_1_tl_indiios_octu_0_21", nombre: "Índice de salarios real (todos los trabajadores)", corto: "el índice de salarios", med: "real" },
    ], grupos: ["Salarios", "Poder de compra"], q: "salario", desc: "Salarios registrados, salario mínimo, jubilación mínima y su poder de compra, con datos oficiales." },
  { slug: "dolar", nombre: "Dólar", cats: ["Dólar y tipo de cambio"], corto: INFO_CORTA["Dólar y tipo de cambio"].texto, largo: largoDe("Dólar y tipo de cambio"),
    principales: [
      { id: "fx_blue", nombre: "Dólar blue (en pesos de hoy)", corto: "el dólar blue", med: "real" },
      { id: "fx_oficial", nombre: "Dólar oficial (en pesos de hoy)", corto: "el dólar oficial", med: "real" },
      { id: "brecha_blue", nombre: "Brecha blue", corto: "la brecha blue" },
    ], grupos: ["Dólar y mercados"], porCat: true, q: "dólar", desc: "Dólar oficial, blue, MEP y CCL, y la brecha entre ellos, en pesos de hoy y en dólares." },
  { slug: "actividad", nombre: "Actividad económica", cats: ["Actividad"], corto: INFO_CORTA["Actividad"].texto, largo: largoDe("Actividad"),
    principales: [
      { id: "dg_143_3_no_pr_2004_a_31", nombre: "Actividad económica (EMAE)", corto: "la actividad económica" },
      { id: "dg_3_2_ogp_d_2004_t_17", nombre: "PIB (producción total del país)", corto: "el PIB" },
      { id: "dg_3_2_ogp_d_2004_t_17", nombre: "PIB por habitante", corto: "el PIB por habitante", esc: "pc" },
      { id: "dg_453_1_serie_deseada_0_0_24_58", nombre: "Producción industrial", corto: "la producción industrial" },
    ], grupos: ["Actividad"], q: "actividad", desc: "Actividad económica mensual (EMAE), PIB, producción industrial y construcción de Argentina." },
  { slug: "empleo", nombre: "Empleo y pobreza", cats: ["Empleo, pobreza e ingresos"], corto: INFO_CORTA["Empleo, pobreza e ingresos"].texto, largo: largoDe("Empleo, pobreza e ingresos"),
    principales: [
      { id: "dg_42_3_eph_puntuatal_0_m_30", nombre: "Desocupación", corto: "la desocupación" },
      { id: "pob_tasa_pobreza_personas", nombre: "Pobreza", corto: "la pobreza" },
      { id: "pob_tasa_indigencia_personas", nombre: "Indigencia", corto: "la indigencia" },
      { id: "dg_151_1_aariadotac_2012_m_26", nombre: "Empleo privado registrado", corto: "el empleo privado registrado" },
    ], grupos: ["Empleo y pobreza"], q: "empleo", desc: "Desocupación, empleo, informalidad, pobreza e indigencia en Argentina." },
  { slug: "externo", nombre: "Comercio exterior", cats: ["Sector externo"], corto: INFO_CORTA["Sector externo"].texto, largo: largoDe("Sector externo"),
    principales: [
      { id: "dg_saldo_comercial", nombre: "Saldo comercial (% del PIB)", corto: "el saldo comercial", esc: "pib" },
      { id: "dg_160_2_tl_cuennte_0_t_22", nombre: "Cuenta corriente (% del PIB)", corto: "la cuenta corriente", esc: "pib" },
      { id: "dg_74_3_iet_0_m_16", nombre: "Exportaciones de bienes", corto: "las exportaciones" },
    ], grupos: ["Sector externo"], q: "externo", desc: "Exportaciones, importaciones, saldo comercial, cuenta corriente y soja." },
  { slug: "fiscal", nombre: "Cuentas públicas", cats: ["Fiscal"], corto: INFO_CORTA["Fiscal"].texto, largo: largoDe("Fiscal"),
    principales: [
      { id: "dg_379_9_superavit_017_23_94", nombre: "Resultado fiscal primario (% del PIB)", corto: "el resultado primario", esc: "pib" },
      { id: "dg_379_9_resultado_017_18_38", nombre: "Resultado fiscal financiero (% del PIB)", corto: "el resultado financiero", esc: "pib" },
    ], grupos: ["Fiscal"], q: "fiscal", desc: "Resultado primario y financiero del sector público nacional, ingresos y gastos." },
  { slug: "finanzas", nombre: "Dinero, tasas y mercados", cats: ["Dinero y bancos (BCRA)", "Tasas de interés", "Mercados"],
    corto: "Reservas, tasas de interés y riesgo país: cómo están el dinero y los mercados.", largo: largoDe("Dinero y bancos (BCRA)", "Tasas de interés", "Mercados"),
    principales: [
      { id: "bcra_1", nombre: "Reservas del Banco Central (dólares de hoy)", corto: "las reservas", med: "usdr" },
      { id: "riesgo", nombre: "Riesgo país", corto: "el riesgo país" },
      { id: "bcra_12", nombre: "Tasa de plazo fijo (real anual)", corto: "la tasa de plazo fijo", med: "real_a" },
    ], grupos: ["Dólar y mercados"], porCat: true, q: "mercados", desc: "Reservas del Banco Central, tasas de interés, riesgo país, depósitos y préstamos." },
  { slug: "opinion", nombre: "Opinión pública", cats: ["Opinión pública (UTDT)"], corto: INFO_CORTA["Opinión pública (UTDT)"].texto, largo: largoDe("Opinión pública (UTDT)"),
    principales: [
      { id: "dg_380_3_icc_nacionnal_0_t_12", nombre: "Confianza del consumidor", corto: "la confianza del consumidor" },
      { id: "dg_370_3_icg_nivel_ral_0_0_17_94", nombre: "Confianza en el gobierno", corto: "la confianza en el gobierno" },
    ], grupos: [], porCat: true, q: "confianza", desc: "Confianza del consumidor y confianza en el gobierno (Universidad Di Tella)." },
];

export const temaPorSlug = (slug: string): Tema | undefined => TEMAS.find((t) => t.slug === slug);

/** Principales que existen en el catálogo (los que no, se omiten). */
export function principalesDe(t: Tema, S: Record<string, SerieMeta>): Principal[] {
  return t.principales.filter((p) => S[p.id]).map((p) => ({
    id: p.id, nombre: p.nombre, corto: p.corto, med: p.med ?? medDefaultDe(S[p.id]), rel: null, modo: "compra", esc: p.esc ?? "",
  }));
}
export const todosLosPrincipales = (S: Record<string, SerieMeta>): Principal[] => TEMAS.flatMap((t) => principalesDe(t, S));
/** Series cuyos datos hacen falta para mostrar un principal. */
export const idsDe = (e: Expr): string[] => [e.id, ...(e.rel ? [e.rel] : [])];

export const seriesDe = (t: Tema, metas: SerieMeta[]): SerieMeta[] => metas.filter((s) => t.cats.includes(s.cat[0]));
/** Subgrupo dentro del tema (`cat[1]` con su nombre público; con varias categorías se antepone la categoría). Sin subgrupo: "Generales".
 *  Bienes, Servicios, Estacional, Núcleo y Regulados van con los indicadores de inflación. */
export const subgrupoDe = (t: Tema, s: SerieMeta): string => {
  const c = esIndicadorIpc(s.id) ? [s.cat[0], "Indicadores de inflación"] : rutaPublica(s.cat);
  return t.cats.length > 1 ? (c[1] ? `${c[0]} › ${c[1]}` : c[0]) : c[1] ?? "Generales";
};

/** Link a Histórico con una variable (medida ya elegida). */
export const hrefHistorico = (e: Expr, extra: Record<string, string> = {}): string =>
  `/historico/?${new URLSearchParams({ v: encExpr(e), ...extra }).toString()}`;
