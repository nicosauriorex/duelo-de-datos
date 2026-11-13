"use client";
// "Cómo viene el año" de /gasto/ (vista=mes, docs/specs/gasto-nacion.md, fase 2): tarjetas, barras por mes y la lista de un nivel.
// Las cuentas están en lib/gasto-mensual.ts; acá solo se dibuja. Estado en la URL: vista=mes, forma, ruta, orden y todas.
import { useCallback, useMemo, useState } from "react";
import { Seg } from "./ui";
import { PanelGasto } from "./PanelGasto";
import { avisoCompartir, compartir } from "@/lib/compartir";
import type { FormatoImg } from "@/lib/config";
import { BAJADA_FORMA, NIVELES, escribirRuta, leerRuta, nombreForma } from "@/lib/gasto";
import {
  FORMAS_M, ORDENES, ORDEN_DEFECTO, armarImagenMensual, armarMensual, esOrden, formaMDe, fuenteMensual, hrefMensual, tituloMensual,
  type ArchivoMensual, type DeflactorMensual, type FilaM, type MesM, type Orden, type VistaM,
} from "@/lib/gasto-mensual";

export function GastoMensual({ ar, deflactor, p, set }: {
  ar: ArchivoMensual; deflactor: DeflactorMensual; p: URLSearchParams; set: (c: Record<string, string | null | undefined>) => void;
}) {
  const [imagen, setImagen] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const forma = formaMDe(ar, p.get("forma"));
  const orden: Orden = esOrden(p.get("orden")) ? (p.get("orden") as Orden) : ORDEN_DEFECTO;
  const ruta = leerRuta(p.get("ruta")), todas = p.get("todas") === "1";
  const vista = useMemo(() => armarMensual({ archivo: ar, forma, ruta, orden, deflactor, todas }),
    [ar, forma, p.get("ruta"), orden, deflactor, todas]);   // eslint-disable-line react-hooks/exhaustive-deps
  // la imagen sale siempre con las diez filas y "Otros", que es lo que abre el link (el link no lleva `todas`)
  const vistaImg = useMemo(() => (!vista || !todas ? vista : armarMensual({ archivo: ar, forma, ruta, orden, deflactor })),
    [vista, todas, ar, forma, p.get("ruta"), orden, deflactor]);   // eslint-disable-line react-hooks/exhaustive-deps
  const armar = useCallback((f: FormatoImg) => armarImagenMensual(vistaImg!, ar, f), [vistaImg, ar]);

  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };
  const ir = (r: string[]) => set({ ruta: escribirRuta(r), todas: null });
  if (!vista) return <div className="card"><p className="note">No hay datos mensuales de esta forma.</p></div>;
  const href = hrefMensual(vista), titulo = tituloMensual(vista);

  return (
    <>
      <div className="gas-formas" role="group" aria-label="Forma de mirar el gasto">
        <Seg valor={forma} opciones={FORMAS_M.filter((f) => ar.arboles[f[0]])} onElegir={(f) => set({ forma: f === "para_que" ? null : f, ruta: null, todas: null })} />
      </div>
      <p className="note gas-bajada">{BAJADA_FORMA[forma]}</p>

      <div className="card gas-card">
        {vista.ruta.length > 0 && (
          <nav className="migas gas-migas" aria-label="Niveles abiertos">
            <button type="button" onClick={() => ir([])}>{nombreForma(forma)}</button>
            {vista.ruta.map((n, i) => (
              <span key={i} className="gas-miga">
                <span aria-hidden="true">›</span>
                {i < vista.ruta.length - 1 ? <button type="button" onClick={() => ir(vista.ruta.slice(0, i + 1))}>{n}</button> : <span aria-current="page">{n}</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="gas-total">
          <h2>{vista.ruta.length ? vista.ruta[vista.ruta.length - 1] : `Gasto total de la Nación, ${vista.periodo} de ${vista.anio}`}</h2>
          {vista.nodo.t && <p className="note gas-tecnico">Nombre en el presupuesto: {vista.nodo.t}</p>}
          <p className="note">Meses completos ({vista.periodo}) contra los mismos meses de {vista.anioAnt}. {vista.unidad}.</p>
          {vista.ipcAviso && <p className="note gas-aviso" role="status">{vista.ipcAviso}</p>}
          {vista.sinIpc && <p className="note gas-aviso" role="status">No hay inflación cargada: los montos están en pesos corrientes de cada mes y la variación real no descuenta la inflación.</p>}
        </div>

        <div className="gm-tarjetas">
          <Tarjeta titulo="Gastado" valor={vista.tarjetas.gastado.valor} sub={vista.tarjetas.gastado.sub} />
          <Tarjeta titulo="Variación real" valor={vista.tarjetas.variacion.valor} sub={vista.tarjetas.variacion.sub} />
          <Tarjeta titulo="Del crédito vigente" valor={vista.tarjetas.ejecutado.valor} sub={vista.tarjetas.ejecutado.sub ?? `ya gastado a fin de ${vista.periodo.split("–").pop()}`} />
        </div>

        <GraficoMeses v={vista} />

        <div className="gm-orden" role="group" aria-label="Orden de la lista">
          <span className="lbl">Ordenar por</span>
          <Seg valor={orden} opciones={ORDENES} onElegir={(o) => set({ orden: o === ORDEN_DEFECTO ? null : o, todas: null })} />
        </div>
        {vista.filas.length ? (
          <>
            <p className="gas-enc" aria-hidden="true"><span>{NIVELES[forma][vista.ruta.length] ?? "Partida"}</span><span>Gastado · variación real · % del vigente</span></p>
            <ol className="gas-lista">
              {vista.filas.map((f, i) => <Fila key={i} f={f} onAbrir={f.nodo?.h?.length ? () => ir([...vista.ruta, f.n]) : f.tipo === "otros" ? () => set({ todas: "1" }) : null} />)}
            </ol>
          </>
        ) : <p className="note">No se divide en un nivel más abajo.</p>}
        <p className="note gas-pie-lista">El % del vigente es lo gastado (devengado) en los meses completos sobre el crédito vigente a fin del último mes completo. Entre paréntesis, lo mismo en {vista.anioAnt} a la misma altura.</p>
      </div>

      <div className="gas-compartir" role="group" aria-label="Compartir esta vista">
        <button type="button" className="btn primario" onClick={() => setImagen(true)}>Compartir como imagen</button>
        <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(href, titulo)))}>Copiar link</button>
      </div>
      {aviso && <p className="aviso-link" role="status">{aviso}</p>}

      <Nota ar={ar} v={vista} />
      {imagen && vistaImg && <PanelGasto armar={armar} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </>
  );
}

function Tarjeta({ titulo, valor, sub }: { titulo: string; valor: string; sub: string }) {
  return (
    <div className="gm-tarjeta">
      <p className="gm-tj-k">{titulo}</p>
      <p className="gm-tj-v">{valor}</p>
      <p className="gm-tj-s">{sub}</p>
    </div>
  );
}

function Fila({ f, onAbrir }: { f: FilaM; onAbrir: (() => void) | null }) {
  const sub = [f.varTxt, f.ejec].filter(Boolean).join(" · ");
  const contenido = (
    <>
      <span className="gas-fila-arriba">
        <span className="gas-nombre">{f.n}{f.tipo === "otros" && <small> · ver todas</small>}</span>
        <span className="gas-monto">{f.txt}</span>
      </span>
      <span className="gas-pista" aria-hidden="true"><span className={`gas-barra${f.tipo !== "nodo" ? " gas-barra-otros" : ""}`} style={{ width: `${(f.ancho * 100).toFixed(2)}%` }} /></span>
      {sub && <span className="gas-sub">{sub}</span>}
      {f.nota && <span className="gas-sub gm-nota">{f.nota}</span>}
    </>
  );
  return (
    <li className={`gas-fila gas-${f.tipo}`}>
      {onAbrir
        ? <button type="button" className="gas-abrir" onClick={onAbrir} title={f.t ? `Nombre en el presupuesto: ${f.t}` : undefined}
          aria-label={f.tipo === "otros" ? `${f.n}: ${f.txt}. Ver todas` : `${f.n}: ${f.txt}${sub ? `, ${sub}` : ""}. Abrir`}>{contenido}</button>
        : <div className="gas-abrir gas-quieta">{contenido}</div>}
    </li>
  );
}

/** Barras por mes: el año contra el anterior, en pesos de hoy. El mes parcial va aparte, más claro, y no entra en ninguna cuenta. */
function GraficoMeses({ v }: { v: VistaM }) {
  const alto = (x: number | null) => (x == null || v.maxMes <= 0 ? 0 : Math.max(0, (x / v.maxMes) * 100));
  const par = v.parcial;
  const columna = (m: MesM) => (
    <div key={m.mes} className={`gm-mes${m.parcial ? " gm-mes-parcial" : ""}`} title={m.parcial ? `${m.nombre} ${v.anio}: ${m.aTxt} (${v.parcialTxt})` : `${m.nombre}: ${v.anio} ${m.aTxt}; ${v.anioAnt} ${m.bTxt}`}>
      <span className="gm-par">
        {!m.parcial && <span className="gm-b gm-b-ant" style={{ height: `${alto(m.b).toFixed(1)}%` }} />}
        <span className={`gm-b ${m.parcial ? "gm-b-parcial" : "gm-b-a"}`} style={{ height: `${alto(m.a).toFixed(1)}%` }} />
      </span>
      <span className="gm-et">{m.nombre}</span>
    </div>
  );
  return (
    <div className="gm-graf">
      <h3>Mes a mes, {v.anio} contra {v.anioAnt}</h3>
      <p className="gm-leyenda">
        <span><i className="gm-sw gm-b-a" aria-hidden="true" /> {v.anio}</span>
        <span><i className="gm-sw gm-b-ant" aria-hidden="true" /> {v.anioAnt}</span>
        {par && <span><i className="gm-sw gm-b-parcial" aria-hidden="true" /> {nombreMesLargo(par)} {v.anio}: {v.parcialTxt}</span>}
      </p>
      <div className="gm-barras" role="img" aria-label={`Gasto de cada mes de ${v.anio} y de ${v.anioAnt}, en pesos de hoy. El detalle está en la tabla de abajo.`}>
        {v.meses.map(columna)}
        {par && columna(par)}
      </div>
      <details className="gm-tabla">
        <summary>Ver mes por mes</summary>
        <div className="tablewrap">
          <table>
            <thead><tr><th scope="col">Mes</th><th scope="col">{v.anio}</th><th scope="col">{v.anioAnt}</th><th scope="col">Variación real</th></tr></thead>
            <tbody>
              {v.meses.map((m) => <tr key={m.mes}><th scope="row">{m.nombre}</th><td>{m.aTxt}</td><td>{m.bTxt}</td><td>{m.varTxt}</td></tr>)}
              <tr className="gm-total"><th scope="row">{v.periodo}</th><td>{v.totalTxt}</td><td>{v.totalAntTxt}</td><td>{v.varTotalTxt}</td></tr>
              {par && <tr className="gm-fila-parcial"><th scope="row">{par.nombre} <small>({v.parcialTxt}; no cuenta)</small></th><td>{par.aTxt}</td><td>–</td><td>–</td></tr>}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
const MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombreMesLargo = (m: MesM) => MESES_L[m.mes - 1];

function Nota({ ar, v }: { ar: ArchivoMensual; v: VistaM }) {
  return (
    <details className="gas-pie">
      <summary>Cómo se calcula “Cómo viene {ar.anio}”</summary>
      <ul className="method">
        <li><b>Gastado (devengado)</b>: el gasto ya hecho, cuando el bien o el servicio se recibió y nace la obligación de pagarlo, aunque todavía no se haya pagado.</li>
        <li><b>El último mes no cuenta</b>: la fuente lo trae incompleto{v.parcial ? ` (${nombreMesLargo(v.parcial)} está ${v.parcialTxt})` : ""}. Se compara {v.periodo} de {v.anio} contra {v.periodo} de {v.anioAnt}, la misma cantidad de meses.</li>
        <li><b>Variación real</b>: lo gastado contra lo gastado en el mismo período del año anterior, después de descontar la inflación: cada mes se lleva a pesos de {v.ref || "hoy"} con el IPC de ese mes. Una suba o una baja no es buena ni mala por sí sola. Cuando el año anterior gastó menos de 0,1 % del total de ese nivel y este año gastó más del doble, la variación no se muestra porque exagera.</li>
        <li><b>Crédito vigente</b>: el presupuesto con las modificaciones que se le van haciendo durante el año, así que cambia mes a mes. El % del vigente toma el de fin del último mes completo; entre paréntesis, el de {v.anioAnt} a la misma altura.</li>
        <li><b>Nombres</b>: un programa que cambió de nombre entre los dos años aparece como “Nuevo en {v.anio}”.</li>
        <li><b>Fuente</b>: {fuenteMensual(ar)}. Los datos cambian a medida que avanza el año. Solo la Administración Nacional: sin empresas públicas ni fondos fiduciarios.</li>
      </ul>
    </details>
  );
}
