"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { FilaChips } from "./FilaChips";

export type CeldaMandato = { texto: string; valor?: number | null; tono?: "bueno" | "malo" | null };
export type FilaMandato = { id: string; nombre: string; periodo: string; color: string; celdas: Record<string, CeldaMandato> };
export type ColumnaMandato = { clave: string; titulo: string; principal?: boolean };
export type TablaMandatosProps = {
  filas: FilaMandato[]; columnas: ColumnaMandato[]; visibles: string[]; extras?: string[]; resaltar?: string; etiqueta: string;
};

const tonoVar = (t?: "bueno" | "malo" | null) => (t === "bueno" ? "var(--bueno)" : t === "malo" ? "var(--malo)" : "var(--text-primary)");

export function TablaMandatos({ filas, columnas, visibles, extras = [], resaltar, etiqueta }: TablaMandatosProps) {
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [orden, setOrden] = useState<{ clave: string; dir: 1 | -1 } | null>(null);
  const principal = columnas.find((c) => c.principal) ?? columnas[0];
  const mostradas = useMemo(
    () => columnas.filter((c) => c.clave === principal?.clave || visibles.includes(c.clave) || elegidas.has(c.clave)),
    [columnas, visibles, elegidas, principal],
  );
  const otras = mostradas.filter((c) => c.clave !== principal?.clave);
  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const k = orden.clave;
    return [...filas].sort((a, b) => {
      const x = a.celdas[k]?.valor, y = b.celdas[k]?.valor;
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x - y) * orden.dir;
    });
  }, [filas, orden]);
  const tope = Math.max(0, ...filas.map((f) => Math.abs((principal && f.celdas[principal.clave]?.valor) || 0)));
  const alternar = (clave: string) => setOrden((o) => (o && o.clave === clave ? (o.dir === -1 ? { clave, dir: 1 } : null) : { clave, dir: -1 }));
  const opcionesExtras: [string, string][] = extras.flatMap((k) => { const c = columnas.find((x) => x.clave === k); return c ? [[k, c.titulo] as [string, string]] : []; });
  const tocar = (k: string) => setElegidas((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div className="tmand">
      {opcionesExtras.length > 0 && (
        <div className="tmand-mas">
          <span className="tmand-mas-rot" aria-hidden="true">Sumar columnas</span>
          <FilaChips opciones={opcionesExtras} valor={elegidas} onElegir={tocar} etiqueta="Más columnas" />
        </div>
      )}
      <ul className="tmand-lista" aria-label={etiqueta}>
        {ordenadas.map((f) => {
          const p = principal ? f.celdas[principal.clave] : undefined;
          return (
            <li key={f.id} className={`tmand-fila${f.id === resaltar ? " tmand-res" : ""}`} style={{ "--pc": `var(${f.color})` } as CSSProperties}>
              <span className="tmand-raya" aria-hidden="true" />
              <span className="tmand-quien">
                <span className="tmand-nombre">{f.nombre}</span>
                <span className="tmand-periodo">{f.periodo}</span>
              </span>
              <span className="tmand-prin" style={{ color: tonoVar(p?.tono) }}>
                {p ? p.texto : "—"}
                {principal && <span className="tmand-prin-t">{principal.titulo}</span>}
              </span>
              {otras.length > 0 && (
                <span className="tmand-resto">
                  {otras.map((c) => `${c.titulo} ${f.celdas[c.clave]?.texto ?? "—"}`).join(" · ")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="tmand-desliza">
      <table className="tmand-tabla">
        <caption className="tmand-cap">{etiqueta}</caption>
        <thead>
          <tr>
            <th scope="col" className="tmand-th-nom">Presidente</th>
            {mostradas.map((c) => {
              const act = orden?.clave === c.clave;
              return (
                <th key={c.clave} scope="col" className={c.clave === principal?.clave ? "tmand-th-prin" : undefined}
                  aria-sort={act ? (orden!.dir === -1 ? "descending" : "ascending") : "none"}>
                  <button type="button" className="tmand-orden" onClick={() => alternar(c.clave)}>
                    {c.titulo}
                    <svg viewBox="0 0 10 14" width="8" height="12" aria-hidden="true" className="tmand-flecha" data-act={act ? (orden!.dir === -1 ? "baja" : "sube") : undefined}>
                      <path d="M5 1 L9 6 H1 Z M5 13 L1 8 H9 Z" fill="currentColor" />
                    </svg>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f) => (
            <tr key={f.id} className={f.id === resaltar ? "tmand-res" : undefined} style={{ "--pc": `var(${f.color})` } as CSSProperties}>
              <th scope="row" className="tmand-th-fila">
                <span className="tmand-raya" aria-hidden="true" />
                <span className="tmand-quien">
                  <span className="tmand-nombre">{f.nombre}</span>
                  <span className="tmand-periodo">{f.periodo}</span>
                </span>
              </th>
              {mostradas.map((c) => {
                const ce = f.celdas[c.clave];
                if (c.clave !== principal?.clave) return <td key={c.clave} className="tmand-celda">{ce?.texto ?? "—"}</td>;
                const v = ce?.valor;
                const frac = v == null || !tope ? 0 : Math.min(1, Math.abs(v) / tope) * 50;
                return (
                  <td key={c.clave} className="tmand-celda tmand-celda-prin">
                    {v != null && <span className={`tmand-barra${v < 0 ? " tmand-neg" : ""}`} style={{ ["--f" as string]: frac / 50, background: tonoVar(ce?.tono ?? null) === "var(--text-primary)" ? "var(--acento)" : tonoVar(ce?.tono) }} aria-hidden="true" />}
                    <span className="tmand-num" style={{ color: tonoVar(ce?.tono) }}>{ce?.texto ?? "—"}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
