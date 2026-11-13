// Herencia, fase 2 (docs/specs/herencia.md): datos oficiales que no están en series abiertas sino en informes (PDF o planillas),
// cargados a mano en `datos/manual/herencia.json`, cada uno con su documento, página y cita. El pipeline los copia a
// `web/public/datos/herencia_informes.json` (pipeline/herencia_informes.py). Acá están todos los cálculos; la página y la imagen solo dibujan.
//
// - Un dato es de un traspaso: `traspaso` = mes de asunción del que recibe (como `ini` en PRES_DEF), o "hoy" para el último dato publicado.
//   "Recibió" del presidente k = el dato con traspaso igual a su mes de asunción; "Entregó" = el del traspaso siguiente; "Hoy" = el de "hoy".
// - Sin color: son montos de deuda, acuerdos y normas, en los que subir o bajar no se califica (D-012).
// - Las cuentas se hacen con los valores tal como se muestran.
import { fmtMes, nf0, nf1, r1, valorMostrado } from "./formato";
import type { Pres } from "./estadisticas";
import type { GrupoHerencia } from "./herencia";

/** Un dato tal como viene del archivo (una entrada por dato y traspaso). */
export interface DatoInforme {
  clave: string; traspaso: string; valor: number | string; unidad: string; fecha_dato: string;
  organismo: string; documento: string; url: string; pagina: string; cita?: string; nota?: string;
}
export interface DatosInformes { actualizado?: string; datos: DatoInforme[] }

/** Cómo se muestra y se compara un dato: monto (cambio en %), porcentaje (cambio en puntos) o texto (sin cambio). */
type Tipo = "monto" | "pct" | "texto";
export interface DefInforme { clave: string; grupo: GrupoHerencia; nombre: string; unidad: string; tipo: Tipo; nota?: string }

/** Filas de informes, en el orden en que se intercalan al final de cada grupo de la tabla. */
export const FILAS_INFORME: DefInforme[] = [
  { clave: "bopreal", grupo: "Banco Central", nombre: "Bonos del Banco Central para importadores (BOPREAL)", unidad: "millones de US$ colocados", tipo: "monto",
    nota: "Bonos en dólares que el Banco Central empezó a colocar en diciembre de 2023 para la deuda de importadores con el exterior." },
  { clave: "cepo", grupo: "Dólar", nombre: "Restricciones para comprar dólares (personas)", unidad: "vigentes o no, y desde cuándo", tipo: "texto",
    nota: "Si una persona podía comprar dólares para ahorro sin tope ni permiso. Sale de las normas del Banco Central y del Boletín Oficial." },
  { clave: "deuda_bruta_usd", grupo: "Deuda y sector externo", nombre: "Deuda pública bruta", unidad: "millones de US$", tipo: "monto" },
  { clave: "deuda_bruta_pib", grupo: "Deuda y sector externo", nombre: "Deuda pública bruta / PIB", unidad: "% del PIB", tipo: "pct" },
  { clave: "deuda_moneda_ext", grupo: "Deuda y sector externo", nombre: "Deuda pública en moneda extranjera", unidad: "% de la deuda bruta", tipo: "pct" },
  { clave: "fmi_deuda", grupo: "Deuda y sector externo", nombre: "Deuda con el FMI", unidad: "millones de DEG (moneda del FMI)", tipo: "monto",
    nota: "En DEG (derechos especiales de giro), la moneda de cuenta del FMI, que es como lo publica el Fondo en su página de cada país. No se pasa a dólares para no mezclar el tipo de cambio de cada fecha." },
  { clave: "fmi_acuerdo", grupo: "Deuda y sector externo", nombre: "Acuerdo vigente con el FMI", unidad: "tipo, año y monto", tipo: "texto" },
  { clave: "deuda_importadores", grupo: "Deuda y sector externo", nombre: "Deuda comercial de importadores (informes)", unidad: "millones de US$", tipo: "monto",
    nota: "Deuda por importaciones de bienes según los informes de deuda externa privada del Banco Central." },
];
export const defInforme = (clave: string | null | undefined): DefInforme | null => FILAS_INFORME.find((f) => f.clave === clave) ?? null;
/** Prefijo de las claves de informes en la URL (`v=inf.cepo`), para no chocar con las de las series. */
export const PREF_INF = "inf.";

/** Un dato listo para mostrar: el texto como se ve, el número como se ve (si lo hay), el mes del dato y la cita completa. */
export interface PuntoInforme { txt: string; visto: number | null; mes: string; dato: DatoInforme }
const fecha = (f: string): string => fmtMes(f.slice(0, 7));

