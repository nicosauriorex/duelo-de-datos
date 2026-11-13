"use client";
import { useEffect, useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Selector, Seg, alternar } from "../ui";
import { FilaVariable } from "../Variables";
import { VentanaConfig } from "./VentanaConfig";
import { BotonCompartir } from "../PanelCompartir";
import { IconoCompartir } from "../Iconos";
import { Grafico, type Fila, type SerieG } from "../Grafico";
import { CeldaPresMandato, LineaInicio, useBase } from "./comunes";
import { fmtMes } from "@/lib/formato";
import { baseIdx, calcularMandato, crearPres, nombreCorto, TITULOS_MANDATO as TITULOS, type ModoMandato } from "@/lib/estadisticas";
import type { Expr } from "@/lib/motor";
import { MODO_MANDATO_DEF, PRES_MANDATO_DEF } from "@/lib/ficha";
import { decExpr, enteroEn, encExpr, lista, unoDe, useParams } from "@/lib/url";
import { vcolor } from "../util";

// "indice" ya no se ofrece (es la misma curva que la variación): los links viejos con ese modo abren en Variación %
const MODOS: [string, string][] = [["teorico", "Precio teórico"], ["var", "Variación %"], ["valor", "Valor del período"]];
const AYUDA: Record<string, string> = {
  teorico: "La misma curva que la variación, expresada en un precio de partida.",
  var: "Cuánto subió desde el mes 0.",
  valor: "El dato tal cual, sin transformar.",
};
const DEF_PRES = PRES_MANDATO_DEF.join(",");

