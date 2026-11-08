"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useSeccion } from "../useSeccion";
import { Cargando, Selector, Seg, alternar } from "../ui";
import { SelectorBase, useBase } from "./comunes";
import { PALETA, tinte } from "../util";
import { fmtMes, nf0, nf1, ok } from "@/lib/formato";
import { baseIdx, crearPres, tablaDesempeno } from "@/lib/estadisticas";
import { crearIndicadores } from "@/lib/catalogo";
import { crearCurios } from "@/lib/curiosidades";
import type { Expr, Vals } from "@/lib/motor";
import { encExpr, lista, unoDe, useParams } from "@/lib/url";

const CRIT_TXT: Record<string, string> = {
  mejora: "cuánto mejoró o empeoró desde el inicio hasta el cierre (en porcentajes, la diferencia en puntos; en el resto, la variación anualizada)",
  nivel: "el nivel promedio del mandato (en montos en pesos corrientes, donde el nivel no se puede comparar entre épocas, se usa la mejora)",
};
const hrefHist = (e: Expr) => `/historico/?v=${encodeURIComponent(encExpr({ ...e, med: e.med || undefined }))}`;

function Sparkline({ v, color, desde }: { v: Vals; color: string; desde: number }) {
  const pts: [number, number][] = [];
  for (let i = Math.max(0, desde); i < v.length; i++) { const x = v[i]; if (ok(x)) pts.push([i, x]); }
  if (pts.length < 2) return null;
  const lo = Math.min(...pts.map((q) => q[1])), hi = Math.max(...pts.map((q) => q[1])), x0 = pts[0][0], x1 = pts[pts.length - 1][0];
  const d = pts.map(([i, y], k) => `${k ? "L" : "M"}${((i - x0) / ((x1 - x0) || 1) * 240).toFixed(1)},${(34 - (y - lo) / ((hi - lo) || 1) * 32).toFixed(1)}`).join("");
  return <svg viewBox="0 0 240 36" preserveAspectRatio="none" aria-hidden="true"><path d={d} fill="none" stroke={`var(${color})`} strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

export function Curiosidades() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const b = useBase(p);
  const { motor: m, version } = sec;
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const I = useMemo(() => (m && !sec.ocupado ? crearIndicadores(m) : null), [m, sec.ocupado, version]);  // eslint-disable-line react-hooks/exhaustive-deps
  const curios = useMemo(() => (m && !sec.ocupado ? crearCurios(m) : []), [m, sec.ocupado, version]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  if (sec.ocupado || !I) return <Cargando />;

  const F = m.F;
  const presId = PRES.some((x) => x.id === p.get("cp")) ? (p.get("cp") as string) : "milei";
  const lado = unoDe(p.get("lado"), ["mejor", "peor"] as const, "mejor");
  const conjunto = unoDe(p.get("set"), ["principales", "todo"] as const, "principales");
  const crit = unoDe(p.get("crit"), ["mejora", "nivel"] as const, "mejora");
  const grupos = new Set(lista(p.has("gr") ? p.get("gr") : I.GRUPOS_IND.join(",")).filter((g) => I.GRUPOS_IND.includes(g)));
  const pr = PRES.find((x) => x.id === presId)!;

  // lo mejor y lo peor del presidente elegido
  const base = I.INDIC.concat(conjunto === "todo" ? I.INDIC_IPC.concat(I.INDIC_PP) : []);
  let filas = base.map((ind) => { const { c, des } = tablaDesempeno(m, F, PRES, ind, b); const d = des[PRES.indexOf(pr)]; return d ? { ind, c, d, r: d.puesto![crit] } : null; })
    .filter(Boolean) as { ind: typeof base[number]; c: ReturnType<typeof m.calc>; d: NonNullable<ReturnType<typeof tablaDesempeno>["des"][number]>; r: number[] }[];
  filas = filas.filter((f) => (lado === "mejor" ? f.d.bueno : f.d.malo));
  filas.sort((a, c) => (lado === "mejor" ? c.r[2] - a.r[2] : a.r[2] - c.r[2]));
  const mesC = (i?: number) => (i != null && i >= 0 ? <small>{fmtMes(F[i])}</small> : null);
  const pu = (x?: number, de?: number, pct?: number) => ok(x) ? <td style={tinte(((pct as number) - 50) / 50)}>{x}º de {de}</td> : <td style={{ color: "var(--text-muted)" }} title="El nivel no se puede comparar entre épocas">–</td>;

  // ranking de presidentes
  const inds = I.INDIC.filter((i) => grupos.has(i.grupo));
  const porPres = PRES.map(() => ({ grupos: {} as Record<string, number[]>, items: [] as { n: string; pct: number }[] }));
  inds.forEach((ind) => {
    const { des } = tablaDesempeno(m, F, PRES, ind, b);
    des.forEach((d, k) => {
      if (!d) return;
      const [, de, pct] = d.puesto![crit];
      if (!ok(de) || de < 3) return;
      (porPres[k].grupos[ind.grupo] = porPres[k].grupos[ind.grupo] || []).push(pct);
      porPres[k].items.push({ n: ind.nombre, pct });
    });
  });
  const ranking = PRES.map((x, k) => {
    const g = Object.values(porPres[k].grupos).map((a) => a.reduce((s, y) => s + y, 0) / a.length);
    return { p: x, score: g.length ? g.reduce((s, y) => s + y, 0) / g.length : null, n: porPres[k].items.length, items: porPres[k].items.sort((a, c) => c.pct - a.pct) };
  }).filter((f) => ok(f.score)).sort((a, c) => (c.score as number) - (a.score as number));
  const desde2003 = m.idxDe("2003-01");

  return (
    <section>
      <p className="sub">Lo que más se suele preguntar, calculado con los mismos datos. Tocá cualquier tarjeta para abrirla en Histórico.</p>
      <div className="card">
        <h2>Lo mejor y lo peor de cada gobierno</h2>
        <div className="controls">
          <Selector etiqueta="Presidente" valor={presId} opciones={PRES.slice().reverse().map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ cp: v === "milei" ? null : v })} />
          <Seg valor={lado} opciones={[["mejor", "Lo mejor"], ["peor", "Lo peor"]]} onElegir={(v) => set({ lado: v === "mejor" ? null : v })} />
          <Seg valor={conjunto} opciones={[["principales", "Indicadores principales"], ["todo", "Incluir precios del IPC y productos"]]} onElegir={(v) => set({ set: v === "principales" ? null : v })} />
          <Seg valor={crit} opciones={[["mejora", "Medir cuánto mejoró (inicio → cierre)"], ["nivel", "Medir el nivel promedio"]]} onElegir={(v) => set({ crit: v === "mejora" ? null : v })} />
          <label>Inicio</label><SelectorBase b={b} set={set} />
        </div>
        <p className="note">
          {lado === "mejor" ? <>Indicadores que <b>mejoraron</b></> : <>Indicadores que <b>empeoraron</b></>} durante {pr.n} (desde {fmtMes(F[baseIdx(F, pr, b)])} hasta el cierre).{" "}
          Ordenados por el puesto frente a los demás presidentes según <b>{CRIT_TXT[crit]}</b>. Se muestran los dos puestos. Tocá una fila para verla en Histórico.
        </p>
        <div className="tablewrap alto"><table>
          <thead><tr><th>Indicador</th><th>Inicio</th><th>Cierre</th><th>Cambio</th><th>Promedio</th><th>Puesto por mejora</th><th>Puesto por nivel</th></tr></thead>
          <tbody>
            {filas.length ? filas.map((f) => (
              <tr key={f.ind.nombre + f.ind.id} className="clic">
                <td className="nombre"><Link prefetch={false} href={hrefHist(f.ind)}>{f.ind.nombre}</Link><small>{f.ind.grupo} · {f.c.unidad}</small></td>
                <td>{m.fmtC(f.c, f.d.st.ini)}{mesC(f.d.st.iniI)}</td><td>{m.fmtC(f.c, f.d.st.fin)}{mesC(f.d.st.finI)}</td>
                <td style={tinte(lado === "mejor" ? 0.6 : -0.6)}>{m.variacionTxt(f.c, f.d.st.ini ?? null, f.d.st.fin ?? null)}
                  {f.d.enPuntos ? (f.d.st.ini! > 0 && f.d.st.fin! >= 0 ? <small>{nf0.format((f.d.st.fin! / f.d.st.ini! - 1) * 100)} % relativo</small> : null) : <small>{nf1.format(f.d.mejora * 100)} % anual</small>}</td>
                <td>{m.fmtC(f.c, f.d.st.prom)}</td>{pu(f.d.m_puesto, f.d.m_de, f.d.m_pct)}{pu(f.d.n_puesto, f.d.n_de, f.d.n_pct)}
              </tr>
            )) : <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>Nada para mostrar.</td></tr>}
          </tbody>
        </table></div>
      </div>
      <div className="card">
        <h2>Ranking de presidentes</h2>
        <p className="note">Para cada indicador se ordena a los presidentes según <b>{CRIT_TXT[crit]}</b> y se pasa a un puntaje de 0 (el peor) a 100 (el mejor). Se promedia dentro de cada grupo y después entre grupos, para que ningún grupo pese más por tener más series. <b>Ojo:</b> muchos datos empiezan en 2003, 2012 o 2016, así que Menem, De la Rúa y Duhalde se evalúan con pocos indicadores; Milei, con un mandato en curso; y el contexto internacional y la herencia de cada uno no entran en el número.</p>
        <div className="controls"><label>Grupos de indicadores</label>
          <Seg valor={grupos} opciones={I.GRUPOS_IND.map((g) => [g, g] as [string, string])} onElegir={(v) => set({ gr: [...alternar(grupos, v)].join(",") })} /></div>
        <div className="tablewrap"><table>
          <thead><tr><th>#</th><th>Presidente</th><th>Puntaje</th><th>Indicadores</th><th style={{ textAlign: "left" }}>Mejor en</th><th style={{ textAlign: "left" }}>Peor en</th></tr></thead>
          <tbody>{ranking.map((f, k) => (
            <tr key={f.p.id}><td>{k + 1}</td><td>{f.p.n}</td><td style={tinte(((f.score as number) - 50) / 40)}>{nf0.format(f.score as number)}</td><td>{f.n}</td>
              <td className="unidad">{f.items.slice(0, 3).map((i) => i.n).join(" · ")}</td><td className="unidad">{f.items.slice(-3).reverse().map((i) => i.n).join(" · ")}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
      <h3>Datos curiosos</h3>
      <div className="curios">
        {curios.map((x, k) => (
          <Link key={x.k} prefetch={false} href={hrefHist(x.e)} className="curio">
            <div className="k">{x.k}</div><div className="v">{x.val}</div><div className="d">{x.d}</div>
            <Sparkline v={x.v} color={PALETA[k % 8]} desde={desde2003} />
          </Link>
        ))}
      </div>
    </section>
  );
}
