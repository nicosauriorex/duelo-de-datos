"use client";
// Carga del gasto de la Nación (docs/specs/gasto-nacion.md): el índice `gasto_nacion.json` y, a pedido, el archivo de cada año.
// Van aparte del catálogo (no pasan por DatosProvider). Cada archivo se baja una sola vez por visita y queda en memoria.
import { useEffect, useState } from "react";
import { decodificarAnio, decodificarIndice, type ArchivoAnio, type IndiceGasto } from "@/lib/gasto";
import { decodificarMensual, type ArchivoMensual } from "@/lib/gasto-mensual";

let indice: Promise<IndiceGasto> | null = null;
const anios = new Map<string, Promise<ArchivoAnio>>();

function bajarIndice(): Promise<IndiceGasto> {
  if (!indice) {
    indice = fetch("/datos/gasto_nacion.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((c) => { const ix = decodificarIndice(c); if (!ix) throw new Error("el archivo no trae años"); return ix; })
      .catch((e) => { indice = null; throw e; });
  }
  return indice;
}

/** Baja (o devuelve de la memoria) el archivo de un año. `version` evita una copia vieja del navegador cuando el pipeline lo rehace. */
export function bajarAnio(archivo: string, version: string): Promise<ArchivoAnio> {
  let p = anios.get(archivo);
  if (!p) {
    p = fetch(`/datos/${archivo}?v=${encodeURIComponent(version)}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((c) => { const a = decodificarAnio(c); if (!a) throw new Error("el archivo no trae datos"); return a; })
      .catch((e) => { anios.delete(archivo); throw e; });
    anios.set(archivo, p);
  }
  return p;
}

/** El índice: `datos` es null mientras carga o si falló (en ese caso `error` trae el mensaje). */
export function useGastoIndice(): { datos: IndiceGasto | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: IndiceGasto | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    let vivo = true;
    bajarIndice().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudo cargar el gasto de la Nación (${e.message}).` }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}

/** Los archivos de los años pedidos (por nombre de archivo). Devuelve los que ya llegaron, si terminó de cargar y el error, si hubo. */
export function useGastoAnios(ix: IndiceGasto | null, archivos: string[]): { listos: Map<string, ArchivoAnio>; cargando: boolean; error: string | null } {
  const [estado, setEstado] = useState<{ listos: Map<string, ArchivoAnio>; cargando: boolean; error: string | null }>({ listos: new Map(), cargando: true, error: null });
  const clave = [...new Set(archivos)].sort().join("|");
  useEffect(() => {
    if (!ix || !clave) { setEstado((e) => ({ ...e, cargando: false })); return; }
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    const lista = clave.split("|");
    Promise.allSettled(lista.map((a) => bajarAnio(a, ix.generado))).then((rs) => {
      if (!vivo) return;
      const listos = new Map<string, ArchivoAnio>();
      let error: string | null = null;
      rs.forEach((r, i) => { if (r.status === "fulfilled") listos.set(lista[i], r.value); else error = `No se pudo cargar ${lista[i]} (${(r.reason as Error).message}).`; });
      setEstado({ listos, cargando: false, error });
    });
    return () => { vivo = false; };
  }, [ix, clave]);
  return estado;
}

let mensual: Promise<ArchivoMensual | null> | null = null;
/** El archivo de la ejecución mensual (fase 2). Si falta o no valida, `datos` queda en null y la vista "Cómo viene" no aparece (sin error en pantalla). */
export function useGastoMensual(): { datos: ArchivoMensual | null; listo: boolean } {
  const [estado, setEstado] = useState<{ datos: ArchivoMensual | null; listo: boolean }>({ datos: null, listo: false });
  useEffect(() => {
    let vivo = true;
    if (!mensual) {
      mensual = fetch("/datos/gasto_nacion_mensual.json", { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => decodificarMensual(c))
        .catch(() => null);
    }
    mensual.then((datos) => { if (vivo) setEstado({ datos, listo: true }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
