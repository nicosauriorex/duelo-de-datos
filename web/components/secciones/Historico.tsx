"use client";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Desplegable, Selector, Seg, alternar } from "../ui";
import { FilaVariable } from "../Variables";
import { Grafico, hayDatos, type Fila, type Marca, type OpcionesG, type Ref, type SerieG } from "../Grafico";
import { PALETA, vcolor } from "../util";
import { fmtMes, MESES, nf0, nf1, fmtNum, ok } from "@/lib/formato";
import { FX_COLOR, FX_KEYS, FX_NOM, type Calculo, type Expr, type Motor } from "@/lib/motor";
import { agrupar, claseVariacion, estadisticasRows, etiqueta, recortar, type EstRows } from "@/lib/estadisticas";
import { useConfig } from "../ConfigProvider";
import { desdePreferido, medidaPreferida, paramSi, type Dolar } from "@/lib/config";
import { decExpr, encExpr, lista as listaUrl, unoDe, useParams } from "@/lib/url";

const TODOS_MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const REFS_H = [
  { k: "ult", letra: "U", nom: "Último", btn: "U · Último", dash: "1 3", val: (s: EstRows): [number, string?] => s.ult },
  { k: "prom", letra: "P", nom: "Promedio", btn: "P · Promedio", dash: "6 4", val: (s: EstRows): [number, string?] => [s.prom] },
  { k: "med", letra: "M", nom: "Mediana", btn: "M · Mediana", dash: "2 3 8 3", val: (s: EstRows): [number, string?] => [s.med] },
  { k: "max", letra: "↑", nom: "Máximo", btn: "↑ Máximo", dash: "4 2", val: (s: EstRows): [number, string?] => s.max },
  { k: "min", letra: "↓", nom: "Mínimo", btn: "↓ Mínimo", dash: "4 2", val: (s: EstRows): [number, string?] => s.min },
];
const REFS_DEF = "ult,prom,med,mk_ult,mk_max,mk_min";
const FIJOS_IDS = ["brecha_blue", "brecha_mep", "brecha_ccl", "soja_chi", "soja_ros", "soja_ratio_oficial", "soja_ratio_blue", "soja_ratio_mep", "soja_ratio_ccl", ...FX_KEYS.map((k) => "fx_" + k)];

