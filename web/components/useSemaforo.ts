"use client";
// Carga de semaforo.json (docs/specs/semaforo-actividad.md). Va aparte del catálogo: no pasa por DatosProvider.
// Se baja una sola vez y se comparte entre la página /semaforo/ y lo que la use.
import { useEffect, useState } from "react";
import { decodificar, type Semaforo, type SemaforoCrudo } from "@/lib/semaforo";

let promesa: Promise<Semaforo> | null = null;
function bajar(): Promise<Semaforo> {
  if (!promesa) {
    promesa = fetch("/datos/semaforo.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<SemaforoCrudo>; })
      .then((c) => { const s = decodificar(c); if (!s) throw new Error("el archivo no trae indicadores"); return s; })
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** `datos` es null mientras carga o si falló (en ese caso `error` trae el mensaje). */
export function useSemaforo(): { datos: Semaforo | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: Semaforo | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudo cargar el semáforo de actividad (${e.message}).` }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
