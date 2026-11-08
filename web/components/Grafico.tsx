"use client";
// Gráfico de líneas con uPlot: uno o dos ejes, bandas mín/máx, escala log, referencias, marcadores,
// etiquetas al final, tooltip y zoom por arrastre (doble clic para volver).
import "uplot/dist/uPlot.min.css";
import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import { MESES, fmtMes, mesNum, ok } from "@/lib/formato";

export type Fila = Record<string, any>;
export interface SerieG {
  key: string; name: string; short?: string; color: string; axis?: number; band?: boolean; fmt?: (v: number) => string; dash?: boolean;
}
export interface Marca { key: string; axis?: number; color: string; fmt: (v: number) => string; tipos: Set<string> }
export interface Ref { v: number; axis?: number; color: string; letra: string; dash?: string }
export interface OpcionesG {
  height?: number; log?: boolean; log2?: boolean; zero?: boolean; zero2?: boolean; refs?: Ref[]; marcas?: Marca[];
  mismaEscala?: boolean; refLine?: number | null; endLabels?: boolean; fmtAxis: (v: number) => string; fmtAxis2?: ((v: number) => string) | null;
  fmtTip: (v: number) => string; tipTitle?: (r: Fila, i: number) => string; tipSub?: (r: Fila, se: SerieG) => string;
  xVals?: number[]; xLabel?: (r: Fila, i: number) => string; maxGap?: number; label?: string;
}

// ------------------------------------------------------------ escalas (mismo criterio que la página vieja)
function niceTicks(min: number, max: number, n: number): number[] {
  const span = max - min || Math.abs(max) || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => span / s <= n) || mag * 10;
  const t: number[] = []; let v = Math.floor(min / step) * step;
  t.push(v);
  while (v < max - 1e-9) { v += step; t.push(+v.toPrecision(12)); }
  return t;
}
function logTicks(min: number, max: number): number[] {
  const t: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++)
    [1, 2, 5].forEach((f) => { const v = f * Math.pow(10, e); if (v >= min * 0.999 && v <= max * 1.001) t.push(v); });
  return t.length > 9 ? t.filter((v) => Math.abs(Math.log10(v) % 1) < 1e-9) : t;
}
interface Esc { ticks: number[]; a: number; b: number; log: boolean }
function escala(vals: number[], o: { log?: boolean; zero?: boolean }): Esc | null {
  if (!vals.length) return null;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (o.log && lo > 0) return { ticks: logTicks(lo, hi), a: lo, b: hi, log: true };
  if (o.zero && lo > 0) lo = 0;
  if (o.zero && hi < 0) hi = 0;
  const pad = (hi - lo) * 0.04 || Math.abs(hi) * 0.05 || 1;
  const ticks = niceTicks(o.zero && lo === 0 ? 0 : lo - pad, hi + pad * 0.75, 5);
  return { ticks, a: ticks[0], b: ticks[ticks.length - 1], log: false };
}

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888";
function hexA(c: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const mesTxt = (n: number) => MESES[((n % 12) + 12) % 12] + "-" + String(Math.floor(n / 12)).slice(2);

function useTema(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const f = () => setT((x) => x + 1);
    mq.addEventListener("change", f);
    const mo = new MutationObserver(f);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mq.removeEventListener("change", f); mo.disconnect(); };
  }, []);
  return t;
}

