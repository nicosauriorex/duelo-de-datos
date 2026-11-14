"use client";
// Buscador global: capa a pantalla completa en el celular, centrada (640 px) en la computadora.
// Mismo contrato que `Hoja`: Escape cierra solo la capa de arriba, Atrás cierra sin salir de la página y el foco vuelve a donde estaba.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAtras, useCapa } from "@/components/ui";
import { Buscador } from "./Buscador";
import { IconoCerrar } from "./iconos";

const FOCALES = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BuscadorGlobal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const panel = useRef<HTMLDivElement>(null);
  const abiertoRef = useRef(abierto);
  abiertoRef.current = abierto;
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;
  const esLaDeArriba = useCapa(abierto);
  const cerrarAtras = useAtras(abierto, useCallback(() => alCerrar.current(), []));
  const cerrarRef = useRef(cerrarAtras);
  cerrarRef.current = cerrarAtras;

  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape" && esLaDeArriba()) { ev.stopPropagation(); cerrarRef.current(); } };
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("keydown", tecla, true);
      document.body.style.overflow = overflow;
      if (previo && previo.isConnected) previo.focus({ preventScroll: true });
    };
  }, [abierto, esLaDeArriba]);

  /** Un link con capas abiertas ya cierra la capa (`ui.tsx`). Si no lo hizo (el destino es la página donde ya está), se cierra acá. */
  const alElegir = () => { window.setTimeout(() => { if (abiertoRef.current) cerrarRef.current(); }, 300); };

  /** Tab no sale de la capa. */
  const atrapar = (ev: React.KeyboardEvent) => {
    if (ev.key !== "Tab" || !panel.current) return;
    const f = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCALES)).filter((e) => e.offsetParent !== null || e === document.activeElement);
    if (!f.length) { ev.preventDefault(); return; }
    const primero = f[0], ultimo = f[f.length - 1], en = document.activeElement;
    if (ev.shiftKey && en === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && en === ultimo) { ev.preventDefault(); primero.focus(); }
  };

  if (!abierto || !montado) return null;
  return createPortal(
    <div className="busqg-velo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) cerrarAtras(); }} onKeyDown={atrapar}>
      <div className="busqg" ref={panel} role="dialog" aria-modal="true" aria-label="Buscar">
        <header className="busqg-cab">
          <h2>Buscar</h2>
          <button type="button" className="busqg-cruz" aria-label="Cerrar" onClick={() => cerrarAtras()}><IconoCerrar /></button>
        </header>
        <div className="busqg-cuerpo"><Buscador autoFoco onElegido={alElegir} /></div>
      </div>
    </div>,
    document.body,
  );
}
