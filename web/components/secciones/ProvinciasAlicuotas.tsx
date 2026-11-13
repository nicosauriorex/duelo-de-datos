"use client";
// Cuánto cobra cada provincia de Ingresos Brutos (docs/specs/provincias.md, fase 3): la alícuota teórica de la ley por actividad, de las 24 jurisdicciones.
// Va debajo de la tabla de las cuentas. Los cálculos están en lib/provinciasAlicuotas.ts; acá solo se dibuja.
// Estado en la URL: ib_act (actividad), ib_anio y ib_orden (desc | asc); el valor por defecto no se escribe. La ventana de aperturas es un estado local (cierra con la cruz, Atrás y Escape).
// Si el archivo falta o no valida, el bloque no aparece.
import { useMemo, useState } from "react";
import { useProvinciasAlicuotas } from "../useProvincias";
import { Modal, Selector, Seg } from "../ui";
import { fechaLarga } from "@/lib/gasto";
import { conPunto, type Contexto } from "@/lib/provincias";
import {
  ORDEN_A_DEFECTO, ORDENES_A, actividadDefecto, actividadValida, anioDefectoA, anioValidoA, armarVistaA, esOrdenA, opcionesActividadA, opcionesAnioA,
  type DatosAlicuotas, type FilaA, type OrdenA, type VistaA,
} from "@/lib/provinciasAlicuotas";

type Cambiar = (x: Record<string, string | null | undefined>) => void;

export function Alicuotas({ c, p, set }: { c: Contexto; p: URLSearchParams; set: Cambiar }) {
  const { datos } = useProvinciasAlicuotas(c.d.generado);
  if (!datos) return null;
  return <Cuerpo d={datos} c={c} p={p} set={set} />;
}

function Cuerpo({ d, c, p, set }: { d: DatosAlicuotas; c: Contexto; p: URLSearchParams; set: Cambiar }) {
  const [abierta, setAbierta] = useState<FilaA | null>(null);
  const defA = actividadDefecto(d), defAnio = anioDefectoA(d);
  const actividad = actividadValida(d, p.get("ib_act")) ?? defA;
  const anio = anioValidoA(d, p.get("ib_anio")) ?? defAnio;
  const orden: OrdenA = esOrdenA(p.get("ib_orden")) ? (p.get("ib_orden") as OrdenA) : ORDEN_A_DEFECTO;
  const v = useMemo(() => armarVistaA(d, c, { actividad, anio, orden }), [d, c, actividad, anio, orden]);
  return (
    <section className="card prov-card pc-ib" aria-labelledby="pc-ib-tit">
      <h2 id="pc-ib-tit">Cuánto cobra cada provincia de Ingresos Brutos</h2>
      <p className="note pc-ib-aviso">
        La alícuota es la que fija la ley de cada provincia para esa actividad (<b>teórica</b>): no es lo que se paga en promedio.
        Para eso, mirá el indicador “Ingresos Brutos sobre la recaudación propia” de arriba.
        {d.aviso ? ` Aviso de la Dirección Nacional de Asuntos Provinciales: ${conPunto(d.aviso)}` : " Los datos de la Dirección Nacional de Asuntos Provinciales son provisorios, en desarrollo."}
      </p>
      <div className="controls prov-controles">
        <Selector etiqueta="Actividad" valor={actividad.slug} opciones={opcionesActividadA(d)} onElegir={(s) => set({ ib_act: s === defA.slug ? null : s })} className="pc-sel-ind" />
        <Selector etiqueta="Año" valor={String(anio)} opciones={opcionesAnioA(d)} onElegir={(a) => set({ ib_anio: Number(a) === defAnio ? null : a })} />
        <div className="controls"><label>Orden</label><Seg valor={orden} opciones={ORDENES_A} onElegir={(o) => set({ ib_orden: o === ORDEN_A_DEFECTO ? null : o })} /></div>
      </div>
      {!v ? <p className="note">No hay datos de {anio}.</p> : v.vacia ? (
        <p className="note" role="status">La planilla de {anio} no trae alícuotas para “{actividad.n}”. Probá con otro año u otra actividad.</p>
      ) : <TablaA v={v} onAbrir={setAbierta} />}
      <p className="note pc-ib-pie">Exenciones: fuera de alcance (no hay base oficial).</p>
      <PieA d={d} anio={anio} />
      {abierta && v && <Aperturas f={abierta} v={v} onCerrar={() => setAbierta(null)} />}
    </section>
  );
}

