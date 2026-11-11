"use client";
// Recuadro "Contexto del mandato": resumen corto para un presidente (Por presidente y detalle de Ranking).
import Link from "next/link";
import { useContexto } from "../useContexto";
import { usePreciosMundo } from "../usePreciosMundo";
import { useCapacidad } from "../useCapacidad";
import { lineaContexto, mandatos } from "@/lib/capacidad";
import { nf0, nf1, ok } from "@/lib/formato";
import { GRUPOS_CMP, resumenMandato, textoAnios } from "@/lib/contexto";
import { extremosMandato } from "@/lib/preciosMundo";
import { fmtMes } from "@/lib/formato";
import type { Motor } from "@/lib/motor";
import type { Pres } from "@/lib/estadisticas";

const signo = (v: number) => { const r = Math.round(v * 10) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + nf1.format(Math.abs(r)); };

/** Si los datos de contexto no se pueden bajar, no se muestra nada (el resto de la página sigue andando). */
export function ContextoMandato({ m, pres }: { m: Motor; pres: Pres }) {
  const { datos } = useContexto();
  const { datos: pm } = usePreciosMundo();
  const { datos: cap } = useCapacidad();
  if (!datos) return null;
  const ext = pm ? extremosMandato(m, pm, pres) : null;   // si no hay datos de precios o el mandato es anterior a 2017, no se muestra la línea
  const mand = mandatos(m.F[m.F.length - 1]).find((x) => x.id === pres.id);
  const congreso = cap && mand ? lineaContexto(cap, pres.id, mand) : null;   // sin datos del presidente, no se muestra la línea
  const grupo = GRUPOS_CMP[0];
  const r = resumenMandato(m, datos, pres, grupo[2]);
  const s = r.sorpresa;
  return (
    <details className="callout contexto-plegado">
      <summary><b>Contexto del mandato</b>{" "}
        <span className="resumen">{pres.n}{ok(r.crecArg.v) && ok(r.crecGrp.v) ? `: crece ${nf1.format(r.crecArg.v)} % por año contra ${nf1.format(r.crecGrp.v)} % ${grupo[1].toLowerCase() === "mundo" ? "del mundo" : "de " + grupo[1]}` : ""}</span></summary>
      <span style={{ color: "var(--text-muted)" }}>({pres.n}, {textoAnios(r.anios)}; comparado con {grupo[1].toLowerCase() === "mundo" ? "el mundo" : grupo[1]})</span>
      {!r.anios.length ? <p className="note">Sin años completos en el mandato.</p> : (
        <ul style={{ margin: "6px 0", paddingLeft: 18 }}>
          <li>Crecimiento promedio: Argentina {ok(r.crecArg.v) ? `${nf1.format(r.crecArg.v)} %` : "—"}; {grupo[1]} {ok(r.crecGrp.v) ? `${nf1.format(r.crecGrp.v)} %` : "—"}.</li>
          {ok(s.sArg) && ok(s.sGrp) && ok(s.dif) &&
            <li>Contra lo que proyectaba el FMI en abril: la Argentina {signo(s.sArg)} puntos por año; {grupo[1]}, {signo(s.sGrp)}. Diferencia: {signo(s.dif)} puntos.</li>}
          {ext && <li>Rubro más caro contra el mundo (dólar oficial, estimado): {ext.caro.n} ({nf0.format(ext.caro.nivel)}, {fmtMes(ext.caro.fecha)}); más barato: {ext.barato.n} ({nf0.format(ext.barato.nivel)}, {fmtMes(ext.barato.fecha)}). Mundo = 100. <Link href="/contexto/#precios-mundo" prefetch={false}>Ver precios en el mundo</Link></li>}
          {congreso && <li>{congreso} <Link href={`/congreso/?cgp=${pres.id}`} prefetch={false}>Ver gobierno y Congreso</Link></li>}
          {r.hayViento && <li>Viento externo: {r.favor} a favor, {r.neutro} neutros y {r.contra} en contra.</li>}
        </ul>
      )}
      <Link href={`/contexto/?cpr=${pres.id}`} prefetch={false}>Ver el contexto completo</Link>
    </details>
  );
}
