"use client";
// Carga de contexto.json (datos anuales del FMI, D-008). Se baja una sola vez y se comparte entre secciones.
import { useEffect, useState } from "react";
import type { DatosContexto } from "@/lib/contexto";

let promesa: Promise<DatosContexto> | null = null;
function bajar(): Promise<DatosContexto> {
  if (!promesa) {
    promesa = fetch("/datos/contexto.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DatosContexto>; })
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** `datos` = null mientras carga o si falló (en ese caso `error` trae el mensaje). */
export function useContexto(): { datos: DatosContexto | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: DatosContexto | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudieron cargar los datos de contexto internacional (${e.message}).` }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
