// Vista previa de los links en redes (docs/specs/vista-previa-links.md): lo que comparten el script que genera las imágenes
// (scripts/generar-previas.ts) y las páginas que las anuncian en su HTML (layout y /dato/<slug>/). Sin `fs`: sirve en cualquier lado.
import type { Metadata } from "next";
import { organismoDe } from "./fuente-publica";

export const SITIO_URL = "https://primerolosdatos.com.ar";
export const NOMBRE_SITIO = "Primero los Datos";
export const DESCRIPCION_SITIO = "Datos de Argentina, en debate. Precios, salarios, dólar, actividad, empleo, pobreza, dinero, fiscal y sector externo con datos oficiales, mes a mes.";
/** Descripción de la ficha del dato (/dato/ y, si falta el resumen de las previas, /dato/<slug>/). */
export const DESCRIPCION_DATO = "Un dato de la economía argentina de tres formas: su historia, cómo le fue con cada presidente y mes a mes desde el inicio de cada mandato.";
/** Tamaño de las imágenes de vista previa (el que piden las redes). */
export const PREVIA = { w: 1200, h: 630 } as const;
/** Carpeta (dentro de `public/`) de las imágenes y del resumen `_datos.json`. Es generada: no se versiona. */
export const CARPETA_PREVIAS = "previas";
export const IMAGEN_SITIO = `/${CARPETA_PREVIAS}/sitio.png`;

/** Lo que el script calcula una sola vez por dato fijo y leen `generateMetadata` y el mapa del sitio. */
export interface PreviaDato {
  nombre: string;        // nombre público del dato
  titulo: string;        // "Inflación mensual: 1,9 % en sep-26"
  descripcion: string;   // frases del contexto automático (neutras)
  fecha: string;         // mes del último dato ("2026-09"): renueva la imagen en las redes cuando sale un dato nuevo
  imagen: string;        // ruta de la imagen, con `?v=<fecha>`
}
/** La vista previa del parte diario del Banco Central (`previas/bcra.json`, lo escribe el mismo script): título y descripción con las cifras del día. */
export interface PreviaParte { titulo: string; descripcion: string; fecha: string; imagen: string }
export const DESCRIPCION_PARTE = "Los datos del día del Banco Central: compra de dólares, reservas, dólar minorista y mayorista, tasas, base monetaria y depósitos.";
/** La vista previa del semáforo de actividad (`previas/semaforo.json`): título y descripción con el mes y la difusión. */
export interface PreviaSemaforo { titulo: string; descripcion: string; fecha: string; imagen: string }
export const DESCRIPCION_SEMAFORO = "Los indicadores de actividad en una sola tabla: cuáles subieron y cuáles bajaron cada mes, y qué porcentaje subió. Fuentes oficiales y cámaras del sector.";
/** La vista previa de la herencia (`previas/herencia.json`): título y descripción con el presidente en funciones. */
export interface PreviaHerencia { titulo: string; descripcion: string; fecha: string; imagen: string }
export const DESCRIPCION_HERENCIA = "Cómo estaban las reservas, el dólar, las cuentas públicas, la inflación, la deuda, la pobreza y el salario cuando asumió cada presidente, y cómo los entregó. Datos oficiales.";
/** La vista previa del gasto de la Nación (`previas/gasto.json`): título y descripción con el total del último año cerrado. */
export interface PreviaGasto { titulo: string; descripcion: string; fecha: string; imagen: string }
export const DESCRIPCION_GASTO = "En qué gasta el Estado nacional cada año: para qué, quién, en qué y dónde, cuánto se presupuestó y cuánto se ejecutó. Datos oficiales de Presupuesto Abierto.";
/** La vista previa de las universidades (`previas/universidades.json`): título y descripción con el total del último año cerrado. */
export interface PreviaUniversidades { titulo: string; descripcion: string; fecha: string; imagen: string }
export const DESCRIPCION_UNIVERSIDADES = "Cuánto transfirió la Nación a cada universidad nacional desde 2018, en pesos de hoy y como % del PIB, con estudiantes y control y rendición de cuentas. Datos oficiales.";
/** La vista previa de las provincias (`previas/provincias.json`): título y descripción con el total ubicado del último año cerrado. */
export interface PreviaProvincias { titulo: string; descripcion: string; fecha: string; imagen: string }
export const DESCRIPCION_PROVINCIAS = "Cuánto gasta la Nación en cada provincia, por habitante y en pesos de hoy, con y sin jubilaciones. Es el gasto que la Nación declara ubicado en cada una, no el de los gobiernos provinciales. Datos oficiales.";
export interface DatosPrevias { generado: string; datos: Record<string, PreviaDato> }

