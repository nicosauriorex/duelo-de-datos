"use client";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useAparecer } from "./useAparecer";

export type FilaBarra = {
  id: string; nombre: string; valor: number | null; texto: string; sub?: string;
  href?: string; onClick?: () => void; tono?: "bueno" | "malo" | null; color?: string;
};
export type ListaBarrasProps = { filas: FilaBarra[]; divergente?: boolean; max?: number; resaltar?: string; etiqueta: string };

function colorDe(f: FilaBarra): string {
  if (f.color) return `var(${f.color})`;
  if (f.tono === "bueno") return "var(--bueno)";
  if (f.tono === "malo") return "var(--malo)";
  return "var(--acento)";
}

/** Lista de filas con una barra por valor. Divergente: el cero va en el centro. */
export function ListaBarras({ filas, divergente, max, resaltar, etiqueta }: ListaBarrasProps) {
  const [ref, aparece] = useAparecer<HTMLOListElement>();
  const tope = max ?? Math.max(0, ...filas.map((f) => (f.valor == null ? 0 : Math.abs(f.valor))));
  return (
    <ol ref={ref} className={`lbar${divergente ? " lbar-div" : ""}`} aria-label={etiqueta} data-aparece={aparece}>
      {filas.map((f, i) => {
        const v = f.valor;
        const frac = v == null || !tope ? 0 : Math.min(1, Math.abs(v) / tope);
        const neg = v != null && v < 0;
        const pct = divergente ? frac * 50 : frac * 100;
        const cuerpo: ReactNode = (
          <>
            <span className="lbar-cab">
              <span className="lbar-nombre">{f.nombre}</span>
              <span className="lbar-valor">{f.texto}</span>
            </span>
            {f.sub && <span className="lbar-sub">{f.sub}</span>}
            <span className="lbar-riel" aria-hidden="true">
              {v != null && <span className={`lbar-barra${neg ? " lbar-neg" : ""}`} style={{ width: `${pct}%` }} />}
            </span>
          </>
        );
        const cls = `lbar-fila${f.id === resaltar ? " lbar-res" : ""}`;
        const estilo = { "--i": i, "--c": colorDe(f) } as CSSProperties;
        return (
          <li key={f.id} className="lbar-item" style={estilo}>
            {f.href ? <Link href={f.href} prefetch={false} className={`${cls} lbar-toca`}>{cuerpo}</Link>
              : f.onClick ? <button type="button" className={`${cls} lbar-toca`} onClick={f.onClick}>{cuerpo}</button>
              : <div className={cls}>{cuerpo}</div>}
          </li>
        );
      })}
    </ol>
  );
}
