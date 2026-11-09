"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSeccion } from "../useSeccion";
import { Cargando, Selector } from "../ui";
import { LineaInicio, useBase } from "./comunes";
import { ok } from "@/lib/formato";
import { crearPres, type BaseCfg, type Pres } from "@/lib/estadisticas";
import { generarCuriosidades, mezclarCurios, TIPOS_CURIO, type CurioGen, type TipoCurio } from "@/lib/curiosidades";
import { hrefHistorico } from "@/lib/temas";
import { crearIndicadores } from "@/lib/catalogo";
import type { Motor } from "@/lib/motor";
import { unoDe, useParams } from "@/lib/url";

/** Minigráfico de la serie completa con el mandato resaltado. */
function MiniMandato({ v, p, color }: { v: (number | null)[]; p: Pres; color: string }) {
  const pts: [number, number][] = [];
  v.forEach((x, i) => { if (ok(x)) pts.push([i, x]); });
  if (pts.length < 2) return null;
  const ys = pts.map((q) => q[1]), lo = Math.min(...ys), hi = Math.max(...ys), x0 = pts[0][0], x1 = pts[pts.length - 1][0];
  const X = (i: number) => ((i - x0) / ((x1 - x0) || 1) * 240).toFixed(1), Y = (y: number) => (34 - (y - lo) / ((hi - lo) || 1) * 32).toFixed(1);
  const trazo = (a: [number, number][]) => a.map(([i, y], k) => `${k ? "L" : "M"}${X(i)},${Y(y)}`).join("");
  const dentro = pts.filter(([i]) => i >= p.i0 && i <= p.i1);
  return (
    <svg viewBox="0 0 240 36" preserveAspectRatio="none" aria-hidden="true">
      <path d={trazo(pts)} fill="none" stroke="var(--text-muted)" strokeOpacity=".5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {dentro.length > 1 && <path d={trazo(dentro)} fill="none" stroke={`var(${color})`} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

function CuriosGeneradas({ m, PRES, I, b, p, set }: {
  m: Motor; PRES: Pres[]; I: ReturnType<typeof crearIndicadores>; b: BaseCfg; p: URLSearchParams; set: (c: Record<string, string | null | undefined>) => void;
}) {
  const [todas, setTodas] = useState(false);
  const lista0 = useMemo(() => generarCuriosidades(m, PRES, I.INDIC, I.INDIC_PP, b), [m, PRES, I, b]);
  const temas = [...new Set(lista0.map((c) => c.tema))];
  const conDatos = PRES.filter((x) => lista0.some((c) => c.pres.id === x.id));
  const fp = conDatos.some((x) => x.id === p.get("cqp")) ? (p.get("cqp") as string) : "todos";
  const ft = temas.includes(p.get("cqt") || "") ? (p.get("cqt") as string) : "todos";
  const fk = unoDe(p.get("cqk"), ["todos", "mejor", "peor", "record", "contraste"] as const, "todos");
  const hayFiltro = fp !== "todos" || ft !== "todos" || fk !== "todos";
  const filtradas = lista0.filter((c) => (fp === "todos" || c.pres.id === fp) && (ft === "todos" || c.tema === ft) && (fk === "todos" || c.tipo === (fk as TipoCurio)));
  const ver: CurioGen[] = hayFiltro || todas ? filtradas.slice().sort((a, c) => PRES.indexOf(c.pres) - PRES.indexOf(a.pres)) : mezclarCurios(filtradas, PRES);
  return (
    <div className="card">
      <h2>Curiosidades de cada gobierno</h2>
      <p className="note">Generadas solas con las mismas reglas para todos los presidentes: el mejor y el peor promedio, los récords históricos y los contrastes entre precio y poder de compra. Solo cuentan indicadores con al menos 12 meses de datos en el mandato. Tocá una tarjeta para ver el gráfico en Histórico.</p>
      <div className="controls">
        <Selector etiqueta="Presidente" valor={fp} opciones={[["todos", "Todos los presidentes"], ...conDatos.slice().reverse().map((x) => [x.id, x.n] as [string, string])]} onElegir={(v) => set({ cqp: v === "todos" ? null : v })} />
        <Selector etiqueta="Tema" valor={ft} opciones={[["todos", "Todos los temas"], ...temas.map((t) => [t, t] as [string, string])]} onElegir={(v) => set({ cqt: v === "todos" ? null : v })} />
        <Selector etiqueta="Tipo" valor={fk} opciones={[["todos", "Todos los tipos"], ...TIPOS_CURIO]} onElegir={(v) => set({ cqk: v === "todos" ? null : v })} />
      </div>
      <p className="note">{hayFiltro || todas ? `${ver.length} curiosidades.` : `${ver.length} de ${filtradas.length}: una buena y una mala por presidente, del más reciente al más antiguo.`}{" "}
        {!hayFiltro && <button type="button" className="enlace" onClick={() => setTodas(!todas)}>{todas ? "Ver el resumen parejo" : "Ver todas"}</button>}</p>
      <div className="curios">
        {ver.map((c) => (
          <Link key={c.id + c.pres.id} prefetch={false} className="curio" href={hrefHistorico(c.e, { d: c.desde, h: c.hasta })}>
            <small>{c.pres.n} · {TIPOS_CURIO.find((t) => t[0] === c.tipo)![1]} · <b className={c.bueno ? "var-bueno" : "var-malo"}>{c.bueno ? "a favor" : "en contra"}</b></small>
            <div className="v">{c.valor}</div>
            <div className="d">{c.frase}.</div>
            <MiniMandato v={c.v} p={c.pres} color={c.pres.color} />
          </Link>
        ))}
        {!ver.length && <p className="note">Nada para mostrar con estos filtros.</p>}
      </div>
    </div>
  );
}

export function Curiosidades() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const info = useBase(p, set, montado), b = info.b;
  const { motor: m, version } = sec;
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const I = useMemo(() => (m && !sec.ocupado ? crearIndicadores(m) : null), [m, sec.ocupado, version]);  // eslint-disable-line react-hooks/exhaustive-deps

  // los links viejos del ranking (`gr`, `crit`) abren Ranking con eso elegido
  const viejo = montado && ["gr", "lado", "crit", "cp"].some((k) => p.has(k));
  useEffect(() => {
    if (!viejo) return;
    const q = new URLSearchParams(window.location.search), n = new URLSearchParams();
    q.forEach((v, k) => { if (k === "gr") n.set("rk", v); else if (k === "crit") { if (v === "nivel") n.set("rkc", v); } else if (k === "cp") n.set("rka", v); else if (!["lado", "set"].includes(k)) n.set(k, v); });
    if (!n.has("rka") && (q.has("lado") || q.has("crit"))) n.set("rka", "milei");
    window.location.replace("/ranking/" + (n.toString() ? "?" + n.toString() : ""));
  }, [viejo]);
  if (viejo) return <Cargando texto="Abriendo Ranking…" />;
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  if (sec.ocupado || !I) return <Cargando />;

  return (
    <section>
      <p className="sub">Lo que más se suele preguntar, calculado con los mismos datos.</p>
      <p className="aviso-link">Los datos curiosos armados a mano están en <Link prefetch={false} href="/plantillas/"><b>Plantillas</b></Link>. El ranking de presidentes y &quot;Lo mejor y lo peor de cada gobierno&quot; pasaron a <Link prefetch={false} href="/ranking/"><b>Ranking</b></Link>.</p>
      <CuriosGeneradas m={m} PRES={PRES} I={I} b={b} p={p} set={set} />
    </section>
  );
}
