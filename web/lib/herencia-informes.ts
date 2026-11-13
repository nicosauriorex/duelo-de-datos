// Herencia, fase 2 (docs/specs/herencia.md): datos oficiales que no están en series abiertas sino en informes (PDF o planillas),
// cargados a mano en `datos/manual/herencia.json`, cada uno con su documento, página y cita. El pipeline los copia a
// `web/public/datos/herencia_informes.json` (pipeline/herencia_informes.py). Acá están todos los cálculos; la página y la imagen solo dibujan.
//
// - Un dato es de un traspaso: `traspaso` = mes de asunción del que recibe (como `ini` en PRES_DEF), o "hoy" para el último dato publicado.
//   "Recibió" del presidente k = el dato con traspaso igual a su mes de asunción; "Entregó" = el del traspaso siguiente; "Hoy" = el de "hoy".
// - Sin color: son montos de deuda, acuerdos y normas, en los que subir o bajar no se califica (D-012).
// - Las cuentas se hacen con los valores tal como se muestran.
import { fmtMes, nf0, nf1, nfDec, restaLimpia, valorMostrado } from "./formato";
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
/** `grupo` "Estimaciones": va en el bloque aparte, debajo de la tabla (fase 3). `dec`: decimales de un monto (0 si falta). */
export type GrupoInforme = GrupoHerencia | "Estimaciones";
export interface DefInforme { clave: string; grupo: GrupoInforme; nombre: string; unidad: string; tipo: Tipo; nota?: string; dec?: number; quien?: string; sinDato?: string; oficial?: boolean }

