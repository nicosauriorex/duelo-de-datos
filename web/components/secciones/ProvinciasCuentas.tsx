"use client";
// Las cuentas de cada provincia (/provincias/?vista=cuentas, docs/specs/provincias.md, fase 2): un indicador de las cuentas de los gobiernos provinciales,
// de las 24 jurisdicciones, y el detalle de cada una. Todas las cuentas están en lib/provinciasCuentas.ts; acá solo se dibuja.
// Estado en la URL: vista=cuentas, ind (id del indicador), anio, orden (desc | asc) y prov (provincia abierta).
// El bloque de alícuotas de Ingresos Brutos (fase 3, ProvinciasAlicuotas.tsx) usa ib_act, ib_anio e ib_orden.
import { useCallback, useMemo, useState } from "react";
import { useProvinciasCuentas } from "../useProvincias";
import { Cargando, Modal, Selector, Seg } from "../ui";
import { PanelGasto } from "../PanelGasto";
import { Alicuotas } from "./ProvinciasAlicuotas";
import { avisoCompartir, compartir } from "@/lib/compartir";
import { fechaLarga } from "@/lib/gasto";
import { extremoTxt } from "@/lib/universidades";
import { conPunto, type Contexto } from "@/lib/provincias";
import {
  IND_DEFECTO, NOTA_CAJA, anioParcial, avisoPeriodoC, etiquetaPeriodo, rangoMeses, crearCtxParcial, indicadorOfrecido, ORDEN_C_DEFECTO, ORDENES_C, TITULO_C, anioDefectoC, anioValidoC, armarDetalleC, armarImagenC, armarVistaC, buscarProvC, crearCtxC, esIndicador, esOrdenC,
  hrefC, indicadorDe, opcionesAnioC, opcionesIndicador, tituloC,
  type CtxC, type DatosCuentas, type DetalleC, type EvoC, type IdInd, type OrdenC, type VistaC,
} from "@/lib/provinciasCuentas";

type Cambiar = (x: Record<string, string | null | undefined>) => void;

export function Cuentas({ c, p, set, montado }: { c: Contexto; p: URLSearchParams; set: Cambiar; montado: boolean }) {
  const { datos, cargando, error } = useProvinciasCuentas(true, c.d.generado);
  if (error) return (
    <div className="card">
      <p className="error" role="alert">{error}</p>
      <p className="note">Todavía no está el archivo con las cuentas de las provincias, o no se pudo leer. El gasto de la Nación en cada provincia sigue disponible en la otra vista de esta página.</p>
    </div>
  );
  if (cargando || !datos) return <Cargando texto="Cargando las cuentas de cada provincia…" />;
  return <CuerpoC d={datos} c={c} p={p} set={set} montado={montado} />;
}

