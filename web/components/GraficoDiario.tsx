"use client";
// Gráfico propio de los datos diarios del Banco Central (SVG simple). `Grafico` (uPlot) está pensado para series mensuales: su eje X son
// meses y no admite días, así que para esta página se dibuja uno aparte: línea (o barras en las compras de dólares), eje con marcas
// redondas, y el valor del punto elegido en un renglón arriba (nada tapa el gráfico). Se elige un punto tocando, arrastrando o con las flechas.
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtEjeY, marcasX, marcasY, masCercano, puntoTxt, recorte, reducir, tipoDiario, type ClaveDiario, type PeriodoDiario, type SerieDiaria } from "@/lib/diario";

const ALTO = 280, M = { t: 10, r: 12, b: 26 };

export function GraficoDiario({ clave, serie, periodo, etiqueta }: { clave: ClaveDiario; serie: SerieDiaria; periodo: PeriodoDiario; etiqueta: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<number | null>(null);    // índice en el tramo completo; null = el último dato
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setSel(null), [clave, periodo]);

  const tramo = useMemo(() => recorte(clave, serie, periodo), [clave, serie, periodo]);
  const barras = tipoDiario(clave) === "flujo";
  const g = useMemo(() => {
    const t = ancho > 0 ? reducir(tramo, Math.max(60, Math.round(ancho))) : tramo;
    let lo = Math.min(...tramo.v), hi = Math.max(...tramo.v);
    if (barras) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    const pad = (hi - lo) * 0.05 || Math.abs(hi) * 0.05 || 1;
    const y = marcasY(barras ? lo : lo - pad, hi + pad * 0.5, 4);
    const a = y.marcas[0], b = y.marcas[y.marcas.length - 1];
    const etqs = y.marcas.map((m) => fmtEjeY(m, y.paso));
    return { t, y, a, b, etqs, margenIzq: 10 + Math.max(...etqs.map((s) => s.length)) * 6.6 };
  }, [tramo, ancho, barras]);

  if (ancho <= 0) return <div ref={caja} className="parte-graf" style={{ height: ALTO }} />;
  const d0 = tramo.dias[0], d1 = tramo.dias[tramo.dias.length - 1];
  const x0 = g.margenIzq, x1 = ancho - M.r, y0 = M.t, y1 = ALTO - M.b;
  const X = (d: number) => x0 + ((d - d0) / (d1 - d0 || 1)) * (x1 - x0);
  const Y = (v: number) => y1 - ((v - g.a) / (g.b - g.a || 1)) * (y1 - y0);
  const i = Math.max(0, Math.min(tramo.v.length - 1, sel ?? tramo.v.length - 1)), pto = puntoTxt(clave, tramo.dias[i], tramo.v[i]);
  const trazo = g.t.dias.map((d, k) => `${k ? "L" : "M"}${X(d).toFixed(1)},${Y(g.t.v[k]).toFixed(1)}`).join("");
  const ancBarra = Math.max(1, Math.min(6, ((x1 - x0) / Math.max(1, g.t.v.length)) * 0.7));

  const elegir = (ev: React.PointerEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (ev.clientX - r.left - x0) / (x1 - x0)));
    setSel(masCercano(tramo.dias, d0 + f * (d1 - d0)));
  };
  const flecha = (ev: React.KeyboardEvent) => {
    const paso = ev.key === "ArrowLeft" ? -1 : ev.key === "ArrowRight" ? 1 : ev.key === "Home" ? -1e9 : ev.key === "End" ? 1e9 : 0;
    if (!paso) return;
    ev.preventDefault();
    setSel(Math.max(0, Math.min(tramo.v.length - 1, i + paso)));
  };

  return (
    <div ref={caja} className="parte-graf">
      <p className="parte-graf-dato" aria-live="polite"><b>{pto.valor}</b><span>{pto.fecha}</span></p>
      <svg width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} role="img" tabIndex={0} aria-label={`${etiqueta}: gráfico diario. Flechas para moverse entre los datos.`}
        className="parte-svg" onPointerDown={elegir} onPointerMove={(ev) => { if (ev.pointerType === "mouse" || ev.buttons) elegir(ev); }} onKeyDown={flecha}>
        {g.y.marcas.map((m, k) => (
          <g key={m}>
            <line className="parte-reja" x1={x0} x2={x1} y1={Y(m)} y2={Y(m)} />
            <text x={x0 - 6} y={Y(m) + 4} textAnchor="end">{g.etqs[k]}</text>
          </g>
        ))}
        {barras && <line className="parte-cero" x1={x0} x2={x1} y1={Y(0)} y2={Y(0)} />}
        {marcasX(d0, d1, ancho < 420 ? 3 : 5).map((m, k, arr) => (
          <text key={m.dia} x={X(m.dia)} y={ALTO - 7} textAnchor={k === 0 ? "start" : k === arr.length - 1 ? "end" : "middle"}>{m.txt}</text>
        ))}
        {barras
          ? g.t.dias.map((d, k) => <line key={d} className="parte-barra" x1={X(d)} x2={X(d)} y1={Y(0)} y2={Y(g.t.v[k])} strokeWidth={ancBarra} />)
          : <path className="parte-linea" d={trazo} />}
        <line className="parte-sel" x1={X(tramo.dias[i])} x2={X(tramo.dias[i])} y1={y0} y2={y1} />
        <circle className="parte-punto" cx={X(tramo.dias[i])} cy={Y(tramo.v[i])} r={4.5} />
      </svg>
    </div>
  );
}