export function Historico() {
  const [p, set, montado] = useParams();
  const base = useSeccion([]);
  const { config } = useConfig();
  const { listo, motor, metas, version } = base;
  const existe = (id: string) => metas.some((m) => m.id === id);

  // ------------------------------------------------------------ estado (todo viene de la URL)
  const E = useMemo(() => {
    if (!listo || !motor || !montado) return null;
    const F = motor.F, ult = F[F.length - 1];
    const def: Expr = existe("pp_gba_asado") && existe("sipa_prom") ? { id: "pp_gba_asado", med: "real", rel: "sipa_prom", modo: "compra", esc: "" } : { id: "sipa_prom", med: medidaPreferida(config), rel: null, modo: "compra", esc: "" };
    let exprs = listaUrl(p.get("v")).map((s) => decExpr(s, existe)).filter(Boolean) as Expr[];
    if (!exprs.length) exprs = [def];
    const modo = unoDe(p.get("m"), ["valor", "b100"] as const, "valor");
    let desde = /^\d{4}-\d{2}$/.test(p.get("d") || "") ? (p.get("d") as string) : desdePreferido(config.desde, F);
    let hasta = /^\d{4}-\d{2}$/.test(p.get("h") || "") ? (p.get("h") as string) : ult;
    desde = desde < F[0] ? F[0] : desde > ult ? ult : desde;
    hasta = hasta > ult ? ult : hasta < F[0] ? F[0] : hasta;
    if (desde > hasta) desde = hasta; // rango inválido: se corrige al más cercano
    const ms = new Set(listaUrl(p.get("ms")).map(Number).filter((n) => n >= 1 && n <= 12));
    return {
      F, ult, modo, exprs: modo === "b100" ? exprs.slice(0, 10) : exprs.slice(0, 2), todas: exprs, desde, hasta,
      meses: ms.size ? ms : new Set(TODOS_MESES),
      freq: unoDe(p.get("f"), ["M", "T", "A"] as const, "M"), ag: unoDe(p.get("ag"), ["promedio", "cierre"] as const, "promedio"), escala: unoDe(p.get("e"), ["lin", "log"] as const, "lin"),
      banda: unoDe(p.get("bd"), ["no", "si"] as const, "no"), eje: unoDe(p.get("ej"), ["propia", "misma"] as const, "propia"),
      refs: new Set(listaUrl(p.has("r") ? p.get("r") : REFS_DEF).filter((k) => [...REFS_H.map((r) => r.k), "mk_ult", "mk_max", "mk_min"].includes(k))),
      br: new Set(listaUrl(p.has("fb") ? p.get("fb") : "blue,mep,ccl").filter((k) => ["blue", "mep", "ccl"].includes(k))),
      fx: new Set(listaUrl(p.has("fx") ? p.get("fx") : "oficial,blue,ccl").filter((k) => (FX_KEYS as readonly string[]).includes(k))),
      fxmed: unoDe(p.get("fxm"), ["corr", "real", "realbi"] as const, "real"), fxbanda: unoDe(p.get("fxbd"), ["no", "si"] as const, "no"),
      sojamed: unoDe(p.get("sm"), ["corr", "usdr"] as const, "corr"), sojafx: unoDe(p.get("sf"), FX_KEYS, config.dolar), dolarPref: config.dolar,
      tabla: unoDe(p.get("t"), ["grafico", "tabla"] as const, "grafico"),
      ratio: new Set(listaUrl(p.has("rt") ? p.get("rt") : "oficial,ccl").filter((k) => (FX_KEYS as readonly string[]).includes(k))),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, motor, montado, p, metas, config.dolar, config.desde, config.medida]);

  const ids = useMemo(() => {
    if (!E) return [] as string[];
    return E.exprs.flatMap((e) => (e.rel ? [e.id, e.rel] : [e.id]));
  }, [E]);
  const sec = useSeccion(ids);
  const fij = useSeccion(FIJOS_IDS); // los bloques de dólar y soja cargan aparte: no demoran el gráfico principal
  // Solo las variables ya cargadas: si una falla, las demás se siguen viendo.
  const disp = useMemo(() => (E && motor ? E.exprs.filter((e) => motor.SER[e.id] && (!e.rel || motor.SER[e.rel])) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [E, motor, version]);
  const Ed = useMemo(() => (E ? { ...E, exprs: disp } : null), [E, disp]);

  if (base.errorGeneral) return <p className="error" role="alert">{base.errorGeneral}</p>;
  if (!E || !motor) return <Cargando />;
  const m: Motor = motor;
  const guardarExprs = (xs: Expr[]) => set({ v: xs.map(encExpr).join(",") });
  const setExpr = (k: number, e: Expr | null) => {
    let xs = E.todas.slice();
    if (e) xs[k] = e;
    else if (b100) xs.splice(k, 1);
    else xs = xs.filter((_, i) => i !== k).slice(0, 1); // en modo valor, quitar la 2ª deja solo la 1ª
    guardarExprs(xs.length ? xs : E.exprs);
  };
  const b100 = E.modo === "b100";
  const hayError = Object.keys(sec.errores).length > 0;

  return (
    <section>
      <Barra E={E} set={set} F={m.F} />
      <div>
        {E.exprs.map((e, k) => (
          <FilaVariable key={k} e={e} color={PALETA[k]} quitable={b100 ? E.exprs.length > 1 : k === 1} onChange={(x) => setExpr(k, x)} />
        ))}
        {!b100 && E.exprs.length < 2 && <FilaVariable e={null} agregable onChange={(x) => x && guardarExprs([...E.todas, x])} />}
        {b100 && E.exprs.length < 10 && (
          <FilaVariable e={null} agregable textoAgregar={`+ Agregar variable (${E.exprs.length} de 10)`} onChange={(x) => x && guardarExprs([...E.todas, x])} />
        )}
      </div>
      {Ed && Ed.exprs.length > 0
        ? <Principal m={m} E={Ed} set={set} version={version} />
        : (hayError && !sec.ocupado ? <p className="error">Las variables elegidas no se pudieron cargar. Probá otra o recargá la página.</p> : <Cargando />)}
      <Fijos m={m} E={E} set={set} listo={!fij.ocupado} version={version} />
    </section>
  );
}

type Estado = NonNullable<ReturnType<typeof useEstado>>;
// (solo para tipar: el estado real se arma en Historico)
declare function useEstado(): {
  F: string[]; ult: string; modo: "valor" | "b100"; exprs: Expr[]; todas: Expr[]; desde: string; hasta: string; meses: Set<number>;
  freq: "M" | "T" | "A"; ag: "promedio" | "cierre"; escala: "lin" | "log"; banda: "no" | "si"; eje: "propia" | "misma"; refs: Set<string>;
  br: Set<string>; fx: Set<string>; fxmed: "corr" | "real" | "realbi"; fxbanda: "no" | "si"; sojamed: "corr" | "usdr";
  sojafx: (typeof FX_KEYS)[number]; dolarPref: Dolar; ratio: Set<string>; tabla: "grafico" | "tabla";
} | null;
type SetFn = (c: Record<string, string | null | undefined>) => void;

// ------------------------------------------------------------ barra fija: período + Mes / Trimestre / Año
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Mes y año como dos desplegables; respeta el primer y el último mes con datos. */
function SelFecha({ valor, min, max, etq, onElegir }: { valor: string; min: string; max: string; etq: string; onElegir: (v: string) => void }) {
  const [y, mo] = valor.split("-").map(Number), [y0, m0] = min.split("-").map(Number), [y1, m1] = max.split("-").map(Number);
  const anios: [string, string][] = [];
  for (let a = y0; a <= y1; a++) anios.push([String(a), String(a)]);
  const iniM = y === y0 ? m0 : 1, finM = y === y1 ? m1 : 12;
  const meses: [string, string][] = [];
  for (let k = iniM; k <= finM; k++) meses.push([String(k), MESES[k - 1]]);
  const cambiarAnio = (v: string) => {
    const ny = +v, lo = ny === y0 ? m0 : 1, hi = ny === y1 ? m1 : 12;
    onElegir(`${ny}-${pad2(Math.max(lo, Math.min(hi, mo)))}`);
  };
  return (
    <span className="fecha-sel">
      <Selector etiqueta={`${etq}: mes`} valor={String(mo)} opciones={meses} onElegir={(v) => onElegir(`${y}-${pad2(+v)}`)} />
      <Selector etiqueta={`${etq}: año`} valor={String(y)} opciones={anios} onElegir={cambiarAnio} />
    </span>
  );
}

function Barra({ E, set, F }: { E: Estado; set: SetFn; F: string[] }) {
  const N = F.length, ult = F[N - 1], hace12 = F[Math.max(0, N - 12)];
  const PRESETS: [string, string][] = [[F[0], "Todo"], ["1995-01", "1995"], ["2003-01", "2003"], ["2011-01", "2011"], ["2017-01", "2017"], ["2023-01", "2023"], [hace12, "Último año"]];
  const ms = [...E.meses].sort((a, b) => a - b).map((k) => MESES[k - 1]).join(", ");
  const cambiarDesde = (v: string) => { if (!v) return; set({ d: v, h: v > E.hasta ? v : undefined }); };
  const cambiarHasta = (v: string) => { if (!v) return; set({ h: v === ult ? null : v, d: v < E.desde ? v : undefined }); };
  const mesClick = (k: number | "todos") => {
    let n: Set<number>;
    if (k === "todos") n = new Set(TODOS_MESES);
    else if (E.meses.size === 12) n = new Set([k]);
    else { n = new Set(E.meses); if (n.has(k)) { n.delete(k); if (!n.size) n = new Set(TODOS_MESES); } else n.add(k); }
    set({ ms: n.size === 12 ? null : [...n].sort((a, b) => a - b).join(",") });
  };
  return (
    <div className="barra-hist" role="region" aria-label="Período y frecuencia">
      <Desplegable etiqueta={<><span className="solo-grande">Período: </span>{fmtMes(E.desde)} – {fmtMes(E.hasta)}{E.meses.size < 12 ? ` · ${ms}` : ""}</>}>
        <div className="controls"><label>Desde</label><SelFecha etq="Desde" valor={E.desde} min={F[0]} max={ult} onElegir={cambiarDesde} />
          <label>Hasta</label><SelFecha etq="Hasta" valor={E.hasta} min={F[0]} max={ult} onElegir={cambiarHasta} /></div>
        <div className="controls"><label>Atajos</label>
          <div className="seg">{PRESETS.map(([v, t]) => (
            <button key={t} type="button" aria-pressed={E.desde === v && E.hasta === ult} onClick={() => set({ d: v, h: null })}>{t}</button>
          ))}</div></div>
        <div className="controls"><label>Meses del año</label>
          <div className="seg">
            <button type="button" aria-pressed={E.meses.size === 12} onClick={() => mesClick("todos")}>Todos</button>
            {MESES.map((n, k) => <button key={n} type="button" aria-pressed={E.meses.size < 12 && E.meses.has(k + 1)} onClick={() => mesClick(k + 1)}>{n}</button>)}
          </div></div>
        {E.freq !== "M" && (
          <div className="controls"><label>Al ver por {E.freq === "A" ? "año" : "trimestre"}</label>
            <Seg valor={E.ag} opciones={[["promedio", "Promedio"], ["cierre", "Cierre"]]} onElegir={(v) => set({ ag: v === "promedio" ? null : v })} />
            <span className="note" style={{ margin: 0 }}>{E.ag === "cierre" ? "Último mes con dato de cada período." : "Promedio de los meses del período."}</span></div>
        )}
        <p className="note" style={{ margin: 0 }}>Con meses sueltos (p.ej. solo enero) se ve un punto por año y se unen con una línea. Escape o un clic afuera cierran este panel.</p>
      </Desplegable>
      <Seg valor={E.freq} opciones={[["M", "Mes"], ["T", "Trimestre"], ["A", "Año"]]} onElegir={(v) => set({ f: v === "M" ? null : v })} />
    </div>
  );
}

// ------------------------------------------------------------ tarjeta de gráfico: barra (Gráfico / Tabla, Configurar, expandir), gráfico o tabla
type Vista = "grafico" | "tabla";
function CardGrafico({ titulo, nota, leyenda, refleg, visibles, config, rows, series, opts, unidades, vista: vistaProp, onVista }: {
  titulo: string; nota?: ReactNode; leyenda?: ReactNode; refleg?: ReactNode; visibles?: ReactNode; config?: { cuenta: number; children: ReactNode };
  rows: Fila[]; series: SerieG[]; opts: OpcionesG; unidades?: Record<string, string>; vista?: Vista; onVista?: (v: Vista) => void;
}) {
  const [vistaL, setVistaL] = useState<Vista>("grafico");
  const [exp, setExp] = useState(false);
  const vista = vistaProp ?? vistaL;
  const elegirVista = (v: string) => (onVista ? onVista(v as Vista) : setVistaL(v as Vista));
  const hay = hayDatos(rows, series, opts);
  const cab = leyenda || refleg ? <>{leyenda}{refleg}</> : null;
  return (
    <div className="card">
      <h2>{titulo}</h2>{nota && <p className="note">{nota}</p>}
      <div className="barra-graf">
        {visibles}
        <Seg valor={vista} opciones={[["grafico", "Gráfico"], ["tabla", "Tabla"]]} onElegir={elegirVista} />
        {config && (
          <Desplegable etiqueta={config.cuenta ? `Configurar gráfico (${config.cuenta})` : "Configurar gráfico"}>{config.children}</Desplegable>
        )}
        <span className="esp" />
        {vista === "grafico" && hay && <button type="button" className="btn expandir" onClick={() => setExp(true)} aria-label="Expandir el gráfico a pantalla completa">⤢ Expandir</button>}
      </div>
      {cab}
      {vista === "tabla"
        ? (rows.length && hay ? (
          <div className="tablewrap tabla-graf"><table>
            <thead><tr><th>Período</th>{series.map((se) => <th key={se.key}>{se.name}{unidades?.[se.key] && <small>{unidades[se.key]}</small>}</th>)}</tr></thead>
            <tbody>{rows.slice().reverse().map((r) => (
              <tr key={r.fecha + (r.per || "")}><td>{etiqueta(r)}</td>{series.map((se) => <td key={se.key}>{ok(r[se.key]) ? (se.fmt || opts.fmtTip)(r[se.key]) : "–"}</td>)}</tr>
            ))}</tbody>
          </table></div>
        ) : <p className="note">Sin datos para esta selección.</p>)
        : <Grafico rows={rows} series={series} opts={opts} expandir={{ titulo, leyenda: cab, abierto: exp, onCerrar: () => setExp(false) }} />}
    </div>
  );
}

// ------------------------------------------------------------ resumen: tarjetas (≥ 640 px) y chips (celular)
interface DefResumen { tit: string; corto: string; val: (s: EstRows) => number; fecha?: (s: EstRows) => string | undefined; desde: (s: EstRows) => number; vs: (s: EstRows) => string }
const DEFS_RES: DefResumen[] = [
  { tit: "Último dato", corto: "Último", val: (s) => s.ult[0], fecha: (s) => s.ult[1], desde: (s) => s.pri[0], vs: (s) => `vs. ${s.pri[1]}` },
  { tit: "Promedio", corto: "Prom.", val: (s) => s.prom, desde: (s) => s.prom, vs: () => "último vs. este" },
  { tit: "Mediana", corto: "Mediana", val: (s) => s.med, desde: (s) => s.med, vs: () => "último vs. este" },
  { tit: "Máximo", corto: "Máx.", val: (s) => s.max[0], fecha: (s) => s.max[1], desde: (s) => s.max[0], vs: () => "último vs. este" },
  { tit: "Mínimo", corto: "Mín.", val: (s) => s.min[0], fecha: (s) => s.min[1], desde: (s) => s.min[0], vs: () => "último vs. este" },
];

// ------------------------------------------------------------ gráfico principal
function Principal({ m, E, set, version }: { m: Motor; E: Estado; set: SetFn; version: number }) {
  const { F } = m;
  const b100 = E.modo === "b100";
  // Claves estables: el gráfico solo se rehace (y pierde el zoom) si cambia algo que lo afecta
  const kExprs = E.exprs.map(encExpr).join(","), kMeses = [...E.meses].join(","), kRefs = [...E.refs].sort().join(",");
  const D = useMemo(() => {
    const lista = E.exprs.map((e, k) => {
      const c = m.calc(e);
      return { c, key: "s" + k, color: PALETA[k], axis: !b100 && k === 1 ? 1 : 0, flujo: !!c.flujo, ultimo: !!c.ultimo, base: "–" };
    });
    const dos = !b100 && lista.length === 2;
    const hayBanda = !b100 && lista.some((o) => o.c.lo);
    const bd = hayBanda && E.banda === "si";
    const enFiltro = (f: string) => f >= E.desde && f <= E.hasta && E.meses.has(+f.slice(5, 7));
    let rows: Fila[] = F.map((f, i) => {
      if (!enFiltro(f)) return null;
      const r: Fila = { fecha: f };
      lista.forEach((o) => { r[o.key] = o.c.v[i]; if (bd && o.c.lo && o.c.hi) { r[o.key + "_lo"] = o.c.lo[i]; r[o.key + "_hi"] = o.c.hi[i]; } });
      return r;
    }).filter(Boolean) as Fila[];
    rows = recortar(agrupar(rows, E.freq, E.meses, new Set(lista.filter((o) => o.flujo).map((o) => o.key)), new Set(lista.filter((o) => o.ultimo).map((o) => o.key)), E.ag === "cierre"), lista.map((o) => o.key));
    if (b100) lista.forEach((o) => {
      const r0 = rows.find((r) => ok(r[o.key]) && r[o.key] !== 0);
      o.base = r0 ? etiqueta(r0) : "–";
      const f = r0 ? 100 / r0[o.key] : null;
      rows.forEach((r) => { r[o.key] = f && ok(r[o.key]) ? r[o.key] * f : null; });
    });
    const puedeLog = rows.every((r) => lista.every((o) => !ok(r[o.key]) || r[o.key] > 0));
    const st = lista.map((o) => estadisticasRows(rows, o.key));
    const fmtDe = (o: { c: Calculo }) => b100 ? (v: number) => nf1.format(v) : (v: number) => m.fmtC(o.c, v);
    const misma = dos && E.eje === "misma";
    const refs: Ref[] = [];
    const refLeg: { dos: boolean; color: string; items: { letra: string; dash: string; nom: string; v: number; txt: string; cuando?: string; color: string }[] }[] = [];
    if (!b100) lista.forEach((o, k) => {
      const s = st[k]; if (!s) return;
      const items = REFS_H.filter((r) => E.refs.has(r.k)).map((r) => {
        const [v, cuando] = r.val(s);
        refs.push({ v, axis: misma ? 0 : o.axis, color: o.color, letra: r.letra, dash: r.dash });
        return { letra: r.letra, dash: r.dash, nom: r.nom, v, txt: m.fmtC(o.c, v), cuando, color: o.color };
      });
      if (items.length) refLeg.push({ dos, color: o.color, items });
    });
    const tiposMk = new Set(["ult", "max", "min"].filter((k) => E.refs.has("mk_" + k)));
    const marcas: Marca[] = b100 || !tiposMk.size ? [] : lista.map((o) => ({ key: o.key, axis: misma ? 0 : o.axis, color: o.color, fmt: fmtDe(o), tipos: tiposMk }));
    const ejeFmt = (c: { pct: boolean }) => (v: number) => c.pct ? nf0.format(v) + " %" : (Math.abs(v) >= 1e6 ? nf1.format(v / 1e6) + " M" : Math.abs(v) >= 1e4 ? nf0.format(v / 1e3) + " mil" : fmtNum(v));
    const series: SerieG[] = lista.map((o) => ({ key: o.key, name: o.c.corto, short: o.c.corto.length > 18 ? o.c.corto.slice(0, 17) + "…" : o.c.corto, color: o.color, axis: o.axis, band: bd && !!o.c.lo, fmt: fmtDe(o) }));
    const opts = {
      log: E.escala === "log" && puedeLog, log2: E.escala === "log" && puedeLog, refs, marcas, mismaEscala: misma, refLine: b100 ? 100 : null, endLabels: b100 && lista.length > 1,
      fmtAxis: b100 ? (v: number) => nf0.format(v) : ejeFmt(lista[0].c), fmtAxis2: dos ? ejeFmt(lista[1].c) : null, fmtTip: fmtDe(lista[0]), tipTitle: etiqueta,
      label: lista.map((o) => o.c.corto).join(", "),
    };
    return { lista, dos, hayBanda, bd, rows, puedeLog, st, fmtDe, refLeg, series, opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, kExprs, E.modo, E.desde, E.hasta, kMeses, E.freq, E.ag, E.escala, E.banda, E.eje, kRefs]);
  const { lista, dos, hayBanda, bd, rows, puedeLog, st, refLeg, series, opts } = D;

  const porFreq = ({ M: "", T: " Valores trimestrales", A: " Valores anuales" })[E.freq];
  const agTxt = E.ag === "cierre" ? `último mes con dato de cada ${E.freq === "A" ? "año" : "trimestre"}` : "promedio de los meses";
  const sumaTxt = E.freq !== "M" && lista.some((o) => o.flujo || o.ultimo)
    ? ` (los flujos se suman y los % del PIB toman el último mes del período; períodos incompletos de flujos quedan vacíos; el resto es ${agTxt}).`
    : E.freq !== "M" ? ` (${agTxt}).` : "";
  const titulo = b100 ? `Comparación en base 100: ${lista.map((o) => o.c.corto).join(", ")}` : dos ? `${lista[0].c.corto} y ${lista[1].c.corto}` : lista[0].c.nombre;
  const nota = (b100 ? "Cada serie vale 100 en su primer dato del período: la línea muestra cuánto subió o bajó desde ahí."
    : lista.map((o, k) => `${dos ? (k ? "Derecha: " : "Izquierda: ") : ""}${o.c.unidad}`).join(" · ") + ".") + porFreq + sumaTxt +
    (bd ? " La sombra va del mínimo al máximo." : "") + ` Fuente: ${[...new Set(lista.map((o) => o.c.serie.fuente))].join("; ")}.`;
  const grupo = (lbl: string, el: React.ReactNode) => <Fragment key={lbl}><label>{lbl}</label>{el}</Fragment>;
  const refsToggle = (k: string) => set({ r: [...alternar(E.refs, k, true)].join(",") || "-" });

  // Opciones de "Configurar gráfico" distintas de las de por defecto
  const igualA = (set0: Set<string>, ks: string[], def: string[]) => {
    const act = ks.filter((k) => set0.has(k)).sort().join(","), d = def.slice().sort().join(",");
    return act === d;
  };
  const cuenta = (b100 ? 1 : 0) + (puedeLog && E.escala !== "lin" ? 1 : 0) + (dos && E.eje !== "propia" ? 1 : 0) + (hayBanda && E.banda !== "no" ? 1 : 0)
    + (!b100 && !igualA(E.refs, REFS_H.map((r) => r.k), ["ult", "prom", "med"]) ? 1 : 0) + (!b100 && !igualA(E.refs, ["mk_ult", "mk_max", "mk_min"], ["mk_ult", "mk_max", "mk_min"]) ? 1 : 0);
  const config = (
    <>
      <div className="controls" id="h_opciones">
        {grupo("Mostrar", <Seg valor={E.modo} opciones={[["valor", "Valor de la serie (hasta 2 variables)"], ["b100", "Comparar en base 100 (hasta 10)"]]} onElegir={(v) => set({ m: v === "valor" ? null : v })} />)}
      </div>
      <div className="controls">
        {puedeLog && grupo("Escala", <Seg valor={E.escala} opciones={[["lin", "Lineal"], ["log", "Logarítmica"]]} onElegir={(v) => set({ e: v === "lin" ? null : v })} />)}
        {dos && grupo("Eje derecho", <Seg valor={E.eje} opciones={[["propia", "Escala propia (adaptada a la serie)"], ["misma", "Misma escala que el izquierdo"]]} onElegir={(v) => set({ ej: v === "propia" ? null : v })} />)}
      </div>
      {!b100 && (
        <div className="controls">
          {grupo("Líneas", <Seg valor={E.refs} opciones={REFS_H.map((r) => [r.k, r.btn] as [string, string])} onElegir={refsToggle} />)}
          {grupo("Marcadores", <Seg valor={E.refs} opciones={[["mk_ult", "Último"], ["mk_max", "Máximo"], ["mk_min", "Mínimo"]]} onElegir={refsToggle} />)}
          {hayBanda && grupo("Rango", <Seg valor={E.banda} opciones={[["no", "Solo promedio"], ["si", "Con mín/máx"]]} onElegir={(v) => set({ bd: v === "no" ? null : v })} />)}
        </div>
      )}
    </>
  );
  const leyenda = <div className="legend">{lista.length > 1 && lista.map((o) => <span key={o.key} style={vcolor(o.color)}>{o.c.corto}{o.axis ? " (eje der.)" : ""}</span>)}</div>;
  const refl = (
    <div className="refleg">{refLeg.map((g, i) => (
      <div key={i}>{g.dos && <span className="punto" style={vcolor(g.color)} />}
        {g.items.map((it) => (
          <span className="ri" key={it.letra}><b style={{ color: `var(${it.color})` }}>{it.letra}</b>
            <svg width="24" height="6" aria-hidden="true"><line x1="0" x2="24" y1="3" y2="3" stroke={`var(${it.color})`} strokeWidth="1.5" strokeDasharray={it.dash} /></svg>
            {it.nom} <span className="rv"><b>{it.txt}</b>{it.cuando ? <> <small>{it.cuando}</small></> : null}</span></span>
        ))}</div>
    ))}</div>
  );
  const unidades = Object.fromEntries(lista.map((o) => [o.key, b100 ? "base 100" : o.c.unidad]));

  // Resumen (tarjetas y chips)
  const celda = (def: DefResumen, o: (typeof lista)[number], k: number) => {
    const s = st[k]; if (!s) return null;
    const hasta = s.ult[0], desde = def.desde(s);
    return { txt: m.fmtC(o.c, def.val(s)), f: def.fecha?.(s), vs: def.vs(s), vr: m.variacionTxt(o.c, desde, hasta), cls: claseVariacion(o.c.dir, o.c.pct, desde, hasta) };
  };
  return (
    <>
      {b100 ? (
        <div className="tiles">
          <div className="card" style={{ gridColumn: "1/-1", margin: 0 }}><h2>Resumen (de mayor a menor)</h2>
            <div className="tablewrap"><table><thead><tr><th>Variable</th><th>Base 100 en</th><th>Último</th><th>Variación</th><th>Máximo</th><th>Mínimo</th><th>Promedio</th></tr></thead><tbody>
              {lista.map((o, k) => ({ o, s: st[k] })).filter((x) => x.s).sort((a, b) => b.s!.ult[0] - a.s!.ult[0]).map(({ o, s }) => {
                const d = s!.ult[0] - 100, cls = claseVariacion(o.c.dir, true, 100, s!.ult[0]);
                return (
                  <tr key={o.key}><td className="nombre"><span className="punto" style={vcolor(o.color)} /> {o.c.corto}<small>{o.c.unidad}</small></td><td>{o.base}</td>
                    <td>{nf1.format(s!.ult[0])}<small>{s!.ult[1]}</small></td><td className={`var-${cls}`}>{d > 0 ? "+" : ""}{nf1.format(d)} %</td>
                    <td>{nf1.format(s!.max[0])}<small>{s!.max[1]}</small></td><td>{nf1.format(s!.min[0])}<small>{s!.min[1]}</small></td><td>{nf1.format(s!.prom)}</td></tr>
                );
              })}
            </tbody></table></div></div>
        </div>
      ) : (
        <>
          <div className="tiles res">
            {DEFS_RES.map((def) => (
              <div className="tile" key={def.tit}><div className="k">{def.tit}</div>
                <div className={`mitades${dos ? " dos" : ""}`}>{lista.map((o, k) => {
                  const c = celda(def, o, k);
                  if (!c) return <div className="mitad" key={k}><div className="v">–</div></div>;
                  return (
                    <div className="mitad" key={k}>{dos && <><span className="punto" style={vcolor(o.color)} />{" "}</>}<span className="v">{c.txt}</span>
                      <div className="d">{c.f ? <>{c.f} · </> : null}{c.vs}: <b className={`var-${c.cls}`}>{c.vr}</b></div></div>
                  );
                })}</div></div>
            ))}
          </div>
          <div className="chips" role="list" aria-label="Resumen">
            {DEFS_RES.map((def) => (
              <div className="chip" role="listitem" key={def.tit} title={def.tit}>
                <span className="n">{def.corto}</span>
                <div className="col">{lista.map((o, k) => {
                  const c = celda(def, o, k);
                  return (
                    <div className="ln" key={k} title={c ? `${def.tit}${c.f ? " · " + c.f : ""} · ${c.vs}` : undefined}>
                      {dos && <span className="punto" style={vcolor(o.color)} />}
                      <span className="v">{c ? c.txt : "–"}</span>
                      {c && <span className={`vr var-${c.cls}`}>{c.vr}</span>}
                      {c?.f && <span className="f">{c.f}</span>}
                    </div>
                  );
                })}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <CardGrafico titulo={titulo} nota={nota} leyenda={leyenda} refleg={refl} config={{ cuenta, children: config }}
        rows={rows} series={series} opts={opts} unidades={unidades} vista={E.tabla} onVista={(v) => set({ t: v === "tabla" ? "tabla" : null })} />
    </>
  );
}

// ------------------------------------------------------------ bloques fijos: dólar y soja
function Fijos({ m, E, set, listo, version }: { m: Motor; E: Estado; set: SetFn; listo: boolean; version: number }) {
  const F = m.F;
  const kMeses = [...E.meses].join(","), kFx = [...E.fx].join(","), kBr = [...E.br].join(","), kRatio = [...E.ratio].join(",");
  const D = useMemo(() => {
    if (!listo || !["fx_oficial", "soja_chi", "soja_ros"].every((id) => m.SER[id])) return null;
    const { SER, transformar } = m;
    const bd = E.fxbanda === "si";
    const enFiltro = (f: string) => f >= E.desde && f <= E.hasta && E.meses.has(+f.slice(5, 7));
    const filasF = (cols: Record<string, (number | null)[]>, bandas: Record<string, [(number | null)[], (number | null)[]]> = {}) =>
      agrupar(F.map((f, i) => {
        const r: Fila = { fecha: f };
        for (const k in cols) r[k] = cols[k][i];
        for (const k in bandas) { r[k + "_lo"] = bandas[k][0][i]; r[k + "_hi"] = bandas[k][1][i]; }
        return r;
      }).filter((r) => enFiltro(r.fecha)), E.freq, E.meses, new Set<string>(), new Set<string>(), E.ag === "cierre");
    const sel = FX_KEYS.filter((k) => E.fx.has(k) && SER["fx_" + k]);
    const sfx = SER.fx_oficial;
    const fx = {
      sel, rows: recortar(filasF(Object.fromEntries(sel.map((k) => [k, transformar(SER["fx_" + k], SER["fx_" + k].vals, E.fxmed)])),
        bd ? Object.fromEntries(sel.map((k) => [k, [transformar(sfx, SER["fx_" + k].mn!, E.fxmed), transformar(sfx, SER["fx_" + k].mx!, E.fxmed)] as [(number | null)[], (number | null)[]]])) : {}), sel),
      series: sel.map((k): SerieG => ({ key: k, name: "Dólar " + FX_NOM[k], short: FX_NOM[k], color: FX_COLOR[k], band: bd })),
      opts: { log: E.fxmed === "corr", endLabels: true, tipTitle: etiqueta, fmtAxis: (v: number) => "$ " + (Math.abs(v) >= 1e4 ? nf0.format(v / 1e3) + " mil" : fmtNum(v)), fmtTip: (v: number) => "$ " + fmtNum(v), label: "Dólares" },
    };
    const br = (["blue", "mep", "ccl"] as const).filter((k) => E.br.has(k) && SER["brecha_" + k]);
    const brecha = {
      br, rows: recortar(filasF(Object.fromEntries(br.map((k) => [k, SER["brecha_" + k].vals]))), br),
      series: br.map((k): SerieG => ({ key: k, name: FX_NOM[k], color: FX_COLOR[k] })),
      opts: { zero: true, refLine: 0, endLabels: true, tipTitle: etiqueta, fmtAxis: (v: number) => nf0.format(v) + " %", fmtTip: (v: number) => nf1.format(v) + " %", label: "Brecha" },
    };
    const real = E.sojamed === "usdr", medRos = (real ? "usdr_" : "usd_") + E.sojafx, chi = SER.soja_chi, ros = SER.soja_ros;
    const tc = real ? "usdr" : "corr";
    const soja = {
      rows: recortar(filasF({ chi: transformar(chi, chi.vals, tc), ros: transformar(ros, ros.vals, medRos) },
        bd ? { chi: [transformar(chi, chi.mn!, tc), transformar(chi, chi.mx!, tc)], ros: [transformar(ros, ros.mn!, medRos), transformar(ros, ros.mx!, medRos)] } : {}), ["chi", "ros"]),
      series: [{ key: "chi", name: "Chicago", color: "--series-1", band: bd }, { key: "ros", name: "Rosario", color: "--series-2", band: bd }] as SerieG[],
      opts: { zero: true, endLabels: true, tipTitle: etiqueta, fmtAxis: (v: number) => "US$ " + nf0.format(v), fmtTip: (v: number) => "US$ " + nf0.format(v), label: "Soja" },
    };
    const rk = FX_KEYS.filter((k) => E.ratio.has(k) && SER["soja_ratio_" + k]);
    const ratio = {
      rk, rows: recortar(filasF(Object.fromEntries(rk.map((k) => [k, SER["soja_ratio_" + k].vals]))), rk),
      series: rk.map((k): SerieG => ({ key: k, name: "Al " + FX_NOM[k], short: FX_NOM[k], color: FX_COLOR[k] })),
      opts: { refLine: 100, endLabels: true, tipTitle: etiqueta, fmtAxis: (v: number) => nf0.format(v) + " %", fmtTip: (v: number) => nf1.format(v) + " %", label: "Rosario sobre Chicago" },
    };
    return { fx, brecha, soja, ratio };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, listo, E.desde, E.hasta, kMeses, E.freq, E.ag, kFx, kBr, E.fxmed, E.fxbanda, E.sojamed, E.sojafx, kRatio]);

  const { refUS } = m.refs();
  const medNom = Object.fromEntries(m.medFx())[E.fxmed];
  const tog = (clave: string, set0: Set<string>, v: string, vacio = false) => set({ [clave]: [...alternar(set0, v, vacio)].join(",") });
  const banda = <Seg valor={E.fxbanda} opciones={[["no", "Promedio"], ["si", "Con mín/máx"]]} onElegir={(v) => set({ fxbd: v === "no" ? null : v })} />;
  return (
    <>
      <h3>Dólar y soja: varias series a la vez</h3>
      {!D ? <Cargando /> : (
        <>
          <CardGrafico titulo="Dólares"
            nota={<>{medNom}. Promedio mensual{E.freq !== "M" && E.ag === "cierre" ? `; por ${E.freq === "A" ? "año" : "trimestre"}, el último mes` : ""}.{E.fxmed === "corr" ? " Escala logarítmica: la misma distancia vertical es la misma variación %." : ""}</>}
            leyenda={<div className="legend">{D.fx.sel.map((k) => <span key={k} style={vcolor(FX_COLOR[k])}>{FX_NOM[k]}</span>)}</div>}
            visibles={<Seg valor={E.fx} opciones={FX_KEYS.map((k) => [k, FX_NOM[k]] as [string, string])} onElegir={(v) => tog("fx", E.fx, v)} />}
            config={{
              cuenta: (E.fxmed !== "real" ? 1 : 0) + (E.fxbanda !== "no" ? 1 : 0),
              children: (
                <div className="controls">
                  <label>Medida</label><Seg valor={E.fxmed} opciones={[["corr", "Corrientes"], ["real", "Pesos de hoy"], ["realbi", "Pesos de hoy neto infl. EEUU"]]} onElegir={(v) => set({ fxm: v === "real" ? null : v })} />
                  {banda}
                </div>
              ),
            }}
            rows={D.fx.rows} series={D.fx.series} opts={D.fx.opts} />
          <CardGrafico titulo="Brecha con el dólar oficial" nota="Cuánto más caro que el oficial mayorista (A3500)."
            leyenda={<div className="legend">{D.brecha.br.map((k) => <span key={k} style={vcolor(FX_COLOR[k])}>{FX_NOM[k]}</span>)}</div>}
            visibles={<Seg valor={E.br} opciones={[["blue", "Blue"], ["mep", "MEP"], ["ccl", "CCL"]]} onElegir={(v) => tog("fb", E.br, v)} />}
            rows={D.brecha.rows} series={D.brecha.series} opts={D.brecha.opts} />
          <CardGrafico titulo="Soja: Chicago vs. Rosario"
            nota={<>US$ por tonelada{E.sojamed === "usdr" ? ` de ${refUS} (ajustado por inflación de EEUU)` : " corrientes"}. Rosario pasado al dólar {FX_NOM[E.sojafx]} de cada mes.</>}
            leyenda={<div className="legend"><span style={vcolor("--series-1")}>Chicago (CBOT)</span><span style={vcolor("--series-2")}>Rosario (pizarra, al {FX_NOM[E.sojafx]})</span></div>}
            config={{
              cuenta: (E.sojamed !== "corr" ? 1 : 0) + (E.sojafx !== E.dolarPref ? 1 : 0) + (E.fxbanda !== "no" ? 1 : 0),
              children: (
                <div className="controls">
                  <label>Medida</label><Seg valor={E.sojamed} opciones={[["corr", "US$ corrientes"], ["usdr", "US$ reales"]]} onElegir={(v) => set({ sm: v === "corr" ? null : v })} />
                  {banda}
                  <label>Rosario al dólar</label><Seg valor={E.sojafx} opciones={FX_KEYS.map((k) => [k, FX_NOM[k]] as [string, string])} onElegir={(v) => set({ sf: paramSi(v, "oficial", E.dolarPref) })} />
                </div>
              ),
            }}
            rows={D.soja.rows} series={D.soja.series} opts={D.soja.opts} />
          <CardGrafico titulo="Cuánto recibe el productor: Rosario / Chicago"
            nota={<>Precio en Rosario pasado a dólares, como % de Chicago. Al oficial muestra retenciones y costos; al blue, MEP o CCL, cuántos dólares &quot;libres&quot; consigue el productor (con cepo, bastante menos).</>}
            leyenda={<div className="legend">{D.ratio.rk.map((k) => <span key={k} style={vcolor(FX_COLOR[k])}>al {FX_NOM[k]}</span>)}</div>}
            visibles={<><label>Al dólar</label><Seg valor={E.ratio} opciones={FX_KEYS.map((k) => [k, FX_NOM[k]] as [string, string])} onElegir={(v) => tog("rt", E.ratio, v)} /></>}
            rows={D.ratio.rows} series={D.ratio.series} opts={D.ratio.opts} />
        </>
      )}
    </>
  );
}
