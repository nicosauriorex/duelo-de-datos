"use client";
// Capa de ajustes: hoja que sale desde abajo en el celular y panel a la derecha desde 900 px.
// Mismo contrato que `Modal` de ui.tsx: Escape cierra solo la capa de arriba, Atrás cierra sin salir de la página,
// el foco queda adentro y vuelve al botón que la abrió, y la cruz mide 44 px.
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAtras, useCapa } from "@/components/ui";
import { IconoCerrar } from "./iconos";

const FOCALES = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type CerrarHoja = (luego?: () => void) => void;

export function Hoja({ titulo, abierta, onCerrar, children, pie }: {
  titulo: string; abierta: boolean; onCerrar: () => void;
  /** Si es una función recibe `cerrar(luego?)`: cierra por el camino de Atrás y recién después corre `luego` (por ejemplo, para abrir otra capa). */
  children: ReactNode | ((cerrar: CerrarHoja) => ReactNode); pie?: ReactNode;
}) {
  const [montada, setMontada] = useState(false);
  useEffect(() => setMontada(true), []);
  const panel = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const luego = useRef<(() => void) | null>(null);
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;
  const esLaDeArriba = useCapa(abierta);
  const cerrarAtras = useAtras(abierta, useCallback(() => {
    alCerrar.current();
    const f = luego.current; luego.current = null;
    f?.();
  }, []));
  const cerrar = useCallback<CerrarHoja>((fn) => { if (fn) luego.current = fn; cerrarAtras(); }, [cerrarAtras]);
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;

  useEffect(() => {
    if (!abierta) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && esLaDeArriba()) { ev.stopPropagation(); cerrarRef.current(); }
    };
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("keydown", tecla, true);
      document.body.style.overflow = overflow;
      if (previo && previo.isConnected) previo.focus({ preventScroll: true });
    };
  }, [abierta, esLaDeArriba]);

  /** Tab no sale de la hoja. */
  const atrapar = (ev: React.KeyboardEvent) => {
    if (ev.key !== "Tab" || !panel.current) return;
    const f = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCALES)).filter((e) => e.offsetParent !== null || e === document.activeElement);
    if (!f.length) { ev.preventDefault(); panel.current.focus(); return; }
    const primero = f[0], ultimo = f[f.length - 1], en = document.activeElement;
    if (ev.shiftKey && (en === primero || en === panel.current)) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && en === ultimo) { ev.preventDefault(); primero.focus(); }
  };

  if (!abierta || !montada) return null;
  return createPortal(
    <div className="hoja-velo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) cerrar(); }} onKeyDown={atrapar}>
      <div className="hoja" ref={panel} role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1}>
        <span className="hoja-manija" aria-hidden="true" />
        <header className="hoja-cab">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="hoja-cruz" aria-label="Cerrar" onClick={() => cerrar()}><IconoCerrar /></button>
        </header>
        <div className="hoja-cuerpo">{typeof children === "function" ? children(cerrar) : children}</div>
        {pie && <footer className="hoja-pie">{pie}</footer>}
      </div>
    </div>,
    document.body,
  );
}
