// Lectura de archivos al compilar (solo en el servidor de build: lo importan páginas sin "use client", el mapa del sitio y nada más).
// Si falta un archivo, no falla: las páginas fijas salen con título, descripción e imagen generales.
import fs from "node:fs";
import path from "node:path";
import { DATOS_FIJOS, type DatoFijo } from "./datos-fijos";
import { CARPETA_PREVIAS, type DatosPrevias, type PreviaDato, type PreviaGasto, type PreviaHerencia, type PreviaParte, type PreviaSemaforo } from "./previas";

const PUBLICO = path.join(process.cwd(), "public");

function leerJson<T>(...partes: string[]): T | null {
  try { return JSON.parse(fs.readFileSync(path.join(PUBLICO, ...partes), "utf8")) as T; } catch { return null; }
}

let previas: DatosPrevias | null | undefined;
/** El resumen que escribe `npm run previas` (null si no se corrió). */
export function leerPrevias(): DatosPrevias | null {
  if (previas === undefined) previas = leerJson<DatosPrevias>(CARPETA_PREVIAS, "_datos.json");
  return previas;
}
export const previaDe = (slug: string): PreviaDato | null => leerPrevias()?.datos[slug] ?? null;

let ids: Set<string> | null | undefined;
/** Ids de las series del catálogo que generó el pipeline (null si no está). */
function idsCatalogo(): Set<string> | null {
  if (ids === undefined) {
    const cat = leerJson<{ series: { id: string }[] }>("datos", "catalogo.json");
    ids = cat ? new Set(cat.series.map((s) => s.id)) : null;
  }
  return ids;
}

/** Datos fijos con página: los que tienen su serie (y la de la relación, si hay) en el catálogo. Sin catálogo, todos. */
export function fijosPublicables(): DatoFijo[] {
  const S = idsCatalogo();
  return S ? DATOS_FIJOS.filter((d) => S.has(d.e.id) && (!d.e.rel || S.has(d.e.rel))) : DATOS_FIJOS;
}

/** Título, descripción e imagen del parte del Banco Central (null si `npm run previas` no lo generó: la página usa los textos generales). */
export const previaParte = (): PreviaParte | null => leerJson<PreviaParte>(CARPETA_PREVIAS, "bcra.json");

/** Título, descripción e imagen del semáforo de actividad (null si `npm run previas` no lo generó: la página usa los textos generales). */
export const previaSemaforo = (): PreviaSemaforo | null => leerJson<PreviaSemaforo>(CARPETA_PREVIAS, "semaforo.json");

/** Título, descripción e imagen de la herencia (null si `npm run previas` no lo generó: la página usa los textos generales). */
export const previaHerencia = (): PreviaHerencia | null => leerJson<PreviaHerencia>(CARPETA_PREVIAS, "herencia.json");

/** Título, descripción e imagen del gasto de la Nación (null si `npm run previas` no lo generó: la página usa los textos generales). */
export const previaGasto = (): PreviaGasto | null => leerJson<PreviaGasto>(CARPETA_PREVIAS, "gasto.json");
