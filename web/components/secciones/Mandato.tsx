"use client";
import { useEffect, useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Desplegable, Selector, Seg, alternar } from "../ui";
import { FilaVariable } from "../Variables";
import { Grafico, type Fila, type SerieG } from "../Grafico";
import { LineaInicio, useBase } from "./comunes";
import { fmtNum, fmtMes, lastIdx, nf0, nf1, ok } from "@/lib/formato";
import { baseIdx, baseTxt, crearPres } from "@/lib/estadisticas";
import type { Expr } from "@/lib/motor";
import { decExpr, enteroEn, encExpr, lista, unoDe, useParams } from "@/lib/url";
import { vcolor } from "../util";

const MODOS: [string, string][] = [["teorico", "Precio teórico"], ["var", "Variación % desde el mes 0"], ["indice", "Índice (mes 0 = 100)"], ["valor", "Valor del período"]];
const TITULOS: Record<string, string> = { teorico: "precio teórico", indice: "índice, mes 0 = 100", var: "variación % desde el mes 0", valor: "valor" };
const DEF_PRES = "nk,cfk1,cfk2,macri,af,milei";

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
  const clave = p.toString() + JSON.stringify(b);
  useEffect(() => { setAnim(null); }, [clave]);

  const modo = unoDe(p.get("mmo"), ["teorico", "var", "indice", "valor"] as const, "teorico");
  const selIds = new Set(lista(p.has("mp") ? p.get("mp") : DEF_PRES).filter((id) => PRES_T0.some((x) => x.id === id)));
  const banda = unoDe(p.get("mbd"), ["no", "si"] as const, "no");

  const D = useMemo(() => {
    if (!m || sec.ocupado || !m.SER[eB.id] || (eB.rel && !m.SER[eB.rel])) return null;
    const F = m.F;
    const c = m.calc(eB), arr = c.v;
    const bnd = banda === "si" && c.lo && c.hi ? [c.lo, c.hi] : null;
    const pres = PRES_T0.filter((x) => selIds.has(x.id));
    const teo = modo === "teorico";
    const li = lastIdx(arr);
    const ancOpc: [string, string][] = [["ultimo", `Último dato (${fmtMes(F[li])})`], ...PRES_T0.slice().reverse().map((x): [string, string] => [x.id, `Mes 0 de ${x.n}`])];
    const anc = ancOpc.some((o) => o[0] === p.get("anc")) ? (p.get("anc") as string) : "milei";
    let ancla: number | null = null, ancTxt = "";
    if (anc === "ultimo") { ancla = arr[li]; ancTxt = `el último dato (${fmtMes(F[li])})`; }
    else { const x = PRES.find((q) => q.id === anc)!, bi = baseIdx(F, x, b); ancla = bi >= 0 ? arr[bi] : null; ancTxt = `el mes 0 de ${x.n} (${bi >= 0 ? fmtMes(F[bi]) : "–"})`; }
    const conv = (xv: number | null, x0: number | null) => {
      if (!ok(x0) || !ok(xv) || x0 === 0) return null;
      if (c.pct && modo !== "valor") return xv - x0 + (teo && ok(ancla) ? ancla : 0);
      if (modo === "indice") return xv / x0 * 100;
      if (modo === "var") return (xv / x0 - 1) * 100;
      if (teo) return ok(ancla) ? ancla * xv / x0 : null;
      return xv;
    };
    const maxMes = Math.max(1, ...pres.map((x) => x.i1 - baseIdx(F, x, b)));
    const todas: Fila[] = Array.from({ length: maxMes + 1 }, (_, t) => ({ t }));
    pres.forEach((x) => {
      const bi = baseIdx(F, x, b), x0 = arr[bi];
      for (let t = 0; t <= x.i1 - bi; t++) {
        todas[t][x.id] = conv(arr[bi + t], x0);
        if (bnd) { todas[t][x.id + "_lo"] = conv(bnd[0][bi + t], x0); todas[t][x.id + "_hi"] = conv(bnd[1][bi + t], x0); }
        todas[t]["_f_" + x.id] = F[bi + t];
      }
    });
    const hasta = Math.min(maxMes, enteroEn(p.get("mh"), 1, 10000, maxMes));
    const desde = Math.min(enteroEn(p.get("md"), 0, 10000, 0), hasta - 1);
    const rows = todas.slice(desde, hasta + 1);
    let fmtAxis: (v: number) => string, fmtTip: (v: number) => string, ref: number | null = null;
    if (c.pct && modo !== "valor") { fmtAxis = (v) => nf0.format(v); fmtTip = (v) => nf1.format(v) + " %"; ref = teo ? ancla : 0; }
    else if (modo === "indice") { fmtAxis = (v) => nf0.format(v); fmtTip = (v) => nf1.format(v); ref = 100; }
    else if (modo === "var") { fmtAxis = (v) => nf0.format(v) + " %"; fmtTip = (v) => (v > 0 ? "+" : "") + nf1.format(v) + " %"; ref = 0; }
    else { fmtAxis = (v) => c.pct ? nf0.format(v) + " %" : (Math.abs(v) >= 1e6 ? nf1.format(v / 1e6) + " M" : Math.abs(v) >= 1e4 ? nf0.format(v / 1e3) + " mil" : fmtNum(v)); fmtTip = (v) => m.fmtC(c, v); ref = teo ? ancla : null; }
    const vals = rows.flatMap((r) => pres.map((x) => r[x.id])).filter((v) => ok(v) && v > 0) as number[];
    const usarLog = !c.pct && modo !== "var" && vals.length > 1 && Math.max(...vals) / Math.min(...vals) > 30 && rows.every((r) => pres.every((x) => !ok(r[x.id]) || r[x.id] > 0));
    const paso = (hasta - desde) > 36 ? 6 : (hasta - desde) > 12 ? 3 : 1;
    const series: SerieG[] = pres.map((x) => ({ key: x.id, name: x.n, short: x.n.replace("Néstor ", "").replace("Alberto Fernández", "A. Fernández"), color: x.color, dash: x.dash, band: !!bnd }));
    const opts = {
      xVals: rows.map((r) => r.t as number), endLabels: true, log: usarLog, refLine: ref, fmtAxis, fmtTip, fmtAxis2: null, label: c.corto,
      xLabel: (r: Fila) => (r.t % paso === 0 ? (r.t === 0 ? "Mes 0" : String(r.t)) : ""),
      tipTitle: (r: Fila) => `Mes ${r.t}`,
      tipSub: (r: Fila, se: SerieG) => (r["_f_" + se.key] ? ` <small style="color:var(--text-muted)">${fmtMes(r["_f_" + se.key])}</small>` : ""),
    };
    const cel = (x: typeof pres[number], t: number) => { const r = todas[t]; return r && ok(r[x.id]) ? fmtTip(r[x.id]) : "–"; };
    const nota = (teo ? `Partiendo de ${ancTxt}: ${m.fmtC(c, ancla)} (${c.unidad}), y aplicando ${c.pct ? "los cambios en puntos" : "las variaciones"} de cada mandato. `
      : `Unidad: ${modo === "indice" ? "índice" : modo === "var" && !c.pct ? "%" : c.unidad}. `) + `Mes 0 = ${baseTxt(b)}.` +
      (c.pct ? " En porcentajes se suman los cambios en puntos, no se multiplican." : "") + (bnd ? " La sombra va del mínimo al máximo diario de cada mes." : "") +
      (banda === "si" && !c.lo ? " (Esta variable no tiene datos diarios: no hay rango.)" : "");
    return { c, pres, teo, ancOpc, anc, maxMes, desde, hasta, rows, series, opts, nota, cel, todas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, sec.ocupado, eB.id, eB.med, eB.rel, eB.modo, eB.esc, modo, banda, b, p, PRES_T0]);

  const maxAnim = D ? D.rows.length - 1 : 0;
  const ms = Math.round(Math.max(6000 / Math.max(1, maxAnim), Math.min(150, 12000 / Math.max(1, maxAnim))));
  const play = !!anim?.play;
  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => {
      setAnim((a) => (!a || !a.play ? a : a.t + 1 >= maxAnim ? { t: maxAnim, play: false } : { t: a.t + 1, play: true }));
    }, ms);
    return () => window.clearInterval(id);
  }, [play, ms, maxAnim]);
  const animar = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAnim(null); return; }
    setAnim({ t: 0, play: true });
  };
  const rowsVista = D && anim ? D.rows.map((r, i) => (i <= anim.t ? r : { t: r.t })) : D?.rows;

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  const errs = Object.values(sec.errores);
  const HITOS = [6, 12, 24, 36, 48];

  return (
    <section>
      <p className="sub">Cada línea arranca en el mes 0 de un presidente. Con &quot;precio teórico&quot; se toma un valor de partida y se le aplica lo que pasó en cada mandato: si con Milei el dólar arrancó en $1.000 y en el mes 20 de CFK 2 había subido 50%, la línea de CFK 2 marca $1.500 en el mes 20.</p>
      <FilaVariable e={eB} onChange={(e) => e && set({ mv: encExpr(e) })} />
      <LineaInicio info={info} etiqueta="Mes 0" />
      <div className="controls">
        <Selector etiqueta="Modo" valor={modo} opciones={MODOS.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => set({ mmo: v === "teorico" ? null : v })} />
        {D && D.teo && <><label>Partiendo de</label>
          <Selector etiqueta="Partiendo de" valor={D.anc} opciones={D.ancOpc.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => set({ anc: v === "milei" ? null : v })} /></>}
        <Desplegable etiqueta="Presidentes y opciones">
          <div className="controls"><label>Presidentes</label><Seg valor={selIds} opciones={PRES_T0.map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ mp: [...alternar(selIds, v)].join(",") })} /></div>
          <div className="controls"><label>Rango del mes</label><Seg valor={banda} opciones={[["no", "Solo promedio"], ["si", "Promedio + mín/máx"]]} onElegir={(v) => set({ mbd: v === "no" ? null : v })} /></div>
        </Desplegable>
      </div>
      {D && (
        <div className="controls">
          <label>Meses</label><label htmlFor="mm_desde">desde</label>
          <input type="range" id="mm_desde" min={0} max={D.maxMes - 1} step={1} value={D.desde} onChange={(ev) => { const d = +ev.target.value; set({ md: d ? String(d) : null, mh: d >= D.hasta ? String(d + 1) : undefined }); }} />
          <label htmlFor="mm_hasta">hasta</label>
          <input type="range" id="mm_hasta" min={1} max={D.maxMes} step={1} value={D.hasta} onChange={(ev) => { const h = +ev.target.value; set({ mh: h === D.maxMes ? null : String(h), md: D.desde >= h ? String(h - 1) : undefined }); }} />
          <span className="lbl">mes {D.desde} a {D.hasta}{D.hasta === D.maxMes && D.desde === 0 ? " (todo)" : ""}</span>
        </div>
      )}
      {!D ? (errs.length ? null : <Cargando />) : (
        <>
          <div className="card">
            <h2>{D.c.corto}: {TITULOS[modo]} por mes de mandato</h2><p className="note">{D.nota}</p>
            <div className="anim-barra">
              {!anim ? <button type="button" className="btn" onClick={animar}>▶ Animar</button>
                : anim.play ? <button type="button" className="btn" onClick={() => setAnim({ ...anim, play: false })}>⏸ Pausa</button>
                : <><button type="button" className="btn" onClick={() => setAnim(anim.t >= maxAnim ? { t: 0, play: true } : { ...anim, play: true })}>▶ Seguir</button>
                  <button type="button" className="btn" onClick={() => setAnim({ t: 0, play: true })}>↺ Reiniciar</button></>}
              {anim && <span className="lbl" role="status">Mes {D.rows[anim.t].t as number}</span>}
            </div>
            <div className="legend">{D.pres.map((x) => <span key={x.id} style={vcolor(x.color)}>{x.n}</span>)}</div>
            <Grafico rows={rowsVista || D.rows} series={D.series} opts={anim ? { ...D.opts, rowsEscala: D.rows } : D.opts} />
          </div>
          <div className="card">
            <h2>Resumen por hitos</h2><p className="note">Mismo cálculo que el gráfico ({TITULOS[modo]}) en meses clave y al final de cada mandato.</p>
            <div className="tablewrap"><table>
              <thead><tr><th>Presidente</th><th>Mes 0</th>{HITOS.map((x) => <th key={x}>Mes {x}</th>)}<th>Final</th></tr></thead>
              <tbody>{D.pres.map((x) => {
                const fin = x.i1 - baseIdx(m.F, x, b);
                return <tr key={x.id}><td>{x.n}</td><td>{D.cel(x, 0)}</td>{HITOS.map((h) => <td key={h}>{h <= fin ? D.cel(x, h) : ""}</td>)}<td>{D.cel(x, fin)}<small>mes {fin}</small></td></tr>;
              })}</tbody>
            </table></div>
          </div>
        </>
      )}
    </section>
  );
  function decExprSeguro(s: string | null): Expr | null { return decExpr(s, () => true); }
}
