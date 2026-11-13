"use client";
// Carga de provincias.json (docs/specs/provincias.md, fase 1) y, a pedido, del archivo de un año. Va aparte del catálogo: no pasa por DatosProvider.
// El índice se baja una sola vez por visita y cada año, una sola vez por archivo. Si el archivo falta o no valida, `datos` queda en null y `error` dice por qué.
import { useEffect, useState } from "react";
import { decodificarAnioProv, decodificarProv, type ArchivoProv, type DatosProv } from "@/lib/provincias";

let promesa: Promise<DatosProv> | null = null;
function bajar(): Promise<DatosProv> {
  if (!promesa) {
    promesa = fetch("/datos/provincias.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((c) => { const d = decodificarProv(c); if (!d) throw new Error("el archivo no trae provincias"); return d; })
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

export function useProvincias(): { datos: DatosProv | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: DatosProv | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudo cargar el gasto de la Nación por provincia (${e.message}).` }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}

const anios = new Map<string, Promise<ArchivoProv>>();
/** Baja (o devuelve de la memoria) el archivo de un año. `version` evita una copia vieja del navegador cuando el pipeline lo rehace. */
function bajarAnio(archivo: string, version: string): Promise<ArchivoProv> {
  let p = anios.get(archivo);
  if (!p) {
    p = fetch(`/datos/${archivo}?v=${encodeURIComponent(version)}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((c) => { const a = decodificarAnioProv(c); if (!a) throw new Error("el archivo no trae datos"); return a; })
      .catch((e) => { anios.delete(archivo); throw e; });
    anios.set(archivo, p);
  }
  return p;
}

/** El archivo de un año (null mientras no se pide o carga). `archivo` null = no se pide nada. */
export function useProvinciasAnio(archivo: string | null, version: string): { datos: ArchivoProv | null; cargando: boolean; error: string | null } {
  const [estado, setEstado] = useState<{ clave: string; datos: ArchivoProv | null; error: string | null }>({ clave: "", datos: null, error: null });
  useEffect(() => {
    if (!archivo) return;
    let vivo = true;
    bajarAnio(archivo, version).then((datos) => { if (vivo) setEstado({ clave: archivo, datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ clave: archivo, datos: null, error: `No se pudo cargar el detalle de ${archivo} (${e.message}).` }); });
    return () => { vivo = false; };
  }, [archivo, version]);
  const actual = !!archivo && estado.clave === archivo;
  return { datos: actual ? estado.datos : null, cargando: !!archivo && !actual, error: actual ? estado.error : null };
}
