"use client";
// Barra fina de todas las páginas (logo, menú de 5 secciones y configuración), subsecciones de Presidentes y cabecera de página con "Volver".
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonConfig } from "./ConfigProvider";
import { useDeslizable } from "./Movimiento";
import { IconoAbajo, IconoVolver } from "./Iconos";
import { ORGANISMOS } from "@/lib/fuentes";

/** Las 5 secciones del menú: [carpeta, nombre]. */
export const SECCIONES: [string, string][] = [
  ["", "Inicio"], ["historico", "Histórico"], ["presidentes", "Presidentes"], ["contexto", "Contexto"], ["plantillas", "Gráficos listos"],
];
/** Subsecciones de Presidentes: [carpeta, ancla, nombre]. Las URLs son las de siempre. */
const SUBSECCIONES: [string, string, string][] = [
  ["presidentes", "", "Por presidente"], ["mandato", "", "Meses de mandato"], ["ranking", "", "Ranking"],
  ["elecciones", "", "Elecciones"], ["congreso", "", "Congreso"],
];
// Curiosidades ya no está en el menú, pero la página sigue en la misma URL y cuenta como parte de Presidentes.
const GRUPO_PRES = new Set([...SUBSECCIONES.map((s) => s[0]), "curiosidades"]);
const TITULOS: Record<string, string> = {
  historico: "Histórico", presidentes: "Por presidente", ranking: "Ranking de presidentes", mandato: "Meses de mandato",
  curiosidades: "Curiosidades", congreso: "Gobierno y Congreso", elecciones: "Elecciones", contexto: "Contexto internacional", bcra: "Parte del Banco Central", semaforo: "Semáforo de actividad", plantillas: "Gráficos listos", fuentes: "Fuentes",
};
/** Páginas donde aparece "Volver" si se llegó desde otra página del sitio. */
const CON_VOLVER = new Set(["historico", "tema", "dato", "bcra", "semaforo", ...GRUPO_PRES]);

const carpetaDe = (ruta: string) => ruta.split("/")[1] ?? "";

/** Ancla actual de la URL. Next no dispara `hashchange` al navegar, así que también se relee cuando cambia la ruta o se toca un link del menú. */
function useAncla(ruta: string): [string, (h: string) => void] {
  const [ancla, setAncla] = useState("");
  useEffect(() => {
    const leer = () => setAncla(window.location.hash);
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, [ruta]);
  return [ancla, setAncla];
}

function LinksPresidentes({ carpeta, ancla, onIr }: { carpeta: string; ancla: string; onIr: (h: string) => void }) {
  return (
    <>
      {SUBSECCIONES.map(([c, h, n]) => {
        const actual = carpeta === c;
        return <Link key={c + h} prefetch={false} href={`/${c}/${h}`} aria-current={actual ? "page" : undefined} onClick={() => onIr(h)}>{n}</Link>;
      })}
    </>
  );
}

export function Barra() {
  const ruta = usePathname() || "/";
  const carpeta = carpetaDe(ruta);
  const enPres = GRUPO_PRES.has(carpeta);
  const [ancla, setAncla] = useAncla(ruta);
  const [cerrado, setCerrado] = useState(false);   // el menú desplegable se cierra al elegir y vuelve a estar disponible al sacar el mouse
  const fila = useRef<HTMLElement>(null);
  useDeslizable(fila, false, enPres);
  const actualDe = (id: string) => (id === "presidentes" ? enPres : id === "" ? ruta === "/" || carpeta === "tema" : carpeta === id);
  return (
    <header className="barra">
      <div className="barra-fila">
        <Link href="/" prefetch={false} className="marca">Primero los Datos</Link>
        <nav className="tabs" aria-label="Secciones">
          {SECCIONES.map(([id, t]) => {
            const actual = actualDe(id);
            const link = (
              <Link key={id || "inicio"} prefetch={false} href={id ? `/${id}/` : "/"} aria-current={actual ? "page" : undefined} aria-haspopup={id === "presidentes" ? "true" : undefined}
                onClick={() => { if (id === "presidentes") setAncla(""); }}>
                {t}{id === "presidentes" && <IconoAbajo />}
              </Link>
            );
            if (id !== "presidentes") return link;
            return (
              <div key={id} className={`con-menu${cerrado ? " cerrado" : ""}`} onMouseLeave={() => setCerrado(false)} onFocus={() => setCerrado(false)}
                onKeyDown={(ev) => { if (ev.key === "Escape") (document.activeElement as HTMLElement | null)?.blur(); }}>
                {link}
                <div className="submenu" onClick={() => { setCerrado(true); (document.activeElement as HTMLElement | null)?.blur(); }}>
                  <LinksPresidentes carpeta={carpeta} ancla={ancla} onIr={setAncla} />
                </div>
              </div>
            );
          })}
        </nav>
        <BotonConfig />
      </div>
      {enPres && (
        <nav className="subtabs" aria-label="Presidentes" ref={fila}>
          <LinksPresidentes carpeta={carpeta} ancla={ancla} onIr={setAncla} />
        </nav>
      )}
    </header>
  );
}

/** Pie general con las fuentes. En la portada no va: ya está el bloque "Todo tiene fuente". El render estático de "/" sale sin pie. */
export function PieSitio() {
  const ruta = usePathname() || "/";
  if (ruta === "/") return null;
  return (
    <footer className="pie">
      <div className="ancho">
        <p className="pie-fuentes"><b>Fuentes principales:</b> {ORGANISMOS.join(" · ")} y otras.</p>
        <Link prefetch={false} href="/fuentes/" className="btn">Ver las fuentes</Link>
      </div>
    </footer>
  );
}

/** ¿Hay una página anterior del sitio en el historial de esta pestaña? (API de navegación; si no existe, se cuentan las páginas visitadas). */
let visitadas: string[] = [];
function hayAnterior(ruta: string): boolean {
  const nav = (window as unknown as { navigation?: { currentEntry?: { index: number } | null } }).navigation;
  if (nav?.currentEntry) return nav.currentEntry.index > 0;
  if (visitadas[visitadas.length - 2] === ruta) visitadas = visitadas.slice(0, -1);        // se volvió atrás
  else if (visitadas[visitadas.length - 1] !== ruta) visitadas = [...visitadas, ruta];
  return visitadas.length > 1;
}

/** Cabecera de las páginas internas: "← Volver" (si se llegó desde otra página del sitio) y el título de la sección. */
export function CabeceraPagina() {
  const ruta = usePathname() || "/";
  const carpeta = carpetaDe(ruta);
  const [volver, setVolver] = useState(false);
  useEffect(() => { setVolver(CON_VOLVER.has(carpeta) && hayAnterior(ruta)); }, [ruta, carpeta]);
  if (ruta === "/") return null;
  const titulo = TITULOS[carpeta];
  if (!titulo && !volver) return null;
  return (
    <div className="cab-pagina">
      {volver && <button type="button" className="volver-atras" onClick={() => window.history.back()}><IconoVolver />Volver</button>}
      {titulo && <h1>{titulo}</h1>}
    </div>
  );
}
