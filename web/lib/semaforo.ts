// Semáforo de actividad (docs/specs/semaforo-actividad.md): decodifica `semaforo.json` y calcula todo lo que muestran la página /semaforo/,
// la imagen para compartir y la vista previa en redes. Funciones puras, sin React ni acceso al DOM.
// Regla "las cuentas cierran": cada variación se redondea a un decimal como se muestra, y la difusión se cuenta con esos valores redondeados.
// Palabras neutras (D-012): verde es "subió" y rojo es "bajó"; nunca "bueno" ni "malo".
import { fmtMes, mesNum, nf0, nf1, r1 } from "./formato";

// ---------------------------------------------------------------- datos crudos (formato del pipeline)
export type Ajuste = "oficial" | "propia" | "ninguno";
export interface IndicadorCrudo {
  clave: string; grupo: string; nombre: string; fuente: string; unidad: string; ajuste: Ajuste; real: boolean;
  id: string | null; f0: string; orig: (number | null)[]; sa: (number | null)[];
}
export interface ControlCrudo { clave: string; error_medio_pp: number; meses: number }
export interface SemaforoCrudo { actualizado: string; control: ControlCrudo[]; indicadores: IndicadorCrudo[] }

/** Un indicador ya decodificado: `mes0` es su primer mes como número (año * 12 + mes, el mismo de `mesNum`). */
export interface Indicador extends IndicadorCrudo { mes0: number; corto: string }
export interface Semaforo { actualizado: string; control: ControlCrudo[]; indicadores: Indicador[] }

/** Nombres cortos para la imagen compartible (la tabla de la imagen tiene poco ancho). La clave que falte usa el nombre entero. */
const CORTOS: Record<string, string> = {
  emae: "Actividad (EMAE)", ipi: "Industria", acero: "Acero", hierro: "Hierro", mineria: "Minería", isac: "Construcción",
  cemento: "Cemento", gas: "Gas", electricidad: "Electricidad", naftas: "Naftas", faena_vacuna: "Faena vacuna", faena_aves: "Faena de aves",
  trigo: "Harina de trigo", soja: "Molienda de soja", pesca: "Pesca", divisas_agro: "Divisas del agro", supermercados: "Supermercados",
  shoppings: "Centros de compra", confianza: "Confianza consumidor", iva: "IVA (real)", debcred: "Créditos y débitos (real)",
  segsocial: "Seguridad social (real)", prest_personales: "Préstamos personales", prest_comerciales: "Préstamos comerciales",
  expo: "Exportaciones", impo: "Importaciones", expo_brasil: "Exportaciones a Brasil", impo_brasil: "Importaciones de Brasil", empleo: "Empleo privado",
};

const AJUSTES: Ajuste[] = ["oficial", "propia", "ninguno"];
const esLista = (l: unknown): l is (number | null)[] => Array.isArray(l) && l.every((x) => x == null || typeof x === "number");

/** Valida el archivo y arma los indicadores. Devuelve null si no trae ninguno utilizable (la página lo dice). */
export function decodificar(c: SemaforoCrudo | null | undefined): Semaforo | null {
  if (!c || !Array.isArray(c.indicadores)) return null;
  const indicadores: Indicador[] = [];
  for (const i of c.indicadores) {
    if (!i || typeof i.clave !== "string" || !/^\d{4}-\d{2}$/.test(i.f0) || !esLista(i.orig) || !AJUSTES.includes(i.ajuste)) continue;
    const sa = esLista(i.sa) ? i.sa : [];
    indicadores.push({ ...i, sa, mes0: mesNum(i.f0), corto: CORTOS[i.clave] ?? i.nombre });
  }
  return indicadores.length ? { actualizado: String(c.actualizado ?? ""), control: Array.isArray(c.control) ? c.control : [], indicadores } : null;
}

// ---------------------------------------------------------------- meses
/** "2026-09" de un mes numérico. */
export const isoDeMes = (m: number): string => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
/** "sep-26" de un mes numérico. */
export const txtMes = (m: number): string => fmtMes(isoDeMes(m));

