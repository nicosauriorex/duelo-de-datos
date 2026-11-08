"use client";
import { useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Seg, alternar } from "../ui";
import { BotonInfo } from "../Variables";
import { LineaInicio, useBase } from "./comunes";
import { PALETA, tinte } from "../util";
import { fmtMes, fmtNum, nf0, nf1, nf2, norm, ok } from "@/lib/formato";
import { crearElec, crearPres, METRICA_E, pearson, valorElec } from "@/lib/estadisticas";
import { textoBusqueda } from "@/lib/catalogo";
import type { Calculo, Expr, Serie } from "@/lib/motor";
import { enteroEn, lista, unoDe, useParams } from "@/lib/url";

const fmtR = (r: number) => (r > 0 ? "+" : "") + nf2.format(r);
const esDetalle = (s: Serie) => ((s.cat[1] || "").startsWith("IPC INDEC") && s.cat[2] !== "Nacional") || ((s.cat[1] || "").startsWith("Precios promedio") && s.cat[2] !== "GBA");

function niceTicks(min: number, max: number, n: number): number[] {
  const span = max - min || Math.abs(max) || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => span / s <= n) || mag * 10;
  const t: number[] = []; let v = Math.floor(min / step) * step;
  t.push(v);
  while (v < max - 1e-9) { v += step; t.push(+v.toPrecision(12)); }
  return t;
}

interface Corr { s: Serie; ind: Expr; c: Calculo; pts: { e: ReturnType<typeof crearElec>[number]; x: number }[]; r: number; b: number; a: number; n: number }

