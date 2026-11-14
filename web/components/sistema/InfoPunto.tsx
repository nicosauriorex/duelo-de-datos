"use client";
// Botón ⓘ de 44 px que abre un globo con texto corto. Posición fija como `Selector` (abajo o arriba según el espacio).
// Cierra con Escape, clic afuera, su cruz y Atrás.
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useAtras, useCapa } from "../ui";
import { IconoCerrar, IconoInfo } from "./iconos";

type Pos = { left: number; top?: number; bottom?: number; max: number };
const ANCHO = 320, MARGEN = 8;

export function InfoPunto({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const globo = useRef<HTMLDivElement>(null);
  const id = useId();
  const esLaDeArriba = useCapa(abierto);
  const cerrarAtras = useAtras(abierto, useCallback(() => setAbierto(false), []));

  const abrir = useCallback(() => {
    const r = boton.current?.getBoundingClientRect(); if (!r) return;
    const vh = window.innerHeight, vw = window.innerWidth;
    const abajo = vh - r.bottom - MARGEN, arriba = r.top - MARGEN;
    const ancho = Math.min(ANCHO, vw - 2 * MARGEN);
    const left = Math.max(MARGEN, Math.min(r.left + r.width / 2 - ancho / 2, vw - ancho - MARGEN));
    setPos(abajo >= 180 || abajo >= arriba
      ? { left, top: r.bottom + 4, max: Math.max(120, abajo - 4) }
      : { left, bottom: vh - r.top + 4, max: Math.max(120, arriba - 4) });
    setAbierto(true);
  }, []);

  const cerrar = useCallback((foco = true) => { cerrarAtras(); if (foco) boton.current?.focus(); }, [cerrarAtras]);

  useEffect(() => {
    if (!abierto) return;
    globo.current?.focus({ preventScroll: true });
    const clic = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (!globo.current?.contains(t) && !boton.current?.contains(t)) cerrar(false);
    };
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape" && esLaDeArriba()) { ev.stopPropagation(); cerrar(); } };
    const scroll = (ev: Event) => { if (!globo.current?.contains(ev.target as Node)) cerrar(false); };
    const ancho0 = window.innerWidth;
    const redim = () => { if (window.innerWidth !== ancho0) cerrar(false); };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", tecla, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", redim);
    return () => {
      document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", tecla, true);
      window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", redim);
    };
  }, [abierto, cerrar, esLaDeArriba]);

  return (
    <span className="infop">
      <button ref={boton} type="button" className="infop-btn" aria-label={etiqueta} aria-expanded={abierto} aria-controls={abierto ? id : undefined}
        aria-haspopup="dialog" onClick={() => (abierto ? cerrar() : abrir())}>
        <IconoInfo className="infop-icono" />
      </button>
      {abierto && pos && (
        <div ref={globo} id={id} className="infop-globo" role="dialog" aria-label={etiqueta} tabIndex={-1}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, maxHeight: pos.max }}>
          <button type="button" className="infop-cruz" aria-label="Cerrar" onClick={() => cerrar()}><IconoCerrar /></button>
          <div className="infop-texto">{children}</div>
        </div>
      )}
    </span>
  );
}
