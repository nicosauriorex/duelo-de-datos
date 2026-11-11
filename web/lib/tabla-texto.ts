// Texto tabulado de la tabla de Histórico: para pegar en una planilla. Funciones puras (sin DOM).
import { etiqueta, type Fila } from "./estadisticas";
import { ok } from "./formato";

/** Una columna de la tabla: la clave en las filas, el nombre, la unidad (opcional) y cómo se escribe cada número (con coma decimal, como en pantalla). */
export interface ColTabla { key: string; name: string; unidad?: string; fmt: (v: number) => string }

const celda = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();

/** Filas de texto de la tabla, de la más reciente a la más vieja (como se ve en pantalla). Los datos que faltan van como "–". */
export function filasDeTabla(rows: Fila[], cols: ColTabla[]): string[][] {
  return rows.slice().reverse().map((r) => [etiqueta(r), ...cols.map((c) => (ok(r[c.key]) ? c.fmt(r[c.key]) : "–"))]);
}

/** Texto tabulado: encabezados, una línea por fila y, como última fila, la dirección de la vista. Sin tope de filas. */
export function tablaATexto(cols: ColTabla[], filas: string[][], url: string): string {
  const enc = ["Período", ...cols.map((c) => (c.unidad ? `${c.name} (${c.unidad})` : c.name))];
  return [enc, ...filas, [url]].map((f) => f.map(celda).join("\t")).join("\n");
}