/** Filas de informes, en el orden en que se intercalan al final de cada grupo de la tabla. */
export const FILAS_INFORME: DefInforme[] = [
  { clave: "puts", grupo: "Banco Central", nombre: "Opciones de venta de títulos que los bancos tenían contra el Banco Central (puts)", unidad: "billones de $ de dic-2023", tipo: "monto", dec: 2,
    nota: "Opciones de liquidez sobre títulos del Tesoro (Comunicación \"A\" 7716): si los bancos las ejercían, el Banco Central tenía que comprarles los bonos con pesos nuevos. Valor nominal a precios de mercado." },
  { clave: "bopreal", grupo: "Banco Central", nombre: "Bonos del Banco Central para importadores (BOPREAL)", unidad: "millones de US$ colocados", tipo: "monto",
    nota: "Bonos en dólares que el Banco Central empezó a colocar en diciembre de 2023 para la deuda de importadores con el exterior." },
  { clave: "cepo", grupo: "Dólar", nombre: "Restricciones para comprar dólares (personas)", unidad: "vigentes o no, y desde cuándo", tipo: "texto",
    nota: "Si una persona podía comprar dólares para ahorro sin tope ni permiso. Sale de las normas del Banco Central y del Boletín Oficial." },
  { clave: "cobertura_luz", grupo: "Precios", nombre: "Parte del costo de la electricidad que pagan las tarifas", unidad: "% (precio estacional / costo medio del sistema)", tipo: "pct",
    nota: "Precio estacional que pagan las distribuidoras dividido el precio monómico (costo medio) del mercado eléctrico mayorista, según la Secretaría de Energía. Solo electricidad." },
  { clave: "precios_acordados", grupo: "Precios", nombre: "Precios en programas acordados (Precios Justos y otros)", unidad: "% de los precios relevados en el GBA", tipo: "pct", dec: 2,
    nota: "Parte de los precios que releva el INDEC para el IPC del Gran Buenos Aires que estaban dentro de programas de precios acordados entre el Estado y las empresas. Es parte de la muestra, no de la canasta ponderada." },
  { clave: "importaciones_pendientes", grupo: "Deuda y sector externo", nombre: "Importaciones pendientes de pago", unidad: "millones de US$", tipo: "monto",
    nota: "Deuda de importadores de bienes y servicios con el exterior estimada por el Banco Central al 12-12-2023, con la que se armaron los BOPREAL." },
  { clave: "deuda_bruta_usd", grupo: "Deuda y sector externo", nombre: "Deuda pública bruta", unidad: "millones de US$", tipo: "monto" },
  { clave: "deuda_bruta_pib", grupo: "Deuda y sector externo", nombre: "Deuda pública bruta / PIB", unidad: "% del PIB", tipo: "pct" },
  { clave: "deuda_moneda_ext", grupo: "Deuda y sector externo", nombre: "Deuda pública en moneda extranjera", unidad: "% de la deuda bruta", tipo: "pct" },
  { clave: "fmi_deuda", grupo: "Deuda y sector externo", nombre: "Deuda con el FMI", unidad: "millones de DEG (moneda del FMI)", tipo: "monto",
    nota: "En DEG (derechos especiales de giro), la moneda de cuenta del FMI, que es como lo publica el Fondo en su página de cada país. No se pasa a dólares para no mezclar el tipo de cambio de cada fecha." },
  { clave: "fmi_acuerdo", grupo: "Deuda y sector externo", nombre: "Acuerdo vigente con el FMI", unidad: "tipo, año y monto", tipo: "texto" },
  { clave: "deuda_importadores", grupo: "Deuda y sector externo", nombre: "Deuda comercial de importadores (informes)", unidad: "millones de US$", tipo: "monto",
    nota: "Deuda por importaciones de bienes según los informes de deuda externa privada del Banco Central." },
  // Estimaciones (fase 3): no son datos oficiales del país; van en un bloque aparte
  { clave: "reservas_netas_fmi", grupo: "Estimaciones", nombre: "Reservas netas según el FMI", unidad: "millones de US$", tipo: "monto", quien: "FMI", sinDato: "el FMI no la publicó",
    nota: "Reservas brutas menos lo que el Banco Central debe devolver en el corto plazo (swaps, encajes de los bancos, seguro de depósitos y, según el acuerdo, el crédito del FMI). Cada cifra sale de un informe distinto del FMI, con la definición de ese informe: ver la nota de cada dato." },
  { clave: "reservas_netas_bcra", grupo: "Estimaciones", nombre: "Reservas netas según el Banco Central", unidad: "millones de US$", tipo: "monto", quien: "Banco Central", oficial: true, sinDato: "el Banco Central no la publicó",
    nota: "Definición propia del Banco Central, con criterios jurídicos y contables; el FMI usa otra para seguir el acuerdo." },
  { clave: "cobertura_amba", grupo: "Estimaciones", nombre: "Parte del costo de los servicios públicos que pagan los hogares del AMBA", unidad: "% del costo (luz, gas, agua y transporte)", tipo: "pct", quien: "IIEP (UBA-CONICET)", sinDato: "no hay un promedio publicado de esa fecha",
    nota: "Promedio para hogares de ingresos altos, medios y bajos del AMBA, del Observatorio de Tarifas y Subsidios del IIEP. La serie empieza en 2023 y no es comparable con la de la electricidad de la Secretaría de Energía." },
];
/** Las filas de la estimación propia de reservas netas (salen de reservas_netas.json, no del archivo de informes): una con el método del FMI
 *  y otra con la definición del Banco Central (la misma cuenta sin restar el crédito del FMI, que es deuda del Tesoro). */
export type DefinicionRN = "fmi" | "bcra";
export const DEF_RN_PROPIA: DefInforme = {
  clave: "reservas_netas_propia", grupo: "Estimaciones", nombre: "Reservas netas, estimación propia con el método del FMI", unidad: "millones de US$", tipo: "monto", quien: "Primero los Datos", sinDato: "la estimación empieza en abr-24",
  nota: "Cuenta propia al día con datos del Banco Central y supuestos tomados de los informes del FMI. Tocá el valor para ver la fórmula y cuánto se apartó del FMI cuando publicó.",
};
export const DEF_RN_PROPIA_BCRA: DefInforme = {
  clave: "reservas_netas_propia_bcra", grupo: "Estimaciones", nombre: "Reservas netas, estimación propia con la definición del Banco Central", unidad: "millones de US$", tipo: "monto", quien: "Primero los Datos", sinDato: "la estimación empieza en abr-24",
  nota: "La misma cuenta propia sin restar el crédito del FMI, que el Banco Central no descuenta porque es deuda del Tesoro. Tocá el valor para ver la fórmula y cuánto se apartó del Banco Central cuando publicó.",
};
export const defRNPropia = (cual: DefinicionRN): DefInforme => (cual === "bcra" ? DEF_RN_PROPIA_BCRA : DEF_RN_PROPIA);
/** Cuál de las dos estimaciones propias es una fila (null si no es ninguna). */
export const cualRNPropia = (clave: string): DefinicionRN | null => (clave === DEF_RN_PROPIA.clave ? "fmi" : clave === DEF_RN_PROPIA_BCRA.clave ? "bcra" : null);
export const defInforme = (clave: string | null | undefined): DefInforme | null => FILAS_INFORME.find((f) => f.clave === clave) ?? null;
/** Prefijo de las claves de informes en la URL (`v=inf.cepo`), para no chocar con las de las series. */
export const PREF_INF = "inf.";