function CuerpoC({ d, c, p, set, montado }: { d: DatosCuentas; c: Contexto; p: URLSearchParams; set: Cambiar; montado: boolean }) {
  const x0 = useMemo(() => crearCtxC(d, c), [d, c]);
  const xp = useMemo(() => crearCtxParcial(x0), [x0]);
  const [imagen, setImagen] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const def = anioDefectoC(x0);
  const anio = anioValidoC(x0, p.get("anio")) ?? def;
  // Con "anio" = el año en curso se usa el contexto del período parcial (acumulado, contra el mismo período del año anterior).
  const x = xp && anio === anioParcial(x0) ? xp : x0;
  const ind: IdInd = esIndicador(p.get("ind")) && indicadorOfrecido(x, p.get("ind") as IdInd) ? (p.get("ind") as IdInd) : IND_DEFECTO;
  const orden: OrdenC = esOrdenC(p.get("orden")) ? (p.get("orden") as OrdenC) : ORDEN_C_DEFECTO;
  const abierta = montado ? buscarProvC(x, p.get("prov")) : null;
  const I = indicadorDe(ind);
  const vista = useMemo(() => armarVistaC(x, { anio, ind, orden }), [x, anio, ind, orden]);
  const href = hrefC({ anio, ind, orden }, def);
  const titulo = vista ? tituloC(vista) : TITULO_C;
  const armarImg = useCallback((f: Parameters<typeof armarImagenC>[1]) => armarImagenC(vista!, f), [vista]);
  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };

  return (
    <>
      <p className="sub">Cuánto gasta, cuánto recauda, cuánto recibe de la Nación y cuánto debe el gobierno de cada provincia. Datos oficiales de la Dirección Nacional de Asuntos Provinciales.</p>
      <Aclaraciones />
      {!I.fijo && avisoPeriodoC(x) && <p className="note" role="status">{avisoPeriodoC(x)}</p>}
      <div className="controls prov-controles">
        <Selector etiqueta="Indicador" valor={ind} opciones={opcionesIndicador(x)} onElegir={(v) => set({ ind: v === IND_DEFECTO ? null : v })} className="pc-sel-ind" />
        <Selector etiqueta="Año" valor={String(anio)} opciones={opcionesAnioC(x0)} onElegir={(a) => set({ anio: Number(a) === def ? null : a })} />
        <div className="controls"><label>Orden</label><Seg valor={orden} opciones={ORDENES_C} onElegir={(v) => set({ orden: v === ORDEN_C_DEFECTO ? null : v })} /></div>
      </div>
      <p className="note pc-explica"><b>{I.n}.</b> {I.explica}{I.fijo ? ` Último dato publicado: ${fechaLarga(d.deudaFecha) ?? "sin fecha"}.` : ""}</p>
      {!vista ? <div className="card"><p className="note">No hay datos de {etiquetaPeriodo(x, anio)} para este indicador{I.id === "gasto_hab" || I.id === "recaud_hab" || I.fijo ? " (hace falta la población de la provincia en ese año)" : ""}.</p></div> : (
        <>
          <Tabla v={vista} onAbrir={(id) => set({ prov: id })} />
          <div className="prov-compartir" role="group" aria-label="Compartir esta vista">
            <button type="button" className="btn primario" onClick={() => setImagen(true)}>Compartir como imagen</button>
            <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(href, titulo)))}>Copiar link</button>
          </div>
          {aviso && <p className="aviso-link" role="status">{aviso}</p>}
        </>
      )}
      <Alicuotas c={c} p={p} set={set} />
      <Pie d={d} parcial={!!x.per} />
      {abierta && <DetalleCuentas x={x} xEvo={x0} id={abierta.id} anio={anio} ind={ind} orden={orden} def={def} onCerrar={() => set({ prov: null })} />}
      {imagen && vista && <PanelGasto armar={armarImg} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </>
  );
}

/** Lo que hay que saber antes de leer la tabla: una línea visible y el resto plegado (el dato antes que la explicación).
 *  La caja de jubilaciones se explica debajo de la tabla, junto a la marca †. */
function Aclaraciones() {
  return (
    <div className="callout prov-aclara">
      <p>Cuentas del <b>gobierno de cada provincia</b>, sin municipios ni empresas provinciales. Ejecución <b>provisoria</b>.</p>
      <details>
        <summary>Más sobre estos datos</summary>
        <p>Es la Administración Pública No Financiera de cada provincia, según la Dirección Nacional de Asuntos Provinciales. La Ciudad de Buenos Aires recibe coparticipación desde 2003, con un régimen distinto.</p>
        <p>No hay puntaje combinado: cada indicador se mira por separado y sin decir qué provincia está mejor o peor.</p>
      </details>
    </div>
  );
}