// ---------------------------------------------------------------- medidas
export type Medida = "ia" | "mm";
export const MEDIDAS: [Medida, string][] = [["ia", "Interanual"], ["mm", "Mes contra mes"]];
export const MEDIDA_DEFECTO: Medida = "ia";
export const esMedida = (s: string | null | undefined): s is Medida => s === "ia" || s === "mm";
export const COLUMNAS = 7;

const valorEn = (l: (number | null)[], mes0: number, m: number): number | null => {
  const v = l[m - mes0];
  return v == null || !Number.isFinite(v) ? null : v;
};

const tieneDatos = (l: (number | null)[]): boolean => l.some((v) => v != null);
/** ¿El indicador entra en esta medida? Mes contra mes solo con series sin estacionalidad oficiales (o que no la necesitan). */
export const admiteMedida = (i: Indicador, med: Medida): boolean => (med === "ia" ? tieneDatos(i.orig) : i.ajuste !== "propia" && tieneDatos(i.sa));

/** Variación en % del mes `m`, redondeada a un decimal como se muestra (y sin "-0,0"). null si falta un dato o el valor anterior es cero o negativo. */
export function variacionEn(i: Indicador, med: Medida, m: number): number | null {
  const lista = med === "ia" ? i.orig : i.sa;
  const ahora = valorEn(lista, i.mes0, m), antes = valorEn(lista, i.mes0, m - (med === "ia" ? 12 : 1));
  if (ahora == null || antes == null || antes <= 0) return null;
  return r1((ahora / antes - 1) * 100);
}

/** Último mes con variación calculable de una medida (null si no hay ninguno). */
export function ultimoMesConVariacion(i: Indicador, med: Medida): number | null {
  const lista = med === "ia" ? i.orig : i.sa;
  for (let k = lista.length - 1; k >= 0; k--) if (lista[k] != null && variacionEn(i, med, i.mes0 + k) != null) return i.mes0 + k;
  return null;
}
/** Último mes con dato de la lista que usa la medida (el "último dato" de la fila). */
export function ultimoMesDato(i: Indicador, med: Medida): number | null {
  const lista = med === "ia" ? i.orig : i.sa;
  for (let k = lista.length - 1; k >= 0; k--) if (lista[k] != null) return i.mes0 + k;
  return null;
}

// ---------------------------------------------------------------- texto y color de una celda
export type Direccion = "sube" | "baja" | "cero";
/** "+1,2", "−0,3" o "0,0" (nunca "−0,0"). */
export const txtVariacion = (p: number): string => (p === 0 ? nf1.format(0) : `${p > 0 ? "+" : "−"}${nf1.format(Math.abs(p))}`);
export const direccionDe = (p: number): Direccion => (p > 0 ? "sube" : p < 0 ? "baja" : "cero");
export const PALABRA_DIRECCION: Record<Direccion, string> = { sube: "subió", baja: "bajó", cero: "sin cambios" };

/** Piso de la escala de color: lo habitual de un indicador nunca se toma menor que esto, para que un indicador casi quieto no pinte fuerte por 0,1 punto. */
const PISO_ESCALA: Record<Medida, number> = { ia: 1, mm: 0.3 };
const MESES_ESCALA = 60;

/** Lo habitual del indicador: la mediana de sus variaciones (en valor absoluto) de los últimos 5 años, nunca menor que el piso de la medida. */
export function escalaDe(i: Indicador, med: Medida): number {
  const fin = ultimoMesConVariacion(i, med);
  if (fin == null) return PISO_ESCALA[med];
  const abs: number[] = [];
  for (let m = fin; m > fin - MESES_ESCALA; m--) { const v = variacionEn(i, med, m); if (v != null) abs.push(Math.abs(v)); }
  if (abs.length < 12) return PISO_ESCALA[med] * 2;
  abs.sort((a, b) => a - b);
  const mid = abs.length >> 1, mediana = abs.length % 2 ? abs[mid] : (abs[mid - 1] + abs[mid]) / 2;
  return Math.max(mediana, PISO_ESCALA[med]);
}
/** Intensidad del color, de 1 a 4, según cuánto se aparta la variación de lo habitual del indicador. El tope es 4: un +30 % no apaga al resto. */
export function nivelDe(p: number, escala: number): 1 | 2 | 3 | 4 {
  const r = Math.abs(p) / escala;
  return r < 0.5 ? 1 : r < 1 ? 2 : r < 1.75 ? 3 : 4;
}

