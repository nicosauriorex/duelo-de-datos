"use client";
// Resumen de la vista en un renglón: lo elegido (Mensual, 2003–hoy, Nacional) y un botón "Ajustes".
import { useRef } from "react";
import { useDeslizable } from "@/components/Movimiento";
import { IconoAjustes } from "@/components/Iconos";

export function BarraVista({ items, onAbrir }: { items: { clave: string; texto: string }[]; onAbrir: (clave?: string) => void }) {
  const fila = useRef<HTMLDivElement>(null);
  useDeslizable(fila, false, items.length);
  return (
    <div className="vistabar">
      <div ref={fila} className="vistabar-fila" role="group" aria-label="Lo que se está mostrando">
        {items.map((it) => (
          <button key={it.clave} type="button" className="vistabar-chip" aria-label={`${it.texto}: cambiar`} onClick={() => onAbrir(it.clave)}>
            <span className="vistabar-cuerpo">{it.texto}</span>
          </button>
        ))}
      </div>
      <button type="button" className="vistabar-ajustes" aria-haspopup="dialog" onClick={() => onAbrir()}>
        <IconoAjustes /><span>Ajustes</span>
      </button>
    </div>
  );
}
