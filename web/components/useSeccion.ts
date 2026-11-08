"use client";
import { useDatos, useCargar } from "./DatosProvider";

/** Pide los archivos de datos que necesita una sección. `ids` = series; "todo" = todas las categorías. */
export function useSeccion(ids: string[] | "todo") {
  const d = useDatos();
  const archivos = !d.listo ? [] : ids === "todo" ? d.todosLosArchivos() : d.archivosDe(ids);
  const cargado = useCargar(archivos);
  return { ...d, cargado, archivos, ocupado: !d.listo || !cargado };
}
