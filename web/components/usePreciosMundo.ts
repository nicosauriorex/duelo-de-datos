"use client";
// Carga de precios_mundo.json (niveles de precios por rubro, bloque 6c, D-008). Se baja una sola vez y se comparte.
import { useEffect, useState } from "react";
import type { DatosPM } from "@/lib/preciosMundo";

let promesa: Promise<DatosPM> | null = null;
function bajar(): Promise<DatosPM> {
  if (!promesa) {
    promesa = fetch("/datos/precios_mundo.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DatosPM>; })
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** `datos` = null mientras carga o si falló (en ese caso `error` trae el mensaje). */
export function usePreciosMundo(): { datos: DatosPM | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: DatosPM | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudieron cargar los precios en el mundo (${e.message}).` }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
