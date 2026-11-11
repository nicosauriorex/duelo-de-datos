"use client";
// Gráfico de líneas con uPlot: uno o dos ejes, bandas mín/máx, escala log, referencias, marcadores,
// etiquetas al final, tooltip, zoom por arrastre (mouse y táctil; Volver / doble clic) y vista expandida.
import "uplot/dist/uPlot.min.css";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import uPlot from "uplot";
import { MESES, fmtMes, mesNum, ok } from "@/lib/formato";
import { estadisticasRows } from "@/lib/estadisticas";
import { useConfig } from "./ConfigProvider";
import { BarraZoom } from "./BarraZoom";
import { useAtras } from "./ui";

export type Fila = Record<string, any>;
export interface SerieG {
  key: string; name: string; short?: string; color: string; axis?: number; band?: boolean; fmt?: (v: number) => string; dash?: boolean;
  puntos?: number;   // solo círculos de este tamaño, sin línea (valores medidos aislados)
}
export interface Marca { key: string; axis?: number; color: string; fmt: (v: number) => string; tipos: Set<string> }
export type TipoRef = "ult" | "prom" | "med" | "max" | "min";
/** Línea de referencia. Con `key` y `tipo` se recalcula con el tramo visible al acercar; `nom`, `quien` y `fmt` arman la etiqueta al pasar el cursor. */
export interface Ref {
  v: number; axis?: number; color: string; letra: string; corto?: string; dash?: string;
  key?: string; tipo?: TipoRef; nom?: string; quien?: string; fmt?: (v: number) => string;
}
export interface FranjaG { ini: number; fin: number; nombre: string; color: string }
export interface OpcionesG {
  height?: number; log?: boolean; log2?: boolean; zero?: boolean; zero2?: boolean; refs?: Ref[]; marcas?: Marca[];
  mismaEscala?: boolean; refLine?: number | null; endLabels?: boolean; fmtAxis: (v: number) => string; fmtAxis2?: ((v: number) => string) | null;
  fmtTip: (v: number) => string; tipTitle?: (r: Fila, i: number) => string; tipSub?: (r: Fila, se: SerieG) => string;
  xVals?: number[]; franjas?: FranjaG[]; xLabel?: (r: Fila, i: number) => string; maxGap?: number; label?: string;
  sinBarra?: boolean;   // no mostrar la barra de zoom bajo el gráfico
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
  if (o.log && lo > 0) { if (lo === hi) { lo *= 0.8; hi *= 1.25; } return { ticks: logTicks(lo, hi), a: lo, b: hi, log: true }; }
  if (o.zero && lo > 0) lo = 0;
  if (o.zero && hi < 0) hi = 0;
  const pad = (hi - lo) * 0.04 || Math.abs(hi) * 0.05 || 1;
  const ticks = niceTicks(o.zero && lo === 0 ? 0 : lo - pad, hi + pad * 0.75, 5);
  return { ticks, a: ticks[0], b: ticks[ticks.length - 1], log: false };
}

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "gray";
function hexA(c: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const mesTxt = (n: number) => MESES[((n % 12) + 12) % 12] + "-" + String(Math.floor(n / 12)).slice(2);
const PX_MIN_PUNTO = 6;      // con menos píxeles por dato no se dibujan puntos ni marcadores intermedios
const MIN_DATOS_BARRA = 24;  // con menos datos no hay barra de zoom
const TOL_REF_MOUSE = 6, TOL_REF_TACTIL = 10; // distancia vertical (px) para considerar el cursor "sobre" una línea de referencia

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

const MQ_ESTRECHO = "(max-width: 639.98px)";
function useMedia(q: string): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q), f = () => setV(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [q]);
  return v;
}

