"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

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

/** Capas abiertas (ventanas, desplegables y selectores) en orden de apertura: Escape cierra solo la de arriba. */
const pilaModales: symbol[] = [];
/** Mientras `abierta` es true, esta capa está en la pila. Devuelve una función que dice si es la de arriba. */
export function useCapa(abierta: boolean): () => boolean {
  const yo = useRef(Symbol("capa"));
  useEffect(() => {
    if (!abierta) return;
    const id = yo.current;
    pilaModales.push(id);
    return () => { const k = pilaModales.indexOf(id); if (k >= 0) pilaModales.splice(k, 1); };
  }, [abierta]);
  return useCallback(() => pilaModales[pilaModales.length - 1] === yo.current, []);
}

// ---------------------------------------------------------------- botón Atrás del navegador
// Cada capa abierta agrega UNA entrada al historial (misma URL). Un único `popstate` global cierra la capa de arriba.
// - Cierre por Atrás: el navegador ya consumió la entrada; se llama a onCerrar.
// - Cierre por otro camino (cruz, Escape, clic afuera, elegir): al desmontar el efecto se consume la entrada con
//   `history.back()` y se anota en `silencio` para que ese `popstate` no cierre la capa de abajo.
// - `router.replace` de Next (filtros en la URL) reemplaza la entrada actual y perdería nuestra marca `__capa`:
//   se parchea `replaceState` una vez para conservarla. La marca también evita deshacer una navegación: si la
//   capa se desmonta porque se cambió de ruta (la entrada actual ya no es la suya), no se llama a `back()`.
// - Página abierta directo: el `pushState` crea la entrada, así Atrás cierra la capa y no sale del sitio.
// - StrictMode: el efecto corre dos veces; la profundidad (no un token) es la marca, así el `back()` diferido del
//   primer ciclo cae sobre una entrada equivalente a la del segundo.
interface EntradaAtras { profundidad: number; alCerrar: () => void; cerrando: boolean }
const pilaAtras: EntradaAtras[] = [];
let silencio = 0;
/** La URL más nueva escrita mientras hay capas abiertas (ver `llevarUrl`). */
let urlCapas: string | null = null;
/** Enlace que se tocó con capas abiertas y que se sigue cuando sus entradas del historial ya se consumieron. */
let irA: HTMLAnchorElement | null = null;
let atrasInstalado = false;

function instalarAtras() {
  if (atrasInstalado || typeof window === "undefined") return;
  atrasInstalado = true;
  const original = window.history.replaceState;
  // Los filtros se guardan en la URL con `replaceState`. Si cambian con una capa abierta, quedan escritos en la entrada
  // de la capa; al volver a la entrada de abajo hay que llevarse esa URL, o el cambio se pierde del link.
  const llevarUrl = () => {
    if (!urlCapas) return;
    const quiero = new URL(urlCapas);
    if (quiero.pathname !== window.location.pathname) urlCapas = null;          // se cambió de página: no tocar
    else if (urlCapas !== window.location.href) original.call(window.history, window.history.state, "", urlCapas);
  };
  window.addEventListener("popstate", () => {
    llevarUrl();
    if (silencio > 0) silencio--;
    else { const e = pilaAtras.pop(); if (e) e.alCerrar(); }
    if (!pilaAtras.length && !silencio) urlCapas = null;
    if (irA && !silencio) { const a = irA; irA = null; a.click(); }   // ya sin capas en el historial: ahora sí, seguir el enlace
  }, true);   // en captura: corre antes que el `popstate` de Next, que si no vuelve a escribir la URL vieja
  // Un enlace del sitio tocado con capas abiertas (por ejemplo "Ir a la página del tema" dentro de una ventana): primero se
  // cierran las capas y se consumen sus entradas, y recién después se navega. Si no, quedaría una entrada de más en el
  // historial y desde la página nueva harían falta dos Atrás para volver.
  document.addEventListener("click", (ev) => {
    if (!pilaAtras.length || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = (ev.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.origin !== window.location.origin) return;
    if (a.pathname === window.location.pathname && a.search === window.location.search) return;   // solo un ancla de la misma página
    ev.preventDefault(); ev.stopPropagation();
    // El enlace puede desaparecer al cerrarse su ventana: se sigue una copia suelta, que Next no intercepta (carga la página de destino).
    const copia = document.createElement("a"); copia.href = a.href;
    const capas = pilaAtras.splice(0);
    irA = copia; silencio++;
    for (const c of capas.reverse()) c.alCerrar();
    window.history.go(-capas.length);
  }, true);
  window.history.replaceState = function (this: History, estado: unknown, titulo: string, url?: string | URL | null) {
    const actual = window.history.state as { __capa?: number } | null;
    // `useParams` escribe con estado null: también ahí se conserva la marca de la capa
    if (actual && actual.__capa !== undefined && (estado == null || (typeof estado === "object" && (estado as { __capa?: number }).__capa === undefined))) {
      estado = { ...((estado as object | null) ?? {}), __capa: actual.__capa };
    }
    const r = original.call(this, estado, titulo, url);
    if (pilaAtras.length) urlCapas = window.location.href;
    return r;
  };
}

/** Mientras `abierta` es true, el botón Atrás del navegador cierra esta capa en vez de salir de la página.
 *  Devuelve `cerrar`: llamarla cierra la capa (consume la entrada del historial que se había agregado y después llama a onCerrar una sola vez). */
export function useAtras(abierta: boolean, onCerrar: () => void): () => void {
  const cb = useRef(onCerrar);
  cb.current = onCerrar;
  const entrada = useRef<EntradaAtras | null>(null);
  useEffect(() => {
    if (!abierta) return;
    instalarAtras();
    const e: EntradaAtras = { profundidad: pilaAtras.length + 1, alCerrar: () => cb.current(), cerrando: false };
    pilaAtras.push(e); entrada.current = e;
    const base = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
    window.history.pushState({ ...base, __capa: e.profundidad }, "", window.location.href);
    urlCapas = window.location.href;
    return () => {
      if (entrada.current === e) entrada.current = null;
      const k = pilaAtras.indexOf(e);
      if (k < 0) return;                       // ya la consumió el botón Atrás
      pilaAtras.splice(k, 1);
      const actual = window.history.state as { __capa?: number } | null;
      if (actual && actual.__capa === e.profundidad) { silencio++; window.history.back(); }
      else if (!pilaAtras.length && !silencio) urlCapas = null;
    };
  }, [abierta]);
  return useCallback(() => {
    const e = entrada.current;
    if (!e) { cb.current(); return; }
    if (e.cerrando) return;                    // doble clic: no consumir una entrada ajena
    e.cerrando = true;
    if (pilaAtras[pilaAtras.length - 1] === e) window.history.back();   // el popstate llama a onCerrar
    else cb.current();
  }, []);
}

/** Panel desplegable que se abre debajo del botón y EMPUJA el contenido (no flota encima).
 *  Se cierra con Escape, con un clic afuera, con su cruz o con Atrás. */
export function Desplegable({ etiqueta, children, abiertoInicial = false, className = "" }: {
  etiqueta: ReactNode; children: ReactNode; abiertoInicial?: boolean; className?: string;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const esLaDeArriba = useCapa(abierto);
  const cerrarAtras = useAtras(abierto, () => setAbierto(false));
  useEffect(() => {
    if (!abierto) return;
    const clic = (ev: MouseEvent) => { if (raiz.current && !raiz.current.contains(ev.target as Node)) setAbierto(false); };
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape" && esLaDeArriba()) { setAbierto(false); boton.current?.focus(); } };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", tecla); };
  }, [abierto, esLaDeArriba]);
  return (
    <div className={`desplegable ${className}`} ref={raiz}>
      <button ref={boton} type="button" className="btn drop" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}><span className="et">{etiqueta}</span></button>
      {abierto && (
        <div className="panel">
          <div className="panel-cruz"><button type="button" className="cruz-capa" aria-label="Cerrar" onClick={() => { cerrarAtras(); boton.current?.focus(); }}><IconoCruz /></button></div>
          {children}
        </div>
      )}
    </div>
  );
}

