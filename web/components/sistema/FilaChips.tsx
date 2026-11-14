"use client";
// Opciones en un solo renglón que se desliza de costado, con fundido en el borde donde hay más.
import { useRef } from "react";
import { useDeslizable } from "@/components/Movimiento";

export function FilaChips({ opciones, valor, onElegir, etiqueta }: {
  opciones: [string, string][]; valor: string | Set<string>; onElegir: (v: string) => void; etiqueta: string;
}) {
  const fila = useRef<HTMLDivElement>(null);
  useDeslizable(fila, false, opciones.length);
  const activo = (v: string) => (valor instanceof Set ? valor.has(v) : valor === v);

  /** Desliza la fila (no la página) hasta que el chip elegido se vea entero. */
  const traer = (b: HTMLElement) => {
    const f = fila.current;
    if (!f) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const izq = b.offsetLeft - f.offsetLeft, der = izq + b.offsetWidth;
    let destino = f.scrollLeft;
    if (izq < f.scrollLeft + 24) destino = izq - 24;
    else if (der > f.scrollLeft + f.clientWidth - 24) destino = der - f.clientWidth + 24;
    if (destino !== f.scrollLeft) f.scrollTo({ left: Math.max(0, destino), behavior: quieto ? "auto" : "smooth" });
  };

  return (
    <div ref={fila} className="chips" role="group" aria-label={etiqueta}>
      {opciones.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={activo(v)} onClick={(e) => { traer(e.currentTarget); onElegir(v); }}>
          <span className="chips-cuerpo">{t}</span>
        </button>
      ))}
    </div>
  );
}
