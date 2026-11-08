"use client";
import { useMemo } from "react";
import { Seg } from "../ui";
import { tinte } from "../util";
import { fmtMes, ok } from "@/lib/formato";
import type { Calculo, Motor } from "@/lib/motor";
import { varNum, type BaseCfg, type StatsM } from "@/lib/estadisticas";
import { enteroEn, unoDe } from "@/lib/url";

export const COLS: [string, string][] = [["ini", "Inicio"], ["fin", "Cierre"], ["var", "Variación"], ["min", "Mínimo"], ["max", "Máximo"], ["prom", "Promedio"], ["med", "Mediana"], ["n", "Meses"]];
export const OPC_BASE: [string, string][] = [["prev", "Último mes del antecesor (T-1)"], ["asume", "Mes de asunción (T)"], ["mas", "T + n meses"]];

/** Base de los mandatos (T-1 / T / T+n), guardada en la URL con los parámetros `b` y `n`. */
export function useBase(p: URLSearchParams): BaseCfg {
  return useMemo(() => ({ base: unoDe(p.get("b"), ["prev", "asume", "mas"] as const, "prev"), n: enteroEn(p.get("n"), 1, 47, 1) }), [p]);
}
export function SelectorBase({ b, set }: { b: BaseCfg; set: (c: Record<string, string | null>) => void }) {
  return (
    <>
      <Seg valor={b.base} opciones={OPC_BASE} onElegir={(v) => set({ b: v === "prev" ? null : v })} />
      {b.base === "mas" && (
        <input type="number" min={1} max={47} className="num-n" value={b.n} title="n: meses después de asumir" aria-label="Meses después de asumir"
          onChange={(ev) => set({ n: String(Math.max(1, Math.min(47, Math.round(+ev.target.value || 1)))), b: "mas" })} />
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
    var: <td key="var" style={tinte(s.var)}>{m.variacionTxt(c, st.ini ?? null, st.fin ?? null)}</td>,
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