/** Etiquetas del eje X según el ancho disponible (px por etiqueta de año ≥ 40; abreviadas en celular si hace falta). */
export function ejeX(a: number, b: number, anchoPx: number, estrecho: boolean): { splits: number[]; fmt: (v: number) => string } {
  const span = Math.max(1e-9, b - a), nY = span / 12, splits: number[] = [];
  if (nY < 1.5) {
    const paso = [1, 2, 3, 6, 12].find((p) => (span / p + 1) * 56 <= anchoPx) || 12;
    for (let n = Math.ceil(a / paso) * paso; n <= b + 1e-9; n += paso) splits.push(n);
    return { splits, fmt: mesTxt };
  }
  const cand = [1, 2, 5, 10, 20, 50], px = (p: number) => anchoPx / (nY / p);
  let paso = cand.find((p) => px(p) >= 40) || 50, abrev = false;
  if (estrecho) { const p2 = cand.find((p) => px(p) >= 30) || 50; if (p2 < paso) { paso = p2; abrev = true; } }
  for (let yr = Math.ceil((a - 0.5) / 12); yr * 12 <= b + 1e-9; yr++) if (yr % paso === 0 && yr * 12 >= a - 0.5) splits.push(yr * 12);
  return { splits, fmt: (v) => (abrev ? "'" + String(Math.round(v / 12)).slice(-2) : String(Math.round(v / 12))) };
}

export function hayDatos(rows: Fila[], series: SerieG[], opts: OpcionesG): boolean {
  const okv = (v: unknown, ax: number) => ok(v as number) && (!(ax ? opts.log2 : opts.log) || (v as number) > 0);
  return rows.some((r) => series.some((s) => okv(r[s.key], s.axis || 0)));
}

export interface Expandir { titulo: string; leyenda?: ReactNode; abierto: boolean; onCerrar: () => void }

/** Gráfico con ayuda debajo; con `expandir.abierto` muestra además la vista a pantalla completa. */
export function Grafico({ rows, series, opts, expandir }: { rows: Fila[]; series: SerieG[]; opts: OpcionesG; expandir?: Expandir }) {
  const tactil = useMedia("(pointer: coarse)");
  if (!hayDatos(rows, series, opts)) return <p className="note">Sin datos para esta selección.</p>;
  const ayuda = tactil ? "Tocá un punto para ver el valor. Acercá con la barra de abajo o arrastrando de costado." : "Arrastrá para acercar o usá la barra de abajo; doble clic para volver.";
  return (
    <>
      <GraficoBase rows={rows} series={series} opts={opts} />
      <p className="note ayuda-zoom">{ayuda}</p>
      {expandir?.abierto && (
        <Expandido expandir={expandir} ayuda={ayuda}><GraficoBase rows={rows} series={series} opts={opts} lleno /></Expandido>
      )}
    </>
  );
}

function Expandido({ expandir, ayuda, children }: { expandir: Expandir; ayuda: string; children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);
  const [vertical, setVertical] = useState(false);
  const coarse = useMedia("(pointer: coarse)");
  // El botón Atrás del celular cierra la vista ampliada (no sale de la página); la cruz y Escape usan el mismo camino.
  const cerrar = useAtras(true, expandir.onCerrar);
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  useEffect(() => {
    const fs = { v: false };
    document.body.classList.add("sin-scroll");
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape") { ev.preventDefault(); cerrarRef.current(); } };
    const cambioFs = () => { if (fs.v && !document.fullscreenElement) cerrarRef.current(); };
    const medir = () => setVertical(window.innerHeight > window.innerWidth);
    document.addEventListener("keydown", tecla);
    document.addEventListener("fullscreenchange", cambioFs);
    window.addEventListener("resize", medir);
    medir();
    const el = raiz.current;
    const girar = () => { if (window.matchMedia("(pointer: coarse)").matches) (screen.orientation as any)?.lock?.("landscape")?.catch?.(() => {}); };
    if (el && el.requestFullscreen) el.requestFullscreen().then(() => { fs.v = true; girar(); }).catch(girar);
    else girar();
    return () => {
      fs.v = false;
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("fullscreenchange", cambioFs); window.removeEventListener("resize", medir);
      document.body.classList.remove("sin-scroll");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      try { (screen.orientation as any)?.unlock?.(); } catch { /* no se puede */ }
    };
  }, []);
  return (
    <div className="exp" ref={raiz} role="dialog" aria-modal="true" aria-label={expandir.titulo}>
      <div className="exp-cab">
        <h2>{expandir.titulo}</h2>
        <button type="button" className="btn exp-cerrar" aria-label="Cerrar vista ampliada" onClick={cerrar}>✕</button>
      </div>
      {expandir.leyenda}
      {coarse && vertical && <div className="aviso-giro" role="status">Girá el celular para verlo más grande</div>}
      <div className="graf-caja">{children}</div>
      <p className="note ayuda-zoom">{ayuda}</p>
    </div>
  );
}

