"use client";
// Estado en la URL (query string): se lee al abrir y se escribe con replaceState.
// Un parámetro inválido se ignora y cae al valor por defecto.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Expr } from "./motor";
import { ALIAS_ID } from "./nombres";

export const encExpr = (e: Expr): string => [e.id, e.med ?? "", e.rel ?? "", e.modo ?? "", e.esc ?? ""].join("~");
export function decExpr(s: string | null | undefined, existe: (id: string) => boolean): Expr | null {
  if (!s) return null;
  const [id0, med0, rel0, modo, esc] = s.split("~");
  const alias = ALIAS_ID[id0];     // `inflacion` e `inflacion_ia` ya no se listan: se leen como `ipc_empalme` mensual / interanual
  const id = alias ? alias.id : id0;
  if (!id || !existe(id)) return null;
  const rel = ALIAS_ID[rel0]?.id ?? rel0;
  // `vac` (acumulada en el año) se retiró: se lee como interanual. Un link viejo a `ipc_empalme` sin medida era interanual (hoy el defecto es mensual).
  const med = alias ? alias.med : med0 === "vac" ? "via" : med0 || (id === "ipc_empalme" ? "via" : undefined);
  return { id, med, rel: rel && existe(rel) ? rel : null, modo: modo || "compra", esc: esc || "" };
}
/** Traduce los ids viejos (`inflacion`, `inflacion_ia`) de una lista de expresiones de URL ("a~b~c,d~e") sin descartar nada. */
export function migrarListaExpr(s: string): string {
  return s.split(",").map((x) => {
    const t = x.split("~"), a = ALIAS_ID[t[0]];
    if (a) { t[0] = a.id; t[1] = a.med; }
    if (t[2] && ALIAS_ID[t[2]]) t[2] = ALIAS_ID[t[2]].id;
    return t.join("~");
  }).join(",");
}
export const lista = (s: string | null | undefined): string[] => (s ? s.split(",").filter(Boolean) : []);
export const enteroEn = (s: string | null | undefined, min: number, max: number, def: number): number => {
  const n = s == null || s === "" ? NaN : Number(s);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : def;
};
export const unoDe = <T extends string>(s: string | null | undefined, validos: readonly T[], def: T): T =>
  (validos as readonly string[]).includes(s ?? "") ? (s as T) : def;

/** Devuelve [params, escribir, montado]. `montado` es false hasta leer la URL real (evita desajustes de hidratación). */
export function useParams(): [URLSearchParams, (cambios: Record<string, string | null | undefined>) => void, boolean] {
  const [params, setParams] = useState(() => new URLSearchParams(""));
  const [montado, setMontado] = useState(false);
  const actual = useRef(params);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    actual.current = p; setParams(p); setMontado(true);
  }, []);
  const escribir = useCallback((cambios: Record<string, string | null | undefined>) => {
    const p = new URLSearchParams(actual.current);
    for (const [k, v] of Object.entries(cambios)) { if (v == null || v === "") p.delete(k); else p.set(k, v); }
    actual.current = p;
    const q = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (q ? "?" + q : "") + window.location.hash);
    setParams(p);
  }, []);
  return [params, escribir, montado];
}
