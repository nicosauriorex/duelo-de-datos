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

// ---- imagen (PNG): compartir con el menú del sistema, descargar o copiar al portapapeles
export const archivoPng = (blob: Blob, nombre: string): File => new File([blob], nombre + ".png", { type: "image/png" });
/** ¿Este navegador puede compartir archivos con el menú del sistema? (casi solo los de celular) */
export const puedeCompartirArchivo = (f: File): boolean => typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: [f] });
export const puedeCopiarImagen = (): boolean => typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

export type ResultadoImagen = "compartida" | "copiada" | "descargada" | "cancelado" | "error";
export async function compartirImagen(f: File, titulo: string, url: string): Promise<ResultadoImagen> {
  try { await navigator.share({ files: [f], title: titulo, url: new URL(url, window.location.origin).toString() }); return "compartida"; }
  catch (e) { return (e as Error).name === "AbortError" ? "cancelado" : "error"; }
}
export async function copiarImagen(blob: Blob): Promise<ResultadoImagen> {
  try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); return "copiada"; } catch { return "error"; }
}
export function descargarImagen(f: File): ResultadoImagen {
  try {
    const url = URL.createObjectURL(f), a = document.createElement("a");
    a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return "descargada";
  } catch { return "error"; }
}
export const avisoImagen = (r: ResultadoImagen): string | null =>
  r === "copiada" ? "Imagen copiada" : r === "descargada" ? "Imagen descargada" : r === "error" ? "No se pudo copiar" : null;