export function Mandato() {
  const [p, set, montado] = useParams();
  const info = useBase(p, set, montado), b = info.b;
  const e0 = decExprSeguro(p.get("mv"));
  const sec = useSeccion(e0 ? [e0.id, ...(e0.rel ? [e0.rel] : [])] : ["fx_oficial"]);
  const { motor: m, metas, version } = sec;
  const eExiste = (id: string) => metas.some((x) => x.id === id);
  const eB: Expr = (montado && decExpr(p.get("mv"), eExiste)) || { id: "fx_oficial", med: "corr", rel: null, modo: "compra" };
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const PRES_T0 = useMemo(() => (m ? PRES.filter((x) => m.idxDe(x.ini) > 0) : []), [m, PRES]);

  // animación: mes actual y si avanza; cualquier cambio de filtro la corta
  const [anim, setAnim] = useState<{ t: number; play: boolean } | null>(null);
  const [valorFinal, setValorFinal] = useState(false);   // opción de la imagen: el valor de cada presidente en el último mes visible
  const clave = p.toString() + JSON.stringify(b);
  useEffect(() => { setAnim(null); }, [clave]);

  const modoUrl = unoDe(p.get("mmo"), ["teorico", "var", "indice", "valor"] as const, MODO_MANDATO_DEF);   // "indice" (links viejos) = Variación %
  const modo: ModoMandato = modoUrl === "indice" ? "var" : modoUrl;
  const selIds = new Set(lista(p.has("mp") ? p.get("mp") : DEF_PRES).filter((id) => PRES_T0.some((x) => x.id === id)));
  const banda = unoDe(p.get("mbd"), ["no", "si"] as const, "no");

  const D = useMemo(() => {
    if (!m || sec.ocupado) return null;
    const r = calcularMandato(m, PRES, PRES_T0, { expr: eB, modo, banda: banda === "si", b, presIds: selIds, anc: p.get("anc"), md: p.get("md"), mh: p.get("mh") });
    if (!r) return null;
    const series: SerieG[] = r.pres.map((x) => ({ key: x.id, name: x.n, short: nombreCorto(x.n), color: x.color, dash: x.dash, band: !!r.bnd }));
    const opts = {
      xVals: r.rows.map((f) => f.t as number), endLabels: true, log: r.usarLog, refLine: r.ref, fmtAxis: r.fmtAxis, fmtTip: r.fmtTip, fmtAxis2: null, label: r.c.corto,
      xLabel: (f: Fila) => (f.t % r.paso === 0 ? (f.t === 0 ? "Mes 0" : String(f.t)) : ""),
      tipTitle: (f: Fila) => `Mes ${f.t}`,
      tipSub: (f: Fila, se: SerieG) => (f["_f_" + se.key] ? ` <small style="color:var(--text-muted)">${fmtMes(f["_f_" + se.key])}</small>` : ""),
    };
    return { ...r, series, opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, sec.ocupado, eB.id, eB.med, eB.rel, eB.modo, eB.esc, modo, banda, b, p, PRES_T0]);

  const maxAnim = D ? D.rows.length - 1 : 0;
  const ms = Math.round(Math.max(6000 / Math.max(1, maxAnim), Math.min(150, 12000 / Math.max(1, maxAnim))));
  const play = !!anim?.play;
  useEffect(() => {
    if (!play) return;
    // si el sistema pide reducir el movimiento (también si cambió con la animación andando), no avanza sola
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAnim(null); return; }
    const id = window.setInterval(() => {
      setAnim((a) => (!a || !a.play ? a : a.t + 1 >= maxAnim ? { t: maxAnim, play: false } : { t: a.t + 1, play: true }));
    }, ms);
    return () => window.clearInterval(id);
  }, [play, ms, maxAnim]);
  const animar = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAnim(null); return; }
    setAnim({ t: 0, play: true });
  };
  // el cuadro actual nunca pasa del último mes visible: al achicar "Hasta" con la animación terminada, anim.t queda fuera de rango hasta que el efecto de arriba la corta
  const cuadro = anim ? Math.max(0, Math.min(anim.t, maxAnim)) : 0;
  const rowsVista = D && anim ? D.rows.map((r, i) => (i <= cuadro ? r : { t: r.t })) : D?.rows;

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  const errs = Object.values(sec.errores);
  const HITOS = [6, 12, 24, 36, 48];


  return (
    <section>
      <p className="sub">Cada línea arranca en el mes 0 de un presidente y sigue mes a mes durante su mandato.</p>
      <LineaInicio info={info} F={m.F} />
      <div className="mand-barra" role="group" aria-label="Configuración del gráfico">
        <VentanaConfig etiqueta={D ? D.c.corto : "Variable"} titulo="Variable">
          <FilaVariable e={eB} onChange={(e) => e && set({ mv: encExpr(e) })} />
        </VentanaConfig>
        <VentanaConfig etiqueta="Cómo mostrar" titulo="Cómo mostrar">
          <div className="modos" role="radiogroup" aria-label="Cómo mostrar">
            {MODOS.map(([k, t]) => (
              <div key={k} className="modo">
                <label className="radio"><input type="radio" name="mmo" checked={modo === k} onChange={() => set({ mmo: k === "teorico" ? null : k })} /> {t}</label>
                <p className="note">{AYUDA[k]}</p>
                {k === "teorico" && modo === "teorico" && D && (
                  <div className="sangria"><label>Partiendo de</label>
                    <Selector etiqueta="Partiendo de" valor={D.anc} opciones={D.ancOpc.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => set({ anc: v === "milei" ? null : v })} /></div>
                )}
              </div>
            ))}
          </div>
          <div className="controls"><label>Rango del mes</label><Seg valor={banda} opciones={[["no", "Solo promedio"], ["si", "Promedio + mín/máx"]]} onElegir={(v) => set({ mbd: v === "no" ? null : v })} /></div>
        </VentanaConfig>
        <VentanaConfig etiqueta="Presidentes" titulo="Presidentes">
          <div className="controls"><Seg valor={selIds} opciones={PRES_T0.map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ mp: [...alternar(selIds, v)].join(",") })} /></div>
        </VentanaConfig>
      </div>
      {!D ? (errs.length ? null : <Cargando />) : (
        <>
          <div className="card mand-grafico">
            <h2>{D.c.corto}: {TITULOS[modo]} por mes de mandato</h2>
            <div className="anim-barra">
              {!anim ? <button type="button" className="btn" onClick={animar}>▶ Animar</button>
                : anim.play ? <button type="button" className="btn" onClick={() => setAnim({ ...anim, play: false })}>⏸ Pausa</button>
                : <><button type="button" className="btn" onClick={() => setAnim(cuadro >= maxAnim ? { t: 0, play: true } : { t: cuadro, play: true })}>▶ Seguir</button>
                  <button type="button" className="btn" onClick={() => setAnim({ t: 0, play: true })}>↺ Reiniciar</button></>}
              {anim && <span className="lbl" role="status">Mes {D.rows[cuadro]?.t as number}</span>}
              <BotonCompartir className="btn" titulo={`Primero los Datos: ${D.c.corto} por mes de mandato`} href={() => window.location.href} deshabilitado={D.pres.length === 0}
                title="Armar una imagen de este gráfico para compartir" aria-label="Compartir como imagen: meses de mandato"
                crearVista={() => ({ tipo: "mandato", expr: eB, modo, presIds: D.pres.map((x) => x.id), anc: p.get("anc"), md: p.get("md"), mh: p.get("mh"), valorFinal, base: b })}><IconoCompartir />Compartir</BotonCompartir>
            </div>
            <div className="legend">{D.pres.map((x) => <span key={x.id} style={vcolor(x.color)}>{x.n}</span>)}</div>
            {/* tocar el gráfico pausa la animación */}
            <div onPointerDown={() => { if (play) setAnim((a) => (a ? { ...a, play: false } : a)); }}><Grafico rows={rowsVista || D.rows} series={D.series} opts={D.opts} /></div>
            <div className="controls mand-meses">
              <label>Meses</label><label htmlFor="mm_desde">desde</label>
              <input type="range" id="mm_desde" min={0} max={D.maxMes - 1} step={1} value={D.desde} onChange={(ev) => { const d = +ev.target.value; set({ md: d ? String(d) : null, mh: d >= D.hasta ? String(d + 1) : undefined }); }} />
              <label htmlFor="mm_hasta">hasta</label>
              <input type="range" id="mm_hasta" min={1} max={D.maxMes} step={1} value={D.hasta} onChange={(ev) => { const h = +ev.target.value; set({ mh: h === D.maxMes ? null : String(h), md: D.desde >= h ? String(h - 1) : undefined }); }} />
              <span className="lbl">mes {D.desde} a {D.hasta}{D.hasta === D.maxMes && D.desde === 0 ? " (todo)" : ""}</span>
            </div>
            <label className="comp-marca mand-valor"><input type="checkbox" checked={valorFinal} onChange={(ev) => setValorFinal(ev.target.checked)} /> Mostrar el valor de cada presidente en el último mes visible (en la imagen para compartir)</label>
            <details className="contexto-plegado">
              <summary>Cómo se calcula</summary>
              <p className="note">{D.nota}</p>
              {modo === "teorico" && <p className="note">Si con Milei el dólar arrancó en $ 1.000 y en el mes 20 de CFK 2 había subido 50 %, CFK 2 marca $ 1.500 en el mes 20.</p>}
            </details>
          </div>
          <div className="card">
            <h2>Resumen por hitos</h2><p className="note">Mismo cálculo que el gráfico ({TITULOS[modo]}) en meses clave y al final de cada mandato.</p>
            <div className="tablewrap fija"><table>
              <thead><tr><th>Presidente</th><th>Mes 0</th>{HITOS.map((x) => <th key={x}>Mes {x}</th>)}<th>Final</th></tr></thead>
              <tbody>{D.pres.map((x) => {
                const fin = x.i1 - baseIdx(m.F, x, b);
                return <tr key={x.id}><CeldaPresMandato x={x} F={m.F} /><td>{D.cel(x, 0)}</td>{HITOS.map((h) => <td key={h}>{h <= fin ? D.cel(x, h) : ""}</td>)}<td>{D.cel(x, fin)}<small>mes {fin}</small></td></tr>;
              })}</tbody>
            </table></div>
          </div>
        </>
      )}
    </section>
  );
  function decExprSeguro(s: string | null): Expr | null { return decExpr(s, () => true); }
}
