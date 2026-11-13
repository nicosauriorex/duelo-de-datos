// Fuentes del catálogo en palabras del público: para imágenes y vistas previas, que no tienen botones ni detalle.
// El texto completo (con número de serie o variable) se sigue mostrando en el detalle de la serie y en /fuentes/.

export const SITIO_FUENTES = "primerolosdatos.com.ar/fuentes";

/** La fuente sin agregados técnicos: "INDEC, API ipc_nacional" → "INDEC"; "INDEC vía datos.gob.ar, serie 3.2_OGP…" → "INDEC vía datos.gob.ar";
 *  "BCRA, API de estadísticas (variable 1)" → "BCRA". "ver Fuentes" pasa a la dirección de la página de fuentes. */
export function fuentePublica(f: string): string {
  if (/^ver fuentes$/i.test(f.trim())) return `ver ${SITIO_FUENTES}`;
  return f
    .replace(/,\s*API\b[^;]*/g, "")                       // ", API ipc_nacional", ", API de estadísticas (variable 1)", ", API (variables …)"
    .replace(/,\s*serie\s+[^\s,;)]+/g, "")                // ", serie 3.2_OGP_D_2004_T_17"
    .replace(/\s*\([\w.]*_[\w.]*\)/g, "")                 // "(4.4_OGP_2004_T_17)"
    .replace(/\s+/g, " ").trim();
}

/** Solo el organismo de una fuente ("INDEC", "BCRA", "Secretaría de Trabajo"); vacío si la fuente es un portal, un cálculo o un enlace
 *  ("datos.gob.ar, serie …", "cálculo propio", "ver Fuentes"): esas no se nombran. Mira solo la primera fuente si hay varias separadas por ";". */
export function organismoDe(fuente: string): string {
  const inst = fuente.split(";")[0].trim().replace(/^Cálculo propio con /i, "");   // "Cálculo propio con Bolsa de Comercio…" → "Bolsa de Comercio…"
  if (!/^[A-ZÁÉÍÓÚÑ]/.test(inst)) return "";
  return inst.replace(/\s*(\(| vía |,| - | – ).*$/, "").replace(/^Sec\. de /, "Secretaría de ").trim();
}
