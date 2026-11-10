"use client";
// Selector de variables (árbol + búsqueda), ventana de información y fila de controles de una variable.
import { useEffect, useMemo, useRef, useState } from "react";
import { useDatos } from "./DatosProvider";
import { useConfig } from "./ConfigProvider";
import { medidaInicial } from "@/lib/config";
import { Desplegable, Modal, Selector, Seg } from "./ui";
import { IconoEditar } from "./Iconos";
import { fmtMes, lastIdx, norm } from "@/lib/formato";
import { ORDEN_RAIZ, textoBusqueda } from "@/lib/catalogo";
import { INFO_CAT, INFO_CORTA } from "@/lib/info";
import type { Expr, Motor, SerieMeta } from "@/lib/motor";

interface Nodo { nombre: string; hijos: Map<string, Nodo>; items: SerieMeta[]; total: number }
const nodoNuevo = (nombre: string): Nodo => ({ nombre, hijos: new Map(), items: [], total: 0 });

function armarArbol(metas: SerieMeta[], filtro?: (s: SerieMeta) => boolean): Nodo {
  const raiz = nodoNuevo("Todas las variables");
  ORDEN_RAIZ.forEach((n) => raiz.hijos.set(n, nodoNuevo(n)));
  metas.forEach((s) => {
    if (filtro && !filtro(s)) return;
    let nodo = raiz; raiz.total++;
    s.cat.forEach((c) => {
      if (!nodo.hijos.has(c)) nodo.hijos.set(c, nodoNuevo(c));
      nodo = nodo.hijos.get(c)!; nodo.total++;
    });
    nodo.items.push(s);
  });
  for (const [k, v] of raiz.hijos) if (!v.total) raiz.hijos.delete(k);
  // "Nacional" primero, después GBA y el resto de las regiones
  const primero = (n: Nodo) => {
    if (n.hijos.has("Nacional")) n.hijos = new Map([...n.hijos].sort((a, b) => (a[0] === "Nacional" ? -1 : 0) - (b[0] === "Nacional" ? -1 : 0)));
    n.hijos.forEach(primero);
  };
  primero(raiz);
  return raiz;
}

export function Insignia({ s, esIndice }: { s: SerieMeta; esIndice: boolean }) {
  return esIndice ? <span className="tag idx" title="Índice: un número sin unidad (base = 100). Se ve tal cual.">Índice</span>
    : s.tipo === "tasa" || /%/.test(s.u) ? <span className="tag" title="Porcentaje o tasa">%</span>
    : <span className="tag val" title="Valor: monto, precio o cantidad con unidad">Valor</span>;
}

