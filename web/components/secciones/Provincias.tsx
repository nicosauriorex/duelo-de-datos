"use client";
// Cuánto gasta la Nación en cada provincia (/provincias/, docs/specs/provincias.md, fase 1): el gasto que la Nación declara ubicado en cada una de las 24
// jurisdicciones, por habitante, en total o como % de lo ubicado, con y sin jubilaciones y asignaciones. Tocar una provincia abre su detalle (Para qué, Quién,
// En qué y su evolución). Todas las cuentas están en lib/provincias.ts; acá solo se dibuja.
// La vista "Las cuentas de cada provincia" (fase 2, ?vista=cuentas) está en ProvinciasCuentas.tsx; sin `vista` la página es la de siempre.
// Estado en la URL: anio, medida (hab | total | pct), gasto (todo | sin_ss), prov (provincia abierta), forma (para_que | quien | en_que), ruta (nombres separados por "~") y todas.
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useProvincias, useProvinciasAnio } from "../useProvincias";
import { useSeccion } from "../useSeccion";
import { Cargando, Modal, Selector, Seg } from "../ui";
import { PanelGasto } from "../PanelGasto";
import { Cuentas } from "./ProvinciasCuentas";
import { VISTA_CUENTAS } from "@/lib/provinciasCuentas";
import { avisoCompartir, compartir } from "@/lib/compartir";
import { nf0 } from "@/lib/formato";
import {
  NIVELES, armarVista, crearDeflactor, escribirRuta, fechaLarga, leerRuta, nombreForma, type Barra, type Vista,
} from "@/lib/gasto";
import { extremoTxt } from "@/lib/universidades";
import {
  FORMAS_P, FORMA_P_DEFECTO, GASTOS_P, GASTO_P_DEFECTO, MEDIDAS_P, MEDIDA_P_DEFECTO, NOTA_CABA, TITULO_P,
  anioDefectoP, anioGastoDe, conPunto, anioValidoP, arbolesDe, armarAgregado, armarImagenP, armarVistaP, buscarProv, crearContexto, evolucionProv, esFormaP, esGastoP, esMedidaP,
  hrefP, opcionesAnioP, tituloP, txtPesosHab,
  type Contexto, type DatosProv, type EvoProv, type FormaP, type GastoP, type GraficoAgregado, type MedidaP, type ProvIx, type VistaP,
} from "@/lib/provincias";
import { fmtMillones } from "@/lib/formato";
import { useParams } from "@/lib/url";

export function Provincias() {
  const { datos, error } = useProvincias();
  const sec = useSeccion([]);
  const m = sec.motor, listo = !!m && !sec.ocupado;
  const deflactor = useMemo(() => (m && listo ? crearDeflactor(m.F, m.base().IPC) : null), [m, listo]);
  const contexto = useMemo(() => (datos && deflactor ? crearContexto(datos, deflactor) : null), [datos, deflactor]);
  if (error) return (
    <div className="card">
      <p className="error" role="alert">{error}</p>
      <p className="note">Todavía no está el archivo con el gasto por provincia, o no se pudo leer. El resto del sitio sigue funcionando; el gasto de la Nación por provincia, en total, está en <Link prefetch={false} href="/gasto/?forma=donde">En qué gasta la Nación</Link>.</p>
    </div>
  );
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!contexto) return <Cargando texto="Cargando el gasto de la Nación por provincia…" />;
  return <Cuerpo c={contexto} />;
}

