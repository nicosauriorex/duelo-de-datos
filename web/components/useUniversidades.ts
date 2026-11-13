"use client";
// Carga de universidades.json (docs/specs/gasto-nacion.md, fase 3). Va aparte del catálogo: no pasa por DatosProvider.
// Se baja una sola vez por visita. Si el archivo falta o no valida, `datos` queda en null y `error` dice por qué (la página muestra un aviso).
import { useEffect, useState } from "react";
import { decodificarUniv, type DatosUniv } from "@/lib/universidades";

let promesa: Promise<DatosUniv> | null = null;
function bajar(): Promise<DatosUniv> {
  if (!promesa) {
    promesa = fetch("/datos/universidades.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((c) => { const d = decodificarUniv(c); if (!d) throw new Error("el archivo no trae universidades"); return d; })
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

export function useUniversidades(): { datos: DatosUniv | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: DatosUniv | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudieron cargar las transferencias a las universidades (${e.message}).` }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
