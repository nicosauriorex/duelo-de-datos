"use client";
// Plantillas propias: se guardan en el navegador (localStorage["pld:plantillas"]). Si no se puede escribir
// (navegación privada, almacenamiento bloqueado) siguen valiendo mientras la pestaña está abierta.
import { useCallback, useEffect, useState } from "react";
import type { Vista } from "./plantillas";

export const CLAVE_PLANTILLAS = "pld:plantillas";
export const MAX_PROPIAS = 50;
export const MAX_NOMBRE = 60;
export interface Propia { id: string; nombre: string; vista: Vista; fecha: string }
export interface Resultado { ok: boolean; aviso?: string; id?: string }

export const SIN_GUARDAR = "No se pudo guardar en este navegador: la plantilla sirve mientras no cierres esta pestaña.";
let memoria: Propia[] | null = null; // copia de la sesión (sobrevive a la navegación entre secciones)

const limpiar = (raw: unknown): Propia[] => {
  if (!Array.isArray(raw)) return [];
  const out: Propia[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.nombre !== "string" || !o.vista || typeof o.vista !== "object") continue;
    const vista: Vista = {};
    for (const [k, v] of Object.entries(o.vista as Record<string, unknown>)) if (typeof v === "string") vista[k] = v;
    out.push({ id: o.id, nombre: o.nombre.slice(0, MAX_NOMBRE), vista, fecha: typeof o.fecha === "string" ? o.fecha : "" });
  }
  return out.slice(0, MAX_PROPIAS);
};
export function leerPropias(): Propia[] {
  try {
    const t = localStorage.getItem(CLAVE_PLANTILLAS);
    if (t != null) { memoria = limpiar(JSON.parse(t)); return memoria; }
  } catch { /* almacenamiento no disponible: se usa la copia de la sesión */ }
  return memoria ?? [];
}
function guardarPropias(lista: Propia[]): boolean {
  memoria = lista;
  try { localStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify(lista)); return true; } catch { return false; }
}
const nuevoId = () => "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const nombreValido = (n: string) => n.trim().slice(0, MAX_NOMBRE);

export function useMisPlantillas() {
  const [lista, setLista] = useState<Propia[]>([]);
  const [leido, setLeido] = useState(false);
  useEffect(() => { setLista(leerPropias()); setLeido(true); }, []);
  const aplicar = useCallback((nueva: Propia[], id?: string): Resultado => {
    const ok = guardarPropias(nueva);
    setLista(nueva);
    return ok ? { ok: true, id } : { ok: true, id, aviso: SIN_GUARDAR };
  }, []);
  const agregar = useCallback((nombre: string, vista: Vista): Resultado => {
    const actual = leerPropias(), n = nombreValido(nombre);
    if (!n) return { ok: false, aviso: "Poné un nombre para la plantilla." };
    if (actual.length >= MAX_PROPIAS) return { ok: false, aviso: `Ya tenés ${MAX_PROPIAS} plantillas propias, el máximo. Borrá alguna para guardar otra.` };
    const id = nuevoId();
    return aplicar([...actual, { id, nombre: n, vista, fecha: new Date().toISOString() }], id);
  }, [aplicar]);
  const renombrar = useCallback((id: string, nombre: string): Resultado => {
    const n = nombreValido(nombre);
    if (!n) return { ok: false, aviso: "Poné un nombre para la plantilla." };
    return aplicar(leerPropias().map((p) => (p.id === id ? { ...p, nombre: n } : p)));
  }, [aplicar]);
  const borrar = useCallback((id: string): Resultado => aplicar(leerPropias().filter((p) => p.id !== id)), [aplicar]);
  return { lista, leido, agregar, renombrar, borrar };
}
