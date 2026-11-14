"use client";
// "Preguntale a los datos": oraciones con huecos y buscador libre.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCargar, useDatos } from "../DatosProvider";
import { useConfig } from "../ConfigProvider";
import { Picker, conPunteroFino } from "../Variables";
import { Modal, useAtras, useCapa } from "../ui";
import { IconoIr } from "../Iconos";
import { Sparkline } from "../Sparkline";
import { FilaChips } from "../sistema/FilaChips";
import { Delta } from "../sistema/Delta";
import { IconoCerrar } from "../sistema/iconos";
import { palabrasBusqueda, textoBusqueda } from "@/lib/catalogo";
import { baseDeConfig } from "@/lib/config";
import { type SerieMeta } from "@/lib/motor";
import { PRES_DEF } from "@/lib/estadisticas";
import {
  MEDIDAS_DOLAR, PRESIDENTES, SALARIOS, anios, contraer, hrefCompra, hrefDesde, hrefMedida, hrefPresidente, hrefSubio,
  idsCompra, idsMontos, idsPrecios, respuestaCompra, respuestaDesde, respuestaMedida, respuestaPresidente, respuestaSubio, rotulo,
  seccionesCompra, todosLosPrincipales, type Opcion, type Respuesta,
} from "@/lib/oraciones";

/** Lista de opciones de un hueco. Va pegada a su botón (posición absoluta dentro del hueco): al deslizar la página se mueve con él y nunca queda flotando ni se va de la pantalla.
 *  Se abre hacia arriba si abajo no entra y se corre si se saldría por un costado. Flechas, Enter y Escape; el clic afuera la cierra. */
function ListaHueco({ etiqueta, valor, opciones, onElegir }: { etiqueta: string; valor: string; opciones: Opcion[]; onElegir: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [arriba, setArriba] = useState(false);
  const [corrimiento, setCorrimiento] = useState(0);
  const raiz = useRef<HTMLSpanElement>(null), boton = useRef<HTMLButtonElement>(null), lista = useRef<HTMLUListElement>(null);
  const id = useId();
  const esLaDeArriba = useCapa(abierto);
  const cerrarAtras = useAtras(abierto, () => { setAbierto(false); boton.current?.focus(); });   // Atrás cierra solo esta capa
  const idx = Math.max(0, opciones.findIndex((o) => o[0] === valor));
  const cerrarRef = useRef(cerrarAtras);
  cerrarRef.current = cerrarAtras;
  const cerrar = useCallback((foco = true) => { cerrarRef.current(); if (foco) boton.current?.focus(); }, []);
  const abrir = () => {
    const r = boton.current?.getBoundingClientRect();
    if (r) setArriba(window.innerHeight - r.bottom < 260 && r.top > window.innerHeight - r.bottom);
    setCorrimiento(0); setActivo(idx); setAbierto(true);
  };
  const elegir = (i: number) => { const o = opciones[i]; if (o) onElegir(o[0]); cerrar(); };
  // Si la lista se saldría por la derecha o por la izquierda de la pantalla, se corre.
  useLayoutEffect(() => {
    if (!abierto) return;
    const r = lista.current?.getBoundingClientRect();
    if (!r) return;
    const margen = 8, ancho = window.innerWidth;
    if (r.right > ancho - margen) setCorrimiento(-(r.right - (ancho - margen)));
    else if (r.left < margen) setCorrimiento(margen - r.left);
  }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    lista.current?.focus({ preventScroll: true });
    const afuera = (ev: Event) => { if (!raiz.current?.contains(ev.target as Node)) cerrar(false); };
    document.addEventListener("pointerdown", afuera);
    return () => document.removeEventListener("pointerdown", afuera);
  }, [abierto, cerrar]);
  useEffect(() => { if (abierto) lista.current?.querySelector<HTMLElement>(`[data-i="${activo}"]`)?.scrollIntoView({ block: "nearest" }); }, [abierto, activo]);
  const tecla = (ev: React.KeyboardEvent) => {
    const n = opciones.length;
    if (ev.key === "ArrowDown") { ev.preventDefault(); setActivo((activo + 1) % n); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActivo((activo + n - 1) % n); }
    else if (ev.key === "Home") { ev.preventDefault(); setActivo(0); }
    else if (ev.key === "End") { ev.preventDefault(); setActivo(n - 1); }
    else if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); elegir(activo); }
    else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); if (esLaDeArriba()) cerrar(); }
    else if (ev.key === "Tab") cerrar(false);
  };
  return (
    <span className="hueco hueco-lista" ref={raiz}>
      <button ref={boton} type="button" className="btn sel-btn" aria-label={etiqueta} aria-haspopup="listbox" aria-expanded={abierto} aria-controls={abierto ? id : undefined}
        onClick={() => (abierto ? cerrar() : abrir())} onKeyDown={(ev) => { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); if (!abierto) abrir(); } }}>
        <span className="et">{opciones[idx]?.[1] ?? ""}</span>
      </button>
      {abierto && (
        <ul ref={lista} id={id} className={`hueco-menu${arriba ? " arriba" : ""}`} role="listbox" tabIndex={-1} aria-label={etiqueta} aria-activedescendant={`${id}-${activo}`}
          style={corrimiento ? { transform: `translateX(${corrimiento}px)` } : undefined} onKeyDown={tecla}>
          <li role="presentation" className="hueco-cerrar-fila">
            <button type="button" className="hueco-cerrar" aria-label="Cerrar" tabIndex={-1} onClick={() => cerrar()}><IconoCerrar /></button>
          </li>
          {opciones.map(([v, t], i) => (
            <li key={v} id={`${id}-${i}`} data-i={i} role="option" aria-selected={v === valor} className={i === activo ? "activo" : undefined}
              onMouseEnter={() => setActivo(i)} onClick={() => elegir(i)}>{t}</li>
          ))}
        </ul>
      )}
    </span>
  );
}

