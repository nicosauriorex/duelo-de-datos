"use client";
// Carga de herencia_informes.json (herencia, fase 2: datos de informes cargados a mano en datos/manual/herencia.json). Se baja una sola vez.
// Si el archivo no está o falla, la página sigue con las series (fase 1): los datos de informes son un agregado, no una condición.
import { useEffect, useState } from "react";
import type { DatosInformes, DatoInforme } from "@/lib/herencia-informes";

let promesa: Promise<DatoInforme[]> | null = null;
function bajar(): Promise<DatoInforme[]> {
  if (!promesa) {
    promesa = fetch("/datos/herencia_informes.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DatosInformes>; })
      .then((j) => (Array.isArray(j?.datos) ? j.datos : []))
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** `datos` = null mientras carga; [] si falló o no hay archivo (con `error` para avisar). */
export function useHerenciaInformes(): { datos: DatoInforme[] | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: DatoInforme[] | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: [], error: `No se pudieron cargar los datos de informes (${e.message}).` }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