function Tabla({ v, onAbrir }: { v: VistaC; onAbrir: (id: string) => void }) {
  return (
    <div className="card prov-card">
      <h2>{v.ind.n}{v.ind.fijo ? ` (al ${fechaLarga(v.fechaDeuda) ?? "último dato"})` : ` en ${v.etq}`}</h2>
      <p className="note">{v.unidad}. {v.ind.fijo ? "No depende del año elegido. " : ""}Ordenado de {v.orden === "desc" ? "mayor a menor" : "menor a mayor"}. Tocá una provincia para ver sus cuentas.</p>
      {v.aviso && <p className="note" role="status">{v.aviso}</p>}
      <div className="tablewrap fija prov-tabla">
        <table>
          <thead><tr><th scope="col">Provincia</th><th scope="col">{v.ind.n}</th>{v.encVari && <th scope="col">{v.encVari}</th>}</tr></thead>
          <tbody>
            {v.filas.map((f) => (
              <tr key={f.id}>
                <td className="prov-nombre">
                  <button type="button" className="prov-abrir" onClick={() => onAbrir(f.id)} aria-label={`${f.n}${f.pos != null ? `, puesto ${f.pos}` : ""}: ${f.txt}${f.caja ? ", con caja de jubilaciones propia" : ""}. Ver sus cuentas`}>
                    <span className="prov-pos" aria-hidden="true">{f.pos ?? "–"}</span>
                    <span className="prov-nom">{f.n}{f.caja && <abbr className="prov-marca" title={NOTA_CAJA}>†</abbr>}</span>
                  </button>
                </td>
                <td className="prov-valor">{f.txt}</td>
                {v.encVari && <td>{f.variTxt ?? "–"}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td className="prov-nombre"><span className="prov-nom prov-total-n">Las 24 juntas</span></td><td className="prov-valor">{v.juntas.txt}</td>{v.encVari && <td>{v.juntas.variTxt ?? "–"}</td>}</tr>
          </tfoot>
        </table>
      </div>
      {v.sinCuentas && <p className="note">{v.sinCuentas}</p>}
      {v.conCaja > 0 && <p className="note pc-nota-caja">† {NOTA_CAJA} En {v.etq}: {v.conCaja} de las 24.</p>}
      {v.encVari && <p className="note">{v.ind.tipo === "pesos" ? `La variación es real (descontada la inflación) contra ${v.etqAnt}.` : `La variación es la diferencia contra ${v.etqAnt}${v.ind.tipo === "pct" ? ", en puntos porcentuales" : ""}.`} Un guion es que falta el dato de ese año.</p>}
      <details className="gas-tabla-anios">
        <summary>Cómo se calcula</summary>
        <p className="note">{v.ind.formula}.</p>
      </details>
    </div>
  );
}

/** Detalle de una provincia: sus cuentas del año, el gasto por finalidad y la evolución del indicador. En una ventana con cruz, Atrás y Escape. */
function DetalleCuentas({ x, xEvo, id, anio, ind, orden, def, onCerrar }: { x: CtxC; xEvo: CtxC; id: string; anio: number; ind: IdInd; orden: OrdenC; def: number; onCerrar: () => void }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const det = useMemo(() => armarDetalleC(x, id, anio, ind, xEvo), [x, xEvo, id, anio, ind]);
  const I = indicadorDe(ind);
  if (!det) return null;
  const href = hrefC({ anio, ind, orden }, def, id);
  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };
  return (
    <Modal titulo={`${det.n}: cuentas de ${det.etq}`} onCerrar={onCerrar} ancho>
      <div className="prov-detalle">
        <h2>{det.n}: cuentas de {det.etq}</h2>
        <p className="prov-cifras">
          <b>{det.valorTxt ?? "Sin dato"}</b><span> {I.n.toLowerCase()}{I.fijo ? "" : ` en ${det.etq}`}</span>
          {det.variTxt && <span> · {det.variTxt}{I.tipo === "pesos" ? " real" : ""} vs {det.etqAnt}</span>}
        </p>
        {det.caja && <p className="note">† {NOTA_CAJA}</p>}
        {det.cuentas ? <TablaCuentas cu={det.cuentas} etq={det.etq} /> : <p className="note">No hay cuentas de {det.n} para {det.etq}.</p>}
        {det.finalidades && (
          <div className="pc-fin">
            <h3>En qué gastó, por finalidad ({det.etq})</h3>
            <p className="note">Total {det.finTotal}, en pesos de {x.p.def.ref}.</p>
            {det.finNota && <p className="note">{det.finNota}</p>}
            <ol className="gas-lista">
              {det.finalidades.map((b) => (
                <li key={b.n} className="gas-fila gas-nodo">
                  <div className="gas-abrir gas-quieta">
                    <span className="gas-fila-arriba"><span className="gas-nombre">{b.n}</span><span className="gas-monto">{b.txt}</span></span>
                    <span className="gas-pista" aria-hidden="true"><span className="gas-barra" style={{ width: `${(b.ancho * 100).toFixed(2)}%` }} /></span>
                    <span className="gas-sub">{b.parte}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
        {det.evo ? <Evolucion evo={det.evo} anio={anio} nombre={det.n} titulo={I.n} nota={det.evoNota} /> : <p className="note">{I.n} no depende del año: es el último dato publicado, así que no tiene evolución.</p>}
        <div className="prov-compartir">
          <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(href, `${det.n}: ${tituloC({ anio, ind: I, etq: det.etq })}`)))}>Copiar link de esta provincia</button>
        </div>
        {aviso && <p className="aviso-link" role="status">{aviso}</p>}
      </div>
    </Modal>
  );
}

function TablaCuentas({ cu, etq }: { cu: NonNullable<DetalleC["cuentas"]>; etq: string }) {
  const bloque = (titulo: string, filas: typeof cu.ingresos) => (
    <>
      <tr className="pc-cab"><th scope="rowgroup" colSpan={2}>{titulo}</th></tr>
      {filas.map((f, k) => (
        <tr key={f.n} className={!f.sub && k === filas.length - 1 ? "pc-total" : undefined}>
          <th scope="row" className={f.sub ? "pc-sub" : undefined}>{f.n}</th><td>{f.txt}</td>
        </tr>
      ))}
    </>
  );
  return (
    <div className="pc-cuentas">
      <p className="note">{cu.unidad}. Las filas suman el total que se ve; “Otros” es lo que falta para llegar al total.</p>
      <div className="tablewrap">
        <table>
          <caption className="pc-leyenda">Ingresos, gastos y resultado de {etq}</caption>
          <tbody>
            {bloque("Ingresos", cu.ingresos)}
            {bloque("Gastos", cu.gastos)}
            <tr className="pc-total"><th scope="row">{cu.resultado.n}</th><td>{cu.resultado.txt}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Gráfico chico de columnas del indicador, una por año (las barras de resultado negativo van más claras), y la tabla año por año. */
function Evolucion({ evo, anio, nombre, titulo, nota }: { evo: EvoC; anio: number; nombre: string; titulo: string; nota: string | null }) {
  return (
    <figure className="uni-evo-fig prov-evo">
      <figcaption className="uni-evo-tit">{nombre}: {titulo.toLowerCase()}, de {evo.puntos[0]?.anio} a {evo.puntos[evo.puntos.length - 1]?.anio}</figcaption>
      <ol className="uni-evo">
        {evo.puntos.map((pt) => {
          const txt = pt.txt ? `${pt.anio}: ${pt.txt}` : `${pt.anio}: sin dato`;
          return (
            <li key={pt.anio}>
              <div className="uni-evo-btn uni-evo-quieta" role="img" aria-label={txt} title={txt}>
                <span className="uni-evo-col"><span className={`uni-evo-barra${pt.neg ? " pc-evo-neg" : ""}${pt.anio === anio ? " uni-evo-elegida" : ""}`} style={{ height: `${(pt.alto * 100).toFixed(1)}%` }} /></span>
                <span className="uni-evo-anio">{String(pt.anio).slice(2)}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {evo.primero && evo.ultimo && evo.primero !== evo.ultimo && <p className="uni-evo-ext"><span>{extremoTxt(evo.primero)}</span><span>{extremoTxt(evo.ultimo)}</span></p>}
      {nota && <p className="note">{nota}</p>}
      {evo.hayNegativos && <p className="note">Las barras más claras son valores negativos (el largo es el valor sin el signo).</p>}
      <details className="gas-tabla-anios">
        <summary>Ver año por año</summary>
        <div className="tablewrap">
          <table>
            <thead><tr><th scope="col">Año</th><th scope="col">{titulo}</th><th scope="col">Variación</th></tr></thead>
            <tbody>{evo.filas.map((f) => <tr key={f.anio}><th scope="row">{f.anio}</th><td>{f.txt ?? "–"}</td><td>{f.vari ?? "–"}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function Pie({ d, parcial }: { d: DatosCuentas; parcial: boolean }) {
  const gen = fechaLarga(d.generado || null);
  const fuentes = Object.entries(d.fuentes);
  return (
    <details className="gas-pie">
      <summary>Qué incluye, cómo se calcula y fuentes</summary>
      <ul className="method">
        <li><b>Qué incluye</b>: ingresos y gastos del gobierno de cada provincia (Administración Pública No Financiera), con ejecución provisoria. No incluye municipios ni empresas provinciales.</li>
        <li><b>Pesos de hoy</b>: el monto de cada año ajustado por inflación con el IPC (el IPC del último mes publicado sobre el IPC promedio de ese año). <b>Por habitante</b>: dividido la población de la provincia en ese año (proyección del INDEC con base censo 2010).</li>
        <li><b>Caja de jubilaciones propia</b>: se marca a las provincias cuyas prestaciones de la seguridad social son el 5 % o más de su gasto total en el año elegido.</li>
        <li><b>Deuda</b>: stock al {fechaLarga(d.deudaFecha) ?? "último dato publicado"}, sin deuda flotante. No depende del año elegido.</li>
        {fuentes.map(([k, f]) => <li key={k}><b>Fuente ({k})</b>: {[f.archivo, f.pagina, f.fecha && `bajado el ${fechaLarga(f.fecha) ?? f.fecha}`].filter(Boolean).join(", ") || "sin detalle"}.</li>)}
        {parcial && d.parcial && <li><b>Período parcial</b>: lo acumulado de {rangoMeses(d.parcial.meses)} de {d.parcial.anios[d.parcial.anios.length - 1]}, comparado con el mismo período de {d.parcial.anios[d.parcial.anios.length - 1] - 1}. Los pesos de hoy usan la inflación promedio de esos meses. Sin empleados públicos ni sueldo medio: no hay dato trimestral.</li>}
        {d.fuente && <li><b>Fuente</b>: {conPunto(d.fuente)}{gen ? ` Archivo armado el ${gen}.` : ""}</li>}
      </ul>
    </details>
  );
}