function Cuerpo({ c }: { c: Contexto }) {
  const [p, set, montado] = useParams();
  const [imagen, setImagen] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const def = anioDefectoP(c);
  const anio = anioValidoP(c, p.get("anio")) ?? def;
  const medida: MedidaP = esMedidaP(p.get("medida")) ? (p.get("medida") as MedidaP) : MEDIDA_P_DEFECTO;
  const gasto: GastoP = esGastoP(p.get("gasto")) ? (p.get("gasto") as GastoP) : GASTO_P_DEFECTO;
  const enCuentas = p.get("vista") === VISTA_CUENTAS;
  const abierta = montado && !enCuentas ? buscarProv(c.d, p.get("prov")) : null;
  const vista = useMemo(() => armarVistaP(c, { anio, medida, gasto }), [c, anio, medida, gasto]);
  const href = hrefP({ anio, medida, gasto }, def);
  const titulo = vista ? tituloP(vista) : TITULO_P;
  const armarImg = useCallback((f: Parameters<typeof armarImagenP>[1]) => armarImagenP(vista!, f), [vista]);
  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };
  const agregado = useMemo(() => (c.d.agregado ? armarAgregado(c.d.agregado) : null), [c.d.agregado]);
  const cerrarDetalle = () => set({ prov: null, forma: null, ruta: null, todas: null });

  const cambiarVista = (v: string) => set({ vista: v === VISTA_CUENTAS ? v : null, anio: null, medida: null, gasto: null, prov: null, forma: null, ruta: null, todas: null, ind: null, orden: null, ib_act: null, ib_anio: null, ib_orden: null });
  const selectorVista = (
    <div className="controls prov-vista"><label>Qué ver</label>
      <Seg valor={enCuentas ? VISTA_CUENTAS : "nacion"} opciones={[["nacion", "Lo que gasta la Nación ahí"], [VISTA_CUENTAS, "Las cuentas de cada provincia"]]} onElegir={cambiarVista} /></div>
  );
  if (enCuentas) return <section className="prov">{selectorVista}<Cuentas c={c} p={p} set={set} montado={montado} /></section>;

  return (
    <section className="prov">
      {selectorVista}
      <p className="sub">Cuánto gasta la Nación en cada provincia, año por año, por habitante y en pesos de hoy. Datos oficiales del presupuesto.</p>
      <p className="callout prov-aclara">
        Es el gasto que la Nación declara ubicado en cada provincia (jubilaciones, asignaciones, universidades, obras y transferencias no automáticas). <b>No es el gasto del
        gobierno provincial ni incluye la coparticipación.</b> Mucho gasto figura en la Ciudad de Buenos Aires (donde están las sedes) o sin provincia.
      </p>
      <div className="controls prov-controles">
        <Selector etiqueta="Año" valor={String(anio)} opciones={opcionesAnioP(c)} onElegir={(a) => set({ anio: Number(a) === def ? null : a })} />
        <div className="controls"><label>Medida</label><Seg valor={medida} opciones={MEDIDAS_P} onElegir={(v) => set({ medida: v === MEDIDA_P_DEFECTO ? null : v })} /></div>
        <div className="controls"><label>Qué gasto</label><Seg valor={gasto} opciones={GASTOS_P} onElegir={(v) => set({ gasto: v === GASTO_P_DEFECTO ? null : v })} /></div>
      </div>
      {!vista ? <div className="card"><p className="note">No hay datos de {anio}.</p></div> : (
        <>
          <Tabla c={c} v={vista} onAbrir={(id) => set({ prov: id, forma: null, ruta: null, todas: null })} />
          <div className="prov-compartir" role="group" aria-label="Compartir esta vista">
            <button type="button" className="btn primario" onClick={() => setImagen(true)}>Compartir como imagen</button>
            <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(href, titulo)))}>Copiar link</button>
          </div>
          {aviso && <p className="aviso-link" role="status">{aviso}</p>}
        </>
      )}
      {agregado && <Agregado g={agregado} d={c.d} />}
      <p className="note prov-link-cuentas">¿Y lo que gasta cada provincia? <button type="button" className="enlace" onClick={() => cambiarVista(VISTA_CUENTAS)}>Ver sus cuentas</button></p>
      <Pie d={c.d} v={vista} />
      {abierta && <Detalle c={c} prov={abierta} anio={anio} medida={medida} gasto={gasto} p={p} set={set} def={def} onCerrar={cerrarDetalle} />}
      {imagen && vista && <PanelGasto armar={armarImg} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </section>
  );
}

