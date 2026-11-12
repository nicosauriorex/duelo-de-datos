// Qué hace la moneda elegida ("Pesos reales", "Pesos corrientes", "Dólares reales/corrientes") en cada tipo de serie.
// Una sola fuente de verdad para "Un presidente, todas las variables" (R13: una opción que no cambia nada no se ofrece en silencio).
//
// Tipo de serie × moneda → medida que se calcula (`aplica` = la moneda cambia lo que se ve):
//   ars  (montos en pesos)      real → real · corr → corr · dólares → esa medida · variación → esa variación      aplica siempre
//   fx   (pesos por dólar)      real → real · corr → corr · variación → esa variación · dólares → real / corrientes   en dólares NO aplica
//   usd  (montos en dólares)    real → pesos de hoy (al oficial) · corr → pesos corrientes (al oficial) · dólares → esos       aplica siempre
//   idx  de precios por rubro   real → índice contra la inflación general · corr → índice tal cual · dólares / variación → tal cual   en dólares NO aplica
//   idx  de precios general     siempre tal cual (contra sí misma sería una línea plana)                             NO aplica
//   idx  con dir = 1 (salarios) real → real · corr → tal cual · dólares / variación → tal cual                       en dólares NO aplica
//   idx  otros                  siempre tal cual                                                                      NO aplica
//   tasa, none (%, cantidades)  siempre tal cual                                                                      NO aplica
import { ES_IPC_GENERAL, type SerieMeta } from "./motor";

export interface MonedaEnSerie {
  /** Medida que se le pide al motor. */
  med: string;
  /** false: la moneda elegida no cambia lo que se ve de esta serie. */
  aplica: boolean;
}

const esDolares = (moneda: string) => moneda.startsWith("usd");
const esVariacion = (moneda: string) => moneda === "vm" || moneda === "via";

/** Índice de precios de un rubro o producto (no el general): admite "real" = relativo a la inflación general. */
export const esIndiceDeRubro = (s: Pick<SerieMeta, "id" | "tipo" | "dir" | "cat">): boolean =>
  s.tipo === "idx" && s.dir !== 1 && s.cat[0] === "Precios" && !ES_IPC_GENERAL(s.id);

export function monedaEnSerie(s: Pick<SerieMeta, "id" | "tipo" | "dir" | "cat">, moneda: string): MonedaEnSerie {
  switch (s.tipo) {
    case "ars": return { med: moneda, aplica: true };
    case "fx":
      if (esVariacion(moneda)) return { med: moneda, aplica: true };
      return esDolares(moneda) ? { med: moneda.startsWith("usdr") ? "real" : "corr", aplica: false } : { med: moneda, aplica: true };
    case "usd":
      return { med: moneda === "real" ? "real" : moneda === "corr" ? "arscorr" : moneda.startsWith("usdr") ? "usdr" : "corr", aplica: !esVariacion(moneda) };
    case "idx":
      if (esIndiceDeRubro(s)) return moneda === "real" ? { med: "real", aplica: true } : { med: "corr", aplica: moneda === "corr" };
      if (s.dir === 1) return moneda === "real" ? { med: "real", aplica: true } : { med: "corr", aplica: moneda === "corr" };
      return { med: "corr", aplica: false };
    default:
      return { med: "asis", aplica: false };   // tasas y cantidades: ni pesos ni dólares
  }
}
