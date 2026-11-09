"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useConfig } from "../ConfigProvider";
import { tinte } from "../util";
import { fmtMes, ok } from "@/lib/formato";
import type { Calculo, Motor } from "@/lib/motor";
import { PRES_DEF, baseResumen, varNum, type StatsM } from "@/lib/estadisticas";
import { DEFECTO, baseDeConfig, baseDeUrl, encT0p, esBaseDeFabrica, limpiarBase, mismaBase, type BaseCfg } from "@/lib/config";

export const COLS: [string, string][] = [["ini", "Inicio"], ["fin", "Cierre"], ["var", "Variación"], ["min", "Mínimo"], ["max", "Máximo"], ["prom", "Promedio"], ["med", "Mediana"], ["n", "Meses"]];
const IDS_PRES = PRES_DEF.map((x) => x.id);
export interface InicioMandato { b: BaseCfg; delLink: boolean; usarMio: () => void }

/** Inicio del mandato de la vista: el del link (`t0`, `t0p` o los viejos `b` y `n`) si lo trae; si no, el de la configuración.
 *  Mantiene la URL en sintonía: con una configuración distinta de la de fábrica agrega `t0`/`t0p` (así el link se ve igual para cualquiera),
 *  y si se cambia algo en el panel saca lo que traía el link. */
export function useBase(p: URLSearchParams, set: (c: Record<string, string | null>) => void, montado: boolean): InicioMandato {
  const { config, rev } = useConfig();
  const cfgBase = useMemo(() => baseDeConfig(config, IDS_PRES), [config]);
  const urlBase = useMemo(() => baseDeUrl(p), [p]);
  const b = useMemo(() => limpiarBase(urlBase ?? cfgBase, IDS_PRES), [urlBase, cfgBase]);
  const delLink = !!urlBase && !mismaBase(urlBase, cfgBase, IDS_PRES);
  const revVista = useRef(rev);
  useEffect(() => {
    if (!montado) return;
    const paramsDe = (x: BaseCfg) => ({ t0: x.t0 === DEFECTO.t0 ? null : String(x.t0), t0p: encT0p(x.t0p) || null });
    if (rev !== revVista.current) { revVista.current = rev; set({ b: null, n: null, ...paramsDe(cfgBase) }); return; }
    if (!urlBase && !esBaseDeFabrica(cfgBase, IDS_PRES)) set(paramsDe(cfgBase));
  }, [montado, rev, cfgBase, urlBase, set]);
  const usarMio = useCallback(() => set({ b: null, n: null, t0: null, t0p: null }), [set]);
  return { b, delLink, usarMio };
}

/** Línea "Inicio: T-1 · Milei T+1 · Configurar" y, si el link trae otro inicio, el aviso para volver al propio. */
export function LineaInicio({ info, etiqueta = "Inicio" }: { info: InicioMandato; etiqueta?: string }) {
  const { abrirPanel } = useConfig();
  return (
    <>
      <div className="linea-inicio"><span>{etiqueta}: <b>{baseResumen(info.b)}</b></span>
        <button type="button" className="enlace" onClick={abrirPanel}>Configurar</button></div>
      {info.delLink && (
        <p className="aviso-link" role="status">Estás viendo el inicio de mandato del link · <button type="button" className="enlace" onClick={info.usarMio}>Usar el mío</button></p>
      )}
    </>
  );
}

export type Orden = { k: string | null; d: number };
export function Cabecera({ cols, ord, onOrden }: { cols: [string, string][]; ord: Orden; onOrden: (k: string) => void }) {
  return <>{cols.map(([k, t]) => (
    <th key={k} className={ord.k === k ? (ord.d > 0 ? "ord-asc" : "ord-desc") : ""} title="Ordenar" tabIndex={0} role="button"
      onClick={() => onOrden(k)} onKeyDown={(ev) => { if (ev.key === "Enter") onOrden(k); }} data-orden={k}>{t}</th>
  ))}</>;
}
export const siguienteOrden = (ord: Orden, k: string): Orden => ord.k !== k ? { k, d: -1 } : ord.d === -1 ? { k, d: 1 } : { k: null, d: -1 };

const mesCorto = (m: Motor, i: number | undefined) => (i != null && i >= 0 ? <small>{fmtMes(m.F[i])}</small> : null);
export type Puntajes = Partial<Record<string, number>>;
export function CeldasStats({ m, c, st, cols, sc }: { m: Motor; c: Calculo; st: StatsM; cols: [string, string][]; sc?: Puntajes }) {
  if (!st.n) return <td colSpan={cols.length} style={{ textAlign: "center", color: "var(--text-muted)" }}>sin datos en este período</td>;
  const d = varNum(c, st);
  const s: Puntajes = sc || { var: ok(d) && c.dir ? Math.sign(d) * c.dir * Math.min(1, Math.abs(d) / (c.pct ? 10 : 50) + 0.25) : 0 };
  const cel: Record<string, React.ReactNode> = {
    ini: <td key="ini">{m.fmtC(c, st.ini)}{mesCorto(m, st.iniI)}</td>,
    fin: <td key="fin" style={tinte(s.fin)}>{m.fmtC(c, st.fin)}{mesCorto(m, st.finI)}</td>,
    var: <td key="var" style={tinte(s.var)}>{m.variacionAbsTxt(c, st.ini ?? null, st.fin ?? null)}</td>,
    min: <td key="min" style={tinte(s.min)}>{m.fmtC(c, st.min)}{mesCorto(m, st.minI)}</td>,
    max: <td key="max" style={tinte(s.max)}>{m.fmtC(c, st.max)}{mesCorto(m, st.maxI)}</td>,
    prom: <td key="prom" style={tinte(s.prom)}>{m.fmtC(c, st.prom)}</td>,
    med: <td key="med" style={tinte(s.med)}>{m.fmtC(c, st.med)}</td>,
    n: <td key="n">{st.n}{st.total != null && st.n < st.total ? <small>de {st.total}</small> : null}</td>,
  };
  return <>{cols.map(([k]) => cel[k])}</>;
}
export const valorCol = (c: Calculo, st: StatsM, k: string | null): number | null | undefined =>
  !st.n || !k ? null : k === "var" ? varNum(c, st) : (st as unknown as Record<string, number | undefined>)[k];
