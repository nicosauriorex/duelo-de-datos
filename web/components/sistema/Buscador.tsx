"use client";
// Buscador: un campo claro y grande, y debajo los resultados en un solo orden (ver `lib/busqueda.ts`).
// Los resultados empujan el contenido (no flotan). El primero lleva la cifra en vivo.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfig } from "@/components/ConfigProvider";
import { useCargar, useDatos } from "@/components/DatosProvider";
import { Sparkline } from "@/components/Sparkline";
import { medidaInicial } from "@/lib/config";
import { MAS_BUSCADOS, buscar, hayBusqueda, hrefMasBuscado, type ResultadoBusqueda } from "@/lib/busqueda";
import { medDefaultDe, type SerieMeta } from "@/lib/motor";
import { crearPlantillas, evaluar, plantillaSuelta } from "@/lib/plantillas";
import { TEMAS, idsDe } from "@/lib/temas";
import { IconoBuscar, IconoCerrar } from "./iconos";

const ETIQUETA_TIPO: Record<ResultadoBusqueda["tipo"], string> = { principal: "Dato", variable: "Variable", grafico: "Gráfico listo", seccion: "Sección" };

/** Valor, fecha y minigráfico del primer resultado. La línea ocupa su lugar desde el principio para que nada salte. */
function CifraViva({ r }: { r: ResultadoBusqueda }) {
  const { motor, archivosDe, version } = useDatos();
  const e = r.e!;
  const cargado = useCargar(archivosDe(idsDe(e)));
  const ev = useMemo(() => {
    if (!cargado || !motor) return null;
    const p = r.plantilla ?? plantillaSuelta("b-" + e.id, r.titulo, e);
    return evaluar(motor, p) ?? (r.plantilla ? evaluar(motor, plantillaSuelta("b-" + e.id, r.titulo, e)) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargado, motor, version, r.href]);
  return (
    <span className="busq-cifra" aria-hidden={ev ? undefined : "true"}>
      {ev && (
        <>
          <span className="busq-valor">{ev.val}</span>
          <span className="busq-fecha">{ev.fecha}</span>
          {motor && <span className="busq-mini"><Sparkline v={ev.v} desde={motor.idxDe("2003-01")} /></span>}
        </>
      )}
    </span>
  );
}

/** `sinAtajos`: no muestra su propio "Ir directo a" al enfocar (la portada ya lo tiene a la vista debajo). */
export function Buscador({ autoFoco, onElegido, sinAtajos }: { autoFoco?: boolean; onElegido?: () => void; sinAtajos?: boolean }) {
  const router = useRouter();
  const { listo, metas } = useDatos();
  const { config } = useConfig();
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const [enfocado, setEnfocado] = useState(false);
  const campo = useRef<HTMLInputElement>(null), raiz = useRef<HTMLDivElement>(null);
  const id = useId();

  const S = useMemo(() => Object.fromEntries(metas.map((s) => [s.id, s])) as Record<string, SerieMeta>, [metas]);
  const plantillas = useMemo(() => (listo ? crearPlantillas(metas) : []), [listo, metas]);
  const medidaDe = useMemo(() => (s: SerieMeta) => medidaInicial(s.tipo, medDefaultDe(s), config), [config]);
  const resultados = useMemo(() => (listo ? buscar(q, { metas, S, plantillas, medidaDe }) : []), [listo, q, metas, S, plantillas, medidaDe]);
  const busca = hayBusqueda(q);
  const sinResultados = listo && busca && !resultados.length;
  const idOpcion = (i: number) => `${id}-op-${i}`;

  useEffect(() => { if (autoFoco && listo) campo.current?.focus(); }, [autoFoco, listo]);
  useEffect(() => setActivo(0), [q]);
  useEffect(() => { raiz.current?.querySelector(`[data-i="${activo}"]`)?.scrollIntoView({ block: "nearest" }); }, [activo]);

  /** Enter abre el elegido haciendo clic en su link: así pasa por lo mismo que un toque (Next, y el cierre ordenado de las capas de `ui.tsx`). */
  const abrir = (r: ResultadoBusqueda | undefined) => {
    if (!r) return;
    const a = raiz.current?.querySelector<HTMLAnchorElement>(`[data-i="${resultados.indexOf(r)}"] a`);
    if (a) a.click(); else { router.push(r.href); onElegido?.(); }
  };
  const tecla = (ev: React.KeyboardEvent) => {
    const n = resultados.length;
    if (ev.key === "ArrowDown" && n) { ev.preventDefault(); setActivo((activo + 1) % n); }
    else if (ev.key === "ArrowUp" && n) { ev.preventDefault(); setActivo((activo + n - 1) % n); }
    else if (ev.key === "Enter") { ev.preventDefault(); abrir(resultados[activo] ?? resultados[0]); }
    else if (ev.key === "Escape" && q) { ev.preventDefault(); ev.stopPropagation(); setQ(""); }
  };

  const mostrarMas = listo && !busca && enfocado && !sinAtajos;
  return (
    <div className="busq" ref={raiz} onFocus={() => setEnfocado(true)}
      onBlur={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setEnfocado(false); }}>
      <form className="busq-campo" role="search" onSubmit={(ev) => { ev.preventDefault(); const r = resultados[activo] ?? resultados[0]; if (r) abrir(r); else campo.current?.focus(); }}>
        <input ref={campo} type="text" inputMode="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false}
          role="combobox" aria-expanded={resultados.length > 0} aria-controls={`${id}-lista`} aria-autocomplete="list"
          aria-activedescendant={resultados.length ? idOpcion(activo) : undefined} aria-label="Buscar un dato"
          value={q} disabled={!listo} placeholder={listo ? "Buscá: inflación, dólar blue, asado…" : "Cargando…"}
          onChange={(ev) => setQ(ev.target.value)} onKeyDown={tecla} />
        {q && <button type="button" className="busq-borrar" aria-label="Borrar lo escrito" onClick={() => { setQ(""); campo.current?.focus(); }}><IconoCerrar /></button>}
        <button type="submit" className="busq-ir" disabled={!listo} aria-label="Buscar o abrir el resultado elegido"><IconoBuscar /></button>
      </form>

      <div className="busq-estado" role="status" aria-live="polite">
        {sinResultados ? `No encontramos «${q.trim()}»` : resultados.length ? `${resultados.length} resultados` : ""}
      </div>

      {mostrarMas && (
        <div className="busq-mas" onMouseDown={(ev) => ev.preventDefault()}>
          <p className="busq-rotulo">Ir directo a</p>
          <ul className="busq-chips">
            {MAS_BUSCADOS.map((m) => <li key={m.slug}><Link prefetch={false} href={hrefMasBuscado(m.slug)} onClick={() => onElegido?.()}>{m.titulo}</Link></li>)}
          </ul>
        </div>
      )}

      {resultados.length > 0 && (
        <ul className="busq-lista" id={`${id}-lista`} role="listbox" aria-label="Resultados">
          {resultados.map((r, i) => (
            <li key={r.tipo + r.href} id={idOpcion(i)} data-i={i} role="option" aria-selected={i === activo} className={i === activo ? "busq-activo" : undefined}
              onMouseMove={() => { if (i !== activo) setActivo(i); }}>
              <Link prefetch={false} href={r.href} tabIndex={-1} onClick={() => onElegido?.()}>
                <span className="busq-titulo">{r.titulo}</span>
                <span className="busq-detalle">{r.detalle}</span>
                <span className="busq-tipo">{ETIQUETA_TIPO[r.tipo]}</span>
                {i === 0 && r.e && <CifraViva key={r.href} r={r} />}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {sinResultados && (
        <div className="busq-sin">
          <p className="busq-sin-texto">No encontramos «{q.trim()}». Probá con otra palabra o elegí un tema:</p>
          <ul className="busq-chips">
            {TEMAS.map((t) => <li key={t.slug}><Link prefetch={false} href={`/tema/${t.slug}/`} onClick={() => onElegido?.()}>{t.nombre}</Link></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