export interface Celda { mes: number; valor: number; txt: string; dir: Direccion; nivel: 1 | 2 | 3 | 4; aria: string }
function celdaDe(m: number, p: number, escala: number): Celda {
  const dir = direccionDe(p);
  return { mes: m, valor: p, txt: txtVariacion(p), dir, nivel: nivelDe(p, escala), aria: `${txtMes(m)}: ${txtVariacion(p)} por ciento, ${PALABRA_DIRECCION[dir]}` };
}

// ---------------------------------------------------------------- la tabla
export interface FilaSem {
  ind: Indicador;
  admite: boolean;                 // false: la medida no incluye este indicador ("solo interanual")
  celdas: (Celda | null)[];        // una por columna, null si no hay dato
  ultimo: string | null;           // mes del último dato, "sep-26"
}
export interface Difusion {
  mes: number; entran: number; suben: number;
  pct: number;                     // % de los que entraron que subieron, redondeado a entero
  txtPct: string;                  // "54 %"
  atenuada: boolean;               // entraron menos de la mitad de los indicadores de la medida
}
export interface Tabla {
  medida: Medida;
  meses: number[]; mesesTxt: string[];
  grupos: { grupo: string; filas: FilaSem[] }[];
  total: number;                   // indicadores que entran en la medida
  difusion: Difusion[];
  columnaResumen: number;          // índice de la columna que resume el semáforo (la última con datos suficientes)
  resumen: string;                 // "En sep-26 subieron 14 de 26 indicadores"
  comparado: string;               // "Cada mes se compara con el mismo mes del año anterior."
}

const COMPARADO: Record<Medida, string> = {
  ia: "Cada mes se compara con el mismo mes del año anterior.",
  mm: "Cada mes se compara con el mes anterior, sin estacionalidad. Solo entran las series con ajuste estacional oficial.",
};

/** Frase del resumen: "En sep-26 subieron 14 de 26 indicadores". */
export function resumenDe(mes: number, suben: number, entran: number): string {
  const verbo = suben === 1 ? "subió" : "subieron";
  return `En ${txtMes(mes)} ${verbo} ${nf0.format(suben)} de ${nf0.format(entran)} ${entran === 1 ? "indicador" : "indicadores"}`;
}

/** Arma la tabla de una medida: los últimos 7 meses terminando en el dato más nuevo entre los indicadores de la medida. null si no hay datos. */
export function armarTabla(sem: Semaforo, med: Medida): Tabla | null {
  const admitidos = sem.indicadores.filter((i) => admiteMedida(i, med));
  const finales = admitidos.map((i) => ultimoMesConVariacion(i, med)).filter((x): x is number => x != null);
  if (!finales.length) return null;
  const fin = Math.max(...finales), meses = Array.from({ length: COLUMNAS }, (_, k) => fin - (COLUMNAS - 1) + k);
  const grupos: { grupo: string; filas: FilaSem[] }[] = [];
  const sumas = meses.map(() => ({ entran: 0, suben: 0 }));
  for (const ind of sem.indicadores) {
    const admite = admiteMedida(ind, med), escala = admite ? escalaDe(ind, med) : 1;
    const celdas = meses.map((m, k) => {
      if (!admite) return null;
      const p = variacionEn(ind, med, m);
      if (p == null) return null;
      sumas[k].entran++;
      if (p > 0) sumas[k].suben++;      // una variación que se lee 0,0 no cuenta como suba
      return celdaDe(m, p, escala);
    });
    const um = ultimoMesDato(ind, admite ? med : "ia");   // las filas "solo interanual" muestran el último dato de la serie original
    const fila: FilaSem = { ind, admite, celdas, ultimo: um == null ? null : txtMes(um) };
    const g = grupos.find((x) => x.grupo === ind.grupo);
    if (g) g.filas.push(fila); else grupos.push({ grupo: ind.grupo, filas: [fila] });
  }
  const total = admitidos.length;
  const difusion: Difusion[] = meses.map((mes, k) => {
    const { entran, suben } = sumas[k], pct = entran ? Math.round((suben / entran) * 100) : 0;
    return { mes, entran, suben, pct, txtPct: entran ? `${nf0.format(pct)} %` : "–", atenuada: entran * 2 < total };
  });
  let col = difusion.length - 1;
  while (col > 0 && (difusion[col].atenuada || difusion[col].entran === 0)) col--;
  const d = difusion[col];
  return { medida: med, meses, mesesTxt: meses.map(txtMes), grupos, total, difusion, columnaResumen: col, resumen: resumenDe(d.mes, d.suben, d.entran), comparado: COMPARADO[med] };
}

