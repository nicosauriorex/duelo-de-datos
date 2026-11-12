"use client";
// Ruta /dato/?v=<variable>: el nombre público de la variable y su ficha (Histórico, Por presidente y Meses de mandato).
// Es el link para compartir un dato y adonde lleva "Ver" en "Preguntale a los datos". Parámetros: `v` (variable, como en Histórico),
// `pd` (presidente que se resalta), `pvista` (Tabla o Velas, como en Por presidente) y el inicio de mandato (`t0`, `t0p`).
// En las páginas fijas (/dato/<slug>/, ver lib/datos-fijos.ts) la variable viene en `fija` y `v` no se lee; los demás parámetros, igual.
import { useMemo } from "react";
import type { Expr } from "@/lib/motor";
import { useSeccion } from "../useSeccion";
import { Cargando } from "../ui";
import { FichaDato } from "../FichaDato";
import { useBase } from "./comunes";
import { PRES_DEF } from "@/lib/estadisticas";
import { EXPR_DEFECTO } from "@/lib/ficha";
import { tituloVariable } from "@/lib/imagen-datos";
import { decExpr, unoDe, useParams } from "@/lib/url";

export function Dato({ fija }: { fija?: Expr } = {}) {
  const [p, set, montado] = useParams();
  const { listo, metas, motor: m, errorGeneral } = useSeccion([]);
  const info = useBase(p, set, montado);
  // Parámetro inválido o ausente: la inflación mensual (si no estuviera en el catálogo, la primera serie).
  const e = useMemo(() => {
    if (!listo || !montado || !metas.length) return null;
    const existe = (id: string) => metas.some((s) => s.id === id);
    if (fija) return fija;
    return decExpr(p.get("v"), existe) ?? (existe(EXPR_DEFECTO.id) ? EXPR_DEFECTO : { ...EXPR_DEFECTO, id: metas[0].id, med: undefined });
  }, [listo, montado, metas, p, fija]);
  const pd = unoDe(p.get("pd"), PRES_DEF.map((x) => x.id), "") || null;

  if (errorGeneral) return <p className="error" role="alert">{errorGeneral}</p>;
  if (!e || !m) return <Cargando />;
  // Nombre público con la medida ("Inflación (variación mensual)"); mientras llegan los datos de la serie, el nombre solo.
  const titulo = m.SER[e.id] && (!e.rel || m.SER[e.rel]) ? tituloVariable(m, e, m.calc(e)) : metas.find((s) => s.id === e.id)?.n ?? "";
  return (
    <section>
      <h1 className="titulo-tema">{titulo}</h1>
      <FichaDato e={e} info={info} p={p} set={set} pd={pd} nivel={2} />
    </section>
  );
}
