"use client";
// Barra de rango bajo el gráfico: dos manijas acercan o alejan, el tramo del medio desplaza la ventana.
// Es solo de vista (no toca la URL). Las manijas miden 44 px de alto y se mueven con las flechas.
import { useMemo, useRef } from "react";

type Ventana = [number, number];

/** Silueta de la serie (hasta ~240 puntos, tomando el máximo de cada tramo para no perder picos), normalizada de 0 a 1. */
function silueta(xs: number[], valores: (number | null)[]): string {
  const pts: [number, number][] = [];
  xs.forEach((x, i) => { const v = valores[i]; if (v != null && Number.isFinite(v)) pts.push([x, v]); });
  if (pts.length < 2) return "";
  const paso = Math.max(1, Math.ceil(pts.length / 240)), red: [number, number][] = [];
  for (let i = 0; i < pts.length; i += paso) {
    const tramo = pts.slice(i, i + paso);
    red.push([tramo[0][0], tramo.reduce((a, p) => Math.max(a, p[1]), -Infinity)]);
  }
  const x0 = xs[0], dx = Math.max(1e-9, xs[xs.length - 1] - x0);
  const lo = Math.min(...red.map((p) => p[1])), hi = Math.max(...red.map((p) => p[1])), dy = hi - lo || 1;
  return red.map(([x, v]) => `${(((x - x0) / dx) * 100).toFixed(2)},${(100 - ((v - lo) / dy) * 100).toFixed(2)}`).join(" ");
}

export function BarraZoom({ xs, valores, ventana, onCambio, paso, fmt, volver }: {
  xs: number[]; valores: (number | null)[]; ventana: Ventana | null; onCambio: (a: number, b: number) => void; paso: number; fmt: (v: number) => string;
  /** "Volver" al período completo: junto a la barra, nunca encima del gráfico. Con `visible` falso conserva su lugar (la barra no cambia de ancho). */
  volver?: { visible: boolean; onClick: () => void };
}) {
  const x0 = xs[0], x1 = xs[xs.length - 1], total = Math.max(1e-9, x1 - x0);
  const [a, b] = ventana ?? [x0, x1];
  const minSpan = Math.min(total, Math.max(paso * 3, 1e-6));
  const pista = useRef<HTMLDivElement>(null);
  const arr = useRef<{ modo: "a" | "b" | "mover"; x: number; a: number; b: number; id: number } | null>(null);
  const puntos = useMemo(() => silueta(xs, valores), [xs, valores]);
  const pct = (v: number) => `${((v - x0) / total) * 100}%`;
  const acotar = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const calcular = (modo: "a" | "b" | "mover", a0: number, b0: number, dx: number): Ventana => {
    if (modo === "a") return [acotar(a0 + dx, x0, b0 - minSpan), b0];
    if (modo === "b") return [a0, acotar(b0 + dx, a0 + minSpan, x1)];
    const span = b0 - a0, na = acotar(a0 + dx, x0, x1 - span);
    return [na, na + span];
  };
  const empezar = (modo: "a" | "b" | "mover") => (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
    arr.current = { modo, x: e.clientX, a, b, id: e.pointerId };
  };
  const mover = (e: React.PointerEvent<HTMLElement>) => {
    const d = arr.current;
    if (!d || d.id !== e.pointerId) return;
    const w = pista.current?.getBoundingClientRect().width || 1;
    const [na, nb] = calcular(d.modo, d.a, d.b, ((e.clientX - d.x) / w) * total);
    onCambio(na, nb);
  };
  const soltar = (e: React.PointerEvent<HTMLElement>) => { if (arr.current?.id === e.pointerId) arr.current = null; };
  const tecla = (modo: "a" | "b" | "mover") => (e: React.KeyboardEvent<HTMLElement>) => {
    const dir = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    const [na, nb] = calcular(modo, a, b, dir * paso * (e.shiftKey ? 12 : 1));
    onCambio(na, nb);
  };
  const manija = (modo: "a" | "b", v: number, min: number, max: number, nombre: string) => (
    <button type="button" className={`bz-manija bz-${modo}`} style={{ left: pct(v) }} role="slider" aria-label={nombre} aria-orientation="horizontal"
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={v} aria-valuetext={fmt(v)}
      onPointerDown={empezar(modo)} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onKeyDown={tecla(modo)}><span /></button>
  );
  const barra = (
    <div className="bz" role="group" aria-label="Zoom del gráfico: período visible">
      <div className="bz-pista" ref={pista}>
        {puntos && <svg className="bz-silueta" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={puntos} vectorEffect="non-scaling-stroke" /></svg>}
        <div className="bz-fuera" style={{ left: 0, width: pct(a) }} />
        <div className="bz-fuera" style={{ left: pct(b), right: 0 }} />
        <div className="bz-sel" style={{ left: pct(a), width: `${((b - a) / total) * 100}%` }} role="slider" tabIndex={0} aria-label="Desplazar el período visible"
          aria-valuemin={x0} aria-valuemax={x1} aria-valuenow={a} aria-valuetext={`${fmt(a)} a ${fmt(b)}`}
          onPointerDown={empezar("mover")} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onKeyDown={tecla("mover")} />
        {manija("a", a, x0, b, "Inicio del período visible")}
        {manija("b", b, a, x1, "Fin del período visible")}
      </div>
    </div>
  );
  if (!volver) return barra;
  return (
    <div className="bz-fila">
      {barra}
      <button type="button" className="btn volver" onClick={volver.onClick} style={volver.visible ? undefined : { visibility: "hidden" }} tabIndex={volver.visible ? 0 : -1} aria-hidden={!volver.visible}>Volver</button>
    </div>
  );
}
