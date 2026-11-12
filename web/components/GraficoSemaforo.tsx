"use client";
// Gráfico de una fila del semáforo: los últimos 5 años de un indicador mensual, con la serie original y, si es oficial, la serie sin estacionalidad.
// SVG simple (el eje X son meses, como en `GraficoDiario`). El valor del mes elegido va en un renglón arriba: nada tapa el gráfico.
// Se elige un mes tocando, arrastrando o con las flechas.
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtEjeY, marcasY } from "@/lib/diario";
import { fmtNum } from "@/lib/formato";
import { serieGrafico, txtMes, type Indicador } from "@/lib/semaforo";

const ALTO = 240, M = { t: 10, r: 12, b: 26 };

export function GraficoSemaforo({ ind }: { ind: Indicador }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<number | null>(null);    // índice en `puntos`; null = el último mes
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
  useEffect(() => setSel(null), [ind.clave]);

  const { puntos, conSa } = useMemo(() => serieGrafico(ind), [ind]);
  const g = useMemo(() => {
    const vals = puntos.flatMap((p) => [p.orig, p.sa]).filter((v): v is number => v != null);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.05 || 1;
    const y = marcasY(lo - pad, hi + pad, 4), etqs = y.marcas.map((m) => fmtEjeY(m, y.paso));
    return { y, a: y.marcas[0], b: y.marcas[y.marcas.length - 1], etqs, margenIzq: 10 + Math.max(...etqs.map((s) => s.length)) * 6.6 };
  }, [puntos]);

  if (ancho <= 0 || puntos.length < 2) return <div ref={caja} className="parte-graf" style={{ height: ALTO }} />;
  const n = puntos.length, x0 = g.margenIzq, x1 = ancho - M.r, y0 = M.t, y1 = ALTO - M.b;
  const X = (k: number) => x0 + (k / (n - 1)) * (x1 - x0);
  const Y = (v: number) => y1 - ((v - g.a) / (g.b - g.a || 1)) * (y1 - y0);
  const trazo = (pick: (k: number) => number | null) => {
    let d = "", abierto = false;
    for (let k = 0; k < n; k++) {
      const v = pick(k);
      if (v == null) { abierto = false; continue; }
      d += `${abierto ? "L" : "M"}${X(k).toFixed(1)},${Y(v).toFixed(1)}`; abierto = true;
    }
    return d;
  };
  const i = Math.max(0, Math.min(n - 1, sel ?? n - 1)), p = puntos[i];
  const nMarcas = ancho < 420 ? 3 : 5;
  const marcas = Array.from({ length: nMarcas }, (_, k) => Math.round((k * (n - 1)) / (nMarcas - 1)));

  const elegir = (ev: React.PointerEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    setSel(Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left - x0) / (x1 - x0))) * (n - 1)));
  };
  const flecha = (ev: React.KeyboardEvent) => {
    const paso = ev.key === "ArrowLeft" ? -1 : ev.key === "ArrowRight" ? 1 : ev.key === "Home" ? -1e9 : ev.key === "End" ? 1e9 : 0;
    if (!paso) return;
    ev.preventDefault();
    setSel(Math.max(0, Math.min(n - 1, i + paso)));
  };

  return (
    <div ref={caja} className="parte-graf">
      <p className="parte-graf-dato" aria-live="polite">
        <b>{txtMes(p.mes)}</b>
        <span>{p.orig != null ? `Original: ${fmtNum(p.orig)}` : "Sin dato"}</span>
        {conSa && p.sa != null && <span>Sin estacionalidad: {fmtNum(p.sa)}</span>}
      </p>
      <svg width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} role="img" tabIndex={0} aria-label={`${ind.nombre}: gráfico mensual de los últimos 5 años. Flechas para moverse entre los meses.`}
        className="parte-svg" onPointerDown={elegir} onPointerMove={(ev) => { if (ev.pointerType === "mouse" || ev.buttons) elegir(ev); }} onKeyDown={flecha}>
        {g.y.marcas.map((m, k) => (
          <g key={m}>
            <line className="parte-reja" x1={x0} x2={x1} y1={Y(m)} y2={Y(m)} />
            <text x={x0 - 6} y={Y(m) + 4} textAnchor="end">{g.etqs[k]}</text>
          </g>
        ))}
        {marcas.map((k, j, arr) => (
          <text key={k} x={X(k)} y={ALTO - 7} textAnchor={j === 0 ? "start" : j === arr.length - 1 ? "end" : "middle"}>{txtMes(puntos[k].mes)}</text>
        ))}
        <path className="parte-linea" d={trazo((k) => puntos[k].orig)} />
        {conSa && <path className="sem-linea-sa" d={trazo((k) => puntos[k].sa)} />}
        <line className="parte-sel" x1={X(i)} x2={X(i)} y1={y0} y2={y1} />
        {p.orig != null && <circle className="parte-punto" cx={X(i)} cy={Y(p.orig)} r={4.5} />}
      </svg>
      <ul className="sem-ref">
        <li><i className="sem-ref-orig" aria-hidden="true" />Serie original</li>
        {conSa && <li><i className="sem-ref-sa" aria-hidden="true" />Sin estacionalidad (oficial)</li>}
      </ul>
    </div>
  );
}