/** La línea de "De cada $100", la tabla de las 24 jurisdicciones y, aparte, lo que no tiene provincia. */
function Tabla({ c, v, onAbrir }: { c: Contexto; v: VistaP; onAbrir: (id: string) => void }) {
  const ant = v.anio - 1;
  const [h1, h2] = v.medida === "hab" ? ["Por habitante", "Total"] : v.medida === "total" ? ["Total", "Por habitante"] : ["% de lo ubicado", "Por habitante"];
  const hayCaba = v.filas.some((f) => f.caba);
  return (
    <>
      {v.masa && (
        <p className="prov-masa">
          De cada $100 que gastó la Nación en {v.anio}{v.enCurso ? " (hasta la fecha)" : ""}, <b>${v.masa.ubicado}</b> figuran en una provincia y <b>${v.masa.caba}</b> en la Ciudad de Buenos Aires;
          el resto, <b>${v.masa.resto}</b>, no tiene provincia (deuda, organismos nacionales).
        </p>
      )}
      <div className="card prov-card">
        <h2>{v.medida === "hab" ? "Gasto de la Nación por habitante" : v.medida === "total" ? "Gasto de la Nación" : "Cómo se reparte lo que la Nación gastó en las provincias"} en {v.anio}{v.enCurso ? " (en curso)" : ""}</h2>
        <p className="note">
          {v.unidad}. Gastado (devengado){v.enCurso ? ` hasta el ${fechaLarga(v.actualizado) ?? "último dato publicado"}` : ""}; {v.gasto === "sin_ss" ? "sin jubilaciones ni asignaciones (la función Seguridad social)" : "todo el gasto ubicado"}. Tocá una provincia para ver en qué gasta ahí.
        </p>
        {v.aviso && <p className="note" role="status">{v.aviso}</p>}
        <div className="tablewrap fija prov-tabla">
          <table>
            <thead>
              <tr><th scope="col">Provincia</th><th scope="col">{h1}</th><th scope="col">{h2}</th><th scope="col">{v.enCurso ? "Variación real" : `Variación real vs ${ant}`}</th></tr>
            </thead>
            <tbody>
              {v.filas.map((f) => (
                <tr key={f.id}>
                  <td className="prov-nombre">
                    <button type="button" className="prov-abrir" onClick={() => onAbrir(f.id)} aria-label={`${f.n}${f.pos != null ? `, puesto ${f.pos}` : ""}: ${f.txt}. Ver el detalle`}>
                      <span className="prov-pos" aria-hidden="true">{f.pos ?? "–"}</span>
                      <span className="prov-nom">{f.n}{f.caba && <abbr className="prov-marca" title={NOTA_CABA}>*</abbr>}</span>
                    </button>
                  </td>
                  <td className="prov-valor">{f.txt}</td>
                  <td>{f.otraTxt ?? "–"}</td>
                  <td>{f.variTxt ?? "–"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td className="prov-nombre"><span className="prov-nom prov-total-n">Las {v.filas.length} juntas</span></td><td className="prov-valor">{v.total || "–"}</td><td>{v.totalOtro ?? "–"}</td><td>–</td></tr>
            </tfoot>
          </table>
        </div>
        {hayCaba && <p className="note prov-nota-caba">* {NOTA_CABA}</p>}
        <p className="note">La variación es real (descontada la inflación) contra {ant}{v.medida === "hab" ? ", por habitante" : ", en pesos de hoy"}; el año en curso no se compara porque todavía no terminó. La población es la proyección del INDEC.{v.gasto === "sin_ss" ? " Sin jubilaciones, una provincia sin dato de Seguridad social queda sin valor." : ""}</p>
        {v.sinProvincia && (
          <div className="prov-sin">
            <h3>Sin provincia</h3>
            <p className="note">Gasto que el presupuesto no ubica en una provincia (en pesos de {v.ref}), con todo el gasto. Su parte del gasto total de la Nación en {v.anio}.</p>
            <div className="tablewrap fija">
              <table>
                <thead><tr><th scope="col">Qué figura</th><th scope="col">Monto</th><th scope="col">% del total</th></tr></thead>
                <tbody>
                  {v.sinProvincia.filas.map((f) => <tr key={f.n}><td className="prov-nombre"><span className="prov-nom">{f.n}</span></td><td>{f.txt}</td><td>{f.parte}</td></tr>)}
                </tbody>
                <tfoot><tr><td className="prov-nombre"><span className="prov-nom prov-total-n">Suma</span></td><td className="prov-valor">{v.sinProvincia.total}</td><td>{v.sinProvincia.parte}</td></tr></tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Detalle de una provincia: lo que gasta la Nación ahí en las tres formas de /gasto/ y la evolución por habitante. En una ventana con cruz, Atrás y Escape. */
function Detalle({ c, prov, anio, medida, gasto, p, set, def, onCerrar }: {
  c: Contexto; prov: ProvIx; anio: number; medida: MedidaP; gasto: GastoP; p: URLSearchParams; set: (x: Record<string, string | null | undefined>) => void; def: number; onCerrar: () => void;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const forma: FormaP = esFormaP(p.get("forma")) ? (p.get("forma") as FormaP) : FORMA_P_DEFECTO;
  const ruta = leerRuta(p.get("ruta")), todas = p.get("todas") === "1";
  const a = c.d.anios.find((x) => x.anio === anio)!, i = c.d.anios.indexOf(a);
  const { datos, cargando, error } = useProvinciasAnio(a.archivo, c.d.generado);
  const arch = datos?.provincias[prov.id] ?? datos?.provincias[String(Number(prov.id))] ?? null;
  const vista = useMemo(() => (arch ? armarVista({ archivo: arbolesDe(arch, gasto), anio: anioGastoDe(a), forma, ruta, medida: "hoy", etapa: "dev", deflactor: c.def, max: todas ? Infinity : undefined }) : null),
    [arch, gasto, a, forma, p.get("ruta"), todas, c.def]);   // eslint-disable-line react-hooks/exhaustive-deps
  const evo = useMemo(() => evolucionProv(c, prov, gasto), [c, prov, gasto]);
  const hab = evo.puntos[i]?.txt ?? null, fila = evo.filas.find((x) => x.anio === anio);
  // total de la cabecera: en el primer nivel, el de las barras (así cierran con lo que se lee); con "sin jubilaciones" en Quién o En qué
  // (que muestran todo el gasto), el de la provincia sin Seguridad social, para que vaya con el "por habitante" de al lado
  const totalCab = vista && !ruta.length && !(gasto === "sin_ss" && forma !== "para_que") ? vista.total : fila?.total ?? null;
  const ir = (r: string[]) => set({ ruta: escribirRuta(r), todas: null });
  const href = hrefP({ anio, medida, gasto }, def, { prov: prov.id, forma, ruta: escribirRuta(ruta) });
  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };
  return (
    <Modal titulo={`${prov.n}: gasto de la Nación en ${anio}`} onCerrar={onCerrar} ancho>
      <div className="prov-detalle">
        <h2>{prov.n}: en qué gasta la Nación en {anio}{a.en_curso ? " (en curso)" : ""}</h2>
        <p className="prov-cifras">
          <b>{hab ?? "Sin dato de población"}</b><span> por habitante, en pesos de {c.def.ref}</span>
          {/* en el primer nivel, el total es el de las barras de abajo (así la suma de lo que se ve da lo que se lee arriba) */}
          {totalCab && <span> · {totalCab} en total</span>}
        </p>
        {gasto === "sin_ss" && <p className="note">Sin jubilaciones ni asignaciones: en Para qué se saca la función Seguridad social. Quién y En qué muestran todo el gasto.</p>}
        {Number(prov.id) === 2 && <p className="note">{NOTA_CABA}</p>}
        <div className="gas-formas prov-formas" role="group" aria-label="Forma de mirar el gasto">
          <Seg valor={forma} opciones={FORMAS_P} onElegir={(f) => set({ forma: f === FORMA_P_DEFECTO ? null : f, ruta: null, todas: null })} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {!vista ? (cargando ? <Cargando texto={`Cargando ${anio}…`} /> : !error && <p className="note">No hay detalle de {prov.n} para {anio}.</p>) : <Barras v={vista} onIr={ir} onTodas={() => set({ todas: "1" })} />}
        <EvoHab evo={evo} anio={anio} nombre={prov.n} sinSS={gasto === "sin_ss"} />
        <div className="prov-compartir">
          <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(href, `${prov.n}: ${tituloP({ anio, enCurso: a.en_curso } as VistaP)}`)))}>Copiar link de esta provincia</button>
        </div>
        {aviso && <p className="aviso-link" role="status">{aviso}</p>}
      </div>
    </Modal>
  );
}

/** Migas, total del nivel abierto y las barras de la forma elegida. Mismas clases que /gasto/. */
function Barras({ v, onIr, onTodas }: { v: Vista; onIr: (r: string[]) => void; onTodas: () => void }) {
  const nivel = NIVELES[v.forma][v.ruta.length];
  return (
    <div className="prov-barras">
      {v.ruta.length > 0 && (
        <nav className="migas gas-migas" aria-label="Niveles abiertos">
          <button type="button" onClick={() => onIr([])}>{nombreForma(v.forma)}</button>
          {v.ruta.map((n, i) => (
            <span key={i} className="gas-miga">
              <span aria-hidden="true">›</span>
              {i < v.ruta.length - 1 ? <button type="button" onClick={() => onIr(v.ruta.slice(0, i + 1))}>{n}</button> : <span aria-current="page">{n}</span>}
            </span>
          ))}
        </nav>
      )}
      {/* el nombre del nivel abierto ya está en las migas (o en el botón elegido) y el total del primer nivel en la cabecera: no se repiten */}
      {v.ruta.length > 0 && <p className="gas-total-num"><b>{v.total}</b> <span>{v.etapaTxt}</span></p>}
      <p className="note">{v.unidad}.</p>
      {v.aviso && <p className="note" role="status">{v.aviso}</p>}
      {v.barras.length ? (
        <>
          <p className="gas-enc" aria-hidden="true"><span>{nivel ?? "Partida"}</span><span>{v.ruta.length ? "% de este nivel" : "% del total"}</span></p>
          <ol className="gas-lista">
            {v.barras.map((b, i) => <FilaBarra key={i} b={b} onAbrir={b.nodo?.h?.length ? () => onIr([...v.ruta, b.n]) : b.tipo === "otros" ? onTodas : null} />)}
          </ol>
        </>
      ) : <p className="note">No se divide en un nivel más abajo.</p>}
    </div>
  );
}

function FilaBarra({ b, onAbrir }: { b: Barra; onAbrir: (() => void) | null }) {
  const contenido = (
    <>
      <span className="gas-fila-arriba">
        <span className="gas-nombre">{b.n}{b.tipo === "otros" && <small> · ver todas</small>}</span>
        <span className="gas-monto">{b.txt}</span>
      </span>
      <span className="gas-pista" aria-hidden="true"><span className={`gas-barra${b.tipo !== "nodo" ? " gas-barra-otros" : ""}`} style={{ width: `${(b.ancho * 100).toFixed(2)}%` }} /></span>
      {b.parte && <span className="gas-sub">{b.parte}</span>}
    </>
  );
  return (
    <li className={`gas-fila gas-${b.tipo}`}>
      {onAbrir
        ? <button type="button" className="gas-abrir" onClick={onAbrir} title={b.t ? `Nombre en el presupuesto: ${b.t}` : undefined}
          aria-label={b.tipo === "otros" ? `${b.n}: ${b.txt}. Ver todas` : `${b.n}: ${b.txt}${b.parte ? `, ${b.parte}` : ""}. Abrir`}>{contenido}</button>
        : <div className="gas-abrir gas-quieta">{contenido}</div>}
    </li>
  );
}

/** Gráfico chico de columnas del gasto por habitante, una por año (el año en curso va rayado y con asterisco), y la tabla año por año. */
function EvoHab({ evo, anio, nombre, sinSS }: { evo: EvoProv; anio: number; nombre: string; sinSS: boolean }) {
  return (
    <figure className="uni-evo-fig prov-evo">
      <figcaption className="uni-evo-tit">{nombre}: gasto por habitante{sinSS ? " (sin jubilaciones ni asignaciones)" : ""}, en pesos de hoy</figcaption>
      <ol className="uni-evo">
        {evo.puntos.map((pt) => {
          const txt = pt.txt ? `${pt.anio}${pt.enCurso ? " (en curso)" : ""}: ${pt.txt}` : `${pt.anio}: sin dato`;
          return (
            <li key={pt.anio}>
              <div className="uni-evo-btn uni-evo-quieta" role="img" aria-label={txt} title={txt}>
                <span className="uni-evo-col"><span className={`uni-evo-barra${pt.enCurso ? " uni-evo-encurso" : ""}${pt.anio === anio ? " uni-evo-elegida" : ""}`} style={{ height: `${(pt.alto * 100).toFixed(1)}%` }} /></span>
                <span className="uni-evo-anio">{pt.anio}{pt.enCurso ? "*" : ""}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {evo.primero && evo.ultimo && evo.primero !== evo.ultimo && <p className="uni-evo-ext"><span>{extremoTxt(evo.primero)}</span><span>{extremoTxt(evo.ultimo)}</span></p>}
      {evo.hayEnCurso && <p className="note">* El año en curso todavía no terminó: lo gastado hasta la fecha no se compara con un año completo.</p>}
      <details className="gas-tabla-anios">
        <summary>Ver año por año</summary>
        <div className="tablewrap">
          <table>
            <thead><tr><th scope="col">Año</th><th scope="col">Por habitante</th><th scope="col">Total</th><th scope="col">Variación real</th></tr></thead>
            <tbody>
              {evo.filas.map((x) => <tr key={x.anio}><th scope="row">{x.anio}{x.enCurso ? " (en curso)" : ""}</th><td>{x.hab ?? "–"}</td><td>{x.total ?? "–"}</td><td>{x.vari ?? "–"}</td></tr>)}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Lo que gastan las provincias juntas, en % del PIB (otra fuente: la Secretaría de Política Económica): total y las cuatro finalidades. */
function Agregado({ g, d }: { g: GraficoAgregado; d: DatosProv }) {
  const W = 600, H = 200, x0 = g.anios[0], x1 = g.anios[g.anios.length - 1], techo = Math.ceil(g.max / 5) * 5 || 1;
  const px = (a: number) => ((a - x0) / ((x1 - x0) || 1)) * W, py = (v: number) => H - (v / techo) * H;
  const trazo = (v: (number | null)[]) => v.map((y, i) => (y == null ? null : `${px(g.anios[i]).toFixed(1)},${py(y).toFixed(1)}`)).reduce<string[][]>((a, s) => { if (s == null) a.push([]); else (a.length ? a[a.length - 1] : a[a.push([]) - 1]).push(s); return a; }, [])
    .filter((t) => t.length > 1).map((t) => "M" + t.join("L")).join("");
  return (
    <div className="card prov-agregado">
      <h2>Lo que gastan las provincias juntas</h2>
      <p className="note">Es otra fuente y otro gasto: lo que gastan los gobiernos provinciales, con sus propios recursos y los que reciben de la Nación, todos juntos y como % del PIB. La fuente no lo abre por provincia, y el último año publicado es {g.ultimoAnio}.</p>
      <figure className="prov-linea">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Gasto de las provincias juntas, en % del PIB, de ${x0} a ${x1}. ${g.lineas.map((l) => `${l.n}: ${l.ultimo ? `${l.ultimo.txt} en ${l.ultimo.anio}` : "sin dato"}`).join("; ")}.`}>
          {[0, 0.5, 1].map((k) => <line key={k} x1="0" x2={W} y1={py(techo * k)} y2={py(techo * k)} className="prov-grilla" vectorEffect="non-scaling-stroke" />)}
          {g.lineas.map((l, k) => <path key={l.n} d={trazo(l.v)} fill="none" stroke={`var(--series-${k + 1})`} strokeWidth={l.total ? 3 : 1.75} vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className="prov-ejes"><span>{x0}</span><span>{x1}</span></div>
        <figcaption className="prov-eje-y">% del PIB; el eje llega a {techo} %</figcaption>
      </figure>
      <ul className="prov-leyenda">
        {g.lineas.map((l, k) => (
          <li key={l.n}>
            <span className="prov-clave" style={{ background: `var(--series-${k + 1})` }} aria-hidden="true" />
            <span className="prov-leyenda-n">{l.n}</span>
            <b>{l.ultimo ? l.ultimo.txt : "–"}</b>
          </li>
        ))}
      </ul>
      {d.fuenteAgregado && <p className="note">Fuente: {conPunto(d.fuenteAgregado)}</p>}
    </div>
  );
}

function Pie({ d, v }: { d: DatosProv; v: VistaP | null }) {
  const gen = fechaLarga(d.generado || null);
  return (
    <details className="gas-pie">
      <summary>Qué incluye, cómo se calcula y fuentes</summary>
      <ul className="method">
        <li><b>Qué incluye</b>: lo que la Administración Nacional declara gastado (devengado) en cada provincia: jubilaciones, pensiones y asignaciones, universidades, obras, salud y transferencias no automáticas. <b>No incluye</b> el gasto de los gobiernos provinciales ni la coparticipación, y tampoco las empresas públicas ni los fondos fiduciarios.</li>
        <li><b>Dónde figura</b>: la provincia es la que declara cada partida del presupuesto, no dónde vive quien recibe el gasto. En la Ciudad de Buenos Aires figuran las sedes de los organismos nacionales; “Interprovincial”, “Nacional”, “Binacional”, “No clasificado” y “Exterior” no tienen provincia (ahí están, por ejemplo, los intereses de la deuda).</li>
        <li><b>Por habitante</b>: el gasto en pesos de hoy dividido la población de la provincia en ese año, en pesos enteros. <b>Pesos de hoy</b>: el monto de cada año ajustado por inflación con el IPC (el IPC del último mes publicado sobre el IPC promedio de ese año). <b>Variación real</b>: la de los pesos de hoy contra el año anterior.</li>
        <li><b>Sin jubilaciones ni asignaciones</b>: resta la función Seguridad social del gasto de cada provincia; sirve para ver obras, salud, educación y transferencias.</li>
        <li><b>Población</b>: {conPunto(d.fuentePoblacion || "INDEC, proyecciones de población por provincia 2010-2040 (base censo 2010)")}</li>
        <li><b>Fuente</b>: {v ? `Presupuesto Abierto (Ministerio de Economía)${v.actualizado ? `, actualizado al ${fechaLarga(v.actualizado)}` : ""}` : "Presupuesto Abierto (Ministerio de Economía)"}.{gen ? ` Archivo armado el ${gen}.` : ""} Montos redondeados: las filas suman el total que se ve.</li>
        <li>Lo mismo, sumado por provincia, en <Link prefetch={false} href="/gasto/?forma=donde">En qué gasta la Nación</Link>.</li>
      </ul>
    </details>
  );
}
