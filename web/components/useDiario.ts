"use client";
// Carga de diario_bcra.json (historia diaria del Banco Central, docs/specs/parte-diario-bcra.md). Va aparte del catálogo: no pasa por DatosProvider.
// Se baja una sola vez y se comparte entre la página /bcra/ y el bloque de la portada.
import { useEffect, useState } from "react";
import { armarParte, decodificar, type Diario, type DiarioCrudo, type Parte } from "@/lib/diario";

let promesa: Promise<Diario> | null = null;
function bajar(): Promise<Diario> {
  if (!promesa) {
    promesa = fetch("/datos/diario_bcra.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DiarioCrudo>; })
      .then(decodificar)
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** `datos` y `parte` son null mientras carga o si falló (en ese caso `error` trae el mensaje). */
export function useDiario(activo = true): { datos: Diario | null; parte: Parte | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: Diario | null; parte: Parte | null; error: string | null }>({ datos: null, parte: null, error: null });
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    bajar().then((datos) => {
      if (!vivo) return;
      const parte = armarParte(datos);
      setEstado(parte ? { datos, parte, error: null } : { datos: null, parte: null, error: "El archivo del parte no trae datos." });
    }).catch((e: Error) => { if (vivo) setEstado({ datos: null, parte: null, error: `No se pudo cargar el parte del Banco Central (${e.message}).` }); });
    return () => { vivo = false; };
  }, [activo]);
  return estado;
}