/** Un dato listo para mostrar: el texto como se ve, el número como se ve (si lo hay), el mes del dato y la cita completa. */
export interface PuntoInforme { txt: string; visto: number | null; mes: string; dato: DatoInforme }
const fecha = (f: string): string => fmtMes(f.slice(0, 7));

export function puntoInforme(d: DefInforme, x: DatoInforme): PuntoInforme {
  if (typeof x.valor === "string" || d.tipo === "texto") return { txt: String(x.valor), visto: null, mes: fecha(x.fecha_dato), dato: x };
  const nf = d.dec ? nfDec(d.dec) : d.tipo === "pct" ? nf1 : nf0, txt = d.tipo === "pct" ? `${nf.format(x.valor)} %` : nf.format(x.valor);
  return { txt, visto: valorMostrado(txt) ?? x.valor, mes: fecha(x.fecha_dato), dato: x };
}

/** El dato de una clave en un traspaso ("AAAA-MM" o "hoy"). */
const buscar = (datos: DatoInforme[], clave: string, traspaso: string): DatoInforme | null =>
  datos.find((x) => x.clave === clave && x.traspaso === traspaso) ?? null;

/** Cambio entre dos datos, con los valores como se muestran: en % (y la diferencia) para montos, en puntos para porcentajes. */
export function cambioInforme(d: DefInforme, a: PuntoInforme | null, b: PuntoInforme | null): { txt: string; abs: string } {
  if (!a || !b || a.visto == null || b.visto == null || d.tipo === "texto") return { txt: "–", abs: "" };
  if (d.tipo === "pct") { const p = restaLimpia(b.visto, a.visto); return { txt: `${p > 0 ? "+" : p < 0 ? "−" : ""}${(d.dec ? nfDec(d.dec) : nf1).format(Math.abs(p))} p.p.`, abs: "" }; }
  const nf = d.dec ? nfDec(d.dec) : nf0, dif = restaLimpia(b.visto, a.visto);
  const abs = dif === 0 ? "" : `${dif > 0 ? "+" : "−"}${nf.format(Math.abs(dif))} ${d.unidad.replace(/ colocados$| \(.*\)$/, "")}`;
  // desde cero o desde un valor negativo no hay variación en % que se lea bien: solo la diferencia (FMI 0 → 31.914; reservas netas 12.400 → −11.200)
  // (sin la unidad, que ya está en la fila: así entra en la columna)
  if (a.visto <= 0 || b.visto < 0) return { txt: dif === 0 ? "–" : `${dif > 0 ? "+" : "−"}${nf.format(Math.abs(dif))}`, abs: "" };
  const v0 = (b.visto / a.visto - 1) * 100, v = Math.abs(v0) < 0.05 ? 0 : v0;
  return { txt: `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v) >= 1000 ? nf0.format(Math.abs(v)) : nf1.format(Math.abs(v))} %`, abs };
}

/** Una fila de informe armada para un presidente. */
/** `sinEntrego`: motivo propio de la segunda columna vacía (si falta, el de la definición). */
export interface FilaInforme { def: DefInforme; recibio: PuntoInforme | null; entrego: PuntoInforme | null; cambio: string; cambioAbs: string; sinEntrego?: string }

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

// ---------------------------------------------------------------- estimación propia de reservas netas (fase 3, reservas_netas.json)
export interface ComponentesRN { fecha: string; netas: number; netas_bcra?: number; brutas: number; encajes: number; swaps: number; sedesa: number; fmi: number }
export interface ReservasNetas {
  actualizado: string; ultimo: ComponentesRN; mensual: { mes: string; fecha: string; netas: number }[];
  controles: { fecha: string; propia: number; fmi: number; dif: number; credito_fmi?: number; cita: string; url: string }[];
  controles_bcra?: { fecha: string; propia: number; bcra: number; dif: number; cita: string; url: string }[];
  definicion_bcra?: { cita: string; url: string };
  supuestos: { concepto: string; desde: string; valor: number | null; cita: string; url: string }[]; no_incluye: string; no_incluye_bcra?: string; fuentes: string;
}
/** Días de atraso a partir de los cuales la estimación no cuenta como "hoy". */
export const MAX_ATRASO_RN_DIAS = 20;

