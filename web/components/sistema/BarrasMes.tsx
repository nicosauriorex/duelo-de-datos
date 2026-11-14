"use client";
// Columnas verticales, una por año, del mismo mes calendario (todos los octubres): la del año actual en el color de acento,
// con su valor escrito arriba; las demás en un tono apagado. SVG propio, medido al ancho del contenedor (a 360 px entran todas, más finas).
// Pasar el mouse o tocar una columna muestra su año y valor en la franja de arriba (no tapa el valor del actual);
// con teclado, el gráfico es enfocable y las flechas recorren los años. Para lectores de pantalla, además, una tabla oculta.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/** `ref`: el año de "el más bajo (o alto) desde…": se pinta en otro color y lleva su año y valor arriba. */
export type FilaBarraMes = { anio: string; valor: number; texto: string; actual: boolean; ref?: boolean };

const ALTO = 200, ARRIBA = 40, ABAJO = 24;   // franja del rótulo del año tocado (0–16), valor del actual (hasta 34) y años debajo del eje
const BASE_SEL = 13, MIN_ACTUAL = 32;

export function BarrasMes({ filas, etiqueta }: { filas: FilaBarraMes[]; etiqueta: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setAncho(Math.floor(el.clientWidth));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const N = filas.length;
  const vals = filas.map((f) => f.valor);
  const min = Math.min(0, ...vals);
  let max = Math.max(0, ...vals);
  if (max === min) max = min + 1;
  const alto = ALTO - ARRIBA - ABAJO;
  const y = (v: number) => ARRIBA + ((max - v) / (max - min)) * alto;
  const y0 = y(0);
  const banda = N ? ancho / N : 0;
  const bw = Math.max(1, banda >= 4 ? banda * 0.7 : banda - 0.5);
  const iAct = filas.findIndex((f) => f.actual);

  const elegirEn = (ev: PointerEvent<SVGSVGElement>) => {
    if (!banda) return;
    const r = ev.currentTarget.getBoundingClientRect();
    const i = Math.floor((ev.clientX - r.left) / banda);
    setSel(i >= 0 && i < N ? i : null);
  };
  const tecla = (ev: KeyboardEvent<SVGSVGElement>) => {
    const k = ev.key;
    if (k !== "ArrowLeft" && k !== "ArrowRight" && k !== "Home" && k !== "End" && k !== "Escape") return;
    ev.preventDefault();
    if (k === "Escape") { setSel(null); return; }
    setSel((s) => {
      const desde = s ?? (iAct >= 0 ? iAct : N - 1);
      if (k === "Home") return 0;
      if (k === "End") return N - 1;
      return Math.max(0, Math.min(N - 1, desde + (k === "ArrowLeft" ? -1 : 1)));
    });
  };

  const act = iAct >= 0 ? filas[iAct] : null;
  const xAct = iAct >= 0 ? iAct * banda + (banda + bw) / 2 : 0;
  const yAct = act ? Math.max(MIN_ACTUAL, Math.min(y(act.valor), y0) - 6) : 0;
  const filaSel = sel != null ? filas[sel] : null;
  // año de referencia: su año y valor arriba de su columna (se oculta mientras se toca otra columna, que usa la misma franja)
  const iRef = filas.findIndex((f) => f.ref);
  const xRef = iRef >= 0 ? iRef * banda + banda / 2 : 0;
  const anclaRef = xRef < 48 ? "start" : xRef > ancho - 48 ? "end" : "middle";
  // Arriba de todas las columnas que quedan debajo del rótulo (no tapa ninguna); si choca con el valor del actual o no entra, a la franja de arriba.
  const yRef = (() => {
    if (iRef < 0) return 0;
    const w = (filas[iRef].anio.length + 2 + filas[iRef].texto.length) * 7 + 4;
    const x0 = anclaRef === "start" ? xRef : anclaRef === "end" ? xRef - w : xRef - w / 2, x1 = x0 + w;
    let tope = Infinity;
    filas.forEach((f, i) => { const a = i * banda, b = a + banda; if (b > x0 && a < x1) tope = Math.min(tope, y(f.valor), y0); });
    const yy = tope - 6;
    const chocaActual = act && x1 > xAct - act.texto.length * 8 - 4 && yy > yAct - 18;
    return yy < MIN_ACTUAL || chocaActual ? BASE_SEL : yy;
  })();
  // rótulo del año tocado: centrado sobre su columna, sin salirse por los costados
  const xSel = sel != null ? sel * banda + banda / 2 : 0;
  const anclaSel = xSel < 48 ? "start" : xSel > ancho - 48 ? "end" : "middle";

  return (
    <div className="bmes" ref={caja}>
      {ancho > 0 && N > 0 ? (
        <svg className="bmes-svg" width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} role="img" aria-label={etiqueta} tabIndex={0}
          onPointerMove={elegirEn} onPointerDown={elegirEn} onPointerLeave={(ev) => { if (ev.pointerType === "mouse") setSel(null); }}
          onKeyDown={tecla} onBlur={() => setSel(null)}>
          {filas.map((f, i) => {
            const top = Math.min(y(f.valor), y0), h = Math.max(1, Math.abs(y(f.valor) - y0));
            return <rect key={f.anio + i} className={`bmes-col${f.actual ? " bmes-actual" : ""}${f.ref ? " bmes-ref" : ""}${i === sel ? " bmes-sel" : ""}`}
              x={i * banda + (banda - bw) / 2} y={top} width={bw} height={h} />;
          })}
          <line className="bmes-cero" x1={0} x2={ancho} y1={y0} y2={y0} />
          {act && <text className="bmes-valor" x={Math.min(ancho, xAct)} y={yAct} textAnchor="end">{act.texto}</text>}
          {iRef >= 0 && (sel == null || filaSel?.actual || sel === iRef) && (
            <text className="bmes-ref-txt" x={xRef} y={yRef} textAnchor={anclaRef}>{filas[iRef].anio}: {filas[iRef].texto}</text>
          )}
          {filaSel && !filaSel.actual && sel !== iRef && (
            <text className="bmes-rotulo" x={xSel} y={BASE_SEL} textAnchor={anclaSel}>{filaSel.anio}: {filaSel.texto}</text>
          )}
          <text className="bmes-anio" x={0} y={ALTO - 6} textAnchor="start">{filas[0].anio}</text>
          <text className="bmes-anio" x={ancho} y={ALTO - 6} textAnchor="end">{filas[N - 1].anio}</text>
        </svg>
      ) : <div style={{ height: ALTO }} aria-hidden="true" />}
      <p className="sr-solo" aria-live="polite">{filaSel ? `${filaSel.anio}: ${filaSel.texto}` : ""}</p>
      <div className="sr-solo"><table>
        <caption>{etiqueta}</caption>
        <thead><tr><th scope="col">Año</th><th scope="col">Valor</th></tr></thead>
        <tbody>{filas.map((f, i) => <tr key={f.anio + i}><th scope="row">{f.anio}</th><td>{f.texto}{f.actual ? " (el último dato)" : f.ref ? " (año de referencia)" : ""}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