export function BotonInfo({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <span className="info-btn" role="button" tabIndex={0} title="Qué es y cómo se calcula" aria-label="Información de la variable"
        onClick={(ev) => { ev.stopPropagation(); setAbierto(true); }}
        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); setAbierto(true); } }}>i</span>
      {abierto && <Info id={id} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

function Info({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const { motor, metas, cargar, version } = useDatos();
  const meta = metas.find((m) => m.id === id);
  useEffect(() => { if (meta) cargar([meta.archivo]); }, [meta, cargar]);
  if (!meta || !motor) return null;
  const s = motor.SER[id];
  const idx = motor.esIndice(meta);
  const meds = motor.medidasDe(meta).map((m) => m[1]).join(" · ");
  void version;
  return (
    <Modal titulo="Información de la variable" onCerrar={onCerrar}>
      <div className="info-cuerpo">
        <h2>{meta.n}</h2>
        <p className="note">{meta.cat.join(" › ")}</p>
        <p>{meta.desc || ""}</p>
        <table className="ficha"><tbody>
          <tr><td>Tipo</td><td>{idx ? "Índice (sin unidad, se ve tal cual)" : "Valor"}</td></tr>
          <tr><td>Unidad</td><td>{meta.u}</td></tr>
          {s && <tr><td>Datos</td><td>{fmtMes(motor.F[s.i0])} a {fmtMes(motor.F[lastIdx(s.vals)])}</td></tr>}
          <tr><td>Fuente</td><td>{meta.fuente}</td></tr>
          <tr><td>Se puede ver</td><td>{meds}{meta.agg ? " · por habitante · % del PIB" : ""}{motor.relPermitido(meta) ? " · en términos de otra variable" : ""}</td></tr>
          <tr><td>Bueno o malo</td><td>{meta.dir > 0 ? "Que suba es bueno" : meta.dir < 0 ? "Que suba es malo" : "Neutro"}</td></tr>
        </tbody></table>
        {meta.cat.map((c) => INFO_CAT[c] ? (
          <details key={c}><summary>Sobre &quot;{c}&quot;</summary><div className="info-cat" dangerouslySetInnerHTML={{ __html: INFO_CAT[c] }} /></details>
        ) : null)}
      </div>
      <footer><button type="button" className="btn" onClick={onCerrar}>Cerrar</button></footer>
    </Modal>
  );
}

/** Texto largo plegado a 2 líneas: "ver más" aparece solo si no entra. */
function TextoPlegable({ html }: { html: string }) {
  const [abierto, setAbierto] = useState(false);
  const [largo, setLargo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current; if (el) setLargo(el.scrollHeight > el.clientHeight + 2 || abierto); }, [html, abierto]);
  return (
    <>
      <div ref={ref} className={abierto ? "" : "plegado"} dangerouslySetInnerHTML={{ __html: html }} />
      {(largo || abierto) && <button type="button" className="ver-mas" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>{abierto ? "ver menos" : "ver más"}</button>}
    </>
  );
}

/** Arriba de la lista de una categoría de primer nivel: qué es en 1 o 2 líneas, la variable recomendada y la explicación larga plegada. */
function IntroCategoria({ nombre, reco, onReco }: { nombre: string; reco: { id: string; nombre: string; med?: string; esc?: string } | null; onReco: (r: { id: string; med?: string; esc?: string }) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className="info-cat intro-cat">
      <p>{INFO_CORTA[nombre].texto}</p>
      <div className="intro-acc">
        {reco && <button type="button" className="btn reco" onClick={() => onReco(reco)}>Recomendado: {reco.nombre}</button>}
        <button type="button" className="ver-mas" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>{abierto ? "ver menos" : "ver más"}</button>
      </div>
      {abierto && <div className="info-larga" dangerouslySetInnerHTML={{ __html: INFO_CAT[nombre] }} />}
    </li>
  );
}

export interface PickerPedido { cb: (id: string, med?: string, esc?: string) => void; filtro?: (s: SerieMeta) => boolean; titulo?: string }

export function Picker({ pedido, onCerrar }: { pedido: PickerPedido; onCerrar: () => void }) {
  const { metas, motor } = useDatos();
  const [camino, setCamino] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [todo, setTodo] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const primero = useRef<string | undefined>(undefined);
  useEffect(() => { inp.current?.focus(); }, []);
  const raiz = useMemo(() => armarArbol(metas, pedido.filtro), [metas, pedido.filtro]);
  const elegir = (id: string, med?: string, esc?: string) => { onCerrar(); pedido.cb(id, med, esc); };
  const qn = norm(q.trim());

  let cuerpo: React.ReactNode;
  let migas: React.ReactNode = null;
  let pie: string;
  if (qn) {
    const toks = qn.split(/\s+/);
    const res: [number, SerieMeta][] = [];
    metas.forEach((s) => {
      if (pedido.filtro && !pedido.filtro(s)) return;
      if (camino.length && !todo && !camino.every((c, k) => s.cat[k] === c)) return;
      const nombre = norm(s.n), t = textoBusqueda(s as SerieMeta & { busca?: string });
      if (!toks.every((k) => t.includes(k))) return;
      res.push([toks.reduce((a, k) => a + (nombre.includes(k) ? 2 : 0) + (nombre.startsWith(k) ? 1 : 0), 0), s]);
    });
    res.sort((a, b) => b[0] - a[0] || a[1].n.length - b[1].n.length);
    cuerpo = res.slice(0, 150).map(([, s]) => (
      <li key={s.id}>
        <button type="button" title={s.desc || ""} onClick={() => elegir(s.id)}>
          <span>{s.n}<span className="ruta">{s.cat.join(" › ")} · {s.u}</span></span>
          <Insignia s={s} esIndice={motor ? motor.esIndice(s) : false} />
        </button>
        <BotonInfo id={s.id} />
      </li>
    ));
    migas = camino.length ? (todo
      ? <>Buscando en todas las variables · <button type="button" onClick={() => setTodo(false)}>buscar solo en {camino[camino.length - 1]}</button></>
      : <>Buscando en <b>{camino.join(" › ")}</b> · <button type="button" onClick={() => setTodo(true)}>buscar en todo</button></>) : null;
    pie = res.length ? `${res.length} resultados${res.length > 150 ? " (se muestran 150)" : ""}. Enter elige el primero.` : "Sin resultados. Probá con otra palabra" + (camino.length && !todo ? " o buscá en todo." : ".");
    primero.current = res[0]?.[1].id;
  } else {
    let nodo = raiz;
    camino.forEach((c) => { nodo = nodo.hijos.get(c) as Nodo; });
    const ultimo = camino[camino.length - 1];
    migas = (
      <>
        <button type="button" onClick={() => setCamino([])}>Todas</button>
        {camino.map((c, k) => <span key={k}> › <button type="button" onClick={() => setCamino(camino.slice(0, k + 1))}>{c}</button></span>)}
      </>
    );
    cuerpo = (
      <>
        {camino.length > 0 && INFO_CAT[ultimo] && (
          camino.length === 1 && INFO_CORTA[ultimo]
            ? <IntroCategoria key={ultimo} nombre={ultimo} reco={metas.some((x) => x.id === INFO_CORTA[ultimo].reco.id && (!pedido.filtro || pedido.filtro(x))) ? INFO_CORTA[ultimo].reco : null}
                onReco={(r) => elegir(r.id, r.med, r.esc)} />
            : <li className="info-cat"><TextoPlegable key={ultimo} html={INFO_CAT[ultimo]} /></li>
        )}
        {[...nodo.hijos.values()].map((h) => (
          <li key={h.nombre} className="carpeta">
            <button type="button" onClick={() => { setCamino([...camino, h.nombre]); setTodo(false); setQ(""); inp.current?.focus(); }}>
              <span>{h.nombre}{INFO_CAT[h.nombre] ? <span className="tiene-info" title="Tiene explicación"> ⓘ</span> : null}</span>
              <span className="cuenta">{h.total}</span>
            </button>
          </li>
        ))}
        {nodo.items.map((s) => (
          <li key={s.id}>
            <button type="button" title={s.desc || ""} onClick={() => elegir(s.id)}>
              <span>{s.n}<span className="ruta">{s.u}</span></span>
              <Insignia s={s} esIndice={motor ? motor.esIndice(s) : false} />
            </button>
            <BotonInfo id={s.id} />
          </li>
        ))}
      </>
    );
    pie = camino.length ? `Escribí para buscar dentro de ${ultimo}. Esc para cerrar.` : "Elegí una categoría o escribí para buscar. Esc para cerrar.";
  }
  return (
    <Modal titulo="Elegir variable" onCerrar={onCerrar}>
      <header>
        <input ref={inp} type="search" value={q} autoComplete="off" placeholder={pedido.titulo || "Buscar: ropa, alquiler, salario, reservas, asado…"}
          onChange={(ev) => setQ(ev.target.value)}
          onKeyDown={(ev) => { if (ev.key === "Enter") { if (primero.current) elegir(primero.current); } }} />
        <div className="migas">{migas}</div>
      </header>
      <ul>{cuerpo}</ul>
      <footer>{pie}</footer>
    </Modal>
  );
}

/** Medida en pasos: un botón con lo elegido que abre un panel con los grupos (Pesos / Dólares / Variaciones...) y, debajo, las opciones del grupo activo. */
function SelectorMedida({ A, med, motor, onElegir }: { A: SerieMeta; med: string; motor: Motor; onElegir: (m: string) => void }) {
  const grupos = motor.gruposMedida(A);
  const act = motor.ubicarMedida(A, med) ?? motor.ubicarMedida(A, motor.medDefault(A)) ?? { g: grupos[0], v: grupos[0].dims.map((d) => d.opciones[0][0]) };
  const { config } = useConfig();
  // Al cambiar de grupo se arranca en la primera opción de cada fila; la cotización es el dólar preferido.
  const porDefecto = (g: (typeof grupos)[number]) => g.unir(g.dims.map((d) => d.opciones.find((o) => o[0] === config.dolar)?.[0] ?? d.opciones[0][0]));
  const medActual = act.g.unir(act.v);
  return (
    <Desplegable className="med-desp" etiqueta={motor.etiquetaMedida(A, medActual)}>
      {grupos.length > 1 && (
        <div className="seg" role="group" aria-label="Tipo de medida">
          {grupos.map((g) => <button key={g.k} type="button" aria-pressed={g === act.g || g.k === act.g.k} onClick={() => { if (g.k !== act.g.k) onElegir(porDefecto(g)); }}>{g.nombre}</button>)}
        </div>
      )}
      {act.g.dims.map((d, i) => (
        <div className="seg med-fila" role="group" aria-label={act.g.nombre || "Medida"} key={act.g.k + i}>
          {d.opciones.map(([v, t]) => (
            <button key={v} type="button" className={d.tenue === v ? "tenue" : undefined} aria-pressed={act.v[i] === v}
              onClick={() => { const nv = act.v.slice(); nv[i] = v; onElegir(act.g.unir(nv)); }}>{t}</button>
          ))}
        </div>
      ))}
    </Desplegable>
  );
}

/** Fila de controles de una variable: [variable] [medida] [en términos de] [modo] [quitar] */
export function FilaVariable({ e, onChange, color, quitable, agregable, textoAgregar, sinRel }: {
  e: Expr | null; onChange: (e: Expr | null) => void; color?: string; quitable?: boolean; agregable?: boolean; textoAgregar?: string; sinRel?: boolean;
}) {
  const { motor, metas, errores } = useDatos();
  const { config } = useConfig();
  const [picker, setPicker] = useState<PickerPedido | null>(null);
  if (!motor) return null;
  const meta = (id: string) => metas.find((m) => m.id === id);
  const abrir = (p: PickerPedido) => setPicker(p);
  const modal = picker ? <Picker pedido={picker} onCerrar={() => setPicker(null)} /> : null;
  if (!e) {
    if (!agregable) return null;
    return (
      <div className="fila-var">
        <button type="button" className="btn" onClick={() => abrir({ cb: (id, med, esc) => onChange({ id, med: med ?? medidaInicial(meta(id)!.tipo, motor.medDefault(meta(id)!), config), rel: null, modo: "compra", esc: esc ?? "" }), titulo: "Buscá o navegá" })}>
          {textoAgregar || "+ Agregar una segunda variable (eje derecho)"}
        </button>
        {modal}
      </div>
    );
  }
  const A = meta(e.id);
  if (!A) return null;
  const escs = motor.escPermitidas(A), escV = escs.some((o) => o[0] === e.esc) ? (e.esc || "") : "";
  const nMed = motor.cantMedidas(motor.gruposMedida(A));
  const relOk = motor.relPermitido(A) && !escV && !sinRel;
  const conRel = relOk && !!e.rel;
  const B = e.rel ? meta(e.rel) : null;
  return (
    <div className="fila-var">
      {color && <span className="punto" style={{ ["--c" as string]: `var(${color})` }} />}
      <button type="button" className="btn var" title={A.n} onClick={() => abrir({
        cb: (id, med, esc) => { const nuevo: Expr = { ...e, id, med: med ?? medidaInicial(meta(id)!.tipo, motor.medDefault(meta(id)!), config), esc: esc ?? "" }; if (!motor.relPermitido(meta(id)!)) nuevo.rel = null; onChange(nuevo); },
      })}>{A.n}</button>
      <BotonInfo id={A.id} />
      {(errores[A.archivo] || (B && errores[B.archivo])) && <span className="error" role="alert">No se pudieron bajar los datos de esta variable.</span>}
      {conRel || escV === "pib" ? null : nMed < 2
        ? <span className="lbl">{motor.esIndice(A) ? "Índice: se ve tal cual" : A.u}</span>
        : <SelectorMedida A={A} med={e.med === "vac" ? "via" : e.med || motor.medDefault(A)} motor={motor} onElegir={(v) => onChange({ ...e, med: v })} />}
      {escs.length > 0 && !conRel && (
        <Selector etiqueta="Total, por habitante o como % del PIB" valor={escV} opciones={escs.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => onChange({ ...e, esc: v, rel: v ? null : e.rel })} />
      )}
      {relOk && (
        <>
          <span className="lbl">en términos de</span>
          <button type="button" className="btn var" onClick={() => abrir({
            cb: (id) => onChange({ ...e, rel: id, modo: e.modo || "compra" }), filtro: motor.relDestino, titulo: "En términos de: salario, dólar, canasta, otro precio…",
          })}>{B ? B.n : "ninguna (elegir…)"}</button>
          {B && (
            <>
              <Selector etiqueta="Modo" valor={e.modo === "medido" ? "medido" : "compra"} onElegir={(v) => onChange({ ...e, modo: v })}
                opciones={[["compra", `¿Cuántos ${A.n} compra 1 ${B.n}?`], ["medido", `${A.n} medido en ${B.n}`]]} />
              <button type="button" className="btn quitar" title="Quitar" onClick={() => onChange({ ...e, rel: null })}>✕ quitar</button>
            </>
          )}
        </>
      )}
      {quitable && <button type="button" className="btn quitar" title="Quitar esta variable" onClick={() => onChange(null)}>✕</button>}
      {modal}
    </div>
  );
}

// ------------------------------------------------------------ renglón limpio + ventana "Configurar variable"
/** Una variable como renglón: punto, nombre, resumen de la medida y ⚙ Configurar. Todo lo demás vive en la ventana. */
export function RenglonVariable({ e, onChange, color, quitable, sinRel, onMover, puedeSubir, puedeBajar }: {
  e: Expr; onChange: (e: Expr | null) => void; color?: string; quitable?: boolean; sinRel?: boolean;
  onMover?: (d: -1 | 1) => void; puedeSubir?: boolean; puedeBajar?: boolean;
}) {
  const { motor, metas, errores } = useDatos();
  const [abierta, setAbierta] = useState(false);
  if (!motor) return null;
  const A = metas.find((m) => m.id === e.id);
  if (!A) return null;
  const B = e.rel ? metas.find((m) => m.id === e.rel) : null;
  const escs = motor.escPermitidas(A), escV = escs.some((o) => o[0] === e.esc) ? (e.esc || "") : "";
  const conRel = !!B && motor.relPermitido(A) && !escV && !sinRel;
  const med = e.med === "vac" ? "via" : e.med || motor.medDefault(A);
  const resumen = conRel ? `en términos de ${B!.n}` : escV === "pib" ? "% del PIB" : escV === "pc" ? "por habitante"
    : motor.cantMedidas(motor.gruposMedida(A)) < 2 ? (motor.esIndice(A) ? "índice" : A.u) : motor.resumenMedida(A, med);
  const verEnSalarios = !sinRel && !conRel && !escV && motor.relPermitido(A) && A.tipo === "ars" && A.cat[0] === "Precios" && metas.some((m) => m.id === "sipa_med");
  const error = errores[A.archivo] || (B && errores[B.archivo]);
  return (
    <div className="fila-var limpia">
      {color && <span className="punto" style={{ ["--c" as string]: `var(${color})` }} />}
      <button type="button" className="nombre-var" title={`${A.n} · ${resumen}`} onClick={() => setAbierta(true)}>
        <b>{A.n}</b><span className="resumen"> · {resumen}</span>
      </button>
      {error && <span className="error" role="alert">No se pudieron bajar los datos.</span>}
      {verEnSalarios && (
        <button type="button" className="btn chico" title="Cuántos salarios cuesta (salario SIPA mediano)" onClick={() => onChange({ ...e, rel: "sipa_med", modo: "medido", med: "corr", esc: "" })}>Ver en salarios</button>
      )}
      {onMover && <>
        <button type="button" className="btn chico" aria-label="Subir" disabled={!puedeSubir} onClick={() => onMover(-1)}>↑</button>
        <button type="button" className="btn chico" aria-label="Bajar" disabled={!puedeBajar} onClick={() => onMover(1)}>↓</button>
      </>}
      <button type="button" className="btn chico" aria-label={`Configurar ${A.n}`} onClick={() => setAbierta(true)}><IconoEditar /><span className="cfg-txt"> Editar</span></button>
      {quitable && <button type="button" className="btn quitar" title="Quitar esta variable" aria-label="Quitar esta variable" onClick={() => onChange(null)}>✕</button>}
      {abierta && <ConfigurarVariable e0={e} sinRel={sinRel} onAceptar={(x) => onChange(x)} onCerrar={() => setAbierta(false)} />}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="grupo-cfg"><h3>{titulo}</h3><div className="grupo-cuerpo">{children}</div></section>;
}

/** Ventana con todo lo de una variable. Los cambios se aplican con Aceptar (un solo cambio de URL); Cancelar, ✕, Esc y "Atrás" no cambian nada. */
function ConfigurarVariable({ e0, sinRel, onAceptar, onCerrar }: { e0: Expr; sinRel?: boolean; onAceptar: (e: Expr) => void; onCerrar: () => void }) {
  const { motor, metas } = useDatos();
  const { config } = useConfig();
  const [d, setD] = useState<Expr>(e0);
  const [picker, setPicker] = useState<PickerPedido | null>(null);
  const pendiente = useRef<Expr | null>(null);
  const empujada = useRef(false);
  // "Atrás" del navegador cierra la ventana sin aplicar; Aceptar vuelve atrás primero y recién después aplica.
  useEffect(() => {
    window.history.pushState({ pldVar: true }, ""); empujada.current = true;
    const atras = () => { empujada.current = false; onCerrar(); if (pendiente.current) onAceptar(pendiente.current); };
    window.addEventListener("popstate", atras);
    return () => window.removeEventListener("popstate", atras);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cancelar = () => { if (empujada.current) window.history.back(); else onCerrar(); };
  const aceptar = () => { pendiente.current = d; if (empujada.current) window.history.back(); else { onCerrar(); onAceptar(d); } };
  if (!motor) return null;
  const meta = (id: string) => metas.find((m) => m.id === id);
  const A = meta(d.id);
  if (!A) return null;
  const B = d.rel ? meta(d.rel) : null;
  const escs = motor.escPermitidas(A), escV = escs.some((o) => o[0] === d.esc) ? (d.esc || "") : "";
  const relOk = motor.relPermitido(A) && !escV && !sinRel;
  const conRel = relOk && !!d.rel;
  const grupos = motor.gruposMedida(A);
  const medAct = d.med === "vac" ? "via" : d.med || motor.medDefault(A);
  // Las series que ya son un porcentaje (inflación, desocupación, pobreza…) no tienen medidas: `grupos` viene vacío y se ven tal cual.
  const SIN_MEDIDA = { k: "", nombre: "", dims: [], unir: () => "asis", partir: () => null, etq: () => "" } as (typeof grupos)[number];
  const act = motor.ubicarMedida(A, medAct) ?? motor.ubicarMedida(A, motor.medDefault(A)) ?? { g: grupos[0] ?? SIN_MEDIDA, v: grupos[0]?.dims.map((x) => x.opciones[0][0]) ?? [] };
  const esMon = (g?: { k: string }) => !!g && (g.k === "pesos" || g.k === "dolares");
  const monedaG = grupos.filter(esMon), varG = grupos.find((g) => g.k === "var"), otrosG = grupos.filter((g) => !esMon(g) && g !== varG);
  const enMoneda = esMon(act.g);
  const setMed = (m: string) => setD({ ...d, med: m });
  const porDefecto = (g: (typeof grupos)[number]) => g.unir(g.dims.map((x) => x.opciones.find((o) => o[0] === config.dolar)?.[0] ?? x.opciones[0][0]));
  const setDim = (i: number, v: string) => { const nv = act.v.slice(); nv[i] = v; setMed(act.g.unir(nv)); };

  // "Cómo se mide": valor (en la moneda elegida), las medidas propias de la serie y las variaciones
  const como: [string, string][] = [];
  if (monedaG.length) como.push(["__valor", "Valor"]);
  otrosG.forEach((g) => g.dims[0].opciones.forEach((o) => como.push([`o:${g.k}:${o[0]}`, o[1]])));
  varG?.dims[0].opciones.forEach((o) => como.push([`v:${o[0]}`, o[1]]));
  const comoAct = enMoneda ? "__valor" : act.g.k === "var" ? `v:${act.v[0]}` : `o:${act.g.k}:${act.v[0]}`;
  const elegirComo = (k: string) => {
    if (k === "__valor") return setMed(porDefecto(monedaG[0]));
    const [t, a, b] = k.split(":");
    if (t === "v" && varG) return setMed(varG.unir([a, ...(varG.dims.length > 1 ? [act.g.k === "var" ? act.v[1] : "nom"] : [])]));
    const g = otrosG.find((x) => x.k === a);
    if (g) setMed(g.unir([b, ...g.dims.slice(1).map((x) => x.opciones[0][0])]));
  };
  const pickVar = () => setPicker({
    cb: (id, med, esc) => {
      const m2 = meta(id)!;
      const nuevo: Expr = { ...d, id, med: med ?? medidaInicial(m2.tipo, motor.medDefault(m2), config), esc: esc ?? "" };
      if (!motor.relPermitido(m2)) nuevo.rel = null;
      setD(nuevo);
    },
  });
  const hayMedida = !conRel && escV !== "pib";
  return (
    <>
      <Modal titulo="Configurar variable" onCerrar={cancelar}>
        <div className="config-cuerpo">
          <h2>Configurar variable</h2>
          <Grupo titulo="Variable">
            <button type="button" className="btn var" title={A.n} onClick={pickVar}>{A.n}</button>
            <BotonInfo id={A.id} />
          </Grupo>
          {hayMedida && enMoneda && monedaG.length > 1 && (
            <Grupo titulo="Moneda">
              <Seg valor={act.g.k} opciones={monedaG.map((g) => [g.k, g.nombre] as [string, string])} onElegir={(k) => { if (k !== act.g.k) setMed(porDefecto(monedaG.find((g) => g.k === k)!)); }} />
              {act.g.dims.length > 1 && <Seg valor={act.v[1]} opciones={act.g.dims[1].opciones} onElegir={(v) => setDim(1, v)} />}
            </Grupo>
          )}
          {hayMedida && enMoneda && act.g.dims[0]?.opciones.length > 1 && (
            <Grupo titulo="Valores">
              <Seg valor={act.v[0]} opciones={act.g.dims[0].opciones} onElegir={(v) => setDim(0, v)} />
            </Grupo>
          )}
          {hayMedida && como.length > 1 && (
            <Grupo titulo="Cómo se mide">
              <Seg valor={comoAct} opciones={como} onElegir={elegirComo} />
              {act.g.k === "var" && act.g.dims.length > 1 && (
                <Seg valor={act.v[1]} opciones={act.g.dims[1].opciones} onElegir={(v) => setDim(1, v)} />
              )}
            </Grupo>
          )}
          {hayMedida && como.length < 2 && !enMoneda && (
            <Grupo titulo="Cómo se mide"><span className="lbl">{motor.esIndice(A) ? "Índice: se ve tal cual" : A.u}</span></Grupo>
          )}
          {escs.length > 0 && !conRel && (
            <Grupo titulo="Total, por habitante o % del PIB">
              <Seg valor={escV} opciones={escs.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => setD({ ...d, esc: v, rel: v ? null : d.rel })} />
            </Grupo>
          )}
          {relOk && (
            <Grupo titulo="En términos de">
              <button type="button" className="btn var" onClick={() => setPicker({ cb: (id) => setD({ ...d, rel: id, modo: d.modo || "compra" }), filtro: motor.relDestino, titulo: "En términos de: salario, dólar, canasta, otro precio…" })}>{B ? B.n : "ninguna (elegir…)"}</button>
              {B && (
                <>
                  <Seg valor={d.modo === "medido" ? "medido" : "compra"} onElegir={(v) => setD({ ...d, modo: v })}
                    opciones={[["compra", `¿Cuántos ${A.n} compra 1 ${B.n}?`], ["medido", `${A.n} medido en ${B.n}`]]} />
                  <button type="button" className="btn quitar" onClick={() => setD({ ...d, rel: null })}>✕ quitar</button>
                </>
              )}
            </Grupo>
          )}
        </div>
        <footer>
          <button type="button" className="btn" onClick={cancelar}>Cancelar</button>
          <button type="button" className="btn primario" onClick={aceptar}>Aceptar</button>
        </footer>
      </Modal>
      {picker && <Picker pedido={picker} onCerrar={() => setPicker(null)} />}
    </>
  );
}