/** Open Graph y Twitter de una página. `imagen` puede ser relativa (se completa con `metadataBase`) o absoluta. */
export function metaCompartir(o: { titulo?: string; descripcion?: string; url?: string; imagen: string; alt: string }): Pick<Metadata, "openGraph" | "twitter"> {
  const img = { url: o.imagen, width: PREVIA.w, height: PREVIA.h, alt: o.alt };
  return {
    openGraph: {
      type: "website", siteName: NOMBRE_SITIO, locale: "es_AR", images: [img],
      ...(o.titulo ? { title: o.titulo } : {}), ...(o.descripcion ? { description: o.descripcion } : {}), ...(o.url ? { url: o.url } : {}),
    },
    twitter: {
      card: "summary_large_image", images: [img],
      ...(o.titulo ? { title: o.titulo } : {}), ...(o.descripcion ? { description: o.descripcion } : {}),
    },
  };
}

// ---------------------------------------------------------------- título y descripción de un dato
const MAX_DESC = 200;
const MAX_UNIDAD_TITULO = 25;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);


/** Frase de la unidad en palabras ("millones de pesos de 2004", "pesos de ago-26 por dólar"). */
const unidadEnPalabras = (u: string) => u.replace(/por US\$/g, "por dólar").replace(/US\$/g, "dólares").replace(/\$/g, "pesos");

/** Título y descripción de la tarjeta de un dato fijo. La cifra del título dice qué es: signo de moneda delante, la unidad corta detrás o,
 *  si la unidad es larga o es un índice, la aclaración va como primera frase de la descripción. `frases` = contexto automático del dato. */
export function textosPrevia(o: {
  nombre: string; valor: string; mes: string; unidad: string; pct: boolean; indice: boolean; frases: string[]; fuente: string;
}): { titulo: string; descripcion: string } {
  const u = o.unidad.trim();
  let cifra = o.valor, aclaracion = "";
  if (o.pct) { /* el valor ya lleva su % */ }
  else if (o.indice) aclaracion = mayuscula(u) + ".";
  else {
    const m = u.match(/^(?:(miles|millones|billones) de )?(US\$|\$)(?:\s+(.*))?$/i);
    if (m) {
      const [, mag, sym, resto] = m, num = o.valor.match(/^([-−])?(.*)$/)!;
      cifra = `${num[1] ?? ""}${sym} ${num[2]}${mag ? " " + mag.toLowerCase() : ""}`;
      if (resto) aclaracion = `En ${mag ? mag.toLowerCase() + " de " : ""}${unidadEnPalabras(`${sym} ${resto}`)}.`;
      else if (mag) aclaracion = "";
    } else if (u && u.length <= MAX_UNIDAD_TITULO) cifra = `${o.valor} ${u.replace(/^miles de /i, "mil ")}`;
    else if (u) aclaracion = `Se mide en ${unidadEnPalabras(u)}.`;
  }
  const org = organismoDe(o.fuente), fuente = org ? `Fuente: ${org}.` : "";
  const cuerpo = [aclaracion, o.frases.join(" ") || "Su historia, por presidente y mes a mes desde cada mandato."].filter(Boolean).join(" ");
  return {
    titulo: `${o.nombre}: ${cifra} en ${o.mes}`,
    descripcion: fuente && (cuerpo + " " + fuente).length <= MAX_DESC ? cuerpo + " " + fuente : cuerpo,
  };
}
