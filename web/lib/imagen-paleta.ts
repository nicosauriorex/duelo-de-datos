// Lee los colores de la marca (tokens de globals.css) en su versión oscura, sea cual sea el tema del usuario.
// La clase `.fijo-oscuro` vuelve a declarar los tokens oscuros: un elemento con esa clase los ve siempre así.
import { PRES_DEF } from "./estadisticas";
import { PALETA } from "@/components/util";
import type { Paleta } from "./imagen";

/** La paleta a partir de una función que da el valor de cada token (`--surface-0` → "#0a1230"). La usan la página (tokens leídos del DOM)
 *  y el script de las vistas previas (tokens leídos de globals.css): los colores salen siempre de los mismos tokens. */
export function paletaDe(t: (token: string) => string, familia: string, colPres: Record<string, string>): Paleta {
  const pres: Record<string, string> = {};
  PRES_DEF.forEach((p) => { pres[p.id] = colPres[p.id] ?? t(p.color); });   // el color elegido por el usuario manda
  return {
    familia,
    fondo: t("--surface-0"), superficie: t("--surface-1"), barra: t("--barra"), sobreBarra: t("--sobre-barra"), borde: t("--border"),
    tinta: t("--text-primary"), tintaSec: t("--text-secondary"), tintaTenue: t("--text-muted"), grilla: t("--grid"), eje: t("--axis"),
    acento: t("--acento"), sobreAcento: t("--sobre-acento"), accion: t("--accion"), bueno: t("--bueno"), malo: t("--malo"),
    series: PALETA.map(t), pres,
    fondosBueno: [1, 2, 3, 4].map((n) => t(`--bueno-f${n}`)), fondosMalo: [1, 2, 3, 4].map((n) => t(`--malo-f${n}`)),
    sobreBueno: [1, 2, 3, 4].map((n) => t(`--sobre-bueno-${n}`)), sobreMalo: [1, 2, 3, 4].map((n) => t(`--sobre-malo-${n}`)),
  };
}

export function leerPaleta(colPres: Record<string, string>): Paleta {
  const el = document.createElement("div");
  el.className = "fijo-oscuro";
  el.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(el);
  try {
    const cs = getComputedStyle(el);
    return paletaDe((n) => cs.getPropertyValue(n).trim(), getComputedStyle(document.body).fontFamily || "Arial, sans-serif", colPres);
  } finally { el.remove(); }
}
