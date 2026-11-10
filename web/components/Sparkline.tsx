import { ok } from "@/lib/formato";
import type { Vals } from "@/lib/motor";

/** Minigráfico de una serie desde el índice `desde` (o desde su primer dato, si es posterior).
 *  Un solo color: el acento del tema, o verde/rojo si se pasa la tendencia (`cls`). `color` (una variable CSS) es solo para el color de un presidente. */
export function Sparkline({ v, desde, cls, color }: { v: Vals; desde: number; cls?: "bueno" | "malo" | "neutro" | null; color?: string }) {
  const pts: [number, number][] = [];
  for (let i = Math.max(0, desde); i < v.length; i++) { const x = v[i]; if (ok(x)) pts.push([i, x]); }
  if (pts.length < 2) return null;
  const lo = Math.min(...pts.map((q) => q[1])), hi = Math.max(...pts.map((q) => q[1])), x0 = pts[0][0], x1 = pts[pts.length - 1][0];
  const d = pts.map(([i, y], k) => `${k ? "L" : "M"}${((i - x0) / ((x1 - x0) || 1) * 240).toFixed(1)},${(34 - (y - lo) / ((hi - lo) || 1) * 32).toFixed(1)}`).join("");
  return (
    <svg className={`mini${cls === "bueno" || cls === "malo" ? " mini-" + cls : ""}`} viewBox="0 0 240 36" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke={color ? `var(${color})` : "currentColor"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