export function puntoInforme(d: DefInforme, x: DatoInforme): PuntoInforme {
  if (typeof x.valor === "string" || d.tipo === "texto") return { txt: String(x.valor), visto: null, mes: fecha(x.fecha_dato), dato: x };
  const txt = d.tipo === "pct" ? `${nf1.format(x.valor)} %` : nf0.format(x.valor);
  return { txt, visto: d.tipo === "pct" ? r1(x.valor) : valorMostrado(txt) ?? x.valor, mes: fecha(x.fecha_dato), dato: x };
}

/** El dato de una clave en un traspaso ("AAAA-MM" o "hoy"). */
const buscar = (datos: DatoInforme[], clave: string, traspaso: string): DatoInforme | null =>
  datos.find((x) => x.clave === clave && x.traspaso === traspaso) ?? null;

/** Cambio entre dos datos, con los valores como se muestran: en % (y la diferencia) para montos, en puntos para porcentajes. */
export function cambioInforme(d: DefInforme, a: PuntoInforme | null, b: PuntoInforme | null): { txt: string; abs: string } {
  if (!a || !b || a.visto == null || b.visto == null || d.tipo === "texto") return { txt: "–", abs: "" };
  if (d.tipo === "pct") { const p = r1(b.visto - a.visto); return { txt: `${p > 0 ? "+" : p < 0 ? "−" : ""}${nf1.format(Math.abs(p))} p.p.`, abs: "" }; }
  const dif = b.visto - a.visto, abs = dif === 0 ? "" : `${dif > 0 ? "+" : "−"}${nf0.format(Math.abs(dif))} ${d.unidad.replace(/ colocados$| \(.*\)$/, "")}`;
  // desde cero no hay variación en %: se muestra solo la diferencia, que es el dato de la fila (FMI 0 → 31.914)
  if (a.visto === 0) return { txt: abs || "–", abs: "" };
  const v0 = (b.visto / a.visto - 1) * 100, v = Math.abs(v0) < 0.05 ? 0 : v0;
  return { txt: `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v) >= 1000 ? nf0.format(Math.abs(v)) : nf1.format(Math.abs(v))} %`, abs };
}

/** Una fila de informe armada para un presidente. */
export interface FilaInforme { def: DefInforme; recibio: PuntoInforme | null; entrego: PuntoInforme | null; cambio: string; cambioAbs: string }

/** Filas de informes del presidente `k`: solo las que tienen al menos un dato cargado (las vacías siguen en "Lo que falta cargar"). */
export function filasInforme(datos: DatoInforme[], PRES: Pres[], k: number): FilaInforme[] {
  const p = PRES[k], sig = PRES[k + 1];
  return FILAS_INFORME.flatMap((d): FilaInforme[] => {
    const r = buscar(datos, d.clave, p.ini), e = buscar(datos, d.clave, sig ? sig.ini : "hoy");
    if (!r && !e) return [];
    const a = r && puntoInforme(d, r), b = e && puntoInforme(d, e), cb = cambioInforme(d, a, b);
    return [{ def: d, recibio: a, entrego: b, cambio: cb.txt, cambioAbs: cb.abs }];
  });
}

/** Claves con algún dato cargado (para el selector de "Todos los traspasos" y para "Lo que falta cargar"). */
export const clavesCargadas = (datos: DatoInforme[]): Set<string> => new Set(datos.map((x) => x.clave));

/** "Todos los traspasos" de un dato de informe: una fila por traspaso (sin dato si no se cargó) y la fila de hoy. */
export interface TraspasoInforme { de: Pres; a: Pres; mes: string; dato: PuntoInforme | null }
export function traspasosInforme(datos: DatoInforme[], clave: string, PRES: Pres[]): { def: DefInforme; filas: TraspasoInforme[]; hoy: PuntoInforme | null } | null {
  const d = defInforme(clave);
  if (!d) return null;
  const filas: TraspasoInforme[] = [];
  for (let k = 1; k < PRES.length; k++) {
    const x = buscar(datos, clave, PRES[k].ini);
    filas.push({ de: PRES[k - 1], a: PRES[k], mes: fmtMes(PRES[k].ini), dato: x && puntoInforme(d, x) });
  }
  const h = buscar(datos, clave, "hoy");
  return { def: d, filas, hoy: h && puntoInforme(d, h) };
}
