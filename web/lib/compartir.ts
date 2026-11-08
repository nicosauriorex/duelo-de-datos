"use client";
// Compartir un link: menú del sistema si existe; si no, se copia al portapapeles.
export type ResultadoCompartir = "compartido" | "copiado" | "cancelado" | "error";
export async function compartir(url: string, titulo: string): Promise<ResultadoCompartir> {
  const abs = new URL(url, window.location.origin).toString();
  if (typeof navigator.share === "function") {
    try { await navigator.share({ title: titulo, url: abs }); return "compartido"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelado"; /* si falla por otra razón, se intenta copiar */ }
  }
  try { await navigator.clipboard.writeText(abs); return "copiado"; } catch { return "error"; }
}
export const avisoCompartir = (r: ResultadoCompartir): string | null =>
  r === "copiado" ? "Link copiado" : r === "error" ? "No se pudo copiar el link" : null;
