"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Grupo de botones. `valor` es un string (selección única) o un Set (múltiple). */
export function Seg({ opciones, valor, onElegir, id }: {
  opciones: [string, string][]; valor: string | Set<string>; onElegir: (v: string) => void; id?: string;
}) {
  const activo = (v: string) => (valor instanceof Set ? valor.has(v) : valor === v);
  return (
    <div className="seg" id={id} role="group">
      {opciones.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={activo(v)} onClick={() => onElegir(v)}>{t}</button>
      ))}
    </div>
  );
}

/** Alterna un valor en un Set; `vacio` permite dejarlo sin elementos. */
export function alternar(set: Set<string>, v: string, vacio = false): Set<string> {
  const n = new Set(set);
  if (n.has(v)) { if (n.size > 1 || vacio) n.delete(v); } else n.add(v);
  return n;
}

/** Panel desplegable que se abre debajo del botón y EMPUJA el contenido (no flota encima).
 *  Se cierra con Escape o con un clic afuera. */
export function Desplegable({ etiqueta, children, abiertoInicial = false, className = "" }: {
  etiqueta: ReactNode; children: ReactNode; abiertoInicial?: boolean; className?: string;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const clic = (ev: MouseEvent) => { if (raiz.current && !raiz.current.contains(ev.target as Node)) setAbierto(false); };
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape") { setAbierto(false); boton.current?.focus(); } };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", tecla); };
  }, [abierto]);
  return (
    <div className={`desplegable ${className}`} ref={raiz}>
      <button ref={boton} type="button" className="btn drop" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>{etiqueta}</button>
      {abierto && <div className="panel">{children}</div>}
    </div>
  );
}

/** Ventana modal con foco, Escape y clic en el fondo para cerrar. */
export function Modal({ titulo, onCerrar, children, ancho }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: boolean }) {
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape") { ev.stopPropagation(); onCerrar(); } };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  }, [onCerrar]);
  return (
    <div className="modal-fondo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) onCerrar(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={ancho ? { width: "min(760px,100%)" } : undefined}>
        {children}
      </div>
    </div>
  );
}

export function Cargando({ texto = "Cargando datos…" }: { texto?: string }) {
  return <p className="note" role="status">{texto}</p>;
}