/** Una fila de estimación propia: solo para el presidente en funciones ("Hoy"); null si no hay archivo; "sin dato" y por qué si el dato es viejo. */
export function filaRNPropia(rn: ReservasNetas | null, enCurso: boolean, cual: DefinicionRN = "fmi", hoy: Date = new Date()): FilaInforme | null {
  if (!rn || !enCurso) return null;
  const DEF = defRNPropia(cual), valor = cual === "bcra" ? rn.ultimo.netas_bcra : rn.ultimo.netas;
  if (valor == null) return null;
  const u = rn.ultimo, dias = (hoy.getTime() - new Date(u.fecha + "T12:00:00-03:00").getTime()) / 864e5;
  if (!(dias <= MAX_ATRASO_RN_DIAS)) {
    return { def: DEF, recibio: null, entrego: null, cambio: "–", cambioAbs: "", sinEntrego: `el último dato es del ${u.fecha.split("-").reverse().join("/")}, con más de ${MAX_ATRASO_RN_DIAS} días de atraso` };
  }
  const dato: DatoInforme = {
    clave: DEF.clave, traspaso: "hoy", valor, unidad: DEF.unidad, fecha_dato: u.fecha,
    organismo: "Primero los Datos (estimación propia)", documento: "Fórmula y supuestos", url: "", pagina: "",
  };
  return { def: DEF, recibio: null, entrego: puntoInforme(DEF, dato), cambio: "–", cambioAbs: "" };
}

/** Cuánto se apartó la estimación del FMI en las fechas en que publicó: "entre −397 y +1.252 millones de US$". */
export function rangoControles(rn: ReservasNetas, cual: DefinicionRN = "fmi"): string {
  const cs = cual === "bcra" ? rn.controles_bcra ?? [] : rn.controles;
  if (!cs.length) return "";
  const difs = cs.map((c) => c.dif), f = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${nf0.format(Math.abs(v))}`;
  const a = Math.min(...difs), b = Math.max(...difs);
  return a === b ? `${f(a)} millones de US$` : `entre ${f(a)} y ${f(b)} millones de US$`;
}

/** Filas del bloque de estimaciones del presidente `k`: las cargadas a mano (FMI, IIEP) y la propia. */
export function filasEstimaciones(datos: DatoInforme[], rn: ReservasNetas | null, PRES: Pres[], k: number): FilaInforme[] {
  const est = filasInforme(datos, PRES, k).filter((f) => f.def.grupo === "Estimaciones");
  const propias = (["fmi", "bcra"] as const).map((c) => filaRNPropia(rn, k === PRES.length - 1, c)).filter((f): f is FilaInforme => !!f);
  if (!propias.length) return est;
  // las propias van justo después de las otras reservas netas, antes de lo demás
  const i = est.map((f) => f.def.clave.startsWith("reservas_netas")).lastIndexOf(true);
  return [...est.slice(0, i + 1), ...propias, ...est.slice(i + 1)];
}

/** Las dos definiciones de reservas netas en una misma fecha (la última en que publicaron las dos): cuánto difieren y cuánto de eso es
 *  el crédito del FMI desde 2025 según la cuenta propia en esa fecha. Null si no hay una fecha común o falta el dato. */
export function dosDefiniciones(datos: DatoInforme[], rn: ReservasNetas | null): { fecha: string; fmi: number; bcra: number; dif: number; credito: number | null } | null {
  const f = datos.find((x) => x.clave === "reservas_netas_fmi" && x.traspaso === "hoy"), b = datos.find((x) => x.clave === "reservas_netas_bcra" && x.traspaso === "hoy");
  if (!f || !b || typeof f.valor !== "number" || typeof b.valor !== "number" || f.fecha_dato.slice(0, 7) !== b.fecha_dato.slice(0, 7)) return null;
  const c = rn?.controles.find((x) => x.fecha.slice(0, 7) === f.fecha_dato.slice(0, 7));
  return { fecha: f.fecha_dato, fmi: f.valor, bcra: b.valor, dif: b.valor - f.valor, credito: c?.credito_fmi ?? null };
}
