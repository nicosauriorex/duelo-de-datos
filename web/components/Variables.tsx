"use client";
// Selector de variables (árbol + búsqueda), ventana de información y fila de controles de una variable.
import { useEffect, useMemo, useRef, useState } from "react";
import { useDatos } from "./DatosProvider";
import { Modal } from "./ui";
import { fmtMes, lastIdx, norm } from "@/lib/formato";
import { ORDEN_RAIZ, textoBusqueda } from "@/lib/catalogo";
import { INFO_CAT } from "@/lib/info";
import type { Expr, SerieMeta } from "@/lib/motor";

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

export interface PickerPedido { cb: (id: string) => void; filtro?: (s: SerieMeta) => boolean; titulo?: string }

export function Picker({ pedido, onCerrar }: { pedido: PickerPedido; onCerrar: () => void }) {
  const { metas, motor } = useDatos();
  const [camino, setCamino] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [todo, setTodo] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const primero = useRef<string | undefined>(undefined);
  useEffect(() => { inp.current?.focus(); }, []);
  const raiz = useMemo(() => armarArbol(metas, pedido.filtro), [metas, pedido.filtro]);
  const elegir = (id: string) => { onCerrar(); pedido.cb(id); };
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
        {camino.length > 0 && INFO_CAT[ultimo] && <li className="info-cat" dangerouslySetInnerHTML={{ __html: INFO_CAT[ultimo] }} />}
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

/** Fila de controles de una variable: [variable] [medida] [en términos de] [modo] [quitar] */
export function FilaVariable({ e, onChange, color, quitable, agregable, textoAgregar, sinRel }: {
  e: Expr | null; onChange: (e: Expr | null) => void; color?: string; quitable?: boolean; agregable?: boolean; textoAgregar?: string; sinRel?: boolean;
}) {
  const { motor, metas, errores } = useDatos();
  const [picker, setPicker] = useState<PickerPedido | null>(null);
  if (!motor) return null;
  const meta = (id: string) => metas.find((m) => m.id === id);
  const abrir = (p: PickerPedido) => setPicker(p);
  const modal = picker ? <Picker pedido={picker} onCerrar={() => setPicker(null)} /> : null;
  if (!e) {
    if (!agregable) return null;
    return (
      <div className="fila-var">
        <button type="button" className="btn" onClick={() => abrir({ cb: (id) => onChange({ id, med: motor.medDefault(meta(id)!), rel: null, modo: "compra", esc: "" }), titulo: "Buscá o navegá" })}>
          {textoAgregar || "+ Agregar una segunda variable (eje derecho)"}
        </button>
        {modal}
      </div>
    );
  }
  const A = meta(e.id);
  if (!A) return null;
  const escs = motor.escPermitidas(A), escV = escs.some((o) => o[0] === e.esc) ? (e.esc || "") : "";
  const meds = motor.medidasDe(A);
  const relOk = motor.relPermitido(A) && !escV && !sinRel;
  const conRel = relOk && !!e.rel;
  const B = e.rel ? meta(e.rel) : null;
  return (
    <div className="fila-var">
      {color && <span className="punto" style={{ ["--c" as string]: `var(${color})` }} />}
      <button type="button" className="btn var" title={A.n} onClick={() => abrir({
        cb: (id) => { const nuevo: Expr = { ...e, id, med: motor.medDefault(meta(id)!), esc: "" }; if (!motor.relPermitido(meta(id)!)) nuevo.rel = null; onChange(nuevo); },
      })}>{A.n}</button>
      <BotonInfo id={A.id} />
      {(errores[A.archivo] || (B && errores[B.archivo])) && <span className="error" role="alert">No se pudieron bajar los datos de esta variable.</span>}
      {conRel || escV === "pib" ? null : meds.length < 2
        ? <span className="lbl">{motor.esIndice(A) ? "Índice: se ve tal cual" : A.u}</span>
        : <select aria-label="Medida" value={meds.some((m) => m[0] === e.med) ? e.med : meds[0][0]} onChange={(ev) => onChange({ ...e, med: ev.target.value })}>
            {meds.map((m) => <option key={m[0]} value={m[0]}>{m[1]}</option>)}
          </select>}
      {escs.length > 0 && !conRel && (
        <select aria-label="Total, por habitante o como % del PIB" value={escV} onChange={(ev) => onChange({ ...e, esc: ev.target.value, rel: ev.target.value ? null : e.rel })}>
          {escs.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
        </select>
      )}
      {relOk && (
        <>
          <span className="lbl">en términos de</span>
          <button type="button" className="btn var" onClick={() => abrir({
            cb: (id) => onChange({ ...e, rel: id, modo: e.modo || "compra" }), filtro: motor.relDestino, titulo: "En términos de: salario, dólar, canasta, otro precio…",
          })}>{B ? B.n : "ninguna (elegir…)"}</button>
          {B && (
            <>
              <select aria-label="Modo" value={e.modo === "medido" ? "medido" : "compra"} onChange={(ev) => onChange({ ...e, modo: ev.target.value })}>
                <option value="compra">¿Cuántos {A.n} compra 1 {B.n}?</option>
                <option value="medido">{A.n} medido en {B.n}</option>
              </select>
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
