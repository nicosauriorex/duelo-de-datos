"use client";
// Carga de herencia_informes.json (herencia, fase 2: datos de informes cargados a mano en datos/manual/herencia.json). Se baja una sola vez.
// Si el archivo no está o falla, la página sigue con las series (fase 1): los datos de informes son un agregado, no una condición.
import { useEffect, useState } from "react";
import type { DatosInformes, DatoInforme, ReservasNetas } from "@/lib/herencia-informes";

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

// Estimación propia de reservas netas (fase 3, reservas_netas.json). Si falta o falla, la fila no aparece: no es una condición de la página.
let promesaRN: Promise<ReservasNetas | null> | null = null;
function bajarRN(): Promise<ReservasNetas | null> {
  if (!promesaRN) {
    promesaRN = fetch("/datos/reservas_netas.json", { cache: "no-cache" })
      .then((r) => (r.ok ? (r.json() as Promise<ReservasNetas>) : null))
      .catch(() => { promesaRN = null; return null; });
  }
  return promesaRN;
}

/** `undefined` mientras carga; null si no hay archivo. */
export function useReservasNetas(): ReservasNetas | null | undefined {
  const [rn, setRn] = useState<ReservasNetas | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    bajarRN().then((x) => { if (vivo) setRn(x); });
    return () => { vivo = false; };
  }, []);
  return rn;
}
