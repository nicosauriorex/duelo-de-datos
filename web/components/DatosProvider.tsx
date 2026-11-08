"use client";
// Carga de datos: catalogo.json + base.json siempre; cada <categoria>.json solo cuando una ruta lo pide.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { crearMotor, normalizarMeta, BASE_IDS, type Motor, type SerieDatos, type SerieMeta } from "@/lib/motor";

interface Catalogo { version: string; fechas: string[]; series: SerieMeta[] }
interface Ctx {
  listo: boolean;
  errorGeneral: string | null;
  motor: Motor | null;
  metas: SerieMeta[];
  version: number; // sube cada vez que llegan series nuevas (para recalcular)
  errores: Record<string, string>; // archivo -> mensaje
  cargar: (archivos: string[]) => Promise<void>;
  archivosDe: (ids: string[]) => string[];
  todosLosArchivos: () => string[];
}
const DatosCtx = createContext<Ctx | null>(null);
export const useDatos = () => {
  const c = useContext(DatosCtx);
  if (!c) throw new Error("useDatos fuera de DatosProvider");
  return c;
};

export function DatosProvider({ children }: { children: React.ReactNode }) {
  const [listo, setListo] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const motorRef = useRef<Motor | null>(null);
  const metasRef = useRef<SerieMeta[]>([]);
  const verDatos = useRef("");
  const pedidos = useRef(new Map<string, Promise<void>>());

  const pedir = useCallback((archivo: string): Promise<void> => {
    const previo = pedidos.current.get(archivo);
    if (previo) return previo;
    const p = (async () => {
      try {
        const r = await fetch(`/datos/${archivo}.json?v=${verDatos.current}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const datos = (await r.json()) as Record<string, SerieDatos>;
        motorRef.current!.agregar(metasRef.current.filter((m) => m.archivo === archivo), datos);
        setErrores((x) => { if (!(archivo in x)) return x; const n = { ...x }; delete n[archivo]; return n; });
        setVersion((v) => v + 1);
      } catch (e) {
        pedidos.current.delete(archivo); // permite reintentar
        setErrores((x) => ({ ...x, [archivo]: `No se pudo bajar los datos de "${archivo}" (${(e as Error).message}).` }));
      }
    })();
    pedidos.current.set(archivo, p);
    return p;
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/datos/catalogo.json", { cache: "no-cache" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const cat = (await r.json()) as Catalogo;
        if (!vivo) return;
        verDatos.current = cat.version;
        metasRef.current = cat.series.map(normalizarMeta);
        motorRef.current = crearMotor(cat.fechas);
        await pedir("base");
        if (!vivo) return;
        if (!BASE_IDS.every((id) => motorRef.current!.SER[id])) throw new Error("faltan series base");
        setListo(true);
      } catch (e) {
        if (vivo) setErrorGeneral(`No se pudieron cargar los datos (${(e as Error).message}). Probá recargar la página.`);
      }
    })();
    return () => { vivo = false; };
  }, [pedir]);

  const valor = useMemo<Ctx>(() => ({
    listo, errorGeneral, motor: motorRef.current, metas: metasRef.current, version, errores,
    cargar: async (archivos) => { await Promise.all([...new Set(archivos)].filter((a) => a !== "base").map(pedir)); },
    archivosDe: (ids) => [...new Set(ids.map((id) => metasRef.current.find((m) => m.id === id)?.archivo).filter(Boolean) as string[])],
    todosLosArchivos: () => [...new Set(metasRef.current.map((m) => m.archivo))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [listo, errorGeneral, version, errores, pedir]);

  return <DatosCtx.Provider value={valor}>{children}</DatosCtx.Provider>;
}

/** Pide los archivos necesarios; devuelve true cuando todos terminaron (con éxito o con error). */
export function useCargar(archivos: string[]): boolean {
  const { listo, cargar } = useDatos();
  const [hecho, setHecho] = useState(false);
  const clave = [...new Set(archivos)].sort().join("|");
  useEffect(() => {
    if (!listo) return;
    let vivo = true;
    setHecho(false);
    cargar(clave ? clave.split("|") : []).then(() => { if (vivo) setHecho(true); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, clave]);
  return listo && hecho;
}

/** Avisos de descarga fallida: se ven en todas las rutas y no tumban al resto. */
export function Errores() {
  const { errores } = useDatos();
  return <>{Object.entries(errores).map(([a, msg]) => <p key={a} className="error" role="alert">{msg}</p>)}</>;
}
