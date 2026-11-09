"use client";
// Carga de capacidad.json (capacidad de gobierno, bloque 6d, D-009). Se baja una sola vez y se comparte.
import { useEffect, useState } from "react";
import type { DatosCap } from "@/lib/capacidad";

let promesa: Promise<DatosCap> | null = null;
function bajar(): Promise<DatosCap> {
  if (!promesa) {
    promesa = fetch("/datos/capacidad.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DatosCap>; })
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** `datos` = null mientras carga o si falló (en ese caso `error` trae el mensaje). */
export function useCapacidad(): { datos: DatosCap | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: DatosCap | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudo cargar la capacidad de gobierno (${e.message}).` }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