// ---------------------------------------------------------------- gráfico de una fila
export interface PuntoGrafico { mes: number; orig: number | null; sa: number | null }
/** Los últimos 5 años del indicador (60 meses terminando en su último dato). La serie sin estacionalidad solo si es oficial: la estimación propia no se muestra. */
export function serieGrafico(i: Indicador, meses = 60): { puntos: PuntoGrafico[]; conSa: boolean } {
  const fin = Math.max(ultimoMesDato(i, "ia") ?? i.mes0, i.ajuste === "oficial" ? ultimoMesDato(i, "mm") ?? i.mes0 : i.mes0);
  const conSa = i.ajuste === "oficial";
  const puntos: PuntoGrafico[] = [];
  for (let m = Math.max(i.mes0, fin - meses + 1); m <= fin; m++) puntos.push({ mes: m, orig: valorEn(i.orig, i.mes0, m), sa: conSa ? valorEn(i.sa, i.mes0, m) : null });
  return { puntos, conSa };
}

// ---------------------------------------------------------------- textos de la página
/** Error medio de la estimación propia contra la oficial, en palabras ("Actividad económica (EMAE): 1,3 puntos"). */
export function controlTxt(sem: Semaforo): { nombre: string; txt: string }[] {
  return sem.control.flatMap((c) => {
    const ind = sem.indicadores.find((i) => i.clave === c.clave);
    if (!ind || !Number.isFinite(c.error_medio_pp)) return [];
    return [{ nombre: ind.nombre, txt: `${nf1.format(c.error_medio_pp)} ${r1(c.error_medio_pp) === 1 ? "punto" : "puntos"}` }];
  });
}

/** Indicadores que se quisieron incluir y no tienen una fuente que un programa pueda leer. */
export const NO_INCLUIDOS: [string, string][] = [
  ["Ventas minoristas pymes", "CAME"],
  ["Patentamientos de autos y motos", "ACARA y ACARA Motos"],
  ["Índice Construya", "Grupo Construya"],
  ["Escrituras", "Colegio de Escribanos"],
  ["Producción de leche", "Ministerio de Agricultura"],
  ["Producción de autos", "ADEFA (la serie disponible no coincide con los datos de ADEFA)"],
  ["Producción de petróleo", "Secretaría de Energía (la serie oficial quedó en nov-25)"],
];

/** Mes del semáforo (el de la columna que lo resume) de una tabla. */
export const mesResumen = (t: Tabla): number => t.meses[t.columnaResumen];

/** Título y descripción de la vista previa en redes (≤ 200 caracteres la descripción). */
export function textosPreviaSemaforo(t: Tabla): { titulo: string; descripcion: string } {
  const d = t.difusion[t.columnaResumen];
  const frase = t.resumen.charAt(0).toLowerCase() + t.resumen.slice(1);
  const contra = t.medida === "ia" ? "contra el mismo mes del año anterior" : "contra el mes anterior";
  return {
    titulo: `Semáforo de actividad: ${frase}`,
    descripcion: `${t.total} indicadores mensuales en una tabla: cuáles subieron y cuáles bajaron ${contra}. Difusión de ${d.txtPct} en ${txtMes(d.mes)}. Fuentes oficiales y cámaras del sector.`,
  };
}

/** Id de la serie en el catálogo del sitio a partir del id de datos.gob.ar (misma regla que `slug` de pipeline/catalogo.py: caracteres repetidos en uno y sin guiones bajos en los extremos) que trae el archivo ("143.3_NO_PR_2004_A_31" → "dg_143_3_no_pr_2004_a_31"). */
export const idCatalogo = (id: string): string => `dg_${id.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
