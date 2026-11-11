"use client";
import { Fragment, useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Desplegable, Selector, Seg, alternar } from "../ui";
import { BotonInfo, FilaVariable, RenglonVariable } from "../Variables";
import { Sparkline } from "../Sparkline";
import { BotonCompartir } from "../PanelCompartir";
import { IconoCompartir } from "../Iconos";
import { ContextoMandato } from "./ContextoMandato";
import { GobiernoCongreso } from "./GobiernoCongreso";
import { INFO_CORTA } from "@/lib/info";
import { CeldasStats, COLS, Cabecera, LineaInicio, siguienteOrden, useBase, valorCol, type Orden } from "./comunes";
import { fmtMes } from "@/lib/formato";
import { baseTxt, baseIdx, crearPres, nivelComparable, ordenar, rankScores, statsMandato, varNum, type Pres } from "@/lib/estadisticas";
import { grupoDe, medidaPara, ordenarGrupos, textoBusqueda } from "@/lib/catalogo";
import { norm } from "@/lib/formato";
import type { Expr } from "@/lib/motor";
import { useConfig } from "../ConfigProvider";
import { medidaPreferida, paramSi } from "@/lib/config";
import { decExpr, encExpr, lista, unoDe, useParams } from "@/lib/url";

const ABIERTOS = new Set(["Salarios", "Dólar y tipo de cambio", "Precios › Indicadores de inflación", "Actividad", "Empleo, pobreza e ingresos", "Mercados", "Fiscal", "Dinero y bancos (BCRA)"]);