function GraficoBase({ rows, series, opts, lleno }: { rows: Fila[]; series: SerieG[]; opts: OpcionesG; lleno?: boolean }) {
  const cont = useRef<HTMLDivElement>(null);
  const tema = useTema();
  const estrecho = useMedia(MQ_ESTRECHO);
  const [vent, setVent] = useState<[number, number] | null>(null); // ventana acercada (null = todo el período)
  const [rev, setRev] = useState(0); // Volver rehace el gráfico entero: el eje queda como al principio
  const { config } = useConfig();
  const kColPres = JSON.stringify(config.colPres);
  const reset = useRef<() => void>(() => {});
  const zoomRef = useRef<[number, number] | null>(null); // rango acercado: se conserva al redibujar por tamaño, no al cambiar datos
  useEffect(() => { zoomRef.current = null; setVent(null); }, [rows, series, opts]);
  const aplicarRef = useRef<(a: number, b: number) => void>(() => {}); // acerca / desplaza el gráfico (lo usa la barra de zoom)
  const xs = useMemo(() => opts.xVals || rows.map((r, i) => (r.fecha ? mesNum(r.fecha) : i)), [rows, opts.xVals]);
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
    const x0 = xs[0], x1 = xs[xs.length - 1];
    const maxGap = opts.maxGap || 13;

    // valores por eje (en el rango x visible)
    const valsDe = (ax: number, xa: number, xb: number) => rows.flatMap((r, i) => (xs[i] < xa || xs[i] > xb) ? [] :
      series.filter((s) => opts.mismaEscala || (s.axis || 0) === ax).flatMap((s) => s.band ? [r[s.key], r[s.key + "_lo"], r[s.key + "_hi"]] : [r[s.key]])).filter((v) => okv(v, ax)) as number[];
    const tk: (Esc | null)[] = [null, null];
    // Ventana x que se va a mostrar. uPlot calcula el rango de Y ANTES de aplicar el nuevo rango de X (u.scales.x todavía
    // tiene el valor anterior), así que la escala vertical se ajustaba a la ventana previa. Se guarda acá, antes de cada setScale.
    let ventana: [number, number] = [x0, x1];
    const rango = (ax: number) => (): [number, number] => {
      const [xa, xb] = ventana;
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
      // con menos de PX_MIN_PUNTO px por dato visible: solo la línea
      const holgado = (uu: uPlot) => {
        const xa = uu.scales.x.min ?? x0, xb = uu.scales.x.max ?? x1;
        let n = 0; for (let i = 0; i < vals.length; i++) if (vals[i] != null && xs[i] >= xa && xs[i] <= xb) n++;
        return n > 0 && Math.max(60, uu.bbox.width / dpr()) / n >= PX_MIN_PUNTO;
      };
      const col = colorDe(se.color);
      idxSerie[se.key] = uSeries.length;
      data.push(plot);
      raw.push({});
      uSeries.push({
        label: se.name, scale: ax ? "y2" : "y", stroke: col, width: se.puntos ? 0 : 2, spanGaps: false, dash: se.dash ? [5, 4] : undefined,
        points: {
          show: se.puntos ? true : (uu: uPlot) => (pocos || ralo) && holgado(uu), size: se.puntos ?? 5, fill: col, stroke: col,
          // uPlot dibuja los puntos que devuelve `filter` aunque `show` sea falso: si no corresponde mostrarlos, se devuelve null
          filter: (_u: uPlot, _si: number, show: boolean) => (show ? vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0) : null),
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

    // eje x: con etiquetas propias (xLabel) quedan fijas; si no, se eligen según el ancho y el rango visible
    const xSplits: number[] = []; const xLab = new Map<number, string>();
    if (opts.xLabel) rows.forEach((r, i) => { const t = opts.xLabel!(r, i); if (t !== "" && t != null) { xSplits.push(xs[i]); xLab.set(xs[i], String(t)); } });
    let xFmt: (v: number) => string = mesTxt;
    const anchoPlot = (uu: uPlot) => Math.max(60, uu.bbox.width / dpr());
    const splitsX = (uu: uPlot, _ax: number, mn: number, mx: number) => {
      if (opts.xLabel) return xSplits;
      const r = ejeX(mn, mx, anchoPlot(uu), estrecho); xFmt = r.fmt; return r.splits;
    };
    let hoverRef: Ref | null = null, tol = TOL_REF_MOUSE, destruido = false;
    let lineas: { rf: Ref; v: number; tramo: string; y: number; yd: number }[] = [];
    const tip = document.createElement("div");
    tip.className = "tip"; tip.style.display = "none";
    const fontAx = "11px system-ui, sans-serif";
    const w0 = Math.max(280, el.clientWidth || 600);
    const alto = () => (lleno ? Math.max(200, el.clientHeight) : opts.height || (estrecho ? 300 : 340));
    const m = { l: estrecho ? 48 : 74 };
    const padR = dual ? 8 : opts.endLabels ? (estrecho ? 70 : 110) : 16;
    const u = new uPlot({
      width: w0, height: alto(), series: uSeries, bands,
      padding: [14, padR, 0, 0],
      legend: { show: false },
      cursor: { drag: { x: false, y: false, setScale: false }, y: false, bind: { dblclick: () => null }, points: { size: 9, width: 2, stroke: surf, fill: (uu, si) => (uu.series[si].stroke as string) } },
      scales: {
        x: { time: false, range: (_uu, mn, mx) => { if (mn != null && mx != null) ventana = [mn, mx]; return [mn, mx]; } },
        y: { distr: opts.log ? 3 : 1, log: 10, range: rango(0) },
        ...(dual ? { y2: { distr: opts.log2 ? 3 : 1, log: 10, range: rango(1) } } : {}),
      },
      axes: [
        { stroke: txt, font: fontAx, grid: { show: false }, ticks: { show: false }, border: { show: true, stroke: axisC, width: 1 }, size: 28, gap: 4,
          splits: splitsX, values: (_u, sp) => sp.map((v) => xLab.get(v) ?? (opts.xLabel ? "" : xFmt(v))) },
        { scale: "y", stroke: txt, font: fontAx, size: m.l, gap: 4, grid: { stroke: grid, width: 1 }, ticks: { show: false }, border: { show: false },
          splits: () => (tk[0] ? tk[0].ticks : []), values: (_u, sp) => sp.map((v) => opts.fmtAxis(v)) },
        ...(dual ? [{ scale: "y2", side: 1, stroke: txt, font: fontAx, size: m.l, gap: 4, grid: { show: false }, ticks: { show: false }, border: { show: false },
          splits: () => (tk[1] ? tk[1].ticks : []), values: (_u: uPlot, sp: number[]) => sp.map((v) => (opts.fmtAxis2 || opts.fmtAxis)(v)) } as uPlot.Axis] : []),
      ],
      hooks: {
        drawClear: [(uu) => {
          const fr = opts.franjas;
          if (!fr || !fr.length) return;
          const ctx = uu.ctx, d = dpr(), T = uu.bbox.top, H = uu.bbox.height;
          const mn = uu.scales.x.min ?? x0, mx = uu.scales.x.max ?? x1;
          ctx.save();
          fr.forEach((f) => {
            const a = Math.max(f.ini, mn), b = Math.min(f.fin, mx);
            if (b <= a) return;
            const pa = uu.valToPos(a, "x", true), pb = uu.valToPos(b, "x", true), col = colorDe(f.color);
            ctx.fillStyle = hexA(col, 0.12); ctx.fillRect(pa, T, pb - pa, H);
            if (f.ini > mn) { ctx.strokeStyle = axisC; ctx.lineWidth = d; ctx.beginPath(); ctx.moveTo(pa, T); ctx.lineTo(pa, T + H); ctx.stroke(); }
            ctx.font = `600 ${10 * d}px system-ui, sans-serif`;
            if (pb - pa > ctx.measureText(f.nombre).width + 8 * d) { ctx.fillStyle = txt; ctx.textAlign = "center"; ctx.fillText(f.nombre, (pa + pb) / 2, T + 11 * d); }
          });
          ctx.restore();
        }],
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
          // Referencias (Último, Promedio, Mediana, ↑, ↓): línea fina punteada y un rótulo corto sobre ella, pegado al borde izquierdo (o derecho con eje doble). En pantalla angosta usa la forma abreviada. Al acercar se recalculan con el tramo visible.
          lineas = [];
          if (opts.refs && opts.refs.length) {
            const xa = uu.scales.x.min ?? x0, xb = uu.scales.x.max ?? x1, zoomed = xa > x0 + 1e-9 || xb < x1 - 1e-9;
            const vis = zoomed ? rows.filter((_, i) => xs[i] >= xa && xs[i] <= xb) : rows;
            const tramo = zoomed && vis.length ? (() => { const y0 = String(vis[0].fecha).slice(0, 4), y1 = String(vis[vis.length - 1].fecha).slice(0, 4); return y0 === y1 ? y0 : `${y0}–${y1}`; })() : "";
            const labs: { y: number; t: string; color: string; axis: number }[] = [];
            const angosto = window.innerWidth < 640;
            opts.refs.forEach((rf) => {
              const ax = rf.axis || 0;
              let v = rf.v;
              if (zoomed && rf.key && rf.tipo) {
                const st = estadisticasRows(vis, rf.key);
                if (st) v = rf.tipo === "ult" ? st.ult[0] : rf.tipo === "prom" ? st.prom : rf.tipo === "med" ? st.med : rf.tipo === "max" ? st.max[0] : st.min[0];
              }
              if (!okv(v, ax)) return;
              const yy = yOf(v, ax); if (!inY(yy)) return;
              const sel = hoverRef === rf;
              ctx.globalAlpha = sel ? 1 : 0.55; ctx.strokeStyle = colorDe(rf.color); ctx.lineWidth = (sel ? 2.5 : 1) * d;
              ctx.setLineDash((rf.dash || "2 4").split(" ").map((n) => +n * d));
              ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(L + W, yy); ctx.stroke();
              ctx.setLineDash([]); ctx.globalAlpha = 1;
              labs.push({ y: yy, t: angosto && rf.corto ? rf.corto : rf.letra, color: rf.color, axis: ax });
              lineas.push({ rf, v, tramo, y: uu.valToPos(v, ax ? "y2" : "y", false), yd: yy });
            });
            [0, 1].forEach((ax) => {
              const l = labs.filter((o) => o.axis === ax).sort((a, b) => a.y - b.y);
              for (let k = 1; k < l.length; k++) if (l[k].y - l[k - 1].y < 12 * d) l[k].y = l[k - 1].y + 12 * d;
              // el texto va apenas arriba de su línea (no tachado por ella) y separado del eje; si no entra arriba, va debajo
              l.forEach((o) => halo(o.t, ax ? L + W - 6 * d : L + 6 * d, o.y - 3 * d < T + 9 * d ? o.y + 11 * d : o.y - 3 * d, colorDe(o.color), ax ? "right" : "left", 10, true));
            });
          }
          // último dato de cada serie
          series.forEach((se) => {
            const ax = se.axis || 0;
            for (let i = rows.length - 1; i >= 0; i--) if (okv(rows[i][se.key], ax)) {
              const cx = xOf(i), cy = yOf(rows[i][se.key], ax);
              if (cx < L - 1 || cx > L + W + 1) break; // el último dato quedó fuera de la ventana acercada
              ctx.beginPath(); ctx.arc(cx, cy, 4 * d, 0, 2 * Math.PI); ctx.fillStyle = colorDe(se.color); ctx.fill();
              ctx.lineWidth = 2 * d; ctx.strokeStyle = surf; ctx.stroke();
              break;
            }
          });
          // Marcadores con etiqueta: último, máximo y mínimo
          if (opts.marcas && opts.marcas.length) {
            const tit = opts.tipTitle || ((r: Fila) => fmtMes(r.fecha));
            const etqs: { cx: number; ty: number; t: string }[] = [];
            const xa = uu.scales.x.min ?? x0, xb = uu.scales.x.max ?? x1;
            let nVis = 0; for (let i = 0; i < xs.length; i++) if (xs[i] >= xa && xs[i] <= xb) nVis++;
            const conIntermedios = Math.max(60, uu.bbox.width / d) / Math.max(1, nVis) >= PX_MIN_PUNTO; // poco espacio por dato: sin máx./mín.
            opts.marcas.forEach((mk) => {
              const ax = mk.axis || 0;
              let iu = -1, imx = -1, imn = -1;
              rows.forEach((r, i) => {
                const v = r[mk.key]; if (!okv(v, ax)) return;
                iu = i;
                if (xs[i] < xa || xs[i] > xb) return; // máximo y mínimo del tramo visible
                if (imx < 0 || v > rows[imx][mk.key]) imx = i; if (imn < 0 || v < rows[imn][mk.key]) imn = i;
              });
              if (iu < 0) return;
              const pts = new Map<number, string[]>();
              if (mk.tipos.has("max") && conIntermedios && imx >= 0) pts.set(imx, ["Máx."]);
              if (mk.tipos.has("min") && conIntermedios && imn >= 0) (pts.get(imn) || pts.set(imn, []).get(imn)!).push("Mín.");
              if (mk.tipos.has("ult") && xs[iu] >= xa && xs[iu] <= xb) (pts.get(iu) || pts.set(iu, []).get(iu)!).unshift("Último");
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
            lab.forEach((l) => {
              const x = xOf(l.i) + 8 * d, libre = Math.max(20 * d, ctx.canvas.width - x - 4 * d);
              let t = l.se.short || (l.se.name.length > 18 ? l.se.name.slice(0, 17) + "…" : l.se.name);
              if (ctx.measureText(t).width > libre) {
                while (t.length > 1 && ctx.measureText(t.replace(/…$/, "") + "…").width > libre) t = t.replace(/…$/, "").slice(0, -1) + "…";
                if (!t.endsWith("…")) t += "…";
              }
              ctx.fillText(t, x, l.y + 4 * d);
            });
          }
          // Etiqueta de la referencia resaltada (cursor cerca de la línea o toque en el celular)
          const selL = lineas.find((l) => l.rf === hoverRef);
          if (selL) {
            const rf = selL.rf, f = rf.fmt || opts.fmtTip;
            const t = `${rf.nom ?? rf.letra}${rf.quien ? " · " + rf.quien : ""}: ${f(selL.v)}`; // solo el nombre de la línea y su valor
            ctx.font = `600 ${11 * d}px system-ui, sans-serif`;
            const w = ctx.measureText(t).width, cx = uu.cursor.left != null && uu.cursor.left >= 0 ? L + uu.cursor.left * d : L + W / 2;
            const x = Math.max(L + 4 * d + w / 2, Math.min(L + W - 4 * d - w / 2, cx));
            const arriba = selL.yd - 8 * d > T + 12 * d;
            halo(t, x, arriba ? selL.yd - 7 * d : selL.yd + 16 * d, css("--text-primary"), "center", 11, true);
          }
          ctx.restore();
        }],
        setCursor: [(uu) => {
          // ¿el cursor está sobre una línea de referencia? Gana la más cercana dentro de la tolerancia; ahí no hay etiqueta de la serie
          const dentro = uu.cursor.left != null && uu.cursor.left >= 0 && uu.cursor.top != null && uu.cursor.top >= 0;
          let sobre: Ref | null = null;
          if (dentro) { let dmin = tol + 1e-6; lineas.forEach((l) => { const dd = Math.abs(l.y - (uu.cursor.top as number)); if (dd <= dmin) { dmin = dd; sobre = l.rf; } }); }
          if (sobre !== hoverRef) {
            hoverRef = sobre; uu.over.classList.toggle("sobre-ref", !!sobre);
            requestAnimationFrame(() => { if (!destruido) u.redraw(false, false); });
          }
          const i = uu.cursor.idx;
          if (sobre || i == null || uu.cursor.left == null || uu.cursor.left < 0) { tip.style.display = "none"; return; }
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
          const fr = opts.franjas?.find((f) => xs[i] >= f.ini && xs[i] < f.fin);
          if (fr) html += `<div class="row"><span>Presidente</span><span>${esc(fr.nombre)}</span></div>`;
          tip.innerHTML = html; tip.style.display = "block";
          const ow = uu.over.clientWidth;
          let left = uu.cursor.left + 14; if (left + tip.offsetWidth > ow - 4) left = uu.cursor.left - tip.offsetWidth - 14;
          tip.style.left = Math.max(4, left) + "px"; tip.style.top = Math.max(0, (uu.cursor.top ?? 0) - 20) + "px";
        }],
      },
    }, data as uPlot.AlignedData, el);
    u.over.appendChild(tip);
    u.over.style.cursor = "crosshair";
    // Zoom propio (mouse, lápiz y táctil): arrastre horizontal selecciona; el vertical sigue siendo scroll (touch-action: pan-y)
    const over = u.over, selEl = document.createElement("div");
    selEl.className = "sel-zoom"; over.appendChild(selEl);
    let down: { x: number; y: number; id: number; tipo: string; vent: [number, number] | null } | null = null, sel = false;
    const pos = (e: PointerEvent) => { const r = over.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const ocultarTip = () => u.setCursor({ left: -10, top: -10 });
    const alPresionar = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      tol = e.pointerType === "mouse" ? TOL_REF_MOUSE : TOL_REF_TACTIL;
      const p = pos(e); down = { ...p, id: e.pointerId, tipo: e.pointerType, vent: zoomRef.current }; sel = false;
      if (e.pointerType !== "mouse") u.setCursor({ left: p.x, top: p.y }); // tocar en otro lado cierra la etiqueta (la detección de líneas la hace setCursor)
    };
    const alPasar = (e: PointerEvent) => { tol = e.pointerType === "mouse" ? TOL_REF_MOUSE : TOL_REF_TACTIL; };
    const alSalir = (e: PointerEvent) => { if (e.pointerType === "mouse" && hoverRef) { hoverRef = null; over.classList.remove("sobre-ref"); u.redraw(false, false); } };
    // Acerca o desplaza a la ventana [a, b] (de la barra de zoom, del arrastre sobre el gráfico o de la selección). Todo el período = sin zoom.
    const aplicar = (a: number, b: number) => {
      const completo = a <= x0 + 1e-9 && b >= x1 - 1e-9;
      ventana = completo ? [x0, x1] : [a, b];
      zoomRef.current = completo ? null : [a, b];
      setVent(zoomRef.current);
      u.setScale("x", { min: ventana[0], max: ventana[1] });
    };
    aplicarRef.current = aplicar;
    const alMover = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const p = pos(e);
      if (!sel) {
        const dx = Math.abs(p.x - down.x), dy = Math.abs(p.y - down.y);
        if (dx > 6 && (down.tipo === "mouse" || dx > dy)) { sel = true; try { over.setPointerCapture(e.pointerId); } catch { /* sin captura */ } } else return;
      }
      if (down.vent) { // con el gráfico acercado, arrastrar de costado lo desplaza
        const [a0, b0] = down.vent, span = b0 - a0, w = over.clientWidth || 1;
        const na = Math.max(x0, Math.min(x1 - span, a0 - ((p.x - down.x) / w) * span));
        aplicar(na, na + span); return;
      }
      const a = Math.max(0, Math.min(down.x, p.x)), b = Math.min(over.clientWidth, Math.max(down.x, p.x));
      selEl.style.display = "block"; selEl.style.left = a + "px"; selEl.style.width = b - a + "px";
    };
    const alSoltar = (e: PointerEvent, cancelado: boolean) => {
      if (!down || e.pointerId !== down.id) return;
      const d0 = down, era = sel; down = null; sel = false; selEl.style.display = "none";
      if (!era || cancelado || d0.vent) return;
      const p = pos(e), a = Math.max(0, Math.min(d0.x, p.x)), b = Math.min(over.clientWidth, Math.max(d0.x, p.x));
      const va = u.posToVal(a, "x"), vb = u.posToVal(b, "x");
      const dentro = xs.filter((v) => v >= va && v <= vb);
      if (dentro.length < 2) return; // menos de 2 períodos: se toma como toque
      aplicar(dentro[0], dentro[dentro.length - 1]);
    };
    const volver = () => { zoomRef.current = null; setVent(null); setRev((n) => n + 1); };
    if (zoomRef.current) { ventana = zoomRef.current; u.setScale("x", { min: ventana[0], max: ventana[1] }); setVent(zoomRef.current); } else setVent(null);
    reset.current = volver;
    const alSoltarOk = (e: PointerEvent) => alSoltar(e, false), alCancelar = (e: PointerEvent) => alSoltar(e, true);
    over.addEventListener("pointerdown", alPresionar); over.addEventListener("pointermove", alMover);
    over.addEventListener("pointerup", alSoltarOk); over.addEventListener("pointercancel", alCancelar);
    over.addEventListener("dblclick", volver);
    over.addEventListener("pointermove", alPasar); over.addEventListener("pointerleave", alSalir);
    const fuera = (e: PointerEvent) => { if (e.pointerType !== "mouse" && !el.contains(e.target as Node)) { ocultarTip(); if (hoverRef) { hoverRef = null; u.redraw(false, false); } } };
    document.addEventListener("pointerdown", fuera);
    el.setAttribute("role", "img"); el.setAttribute("aria-label", opts.label || "Gráfico de líneas");
    const ro = new ResizeObserver(() => {
      const w = Math.max(280, el.clientWidth), h = alto();
      if (Math.abs(w - u.width) > 1 || Math.abs(h - u.height) > 1) u.setSize({ width: w, height: h });
    });
    ro.observe(el);
    return () => { destruido = true; document.removeEventListener("pointerdown", fuera); ro.disconnect(); u.destroy(); el.innerHTML = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, series, opts, xs, tema, hay, estrecho, lleno, rev, kColPres]);

  const sil = series[0];
  const valoresSil = useMemo(() => (sil ? rows.map((r) => (okv(r[sil.key], sil.axis || 0) ? (r[sil.key] as number) : null)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, sil, opts.log, opts.log2]);
  if (!hay) return <p className="note">Sin datos para esta selección.</p>;
  const nDatos = rows.reduce((n, r) => n + (series.some((s) => okv(r[s.key], s.axis || 0)) ? 1 : 0), 0);
  const conBarra = !opts.sinBarra && !opts.xVals && !opts.xLabel && nDatos >= MIN_DATOS_BARRA && xs.length > 1;
  return (
    <div className={`graf-todo${lleno ? " lleno" : ""}`}>
      <div className="graf-caja">
        <div ref={cont} className={`grafico${lleno ? " lleno" : ""}`} />
      </div>
      {/* "Volver" va fuera del área del gráfico para no tapar el último punto ni su etiqueta */}
      {conBarra ? (
        <BarraZoom xs={xs} valores={valoresSil} ventana={vent}
          paso={(xs[xs.length - 1] - xs[0]) / (xs.length - 1)} fmt={mesTxt} onCambio={(a, b) => aplicarRef.current(a, b)}
          volver={{ visible: !!vent, onClick: () => reset.current() }} />
      ) : vent && (
        <div className="bz-fila bz-solo"><button type="button" className="btn volver" onClick={() => reset.current()}>Volver</button></div>
      )}
    </div>
  );
}