function Dispersion({ o, color, metrica }: { o: Corr; color: string; metrica: string }) {
  const W = 260, H = 170, mg = { l: 34, r: 8, t: 8, b: 22 };
  const xs = o.pts.map((q) => q.x), ys = o.pts.map((q) => q.e.v);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  const px = (x1 - x0) * 0.08 || 1; x0 -= px; x1 += px;
  const y0 = Math.max(0, Math.min(...ys) - 4), y1 = Math.max(...ys) + 4;
  const X = (v: number) => mg.l + (v - x0) / (x1 - x0) * (W - mg.l - mg.r), Y = (v: number) => H - mg.b - (v - y0) / (y1 - y0) * (H - mg.t - mg.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Dispersión: ${o.s.n}`}>
      {niceTicks(y0, y1, 3).filter((v) => v >= y0 && v <= y1).map((v) => (
        <g key={"y" + v}><line x1={mg.l} x2={W - mg.r} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" /><text x={mg.l - 4} y={Y(v) + 3} textAnchor="end" style={{ fontSize: 9 }}>{nf0.format(v)}%</text></g>
      ))}
      {niceTicks(x0, x1, 3).filter((v) => v >= x0 && v <= x1).map((v) => (
        <text key={"x" + v} x={X(v)} y={H - 8} textAnchor="middle" style={{ fontSize: 9 }}>{o.c.pct || metrica !== "nivel" ? nf0.format(v) : fmtNum(v)}</text>
      ))}
      <line x1={X(x0)} x2={X(x1)} y1={Y(o.a + o.b * x0)} y2={Y(o.a + o.b * x1)} stroke={`var(${color})`} strokeOpacity=".55" strokeDasharray="4 3" />
      {o.pts.map((q) => {
        const cx = X(q.x), cy = Y(q.e.v);
        return (
          <g key={q.e.f}>
            <circle cx={cx} cy={cy} r="3.5" fill={q.e.tipo === "pres" ? `var(${color})` : "var(--surface-1)"} stroke={`var(${color})`} strokeWidth="1.5">
              <title>{`${q.e.anio} ${q.e.tipo === "pres" ? "presidencial" : "legislativa"}: ${q.e.of} ${nf1.format(q.e.v)}% · ${o.s.n}: ${nf1.format(q.x)}`}</title>
            </circle>
            <text x={cx + 5} y={cy - 4} style={{ fontSize: 9, fill: "var(--text-secondary)" }}>{q.e.anio.slice(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Elecciones() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const info = useBase(p, set, montado), b = info.b;
  const { motor: m, version } = sec;
  const [ord, setOrd] = useState<{ k: string; d: number }>({ k: "abs", d: -1 });
  const [buscar, setBuscar] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const ELEC = useMemo(() => (m ? crearElec(m.F) : []), [m]);
  const tipos = new Set(lista(p.has("et") ? p.get("et") : "pres,leg").filter((t) => t === "pres" || t === "leg"));
  const metrica = unoDe(p.get("em"), ["var12", "nivel", "mandato"] as const, "var12");
  const minN = enteroEn(p.get("emn"), 4, 16, 6);
  const conIpc = unoDe(p.get("eipc"), ["no", "si"] as const, "no");
  const clave = [...tipos].sort().join() + metrica + JSON.stringify(b);

  const todas = useMemo<Corr[]>(() => {
    if (!m || sec.ocupado) return [];
    const base = m.base();
    const elec = ELEC.filter((e) => tipos.has(e.tipo) && e.i > 0);
    const res: Corr[] = [];
    Object.values(m.SER).forEach((s) => {
      if (s.id === "poblacion" || s.id === "pib_nom_anual") return;
      const ind: Expr = { id: s.id, med: m.medDefault(s), rel: null, modo: "compra", esc: s.agg && base.PIB_AN && s.tipo !== "none" ? "pib" : "" };
      const c = m.calc(ind);
      const pts = elec.map((e) => ({ e, x: valorElec(m, m.F, PRES, metrica, b, c, e, ind) })).filter((q) => ok(q.x)) as Corr["pts"];
      if (pts.length < 4) return;
      const pr = pearson(pts.map((q) => q.x), pts.map((q) => q.e.v));
      if (!pr) return;
      res.push({ s, ind, c, pts, ...pr, n: pts.length });
    });
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, sec.ocupado, version, clave, ELEC, PRES]);

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  if (sec.ocupado) return <Cargando />;

  const toks = norm(buscar.trim()) ? norm(buscar.trim()).split(/\s+/) : [];
  const filas = todas.filter((o) => o.n >= minN && (conIpc === "si" || !esDetalle(o.s)) && (!toks.length || toks.every((k) => textoBusqueda(o.s).includes(k))));
  const val = (o: Corr) => (ord.k === "abs" ? Math.abs(o.r) : ord.k === "r" ? o.r : o.n);
  filas.sort((a, c) => (val(a) - val(c)) * ord.d);
  const el = ELEC.filter((e) => tipos.has(e.tipo));
  const elegidos = sel.length ? sel.map((id) => todas.find((o) => o.s.id === id)).filter(Boolean) as Corr[] : filas.slice().sort((a, c) => Math.abs(c.r) - Math.abs(a.r)).slice(0, 12);
  const th = (k: string, t: string) => (
    <th className={ord.k === k ? (ord.d > 0 ? "ord-asc" : "ord-desc") : ""} style={{ cursor: "pointer" }} tabIndex={0} role="button"
      onClick={() => setOrd(ord.k === k ? { k, d: -ord.d } : { k, d: -1 })} onKeyDown={(ev) => { if (ev.key === "Enter") setOrd(ord.k === k ? { k, d: -ord.d } : { k, d: -1 }); }}>{t}</th>
  );
  const textoRel = (o: Corr) => `Cuanto ${metrica === "nivel" ? "más alto" : "más subió"} → ${o.r > 0 ? "más" : "menos"} votos al oficialismo`;

  return (
    <section>
      <p className="sub">¿Qué dato de la economía va de la mano con lo que vota la gente? Cada variable se compara con el % que sacó el oficialismo nacional en cada elección desde 1995.</p>
      <div className="controls">
        <label>Elecciones</label><Seg valor={tipos} opciones={[["pres", "Presidenciales"], ["leg", "Legislativas"]]} onElegir={(v) => set({ et: [...alternar(tipos, v)].join(",") })} />
        <label>Medir</label><Seg valor={metrica} opciones={Object.entries(METRICA_E).map(([k, v]) => [k, v[0]] as [string, string])} onElegir={(v) => set({ em: v === "var12" ? null : v })} />
      </div>
      {metrica === "mandato" && <LineaInicio info={info} />}
      <div className="callout">
        Para cada variable se calcula su valor en cada elección ({METRICA_E[metrica][1]}) y se lo compara con el % que sacó el oficialismo nacional. <b>r</b> es la correlación: +1 = se mueven juntos, −1 = al revés, 0 = nada que ver. Con tan pocas elecciones ({el.length}), una correlación alta puede ser casualidad; con menos de 8 puntos, |r| por debajo de ~0,7 no dice mucho. Los montos de toda la economía se miden como % del PIB y los montos en pesos, en pesos reales.
      </div>
      <div className="card">
        <h2>Gráficos de dispersión</h2>
        <p className="note">{sel.length ? `${elegidos.length} variables elegidas.` : "Las 12 de correlación más fuerte (elegí otras con \"+ graficar\")."} Cada punto es una elección (lleno = presidencial, vacío = legislativa); la línea punteada es la tendencia.{" "}
          {sel.length > 0 && <button type="button" className="btn" onClick={() => setSel([])}>Volver a las 12 más fuertes</button>}</p>
        <div className="disps">
          {elegidos.map((o, k) => (
            <div className="disp" key={o.s.id}><div className="k">{o.s.n}</div><div className="d">r = {fmtR(o.r)} · {o.n} elecciones</div>
              <Dispersion o={o} color={PALETA[k % 8]} metrica={metrica} />
              <div className="d">eje X: {metrica === "nivel" ? o.c.unidad : o.c.pct ? "cambio en puntos" : "cambio %"} · eje Y: % del oficialismo</div></div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2>Correlación de cada variable con el voto al oficialismo</h2>
        <div className="controls">
          <input type="search" aria-label="Buscar variable" placeholder="Buscar variable: salario, inflación, dólar…" style={{ flex: 1, minWidth: 200 }} value={buscar} onChange={(ev) => setBuscar(ev.target.value)} />
          <label htmlFor="e_minn">Mínimo de elecciones</label>
          <input id="e_minn" type="number" className="num-n" min={4} max={16} value={minN} onChange={(ev) => set({ emn: String(Math.max(4, Math.min(16, +ev.target.value || 6))) })} />
          <Seg valor={conIpc} opciones={[["no", "Sin detalle regional de precios"], ["si", "Con todo"]]} onElegir={(v) => set({ eipc: v === "no" ? null : v })} />
        </div>
        <p className="note">{filas.length} variables{filas.length > 300 ? " (se muestran las primeras 300)" : ""}. Tocá un encabezado para ordenar.</p>
        <div className="tablewrap alto"><table>
          <thead><tr><th>Variable</th>{th("r", "r")}{th("abs", "Fuerza |r|")}{th("n", "Elecciones")}<th style={{ textAlign: "left" }}>Qué dice</th><th>Gráfico</th></tr></thead>
          <tbody>
            {filas.slice(0, 300).map((o) => {
              const on = sel.includes(o.s.id);
              return (
                <tr key={o.s.id}><td className="nombre">{o.s.n} <BotonInfo id={o.s.id} /><small>{o.s.cat.slice(0, 2).join(" › ")} · {o.c.unidad}</small></td>
                  <td style={tinte(o.r * 0.9)}>{fmtR(o.r)}</td>
                  <td><span className="barrita" style={{ ["--w" as string]: `${Math.round(Math.abs(o.r) * 100)}%` }} />{nf0.format(o.r * o.r * 100)} %<small>r²</small></td>
                  <td>{o.n}</td><td className="unidad">{textoRel(o)}</td>
                  <td><button type="button" className={`btn${on ? " on" : ""}`} onClick={() => setSel(on ? sel.filter((x) => x !== o.s.id) : [...sel, o.s.id])}>{on ? "✓ en gráficos" : "+ graficar"}</button></td></tr>
              );
            })}
            {!filas.length && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>Nada para mostrar.</td></tr>}
          </tbody>
        </table></div>
      </div>
      <details><summary>Ver las elecciones usadas</summary>
        <p className="note">Presidenciales: primera vuelta. Legislativas: diputados nacionales, total del país; son aproximadas porque las alianzas cambian de nombre entre provincias. En 2003 el &quot;oficialismo&quot; es Kirchner, el candidato que apoyó Duhalde.</p>
        <div className="tablewrap"><table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th style={{ textAlign: "left" }}>Oficialismo</th><th>% de votos</th><th>Resultado</th></tr></thead>
          <tbody>{ELEC.map((e) => <tr key={e.f}><td>{fmtMes(e.f)}</td><td>{e.tipo === "pres" ? "Presidencial (1ª vuelta)" : "Legislativa (diputados, aprox.)"}</td><td className="unidad">{e.of}</td><td>{nf1.format(e.v)} %</td><td>{e.gano ? "Ganó" : "Perdió"}</td></tr>)}</tbody>
        </table></div></details>
    </section>
  );
}