export function Presidentes() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const { config } = useConfig();
  const info = useBase(p, set, montado), b = info.b;
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
  const eB: Expr = decExpr(p.get("pv"), existe) || { id: m.SER.sipa_med ? "sipa_med" : "sipa_prom", med: medidaPreferida(config), rel: null, modo: "compra", esc: "" };
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
  const medPref = medidaPreferida(config);
  const paMed = medsArs.some((o) => o[0] === p.get("pam")) ? (p.get("pam") as string) : medPref;
  const modoA = unoDe(p.get("pam2"), ["todas", "mis"] as const, "todas");
  const RECO_IDS = ["Salarios", "Precios", "Empleo, pobreza e ingresos", "Dólar y tipo de cambio", "Actividad"];
  const recomendadas: Expr[] = RECO_IDS.map((k) => INFO_CORTA[k]?.reco).filter((r) => r && m.SER[r.id]).map((r) => ({ id: r.id, med: r.med, rel: null, modo: "compra", esc: r.esc ?? "" }));
  const misPedidas = lista(p.get("pav")).map((x) => decExpr(x, existe)).filter(Boolean).slice(0, 10) as Expr[];
  const mis: Expr[] = misPedidas.length ? misPedidas : recomendadas;
  const setMis = (nv: Expr[]) => set({ pav: nv.map((e) => encExpr(e)).join(",") || null, pam2: "mis" });
  const mover = (k: number, d: number) => { const nv = mis.slice(); const j = k + d; if (j < 0 || j >= nv.length) return; [nv[k], nv[j]] = [nv[j], nv[k]]; setMis(nv); };
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
      <LineaInicio info={info} />
      <div className="controls">
        <Desplegable etiqueta="Presidentes y columnas">
          <div className="controls"><label>Presidentes</label><Seg valor={presSel} opciones={PRES.map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ pr: [...alternar(presSel, v)].join(",") })} /></div>
          <div className="controls"><label>Columnas</label><Seg valor={new Set(cols.map((x) => x[0]))} opciones={COLS} onElegir={(v) => set({ cl: [...alternar(new Set(cols.map((x) => x[0])), v)].join(",") })} /></div>
        </Desplegable>
      </div>
      <div className="callout">
        <b>Inicio</b> = {baseTxt(b)}: p.ej. para Milei, {bi("milei")}.
        {b.t0 === -1 && " Con T-1 la variación incluye todo lo que pasó en el mandato (p.ej. la devaluación de dic-2023 cuenta para Milei)."}
        {b.t0 === 0 && " El mes de asunción es un promedio que incluye días del antecesor."}
        {" "}Mínimo, máximo, promedio y mediana usan solo los meses del mandato. Verde y rojo indican si el cambio fue bueno o malo (un salario que sube es verde; precios, dólar o riesgo país que suben son rojos).
      </div>
      <div className="card">
        <h2>Una variable, todos los presidentes</h2><p className="note">Tocá un encabezado para ordenar.</p>
        <FilaVariable e={eB} onChange={(e) => e && set({ pv: encExpr(e) })} />
        <div className="controls">
          <BotonCompartir className="btn" titulo={`Primero los Datos: ${c.corto} por presidente`} href={() => window.location.href} deshabilitado={filasB.length === 0}
            title="Armar una imagen de esta tabla para compartir" aria-label="Compartir como imagen: una variable, todos los presidentes"
            crearVista={() => ({ tipo: "barras", expr: eB, presIds: filasB.map((o) => o.x.id), base: b })}><IconoCompartir />Compartir</BotonCompartir>
        </div>
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
          <Seg valor={modoA} opciones={[["todas", "Todas"], ["mis", "Mis variables"]]} onElegir={(v) => set({ pam2: v === "todas" ? null : v, pav: v === "mis" && !misPedidas.length ? recomendadas.map((e) => encExpr(e)).join(",") : undefined })} />
        </div>
        <div className="controls">
          <Selector etiqueta="Presidente" valor={paPres.id} opciones={PRES.slice().reverse().map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ pap: v === "milei" ? null : v })} />
          {modoA === "todas" && <Selector etiqueta="Medida" valor={paMed} opciones={medsArs.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => set({ pam: paramSi(v, "real", medPref) })} />}
          {modoA === "todas" && <input type="search" aria-label="Buscar variable" placeholder="Buscar variable: asado, reservas, alquiler…" style={{ flex: 1, minWidth: 200 }} value={buscar} onChange={(ev) => setBuscar(ev.target.value)} />}
          {modoA === "todas" && <button type="button" className="btn" onClick={() => setAbiertos(new Set(GRUPOS))}>Expandir todo</button>}
          {modoA === "todas" && <button type="button" className="btn" onClick={() => setAbiertos(new Set())}>Contraer todo</button>}
        </div>
        <ContextoMandato m={m} pres={paPres} />
        {modoA === "mis" ? (
          <>
            <p className="note">Hasta 10 variables de cualquier categoría, en el orden en que las agregás. El minigráfico va desde el inicio del mandato de {paPres.n} ({fmtMes(F[baseIdx(F, paPres, b)])}) hasta el cierre.{misPedidas.length ? "" : " Arrancás con las recomendadas de cada tema; cambialas, quitalas o agregá otras."}</p>
            <div className="tablewrap"><table>
              <thead><tr><th>Variable</th><Cabecera cols={cols} ord={{ k: null, d: -1 }} onOrden={() => {}} /><th>Mandato</th></tr></thead>
              <tbody>{mis.map((e, k) => {
                const cc = m.calc(e), st = statsMandato(F, cc.v, paPres, b);
                return (
                  <tr key={k + e.id}>
                    <td className="nombre">
                      <RenglonVariable e={e} sinRel quitable onChange={(ne) => setMis(ne ? mis.map((x, j) => (j === k ? ne : x)) : mis.filter((_, j) => j !== k))}
                        onMover={(d) => mover(k, d)} puedeSubir={k > 0} puedeBajar={k < mis.length - 1} />
                    </td>
                    <CeldasStats m={m} c={cc} st={st} cols={cols} />
                    <td><div className="spark"><Sparkline v={cc.v.slice(0, paPres.i1 + 1)} color={paPres.color} desde={baseIdx(F, paPres, b)} /></div></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
            {mis.length < 10 && <FilaVariable e={null} agregable textoAgregar="+ Agregar variable" onChange={(e) => e && setMis([...mis, e])} />}
            <div className="controls">
              <BotonCompartir className="btn" titulo={`Primero los Datos: ${paPres.n}`} href={() => window.location.href} deshabilitado={mis.length === 0}
                title="Armar una imagen de estas variables para compartir" aria-label={`Compartir como imagen: ${paPres.n}, variables elegidas`}
                crearVista={() => ({ tipo: "variables", presId: paPres.id, exprs: mis, base: b })}><IconoCompartir />Compartir</BotonCompartir>
            </div>
          </>
        ) : (
        <div className="tablewrap"><table>
          <thead><tr><th>Variable</th><th style={{ textAlign: "left" }}>Unidad</th><Cabecera cols={cols} ord={ordA} onOrden={(k) => setOrdA(siguienteOrden(ordA, k))} /></tr></thead>
          <tbody>
            {filasA}
            {!total && <tr><td colSpan={nc} style={{ textAlign: "center", color: "var(--text-muted)" }}>Ninguna variable coincide con &quot;{buscar}&quot;.</td></tr>}
          </tbody>
        </table></div>
        )}
      </div>
      <GobiernoCongreso ultimo={F[F.length - 1]} p={p} set={set} />
      {metas.length === 0 && <Fragment />}
    </section>
  );
}
function alternar2(s: Set<string>, g: string): Set<string> { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; }
void unoDe;