export function Grafico({ rows, series, opts }: { rows: Fila[]; series: SerieG[]; opts: OpcionesG }) {
  const cont = useRef<HTMLDivElement>(null);
  const tema = useTema();
  const dual = series.some((s) => s.axis === 1);
  const okv = (v: unknown, ax: number): v is number => ok(v as number) && (!(ax ? opts.log2 : opts.log) || (v as number) > 0);
  const hay = rows.some((r) => series.some((s) => okv(r[s.key], s.axis || 0)));

  useEffect(() => {
    const el = cont.current;
    if (!el || !hay) return;
    el.innerHTML = "";
    const colorDe = (v: string) => css(v);
    const txt = css("--text-muted"), grid = css("--grid"), axisC = css("--axis"), surf = css("--surface-1");
    const dpr = () => window.devicePixelRatio || 1;
    const xs = opts.xVals || rows.map((r, i) => (r.fecha ? mesNum(r.fecha) : i));
    const x0 = xs[0], x1 = xs[xs.length - 1];
    const maxGap = opts.maxGap || 13;

    // valores por eje (en el rango x visible)
    const valsDe = (ax: number, xa: number, xb: number) => rows.flatMap((r, i) => (xs[i] < xa || xs[i] > xb) ? [] :
      series.filter((s) => opts.mismaEscala || (s.axis || 0) === ax).flatMap((s) => s.band ? [r[s.key], r[s.key + "_lo"], r[s.key + "_hi"]] : [r[s.key]])).filter((v) => okv(v, ax)) as number[];
    const tk: (Esc | null)[] = [null, null];
    const rango = (ax: number) => (u: uPlot): [number, number] => {
      const xa = u.scales.x.min ?? x0, xb = u.scales.x.max ?? x1;
      let sc = escala(valsDe(ax, xa, xb), ax ? { log: opts.log2, zero: opts.zero2 } : { log: opts.log, zero: opts.zero });
      if (!sc && ax === 1) sc = tk[0];
      tk[ax] = sc;
      if (!sc) return [0, 1];
      return [sc.a, sc.b === sc.a ? sc.a + 1 : sc.b];
    };

    // datos para dibujar: puentes de huecos chicos (series trimestrales, mensuales con meses sueltos)
    const hiloKey = (k: string, suf: string) => k + suf;
    const data: (number | null)[][] = [xs];
    const raw: Fila[] = [];
    const uSeries: uPlot.Series[] = [{}];
    const idxSerie: Record<string, number> = {};
    series.forEach((se) => {
      const ax = se.axis || 0;
      const vals = rows.map((r) => (okv(r[se.key], ax) ? (r[se.key] as number) : null));
      const plot = vals.slice();
      let prev = -1;
      vals.forEach((v, i) => {
        if (v == null) return;
        if (prev >= 0 && i - prev > 1 && xs[i] - xs[prev] <= maxGap)
          for (let j = prev + 1; j < i; j++) plot[j] = (vals[prev] as number) + ((v - (vals[prev] as number)) * (xs[j] - xs[prev])) / (xs[i] - xs[prev]);
        prev = i;
      });
      const nOk = vals.filter((v) => v != null).length;
      const first = vals.findIndex((v) => v != null);
      let last = -1; vals.forEach((v, i) => { if (v != null) last = i; });
      const pocos = rows.length <= 60 || (!opts.xVals && rows.length < (x1 - x0 + 1) * 0.6);
      const ralo = nOk > 0 && (nOk <= 60 || nOk < (last - first + 1) * 0.6);
      const col = colorDe(se.color);
      idxSerie[se.key] = uSeries.length;
      data.push(plot);
      raw.push({});
      uSeries.push({
        label: se.name, scale: ax ? "y2" : "y", stroke: col, width: 2, spanGaps: false, dash: se.dash ? [5, 4] : undefined,
        points: {
          show: pocos || ralo, size: 5, fill: col, stroke: col,
          filter: (_u: uPlot, _si: number, _show: boolean) => vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0),
        },
      });
    });
    const bands: uPlot.Band[] = [];
    series.forEach((se) => {
      if (!se.band) return;
      const ax = se.axis || 0;
      const lo = rows.map((r) => (okv(r[se.key + "_lo"], ax) && okv(r[se.key + "_hi"], ax) ? (r[se.key + "_lo"] as number) : null));
      const hi = rows.map((r, i) => (lo[i] != null ? (r[se.key + "_hi"] as number) : null));
      const hidden = (label: string): uPlot.Series => ({ label, scale: ax ? "y2" : "y", stroke: "transparent", width: 0, points: { show: false }, spanGaps: false });
      const iHi = uSeries.length; data.push(hi); uSeries.push(hidden(hiloKey(se.key, "_hi")));
      const iLo = uSeries.length; data.push(lo); uSeries.push(hidden(hiloKey(se.key, "_lo")));
      bands.push({ series: [iHi, iLo], fill: hexA(colorDe(se.color), 0.18) });
    });

    // eje x
    let xSplits: number[] = []; const xLab = new Map<number, string>();
    if (opts.xLabel) {
      rows.forEach((r, i) => { const t = opts.xLabel!(r, i); if (t !== "" && t != null) { xSplits.push(xs[i]); xLab.set(xs[i], String(t)); } });
    } else {
      const nYears = (x1 - x0) / 12, yStep = nYears > 24 ? 5 : nYears > 12 ? 2 : 1;
      if (nYears < 1.5) rows.forEach((r, i) => { if (i % Math.max(1, Math.ceil(rows.length / 8)) === 0) { xSplits.push(xs[i]); xLab.set(xs[i], fmtMes(r.fecha)); } });
      else {
        const yr0 = Math.floor(x0 / 12), yr1 = Math.floor(x1 / 12);
        for (let yr = yr0; yr <= yr1; yr++) if (yr % yStep === 0 && yr * 12 >= x0 - 1 && yr * 12 <= x1) { xSplits.push(yr * 12); xLab.set(yr * 12, String(yr)); }
      }
    }
    const tip = document.createElement("div");
    tip.className = "tip"; tip.style.display = "none";
    const fontAx = "11px system-ui, sans-serif";
    const w0 = Math.max(280, el.clientWidth || 600);
    const m = { l: 74 };
    const u = new uPlot({
      width: w0, height: opts.height || 340, series: uSeries, bands,
      padding: [14, dual ? 8 : opts.endLabels ? 110 : 16, 0, 0],
      legend: { show: false },
      cursor: { drag: { x: true, y: false, setScale: true }, y: false, points: { size: 9, width: 2, stroke: surf, fill: (uu, si) => (uu.series[si].stroke as string) } },
      scales: {
        x: { time: false, range: (uu, mn, mx) => [mn, mx] },
        y: { distr: opts.log ? 3 : 1, log: 10, range: rango(0) },
        ...(dual ? { y2: { distr: opts.log2 ? 3 : 1, log: 10, range: rango(1) } } : {}),
      },
      axes: [
        { stroke: txt, font: fontAx, grid: { show: false }, ticks: { show: false }, border: { show: true, stroke: axisC, width: 1 }, size: 28, gap: 4,
          splits: () => xSplits, values: (_u, sp) => sp.map((v) => xLab.get(v) ?? (opts.xLabel ? "" : mesTxt(v))) },
        { scale: "y", stroke: txt, font: fontAx, size: m.l, gap: 4, grid: { stroke: grid, width: 1 }, ticks: { show: false }, border: { show: false },
          splits: () => (tk[0] ? tk[0].ticks : []), values: (_u, sp) => sp.map((v) => opts.fmtAxis(v)) },
        ...(dual ? [{ scale: "y2", side: 1, stroke: txt, font: fontAx, size: 74, gap: 4, grid: { show: false }, ticks: { show: false }, border: { show: false },
          splits: () => (tk[1] ? tk[1].ticks : []), values: (_u: uPlot, sp: number[]) => sp.map((v) => (opts.fmtAxis2 || opts.fmtAxis)(v)) } as uPlot.Axis] : []),
      ],
      hooks: {
        draw: [(uu) => {
          const ctx = uu.ctx, d = dpr(), L = uu.bbox.left, T = uu.bbox.top, W = uu.bbox.width, H = uu.bbox.height;
          ctx.save();
          ctx.font = `${11 * d}px system-ui, sans-serif`;
          const yOf = (v: number, ax: number) => uu.valToPos(v, ax ? "y2" : "y", true);
          const xOf = (i: number) => uu.valToPos(xs[i], "x", true);
          const halo = (t: string, x: number, y: number, fill: string, anchor: CanvasTextAlign, size = 11, bold = false) => {
            ctx.font = `${bold ? "600 " : ""}${size * d}px system-ui, sans-serif`; ctx.textAlign = anchor;
            ctx.lineWidth = 3 * d; ctx.strokeStyle = surf; ctx.lineJoin = "round"; ctx.strokeText(t, x, y);
            ctx.fillStyle = fill; ctx.fillText(t, x, y);
          };
          const inY = (y: number) => y >= T - 1 && y <= T + H + 1;
          if (dual) {
            ctx.font = `${11 * d}px system-ui, sans-serif`; ctx.fillStyle = css("--text-secondary");
            ctx.textAlign = "right"; ctx.fillText("● izq.", L - 8 * d, T - 4 * d);
            ctx.textAlign = "left"; ctx.fillText("● der.", L + W + 8 * d, T - 4 * d);
          }
          if (opts.refLine != null && !tk[0]?.log && inY(yOf(opts.refLine, 0))) {
            ctx.strokeStyle = axisC; ctx.setLineDash([4 * d, 3 * d]); ctx.lineWidth = d;
            ctx.beginPath(); ctx.moveTo(L, yOf(opts.refLine, 0)); ctx.lineTo(L + W, yOf(opts.refLine, 0)); ctx.stroke(); ctx.setLineDash([]);
          }
          // Referencias (U, P, M, ↑, ↓): línea fina punteada y una letra en el borde
          if (opts.refs && opts.refs.length) {
            const labs: { y: number; t: string; color: string; axis: number }[] = [];
            opts.refs.forEach((rf) => {
              const ax = rf.axis || 0;
              if (!okv(rf.v, ax)) return;
              const yy = yOf(rf.v, ax); if (!inY(yy)) return;
              ctx.globalAlpha = 0.55; ctx.strokeStyle = colorDe(rf.color); ctx.lineWidth = d;
              ctx.setLineDash((rf.dash || "2 4").split(" ").map((n) => +n * d));
              ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(L + W, yy); ctx.stroke();
              ctx.setLineDash([]); ctx.globalAlpha = 1;
              labs.push({ y: yy, t: rf.letra, color: rf.color, axis: ax });
            });
            [0, 1].forEach((ax) => {
              const l = labs.filter((o) => o.axis === ax).sort((a, b) => a.y - b.y);
              for (let k = 1; k < l.length; k++) if (l[k].y - l[k - 1].y < 10 * d) l[k].y = l[k - 1].y + 10 * d;
              l.forEach((o) => halo(o.t, ax ? L + W - 3 * d : L + 3 * d, o.y + 3.5 * d, colorDe(o.color), ax ? "right" : "left", 10, true));
            });
          }
          // último dato de cada serie
          series.forEach((se) => {
            const ax = se.axis || 0;
            for (let i = rows.length - 1; i >= 0; i--) if (okv(rows[i][se.key], ax)) {
              const cx = xOf(i), cy = yOf(rows[i][se.key], ax);
              ctx.beginPath(); ctx.arc(cx, cy, 4 * d, 0, 2 * Math.PI); ctx.fillStyle = colorDe(se.color); ctx.fill();
              ctx.lineWidth = 2 * d; ctx.strokeStyle = surf; ctx.stroke();
              break;
            }
          });
          // Marcadores con etiqueta: último, máximo y mínimo
          if (opts.marcas && opts.marcas.length) {
            const tit = opts.tipTitle || ((r: Fila) => fmtMes(r.fecha));
            const etqs: { cx: number; ty: number; t: string }[] = [];
            opts.marcas.forEach((mk) => {
              const ax = mk.axis || 0;
              let iu = -1, imx = -1, imn = -1;
              rows.forEach((r, i) => {
                const v = r[mk.key]; if (!okv(v, ax)) return;
                iu = i; if (imx < 0 || v > rows[imx][mk.key]) imx = i; if (imn < 0 || v < rows[imn][mk.key]) imn = i;
              });
              if (iu < 0) return;
              const pts = new Map<number, string[]>();
              if (mk.tipos.has("max")) pts.set(imx, ["Máx."]);
              if (mk.tipos.has("min")) (pts.get(imn) || pts.set(imn, []).get(imn)!).push("Mín.");
              if (mk.tipos.has("ult")) (pts.get(iu) || pts.set(iu, []).get(iu)!).unshift("Último");
              pts.forEach((_nom, i) => {
                const v = rows[i][mk.key] as number, cx = xOf(i), cy = yOf(v, ax);
                ctx.beginPath(); ctx.arc(cx, cy, 4 * d, 0, 2 * Math.PI); ctx.fillStyle = surf; ctx.fill();
                ctx.lineWidth = 2 * d; ctx.strokeStyle = colorDe(mk.color); ctx.stroke();
                const arriba = i === imx && i !== imn ? true : i === imn && i !== imx ? false : cy > T + H / 2;
                etqs.push({ cx, ty: arriba ? cy - 9 * d : cy + 15 * d, t: `${mk.fmt(v)} · ${tit(rows[i], i)}` });
              });
            });
            etqs.sort((a, b) => a.ty - b.ty);
            for (let k = 1; k < etqs.length; k++) if (Math.abs(etqs[k].ty - etqs[k - 1].ty) < 12 * d && Math.abs(etqs[k].cx - etqs[k - 1].cx) < 150 * d) etqs[k].ty = etqs[k - 1].ty + 12 * d;
            etqs.forEach((o) => {
              const ty = Math.max(T + 9 * d, Math.min(T + H - 3 * d, o.ty));
              const anc: CanvasTextAlign = o.cx > L + W - 90 * d ? "right" : o.cx < L + 90 * d ? "left" : "center";
              halo(o.t, o.cx, ty, css("--text-primary"), anc);
            });
          }
          // Etiquetas al final de cada línea
          if (opts.endLabels && !dual) {
            const lab = series.map((se) => {
              for (let i = rows.length - 1; i >= 0; i--) if (okv(rows[i][se.key], 0)) return { se, i, y: yOf(rows[i][se.key], 0) };
              return null;
            }).filter(Boolean).sort((a, b) => a!.y - b!.y) as { se: SerieG; i: number; y: number }[];
            for (let k = 1; k < lab.length; k++) if (lab[k].y - lab[k - 1].y < 14 * d) lab[k].y = lab[k - 1].y + 14 * d;
            ctx.textAlign = "left"; ctx.fillStyle = css("--text-secondary"); ctx.font = `${11 * d}px system-ui, sans-serif`;
            lab.forEach((l) => ctx.fillText(l.se.short || (l.se.name.length > 18 ? l.se.name.slice(0, 17) + "…" : l.se.name), xOf(l.i) + 8 * d, l.y + 4 * d));
          }
          ctx.restore();
        }],
        setCursor: [(uu) => {
          const i = uu.cursor.idx;
          if (i == null || uu.cursor.left == null || uu.cursor.left < 0) { tip.style.display = "none"; return; }
          const r = rows[i];
          let html = `<b>${esc(opts.tipTitle ? opts.tipTitle(r, i) : fmtMes(r.fecha))}</b>`;
          series.forEach((se) => {
            const ax = se.axis || 0, v = r[se.key];
            if (!okv(v, ax)) return;
            const f = se.fmt || opts.fmtTip;
            const sub = opts.tipSub ? opts.tipSub(r, se) : "";
            const rango = se.band && okv(r[se.key + "_lo"], ax) ? ` <small style="color:var(--text-muted)">(${esc(f(r[se.key + "_lo"]))} – ${esc(f(r[se.key + "_hi"]))})</small>` : "";
            html += `<div class="row"><span><i style="--c:var(${se.color})"></i>${esc(se.name)}${sub}</span><span>${esc(f(v))}${rango}</span></div>`;
          });
          tip.innerHTML = html; tip.style.display = "block";
          const ow = uu.over.clientWidth;
          let left = uu.cursor.left + 14; if (left + tip.offsetWidth > ow - 4) left = uu.cursor.left - tip.offsetWidth - 14;
          tip.style.left = Math.max(4, left) + "px"; tip.style.top = Math.max(0, (uu.cursor.top ?? 0) - 20) + "px";
        }],
      },
    }, data as uPlot.AlignedData, el);
    u.over.appendChild(tip);
    u.over.style.cursor = "crosshair";
    el.setAttribute("role", "img"); el.setAttribute("aria-label", opts.label || "Gráfico de líneas");
    const ro = new ResizeObserver(() => { const w = Math.max(280, el.clientWidth); if (Math.abs(w - u.width) > 1) u.setSize({ width: w, height: opts.height || 340 }); });
    ro.observe(el);
    return () => { ro.disconnect(); u.destroy(); el.innerHTML = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, series, opts, tema, hay]);

  if (!hay) return <p className="note">Sin datos para esta selección.</p>;
  return (
    <>
      <div ref={cont} className="grafico" />
      <p className="note ayuda-zoom">Arrastrá sobre el gráfico para acercar; doble clic para volver.</p>
    </>
  );
}
