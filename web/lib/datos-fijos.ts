// Datos fijos: los que tienen página propia en /dato/<slug>/ (con título, descripción e imagen para la vista previa de los links en redes).
// Son los principales de cada tema (`TEMAS` en temas.ts) y las cuatro placas de la portada (`PLACAS`, que usa Inicio.tsx), sin repetir.
// Ver docs/specs/vista-previa-links.md.
//
// Reglas de los slugs (se escriben a mano, no se derivan del nombre):
// - Un slug nunca cambia de significado: un link compartido tiene que seguir mostrando el mismo dato.
// - Si un dato se retira, su slug pasa a SLUGS_RETIRADOS y no se vuelve a usar.
// - La variable va completa (id, medida, relación, escala): `hrefDato` da la URL fija solo cuando la variable es exactamente esta.
//   `npm run previas` avisa si un principal de los temas o una placa no tiene su dato fijo, o si la medida no coincide.
import type { Expr } from "./motor";

export interface DatoFijo { slug: string; e: Expr }

const ex = (id: string, med: string, extra: Partial<Expr> = {}): Expr => ({ id, med, rel: null, modo: "compra", esc: "", ...extra });

/** Las variables de las cuatro placas de la portada (única definición: la usa `CIFRAS` en Inicio.tsx). */
export const PLACAS = {
  inflacion: ex("ipc_empalme", "vm"),
  salario: ex("sipa_med", "real"),
  actividad: ex("dg_143_3_no_pr_2004_a_31", "via"),
  actividadNivel: ex("dg_143_3_no_pr_2004_a_31", "asis"),   // la placa la muestra si no hay dato interanual
  dolarBlue: ex("fx_blue", "real"),
} as const;

export const DATOS_FIJOS: DatoFijo[] = [
  // Precios e inflación
  { slug: "inflacion-mensual", e: PLACAS.inflacion },
  { slug: "inflacion-interanual", e: ex("ipc_empalme", "via") },
  // Salarios y jubilaciones
  { slug: "salario-mediano-real", e: PLACAS.salario },
  { slug: "salario-minimo-real", e: ex("smvm", "real") },
  { slug: "jubilacion-minima-real", e: ex("jub_min_bono", "real") },
  { slug: "indice-de-salarios-real", e: ex("dg_149_1_tl_indiios_octu_0_21", "real") },
  // Dólar
  { slug: "dolar-blue", e: PLACAS.dolarBlue },
  { slug: "dolar-oficial", e: ex("fx_oficial", "real") },
  { slug: "brecha-blue", e: ex("brecha_blue", "asis") },
  // Actividad económica
  { slug: "actividad-economica", e: PLACAS.actividadNivel },
  { slug: "actividad-economica-interanual", e: PLACAS.actividad },
  { slug: "pib", e: ex("dg_3_2_ogp_d_2004_t_17", "asis") },
  { slug: "pib-por-habitante", e: ex("dg_3_2_ogp_d_2004_t_17", "asis", { esc: "pc" }) },
  { slug: "produccion-industrial", e: ex("dg_453_1_serie_deseada_0_0_24_58", "asis") },
  // Empleo y pobreza
  { slug: "desocupacion", e: ex("dg_42_3_eph_puntuatal_0_m_30", "asis") },
  { slug: "pobreza", e: ex("pob_tasa_pobreza_personas", "asis") },
  { slug: "indigencia", e: ex("pob_tasa_indigencia_personas", "asis") },
  { slug: "empleo-privado-registrado", e: ex("dg_151_1_aariadotac_2012_m_26", "asis") },
  // Comercio exterior
  { slug: "saldo-comercial", e: ex("dg_saldo_comercial", "corr", { esc: "pib" }) },
  { slug: "cuenta-corriente", e: ex("dg_160_2_tl_cuennte_0_t_22", "corr", { esc: "pib" }) },
  { slug: "exportaciones", e: ex("dg_74_3_iet_0_m_16", "corr") },
  // Cuentas públicas
  { slug: "resultado-fiscal-primario", e: ex("dg_379_9_superavit_017_23_94", "real", { esc: "pib" }) },
  { slug: "resultado-fiscal-financiero", e: ex("dg_379_9_resultado_017_18_38", "real", { esc: "pib" }) },
  // Dinero, tasas y mercados
  { slug: "reservas", e: ex("bcra_1", "usdr") },
  { slug: "riesgo-pais", e: ex("riesgo", "asis") },
  { slug: "tasa-plazo-fijo-real", e: ex("bcra_12", "real_a") },
  // Opinión pública
  { slug: "confianza-del-consumidor", e: ex("dg_380_3_icc_nacionnal_0_t_12", "asis") },
  { slug: "confianza-en-el-gobierno", e: ex("dg_370_3_icg_nivel_ral_0_0_17_94", "asis") },
];

/** Slugs que ya no se usan: no se reutilizan nunca (un link viejo no puede pasar a mostrar otro dato). */
export const SLUGS_RETIRADOS: string[] = [];

/** ¿Es exactamente la misma variable? (id, medida, relación, modo y escala; vacío y ausente cuentan igual). */
export const mismaVariable = (a: Expr, b: Expr): boolean =>
  a.id === b.id && (a.med ?? "") === (b.med ?? "") && (a.rel ?? "") === (b.rel ?? "") && (a.modo || "compra") === (b.modo || "compra") && (a.esc ?? "") === (b.esc ?? "");

/** El dato fijo de una variable, si lo es. */
export const datoFijoDe = (e: Expr): DatoFijo | null => DATOS_FIJOS.find((d) => mismaVariable(d.e, e)) ?? null;
export const datoFijoPorSlug = (slug: string): DatoFijo | null => DATOS_FIJOS.find((d) => d.slug === slug) ?? null;

/** Dirección de la página fija de un dato, con parámetros opcionales (presidente resaltado, vista, inicio de mandato). */
export const hrefFijo = (slug: string, extra: Record<string, string> = {}): string => {
  const q = new URLSearchParams(extra).toString();
  return `/dato/${slug}/${q ? "?" + q : ""}`;
};
