// Nombres públicos de las series: lo que lee la gente en el selector, los títulos, las tablas, las tarjetas y las imágenes.
// Se aplican una sola vez, al cargar el catálogo (`normalizarMeta` en motor.ts): el campo `n` pasa a ser el nombre público
// y el original queda en `nTecnico` (se ve en la ficha de información y la búsqueda lo encuentra). Las series que no están acá conservan su nombre.

export const NOMBRES: Record<string, string> = {
  sipa_med: "Salario mediano (trabajadores registrados)",
  sipa_prom: "Salario promedio (trabajadores registrados)",
  ripte: "Salario promedio de empleos estables (RIPTE)",
  smvm: "Salario mínimo",
  jub_min: "Jubilación mínima",
  jub_min_bono: "Jubilación mínima con bono",
  dg_149_1_tl_indiios_octu_0_21: "Índice de salarios (todos los trabajadores)",
  dg_149_1_sor_priado_octu_0_28: "Índice de salarios informales",
  can_cbt_h2: "Línea de pobreza (familia de 4)",
  can_cba_h2: "Línea de indigencia (familia de 4)",
  can_cbt: "Línea de pobreza (por adulto)",
  can_cba: "Línea de indigencia (por adulto)",
  ipc_empalme: "Inflación",
  fx_oficial: "Dólar oficial",
  dg_143_3_no_pr_2004_a_31: "Actividad económica (EMAE)",
  dg_3_2_ogp_d_2004_t_17: "PIB (producción total del país)",
  dg_453_1_serie_deseada_0_0_24_58: "Producción industrial",
  dg_33_2_isac_sin_edad_0_m_23_56: "Construcción",
  dg_52_2_asdj_0_0_37: "Trabajo informal (asalariados sin aportes)",
  dg_151_1_aariadotac_2012_m_26: "Empleo privado registrado",
  pob_tasa_pobreza_personas: "Pobreza",
  pob_tasa_indigencia_personas: "Indigencia",
  bcra_1: "Reservas del Banco Central",
  riesgo: "Riesgo país",
  dg_saldo_comercial: "Saldo comercial",
  dg_160_2_tl_cuennte_0_t_22: "Cuenta corriente",
  mk_merv: "Merval (bolsa argentina)",
  bcra_26: "Crédito al sector privado",
  dg_379_9_superavit_017_23_94: "Resultado fiscal primario",
  dg_379_9_resultado_017_18_38: "Resultado fiscal financiero",
  bcra_cuasifiscal: "Déficit cuasifiscal del Banco Central",
  bcra_12: "Tasa de plazo fijo",
  dg_380_3_icc_nacionnal_0_t_12: "Confianza del consumidor",
  dg_370_3_icg_nivel_ral_0_0_17_94: "Confianza en el gobierno",
  soja_ratio_oficial: "Brecha de la soja: Rosario contra Chicago (dólar oficial)",
  soja_ratio_blue: "Brecha de la soja: Rosario contra Chicago (dólar blue)",
  soja_ratio_mep: "Brecha de la soja: Rosario contra Chicago (dólar MEP)",
  soja_ratio_ccl: "Brecha de la soja: Rosario contra Chicago (dólar CCL)",
};

/** Nombres públicos de las categorías (`cat[1]`, y el grupo de las listas). El catálogo conserva el nombre técnico: sirve para agrupar y para leer los metadatos;
 *  solo lo que se muestra pasa por `catPublica`. */
export const CATS_PUBLICAS: Record<string, string> = {
  "IPC INDEC (índices, dic-2016 = 100)": "IPC por rubros",
};
export const catPublica = (c: string): string => CATS_PUBLICAS[c] ?? c;
/** Una ruta de categorías ya lista para mostrar. */
export const rutaPublica = (cat: string[]): string[] => cat.map(catPublica);

/** Palabras que la gente usa para buscar cada serie y que no están en su nombre (la búsqueda ya mira el nombre público, el técnico y la categoría). */
export const SINONIMOS: Record<string, string> = {
  sipa_med: "sueldo mediano sipa",
  sipa_prom: "sueldo promedio sipa",
  ripte: "sueldo remuneracion imponible",
  smvm: "salario minimo vital y movil sueldo minimo",
  jub_min: "haber minimo jubilados anses",
  jub_min_bono: "haber minimo jubilados anses bono",
  can_cbt_h2: "canasta basica total cbt pobres",
  can_cba_h2: "canasta basica alimentaria cba indigentes",
  can_cbt: "canasta basica total cbt pobres",
  can_cba: "canasta basica alimentaria cba indigentes",
  ipc_empalme: "ipc inflacion precios indice de precios al consumidor mensual interanual",
  dg_143_3_no_pr_2004_a_31: "emae actividad economia crecimiento",
  dg_3_2_ogp_d_2004_t_17: "pib producto bruto interno crecimiento",
  dg_52_2_asdj_0_0_37: "informalidad en negro sin descuento jubilatorio",
  dg_151_1_aariadotac_2012_m_26: "asalariados registrados sipa",
  bcra_1: "reservas internacionales bcra dolares",
  mk_merv: "merval acciones bolsa indice",
  bcra_26: "prestamos credito bancos",
  bcra_12: "plazo fijo tasa de interes ahorro",
  riesgo: "embi bonos",
};

// Los "regulados" del IPC (tarifas de servicios públicos, combustibles, transporte, educación…): se buscan también como "servicios públicos" y "tarifas", en todas las regiones.
for (const r of ["nacional", "gba", "cuyo", "noreste", "noroeste", "pampeana", "patagonia"]) SINONIMOS[`ipc_${r}_r_estaci`] = "servicios publicos tarifas";

/** Series que ya no se listan porque su entrada pública es otra: se siguen leyendo, y los links viejos se traducen a la entrada nueva. */
export const ALIAS_ID: Record<string, { id: string; med: string }> = {
  inflacion: { id: "ipc_empalme", med: "vm" },
  inflacion_ia: { id: "ipc_empalme", med: "via" },
};
export const esOculta = (id: string): boolean => id in ALIAS_ID;
