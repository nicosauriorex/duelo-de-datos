// Lee los colores de la marca (tokens de globals.css) en su versión oscura, sea cual sea el tema del usuario.
// La clase `.fijo-oscuro` vuelve a declarar los tokens oscuros: un elemento con esa clase los ve siempre así.
import { PRES_DEF } from "./estadisticas";
import { PALETA } from "@/components/util";
import type { Paleta } from "./imagen";

export function leerPaleta(colPres: Record<string, string>): Paleta {
  const el = document.createElement("div");
  el.className = "fijo-oscuro";
  el.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(el);
  try {
    const cs = getComputedStyle(el);
    const t = (n: string) => cs.getPropertyValue(n).trim();
    const pres: Record<string, string> = {};
    PRES_DEF.forEach((p) => { pres[p.id] = colPres[p.id] ?? t(p.color); });   // el color elegido por el usuario manda
    return {
      familia: getComputedStyle(document.body).fontFamily || "Arial, sans-serif",
      fondo: t("--surface-0"), superficie: t("--surface-1"), barra: t("--barra"), sobreBarra: t("--sobre-barra"), borde: t("--border"),
      tinta: t("--text-primary"), tintaSec: t("--text-secondary"), tintaTenue: t("--text-muted"), grilla: t("--grid"), eje: t("--axis"),
      acento: t("--acento"), sobreAcento: t("--sobre-acento"), accion: t("--accion"), bueno: t("--bueno"), malo: t("--malo"),
      series: PALETA.map(t), pres,
    };
  } finally { el.remove(); }
}