function TablaA({ v, onAbrir }: { v: VistaA; onAbrir: (f: FilaA) => void }) {
  return (
    <>
      <p className="note">{v.actividad.n}, {v.anio}. Ordenado por alícuota, de {v.orden === "desc" ? "mayor a menor" : "menor a mayor"}; las que no son un número van al final. Tocá una provincia con aperturas para verlas.</p>
      <div className="tablewrap fija prov-tabla pc-ib-tabla">
        <table>
          <thead><tr><th scope="col">Provincia</th><th scope="col">Alícuota general</th><th scope="col">Diferencia con el tope</th></tr></thead>
          <tbody>
            {v.filas.map((f) => (
              <tr key={f.id}>
                <td className="prov-nombre">
                  {f.aperturas.length ? (
                    <button type="button" className="prov-abrir" onClick={() => onAbrir(f)} aria-label={`${f.n}: ${f.txt}. Tiene ${f.aperturas.length} ${f.aperturas.length === 1 ? "apertura" : "aperturas"}. Ver aperturas`}>
                      <span className="prov-nom">{f.n}</span><span className="pc-ib-marca" aria-hidden="true">con aperturas</span>
                    </button>
                  ) : <span className="prov-nom pc-ib-quieta">{f.n}</span>}
                </td>
                <td className="prov-valor pc-ib-valor">{f.txt}</td>
                <td className="pc-ib-dif">{f.dif ?? ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td className="prov-nombre"><span className="prov-nom prov-total-n">Tope del Consenso Fiscal</span></td><td className="prov-valor pc-ib-valor">{v.tope}</td><td className="pc-ib-dif" /></tr>
          </tfoot>
        </table>
      </div>
      <p className="note">La diferencia es en puntos porcentuales (p.p.) contra el tope, con los valores que se ven; queda vacía si la alícuota o el tope no son un número.</p>
    </>
  );
}

/** Las aperturas de una provincia (por tamaño del contribuyente o por subactividad), como texto. */
function Aperturas({ f, v, onCerrar }: { f: FilaA; v: VistaA; onCerrar: () => void }) {
  return (
    <Modal titulo={`${f.n}: aperturas`} onCerrar={onCerrar} ancho>
      <div className="prov-detalle">
        <h2>{f.n}: aperturas</h2>
        <p className="note">{v.actividad.n}, {v.anio}. Alícuota general: <b>{f.txt}</b>. Son las alícuotas teóricas que la planilla separa por tamaño del contribuyente o por subactividad.</p>
        <dl className="pc-ib-aper">
          {f.aperturas.map((a) => (<div key={a.n}><dt>{a.n}</dt><dd>{a.txt}</dd></div>))}
        </dl>
      </div>
    </Modal>
  );
}

function PieA({ d, anio }: { d: DatosAlicuotas; anio: number }) {
  const f = d.fuentes[String(anio)] ?? Object.values(d.fuentes)[0];
  const gen = fechaLarga(d.generado || null);
  return (
    <p className="note pc-ib-pie">
      Fuente: {d.fuente ? conPunto(d.fuente) : "Dirección Nacional de Asuntos Provinciales."}
      {f?.pagina && <> <a href={f.pagina} target="_blank" rel="noopener noreferrer">Página de la Dirección Nacional de Asuntos Provinciales</a>.</>}
      {gen ? ` Archivo armado el ${gen}.` : ""}
    </p>
  );
}