function IconoCruz() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

/** Dentro de un `Modal`: cierra la ventana por el camino de "Atrás". `luego` se llama después de que la ventana se cerró
 *  (por ejemplo, para aplicar un cambio de URL recién cuando el historial ya volvió a su lugar). */
const CerrarModalCtx = createContext<(luego?: () => void) => void>(() => {});
export const useCerrarModal = () => useContext(CerrarModalCtx);

/** Ventana modal con foco, cruz de cerrar (44 px), Escape, clic en el fondo y botón Atrás para cerrar. */
export function Modal({ titulo, onCerrar, children, ancho }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: boolean }) {
  const yo = useRef(Symbol("modal"));
  const luego = useRef<(() => void) | null>(null);
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;
  const cerrarAtras = useAtras(true, useCallback(() => {
    alCerrar.current();
    const f = luego.current; luego.current = null;
    f?.();
  }, []));
  const cerrar = useCallback((fn?: () => void) => { if (fn) luego.current = fn; cerrarAtras(); }, [cerrarAtras]);
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  useEffect(() => {
    const id = yo.current;
    pilaModales.push(id);   // la ventana es una capa más; con un desplegable abierto encima, Escape no la toca
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape" && pilaModales[pilaModales.length - 1] === id) { ev.stopPropagation(); cerrarRef.current(); } };
    document.addEventListener("keydown", tecla, true);
    return () => { document.removeEventListener("keydown", tecla, true); const k = pilaModales.indexOf(id); if (k >= 0) pilaModales.splice(k, 1); };
  }, []);
  return (
    <div className="modal-fondo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) cerrar(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: "100%", ...(ancho ? { width: "min(760px,100%)" } : null) }}>
        <button type="button" className="cruz-capa modal-cruz" aria-label="Cerrar" onClick={() => cerrar()}><IconoCruz /></button>
        <CerrarModalCtx.Provider value={cerrar}>{children}</CerrarModalCtx.Provider>
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
  useCapa(abierto);   // para que Escape dentro de una ventana cierre solo la lista
  const luego = useRef<(() => void) | null>(null);
  // Atrás cierra la lista; al elegir, el cambio (que puede tocar la URL) se aplica recién cuando el historial ya volvió a su lugar
  const cerrarAtras = useAtras(abierto, useCallback(() => {
    setAbierto(false);
    const f = luego.current; luego.current = null;
    f?.();
  }, []));
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
  const elegir = (i: number) => {
    const o = opciones[i];
    if (o) luego.current = () => onElegir(o[0]);
    cerrarAtras(); boton.current?.focus();
  };

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
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.max, maxWidth: "calc(100vw - 8px)" }}>
          {opciones.map(([v, t], i) => (
            <li key={v} id={`${id}-${i}`} data-i={i} role="option" aria-selected={v === valor} className={i === activo ? "activo" : undefined}
              onMouseEnter={() => setActivo(i)} onClick={() => elegir(i)}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