/** Ventana de "¿Cuánto … compra un …?": todos los ítems ya desplegados, con separadores (Canastas, Precios promedio por categoría, Dólares). El buscador va arriba. */
function ListaProductos({ S, ids, valor, onElegir, onCerrar }: { S: Record<string, SerieMeta>; ids: string[]; valor: string; onElegir: (id: string) => void; onCerrar: () => void }) {
  const [q, setQ] = useState("");
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { if (conPunteroFino()) inp.current?.focus(); }, []);   // en táctil el teclado no se abre solo
  const secciones = useMemo(() => seccionesCompra(S, ids), [S, ids]);
  const toks = useMemo(() => (q.trim() ? palabrasBusqueda(q) : []), [q]);
  const visibles = useMemo(() => secciones.map((sec) => ({
    ...sec, ids: toks.length ? sec.ids.filter((i) => { const t = textoBusqueda(S[i] as SerieMeta & { busca?: string }); return toks.every((k) => t.includes(k)); }) : sec.ids,
  })).filter((sec) => sec.ids.length), [secciones, toks, S]);
  const primero = visibles[0]?.ids[0];
  const elegir = (id: string) => { onCerrar(); onElegir(id); };
  let anterior = "";
  return (
    <Modal titulo="Elegir producto" onCerrar={onCerrar}>
      <header>
        <input ref={inp} type="search" value={q} autoComplete="off" placeholder="Buscá: asado, yerba, dólar blue…" aria-label="Buscar un producto"
          onChange={(ev) => setQ(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter" && primero) elegir(primero); }} />
      </header>
      <ul className="lista-compra">
        {visibles.map((sec) => {
          const cab = sec.grupo !== anterior; anterior = sec.grupo;
          return (
            <li key={sec.grupo + (sec.categoria ?? "")} className="seccion-compra">
              {cab && <h3 className="sep-compra">{sec.grupo}</h3>}
              {sec.categoria && <h4 className="sep-compra sub">{sec.categoria}</h4>}
              <ul>
                {sec.ids.map((i) => (
                  <li key={i}><button type="button" aria-current={i === valor ? "true" : undefined} onClick={() => elegir(i)}>{rotulo(i, S)}</button></li>
                ))}
              </ul>
            </li>
          );
        })}
        {!visibles.length && <li className="note">Sin resultados. Probá con otra palabra.</li>}
      </ul>
      <footer>{visibles.length ? "Elegí un producto, una canasta o un dólar. Esc para cerrar." : "Sin resultados."}</footer>
    </Modal>
  );
}

/** Un hueco de la oración: botón con el valor subrayado. Listas cortas: desplegable pegado al botón; `compra`: ventana con todo desplegado; otras listas largas: selector de variables filtrado. */
function Hueco({ valor, opciones, onElegir, etiqueta, ids, S, compra }: {
  valor: string; opciones?: Opcion[]; onElegir: (v: string) => void; etiqueta: string; ids?: string[]; S: Record<string, SerieMeta>; compra?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const conjunto = useMemo(() => new Set(ids ?? []), [ids]);
  const pedido = useMemo(() => ({ cb: (id: string) => onElegir(id), filtro: (s: SerieMeta) => conjunto.has(s.id), titulo: "Buscá: asado, yerba, alquiler…" }),
    [conjunto, onElegir]);
  if (ids) {
    return (
      <span className="hueco">
        <button type="button" className="btn sel-btn" aria-label={etiqueta} aria-haspopup="dialog" onClick={() => setAbierto(true)}><span className="et">{rotulo(valor, S)}</span></button>
        {abierto && (compra
          ? <ListaProductos S={S} ids={ids} valor={valor} onElegir={onElegir} onCerrar={() => setAbierto(false)} />
          : <Picker pedido={pedido} onCerrar={() => setAbierto(false)} />)}
      </span>
    );
  }
  return <ListaHueco etiqueta={etiqueta} valor={valor} opciones={opciones ?? []} onElegir={onElegir} />;
}

type Clave = "compra" | "presidente" | "desde" | "dolares" | "subio";
const PREGUNTAS: [Clave, string][] = [["compra", "Cuánto compra"], ["presidente", "Con cada presidente"], ["desde", "Desde un año"], ["dolares", "En dólares"], ["subio", "Qué subió más"]];
const IDS_PRES = PRES_DEF.map((x) => x.id);

/** La respuesta en el lugar: cifra grande, fecha, detalle, minigráfico y cambios. Mientras carga, "Calculando…" con el mismo alto. */
function RespuestaVista({ r, listo, href }: { r: Respuesta | null; listo: boolean; href: string }) {
  return (
    <div className="preg-resp" aria-live="polite">
      {!listo ? <p className="preg-espera">Calculando…</p> : !r ? <p className="preg-espera">No hay datos para esta combinación.</p> : (
        <div className="preg-fundido" key={r.cifra + (r.fecha ?? "")}>
          <p className="preg-cifra">{r.cifra}</p>
          {(r.fecha || r.detalle) && <p className="preg-meta">{[r.fecha, r.detalle].filter(Boolean).join(" · ")}</p>}
          {r.v && <div className="preg-mini"><Sparkline v={r.v} desde={r.desde ?? 0} /></div>}
          {r.deltas && <div className="preg-deltas">{r.deltas.map((d, i) => <Delta key={i} {...d} />)}</div>}
        </div>
      )}
      <Link prefetch={false} href={href} className="preg-ver">Ver completo<IconoIr /></Link>
    </div>
  );
}

export function Oraciones({ S }: { S: Record<string, SerieMeta> }) {
  const { motor, archivosDe, version, listo: catalogo } = useDatos();
  const { config } = useConfig();
  const principales = useMemo(() => todosLosPrincipales(S), [S]);
  const clave = (i: number) => String(i);
  const opcPrincipales: Opcion[] = principales.map((p, i) => [clave(i), p.corto]);
  const opcPrincipalesA: Opcion[] = principales.map((p, i) => [clave(i), contraer("a", p.corto)]);   // "al riesgo país", "a la inflación"
  const salarios: Opcion[] = SALARIOS.filter((i) => S[i]).map((i) => [i, rotulo(i, S)]);
  const compra = useMemo(() => idsCompra(S), [S]), montos = useMemo(() => idsMontos(S), [S]), precios = useMemo(() => idsPrecios(S), [S]);
  const anioHoy = new Date().getFullYear();
  const lista = useMemo(() => anios(anioHoy), [anioHoy]);

  const [elegida, setElegida] = useState<Clave>("compra");
  const [producto, setProducto] = useState("pp_gba_asado"), [salario, setSalario] = useState("sipa_med");
  const [ind2, setInd2] = useState(clave(Math.max(0, principales.findIndex((p) => p.id === "ipc_empalme" && p.med === "vm")))), [pres, setPres] = useState("milei");
  const [ind3, setInd3] = useState(clave(Math.max(0, principales.findIndex((p) => p.id === "sipa_med")))), [anio, setAnio] = useState("2017");
  const [monto, setMonto] = useState("sipa_med"), [med, setMed] = useState("usdr_blue");
  const [a, setA] = useState("ipc_gba_01_1_2_coicop"), [b, setB] = useState("ipc_gba_04_1_1_coicop");
  const p2 = principales[Number(ind2)] ?? principales[0], p3 = principales[Number(ind3)] ?? principales[0];

  // Las preguntas que dependen de una serie ausente no aparecen como chip.
  const disponibles = useMemo(() => PREGUNTAS.filter(([k]) =>
    k === "compra" ? !!S.sipa_med : k === "dolares" ? !!S[monto] : k === "subio" ? !!(S[a] && S[b]) : true), [S, monto, a, b]);
  const actual: Clave = disponibles.some(([k]) => k === elegida) ? elegida : (disponibles[0]?.[0] ?? "presidente");

  const idsPregunta = useMemo(() => {
    const x: (string | null | undefined)[] =
      actual === "compra" ? [producto, salario] : actual === "presidente" ? [p2?.id, p2?.rel] : actual === "desde" ? [p3?.id, p3?.rel]
        : actual === "dolares" ? [monto] : [a, b];
    return x.filter(Boolean) as string[];
  }, [actual, producto, salario, p2, p3, monto, a, b]);
  const listo = useCargar(catalogo ? archivosDe(idsPregunta) : []) && catalogo;
  const base = useMemo(() => baseDeConfig(config, IDS_PRES), [config]);
  const respuesta = useMemo<Respuesta | null>(() => {
    if (!motor || !listo) return null;
    switch (actual) {
      case "compra": return respuestaCompra(motor, producto, salario);
      case "presidente": return p2 ? respuestaPresidente(motor, p2, pres, base) : null;
      case "desde": return p3 ? respuestaDesde(motor, p3, anio) : null;
      case "dolares": return respuestaMedida(motor, monto, med);
      default: return respuestaSubio(motor, a, b, S);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, listo, version, actual, producto, salario, p2, p3, pres, anio, monto, med, a, b, base, S]);
  if (!principales.length) return null;

  const href = actual === "compra" ? hrefCompra(producto, salario) : actual === "presidente" ? hrefPresidente(p2, pres) : actual === "desde" ? hrefDesde(p3, anio)
    : actual === "dolares" ? hrefMedida(monto, med) : hrefSubio(a, b);

  return (
    <div className="preg">
      <FilaChips opciones={disponibles} valor={actual} onElegir={(v) => setElegida(v as Clave)} etiqueta="Preguntas" />
      <p className="preg-oracion">
        {actual === "compra" && <>¿Cuánto <Hueco valor={producto} ids={compra} compra etiqueta="Producto" onElegir={setProducto} S={S} /> compra un{" "}
          <Hueco valor={salario} opciones={salarios} etiqueta="Salario" onElegir={setSalario} S={S} />?</>}
        {actual === "presidente" && <>¿Cómo le fue <Hueco valor={ind2} opciones={opcPrincipalesA} etiqueta="Indicador" onElegir={setInd2} S={S} /> con{" "}
          <Hueco valor={pres} opciones={PRESIDENTES} etiqueta="Presidente" onElegir={setPres} S={S} />?</>}
        {actual === "desde" && <>¿Cómo cambió <Hueco valor={ind3} opciones={opcPrincipales} etiqueta="Indicador" onElegir={setInd3} S={S} /> desde{" "}
          <Hueco valor={anio} opciones={lista} etiqueta="Año" onElegir={setAnio} S={S} />?</>}
        {actual === "dolares" && <>¿Cómo evolucionó <Hueco valor={monto} ids={montos} etiqueta="Monto" onElegir={setMonto} S={S} /> en{" "}
          <Hueco valor={med} opciones={MEDIDAS_DOLAR} etiqueta="Medida" onElegir={setMed} S={S} />?</>}
        {actual === "subio" && <>¿Qué subió más: <Hueco valor={a} ids={precios} etiqueta="Primer precio" onElegir={setA} S={S} /> o{" "}
          <Hueco valor={b} ids={precios} etiqueta="Segundo precio" onElegir={setB} S={S} />?</>}
      </p>
      <RespuestaVista r={respuesta} listo={listo} href={href} />
    </div>
  );
}
