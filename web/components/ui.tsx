"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

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
      <button ref={boton} type="button" className="btn drop" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}><span className="et">{etiqueta}</span></button>
      {abierto && <div className="panel">{children}</div>}
    </div>
  );
}

/** Ventana modal con foco, Escape y clic en el fondo para cerrar. */
const pilaModales: symbol[] = []; // con ventanas una sobre otra, Escape cierra solo la de arriba
export function Modal({ titulo, onCerrar, children, ancho }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: boolean }) {
  const yo = useRef(Symbol("modal"));
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  useEffect(() => {
    const id = yo.current;
    pilaModales.push(id);
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape" && pilaModales[pilaModales.length - 1] === id) { ev.stopPropagation(); cerrar.current(); } };
    document.addEventListener("keydown", tecla, true);
    return () => { document.removeEventListener("keydown", tecla, true); const k = pilaModales.indexOf(id); if (k >= 0) pilaModales.splice(k, 1); };
  }, []);
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

/** Desplegable propio (reemplaza al `<select>` nativo): mismo aspecto en todos los dispositivos.
 *  Enter / Espacio / flechas abren; flechas mueven; Enter elige; Escape cierra y devuelve el foco al botón. */
export function Selector({ etiqueta, valor, opciones, onElegir, className = "" }: {
  etiqueta: string; valor: string; opciones: [string, string][]; onElegir: (v: string) => void; className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; max: number } | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();
  const idx = Math.max(0, opciones.findIndex((o) => o[0] === valor));

  const abrir = useCallback(() => {
    const r = boton.current?.getBoundingClientRect(); if (!r) return;
    const vh = window.innerHeight, abajo = vh - r.bottom - 8, arriba = r.top - 8, alto = Math.min(280, opciones.length * 32 + 10);
    const hacia = abajo >= alto || abajo >= arriba ? "abajo" : "arriba";
    const left = Math.max(4, Math.min(r.left, window.innerWidth - Math.max(r.width, 160) - 4));
    setPos(hacia === "abajo" ? { left, top: r.bottom + 4, width: r.width, max: Math.min(280, abajo - 4) } : { left, bottom: vh - r.top + 4, width: r.width, max: Math.min(280, arriba - 4) });
    setActivo(idx); setAbierto(true);
  }, [idx, opciones.length]);
  const cerrar = useCallback((foco = true) => { setAbierto(false); if (foco) boton.current?.focus(); }, []);
  const elegir = (i: number) => { const o = opciones[i]; if (o) onElegir(o[0]); cerrar(); };

  useEffect(() => {
    if (!abierto) return;
    lista.current?.focus({ preventScroll: true });
    const clic = (ev: MouseEvent) => { const t = ev.target as Node; if (!raiz.current?.contains(t) && !lista.current?.contains(t)) cerrar(false); };
    const scroll = (ev: Event) => { if (!lista.current?.contains(ev.target as Node)) cerrar(false); };
    const ancho0 = window.innerWidth;
    const redim = () => { if (window.innerWidth !== ancho0) cerrar(false); }; // la barra del navegador en celular cambia solo el alto
    document.addEventListener("mousedown", clic);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", redim);
    return () => { document.removeEventListener("mousedown", clic); window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", redim); };
  }, [abierto, cerrar]);
  useEffect(() => { if (abierto) lista.current?.querySelector<HTMLElement>(`[data-i="${activo}"]`)?.scrollIntoView({ block: "nearest" }); }, [abierto, activo]);

  const teclaBoton = (ev: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp"].includes(ev.key)) { ev.preventDefault(); abrir(); }
  };
  const teclaLista = (ev: React.KeyboardEvent) => {
    const n = opciones.length;
    if (ev.key === "ArrowDown") { ev.preventDefault(); setActivo((activo + 1) % n); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActivo((activo + n - 1) % n); }
    else if (ev.key === "Home") { ev.preventDefault(); setActivo(0); }
    else if (ev.key === "End") { ev.preventDefault(); setActivo(n - 1); }
    else if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); elegir(activo); }
    else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); cerrar(); }
    else if (ev.key === "Tab") cerrar(false);
  };
  return (
    <div className={`sel ${className}`} ref={raiz}>
      <button ref={boton} type="button" className="btn sel-btn" aria-label={etiqueta} aria-haspopup="listbox" aria-expanded={abierto} aria-controls={abierto ? id : undefined}
        onClick={() => (abierto ? cerrar() : abrir())} onKeyDown={teclaBoton}><span className="et">{opciones[idx]?.[1] ?? ""}</span></button>
      {abierto && pos && (
        <ul ref={lista} id={id} className="sel-lista" role="listbox" tabIndex={-1} aria-label={etiqueta} aria-activedescendant={`${id}-${activo}`} onKeyDown={teclaLista}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.max }}>
          {opciones.map(([v, t], i) => (
            <li key={v} id={`${id}-${i}`} data-i={i} role="option" aria-selected={v === valor} className={i === activo ? "activo" : undefined}
              onMouseEnter={() => setActivo(i)} onClick={() => elegir(i)}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
