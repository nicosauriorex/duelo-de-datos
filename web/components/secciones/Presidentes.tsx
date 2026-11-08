"use client";
import { Fragment, useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Desplegable, Seg, alternar } from "../ui";
import { BotonInfo, FilaVariable } from "../Variables";
import { CeldasStats, COLS, Cabecera, SelectorBase, siguienteOrden, useBase, valorCol, type Orden } from "./comunes";
import { fmtMes } from "@/lib/formato";
import { baseTxt, baseIdx, crearPres, nivelComparable, ordenar, rankScores, statsMandato, varNum, type Pres } from "@/lib/estadisticas";
import { grupoDe, medidaPara, ordenarGrupos, textoBusqueda } from "@/lib/catalogo";
import { norm } from "@/lib/formato";
import type { Expr } from "@/lib/motor";
import { decExpr, encExpr, lista, unoDe, useParams } from "@/lib/url";

const ABIERTOS = new Set(["Salarios", "Dólar y tipo de cambio", "Precios › Indicadores de inflación", "Actividad", "Empleo, pobreza e ingresos", "Mercados", "Fiscal", "Dinero y bancos (BCRA)"]);

export function Presidentes() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const b = useBase(p);
  const [ordB, setOrdB] = useState<Orden>({ k: null, d: -1 });
  const [ordA, setOrdA] = useState<Orden>({ k: null, d: -1 });
  const [abiertos, setAbiertos] = useState(() => new Set(ABIERTOS));
  const [buscar, setBuscar] = useState("");
  const { motor: m, metas } = sec;
  const PRES: Pres[] = useMemo(() => (m ? crearPres(m.F) : []), [m]);

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  if (sec.ocupado) return <Cargando />;

  const existe = (id: string) => !!m.SER[id];
  const presSel = new Set(lista(p.get("pr") ?? PRES.map((x) => x.id).join(",")).filter((id) => PRES.some((x) => x.id === id)));
  const cols = COLS.filter((c) => (p.has("cl") ? lista(p.get("cl")) : COLS.map((x) => x[0])).includes(c[0]));
  const eB: Expr = decExpr(p.get("pv"), existe) || { id: m.SER.sipa_med ? "sipa_med" : "sipa_prom", med: "real", rel: null, modo: "compra", esc: "" };
  const F = m.F;

  // ---- tabla B: una variable, todos los presidentes
  const c = m.calc(eB), dir = c.dir || 0, niv = nivelComparable(m, eB);
  const sts = PRES.map((x) => statsMandato(F, c.v, x, b));
  const col = (f: (s: typeof sts[number]) => number | undefined | null) => rankScores(sts.map(f), dir);
  const sc = { var: col((s) => varNum(c, s)), fin: niv ? col((s) => s.fin) : null, min: niv ? col((s) => s.min) : null,
    max: niv ? col((s) => s.max) : null, prom: niv ? col((s) => s.prom) : null, med: niv ? col((s) => s.med) : null };
  const filasB = ordenar(PRES.map((x, k) => ({ x, k })).filter((o) => presSel.has(o.x.id)), ordB, (o) => valorCol(c, sts[o.k], ordB.k));
  const nota = !dir ? "Sin colores: para esta variable subir o bajar no es ni bueno ni malo en sí mismo."
    : `Colores del mejor (verde) al peor (rojo) entre todos los presidentes${niv ? "" : "; en montos corrientes solo se colorea la variación (los niveles no se pueden comparar con inflación de por medio)"}.`;

  // ---- tabla A: un presidente, todas las variables
  const paPres = PRES.find((x) => x.id === p.get("pap")) || PRES[PRES.length - 1];
  const medsArs = m.medArs();
  const paMed = medsArs.some((o) => o[0] === p.get("pam")) ? (p.get("pam") as string) : "real";
  const toks = norm(buscar.trim()) ? norm(buscar.trim()).split(/\s+/) : [];
  const series = Object.values(m.SER);
  const GRUPOS = ordenarGrupos([...new Set(series.map(grupoDe))]);
  const nc = cols.length + 2;
  const filasA: React.ReactNode[] = [];
  let total = 0;
  GRUPOS.forEach((g) => {
    let ss = series.filter((s) => grupoDe(s) === g);
    if (toks.length) ss = ss.filter((s) => { const t = textoBusqueda(s); return toks.every((k) => t.includes(k)); });
    if (!ss.length) return;
    total += ss.length;
    const ab = toks.length ? true : abiertos.has(g);
    filasA.push(
      <tr key={"g" + g} className={`grupo${ab ? " abierto" : ""}`} onClick={() => { if (toks.length) return; setAbiertos(alternar2(abiertos, g)); }}
        tabIndex={0} onKeyDown={(ev) => { if (ev.key === "Enter" && !toks.length) setAbiertos(alternar2(abiertos, g)); }}>
        <td colSpan={nc}>{g} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({ss.length})</span></td>
      </tr>,
    );
    if (!ab) return;
    const items = ordenar(ss.map((s) => { const cc = m.calc({ id: s.id, med: medidaPara(s, paMed), rel: null }); return { s, c: cc, st: statsMandato(F, cc.v, paPres, b) }; }),
      ordA, (o) => valorCol(o.c, o.st, ordA.k));
    items.forEach(({ s, c: cc, st }) => filasA.push(
      <tr key={s.id}><td className="nombre">{s.n} <BotonInfo id={s.id} /></td><td className="unidad">{cc.unidad}</td><CeldasStats m={m} c={cc} st={st} cols={cols} /></tr>,
    ));
  });
  const bi = (id: string) => { const x = PRES.find((q) => q.id === id)!; return fmtMes(F[baseIdx(F, x, b)]); };

  return (
    <section>
      <div className="controls"><label>Inicio de mandato</label>
        <SelectorBase b={b} set={set} />
        <Desplegable etiqueta="Presidentes y columnas">
          <div className="controls"><label>Presidentes</label><Seg valor={presSel} opciones={PRES.map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ pr: [...alternar(presSel, v)].join(",") })} /></div>
          <div className="controls"><label>Columnas</label><Seg valor={new Set(cols.map((x) => x[0]))} opciones={COLS} onElegir={(v) => set({ cl: [...alternar(new Set(cols.map((x) => x[0])), v)].join(",") })} /></div>
        </Desplegable>
      </div>
      <div className="callout">
        {b.base === "prev" ? <><b>Inicio</b> = último mes del presidente anterior (T-1), para que la variación incluya todo lo que pasó en el mandato (p.ej. la devaluación de dic-2023 cuenta para Milei).</>
          : b.base === "mas" ? <><b>Inicio</b> = {baseTxt(b)}: p.ej. para Milei, {bi("milei")}.</>
          : <><b>Inicio</b> = mes de asunción (T; promedio del mes, incluye días del antecesor).</>}
        {" "}Mínimo, máximo, promedio y mediana usan solo los meses del mandato. Verde y rojo indican si el cambio fue bueno o malo (un salario que sube es verde; precios, dólar o riesgo país que suben son rojos).
      </div>
      <div className="card">
        <h2>Una variable, todos los presidentes</h2><p className="note">Tocá un encabezado para ordenar.</p>
        <FilaVariable e={eB} onChange={(e) => e && set({ pv: encExpr(e) })} />
        <div className="tablewrap"><table>
          <thead><tr><th>Presidente</th><th style={{ textAlign: "left" }}>Mandato</th><Cabecera cols={cols} ord={ordB} onOrden={(k) => setOrdB(siguienteOrden(ordB, k))} /></tr></thead>
          <tbody>{filasB.map(({ x, k }) => (
            <tr key={x.id}><td>{x.n}</td><td className="unidad">{fmtMes(x.ini)} a {fmtMes(F[x.i1])}</td>
              <CeldasStats m={m} c={c} st={sts[k]} cols={cols} sc={Object.fromEntries(Object.entries(sc).map(([kk, a]) => [kk, a ? a[k] : 0]))} /></tr>
          ))}</tbody>
          <caption style={{ captionSide: "bottom", textAlign: "left", fontSize: 12, color: "var(--text-muted)", paddingTop: 8 }}>Unidad: {c.unidad}. {nota}</caption>
        </table></div>
      </div>
      <div className="card">
        <h2>Un presidente, todas las variables</h2>
        <p className="note">Tocá un grupo para abrirlo y un encabezado para ordenar. La medida se aplica a los montos en pesos; los dólares no se pasan a dólares y los índices y porcentajes quedan como son.</p>
        <div className="controls">
          <select aria-label="Presidente" value={paPres.id} onChange={(ev) => set({ pap: ev.target.value === "milei" ? null : ev.target.value })}>
            {PRES.slice().reverse().map((x) => <option key={x.id} value={x.id}>{x.n}</option>)}
          </select>
          <select aria-label="Medida" value={paMed} onChange={(ev) => set({ pam: ev.target.value === "real" ? null : ev.target.value })}>
            {medsArs.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
          </select>
          <input type="search" aria-label="Buscar variable" placeholder="Buscar variable: asado, reservas, alquiler…" style={{ flex: 1, minWidth: 200 }} value={buscar} onChange={(ev) => setBuscar(ev.target.value)} />
          <button type="button" className="btn" onClick={() => setAbiertos(new Set(GRUPOS))}>Expandir todo</button>
          <button type="button" className="btn" onClick={() => setAbiertos(new Set())}>Contraer todo</button>
        </div>
        <div className="tablewrap"><table>
          <thead><tr><th>Variable</th><th style={{ textAlign: "left" }}>Unidad</th><Cabecera cols={cols} ord={ordA} onOrden={(k) => setOrdA(siguienteOrden(ordA, k))} /></tr></thead>
          <tbody>
            {filasA}
            {!total && <tr><td colSpan={nc} style={{ textAlign: "center", color: "var(--text-muted)" }}>Ninguna variable coincide con &quot;{buscar}&quot;.</td></tr>}
          </tbody>
        </table></div>
      </div>
      {metas.length === 0 && <Fragment />}
    </section>
  );
}
function alternar2(s: Set<string>, g: string): Set<string> { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; }
void unoDe;
