"use client";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useSeccion } from "../useSeccion";
import { Cargando, Seg, alternar } from "../ui";
import { FilaVariable } from "../Variables";
import { ContextoMandato } from "./ContextoMandato";
import { LineaInicio, useBase } from "./comunes";
import { tinte, tinteRelativo } from "../util";
import { fmtMes, nf0, nf1, ok } from "@/lib/formato";
import { crearPres, mejorPeor, rankingPresidentes, tablasIndicadores, type CritRk, type FilaMP, type IndRk, type Pres, type TablaInd } from "@/lib/estadisticas";
import { crearIndicadores } from "@/lib/catalogo";
import type { Expr, Motor } from "@/lib/motor";
import { decExpr, encExpr, lista, unoDe, useParams } from "@/lib/url";

const CRIT_TXT: Record<CritRk, string> = {
  mejora: "cuánto mejoró o empeoró desde el inicio hasta el cierre (en porcentajes, la diferencia en puntos; en el resto, la variación anualizada)",
  nivel: "el nivel promedio del mandato (en montos en pesos corrientes, donde el nivel no se puede comparar entre épocas, se usa la mejora)",
  ambos: "el promedio de los dos puntajes de cada indicador: la mejora y el nivel promedio",
};
const MIN_V = 3, MAX_V = 20;
const hrefHist = (e: Expr) => `/historico/?v=${encodeURIComponent(encExpr({ ...e, med: e.med || undefined }))}`;

/** Lo mejor y lo peor de un gobierno: 5 indicadores de cada lado y la lista completa a pedido. */
function MejorPeor({ m, tablas, PRES, pres, crit }: { m: Motor; tablas: TablaInd[]; PRES: Pres[]; pres: Pres; crit: CritRk }) {
  const [todos, setTodos] = useState(false);
  const { mejores, peores } = useMemo(() => mejorPeor(tablas, PRES, pres, crit), [tablas, PRES, pres, crit]);
  const F = m.F;
  const mesC = (i?: number) => (i != null && i >= 0 ? <small>{fmtMes(F[i])}</small> : null);
  const pu = (x?: number, de?: number, pct?: number) => ok(x) ? <td style={tinte(((pct as number) - 50) / 50)}>{x}º de {de}</td> : <td style={{ color: "var(--text-muted)" }} title="El nivel no se puede comparar entre épocas">–</td>;
  const tabla = (titulo: string, filas: FilaMP[], bueno: boolean, vacio: string) => (
    <div>
      <h3>{titulo}</h3>
      <div className="tablewrap"><table>
        <thead><tr><th style={{ textAlign: "left" }}>Indicador</th><th>Inicio</th><th>Cierre</th><th>Cambio</th><th>Promedio</th><th>Puesto por mejora</th><th>Puesto por nivel</th></tr></thead>
        <tbody>
          {(todos ? filas : filas.slice(0, 5)).map((f) => (
            <tr key={f.grupo + f.nombre}>
              <td className="nombre"><Link prefetch={false} href={hrefHist(f.ind)}>{f.nombre}</Link><small>{f.grupo} · {f.c.unidad}</small></td>
              <td>{m.fmtC(f.c, f.d.st.ini)}{mesC(f.d.st.iniI)}</td><td>{m.fmtC(f.c, f.d.st.fin)}{mesC(f.d.st.finI)}</td>
              <td style={tinte(bueno ? 0.6 : -0.6)}>{m.variacionAbsTxt(f.c, f.d.st.ini ?? null, f.d.st.fin ?? null)}
                {f.d.enPuntos ? (f.d.st.ini! > 0 && f.d.st.fin! >= 0 ? <small>{nf0.format((f.d.st.fin! / f.d.st.ini! - 1) * 100)} % relativo</small> : null) : <small>{nf1.format(f.d.mejora * 100)} % anual</small>}</td>
              <td>{m.fmtC(f.c, f.d.st.prom)}</td>
              {pu(f.d.m_puesto, f.d.m_de, f.d.m_pct)}{pu(f.d.n_puesto, f.d.n_de, f.d.n_pct)}
            </tr>
          ))}
          {!filas.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>{vacio}</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
  return (
    <div className="mp-grid">
      {tabla("Lo mejor", mejores, true, "Sin indicadores que hayan mejorado")}
      {tabla("Lo peor", peores, false, "Sin indicadores que hayan empeorado")}
      <p className="note">Usa los indicadores principales de todos los grupos, no solo los filtrados arriba. Se ordenan por el puesto frente a los demás presidentes ({crit === "ambos" ? "promedio de mejora y nivel" : crit === "nivel" ? "nivel promedio" : "mejora"}).{" "}
        {(mejores.length > 5 || peores.length > 5) && <button type="button" className="enlace" onClick={() => setTodos(!todos)}>{todos ? "Ver solo los 5 primeros" : "Ver la lista completa"}</button>}</p>
    </div>
  );
}

export function Ranking() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const info = useBase(p, set, montado), b = info.b;
  const { motor: m, version } = sec;
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const I = useMemo(() => (m && !sec.ocupado ? crearIndicadores(m) : null), [m, sec.ocupado, version]);  // eslint-disable-line react-hooks/exhaustive-deps

  const tablasTodos = useMemo(() => (m && I ? tablasIndicadores(m, m.F, PRES, I.INDIC.map((i) => ({ ind: i as Expr, grupo: i.grupo, nombre: i.nombre })), b) : []), [m, PRES, I, b]);
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado || sec.ocupado || !I) return <Cargando />;

  const F = m.F;
  const crit = unoDe(p.get("rkc"), ["mejora", "nivel", "ambos"] as const, "mejora");
  const grupos = new Set(lista(p.has("rk") ? p.get("rk") : I.GRUPOS_IND.join(",")).filter((g) => I.GRUPOS_IND.includes(g)));
  const usaVars = p.has("rkv");
  const vars = lista(p.get("rkv")).map((s) => decExpr(s, (id) => !!m.SER[id])).filter(Boolean).slice(0, MAX_V) as Expr[];
  const inds: IndRk[] = usaVars
    ? vars.map((e, k) => ({ ind: e, grupo: "v" + k, nombre: m.calc(e).corto }))
    : I.INDIC.filter((i) => grupos.has(i.grupo)).map((i) => ({ ind: i as Expr, grupo: i.grupo, nombre: i.nombre }));
  const valido = !usaVars || vars.length >= MIN_V;
  const res = valido ? rankingPresidentes(m, F, PRES, inds, crit, b) : null;

  // El color del puntaje es relativo a la tabla: el mejor en el verde más fuerte y el peor en el rojo más fuerte.
  const puntajes = (res?.filas ?? []).map((f) => f.score as number).filter(ok);
  const minP = Math.min(...puntajes), maxP = Math.max(...puntajes);
  const abiertos = lista(p.get("rka")).filter((id) => res?.filas.some((f) => f.p.id === id));
  const alternarAb = (id: string) => set({ rka: (abiertos.includes(id) ? abiertos.filter((x) => x !== id) : [...abiertos, id]).join(",") || null });
  const porDefecto = ["sipa_med", "inflacion", "pob_tasa_pobreza_personas"].map((id) => I.INDIC.find((i) => i.id === id)).filter(Boolean) as Expr[];
  const cambiarModo = (v: string) => {
    if (v === "vars") set({ rkv: porDefecto.map((e) => encExpr(e)).join(",") });
    else set({ rkv: null });
  };
  const setVars = (nv: Expr[]) => set({ rkv: nv.map((e) => encExpr(e)).join(",") || "-" });
  const agregar = (e: Expr | null) => { if (e && vars.length < MAX_V) setVars([...vars, e]); };

  return (
    <section>
      <p className="sub">Un puntaje de 0 a 100 por presidente, armado con los indicadores que elijas. Cada presidente se evalúa con los mismos indicadores y el mismo criterio.</p>
      <div className="controls">
        <label>Qué entra</label>
        <Seg valor={usaVars ? "vars" : "grupos"} opciones={[["grupos", "Por grupos"], ["vars", "Elegir variables"]]} onElegir={cambiarModo} />
        <label>Criterio</label>
        <Seg valor={crit} opciones={[["mejora", "Mejora"], ["nivel", "Nivel promedio"], ["ambos", "Ambos"]]} onElegir={(v) => set({ rkc: v === "mejora" ? null : v })} />
      </div>
      {usaVars ? (
        <div className="card">
          <p className="note">Variables elegidas ({vars.length} de {MAX_V}; hacen falta al menos {MIN_V}). Cada una cuenta como su propio grupo.</p>
          {vars.map((e, k) => (
            <FilaVariable key={k + e.id} e={e} sinRel quitable onChange={(ne) => setVars(ne ? vars.map((x, j) => (j === k ? ne : x)) : vars.filter((_, j) => j !== k))} />
          ))}
          {vars.length < MAX_V && <FilaVariable e={null} agregable textoAgregar="+ Agregar variable" onChange={agregar} />}
        </div>
      ) : (
        <div className="controls"><label>Grupos de indicadores</label>
          <Seg valor={grupos} opciones={I.GRUPOS_IND.map((g) => [g, g] as [string, string])} onElegir={(v) => set({ rk: [...alternar(grupos, v)].join(",") })} /></div>
      )}
      <LineaInicio info={info} />
      <div className="card">
        <h2>Ranking de presidentes</h2>
        <p className="note">Para cada indicador se ordena a los presidentes según <b>{CRIT_TXT[crit]}</b> y se pasa a un puntaje de 0 (el peor) a 100 (el mejor). Se promedia dentro de cada grupo y después entre grupos, para que ningún grupo pese más por tener más series. <b>Ojo:</b> muchos datos empiezan en 2003, 2012 o 2016, así que Menem, De la Rúa y Duhalde se evalúan con pocos indicadores; Milei, con un mandato en curso; y el contexto internacional y la herencia de cada uno no entran en el número. <b>Cada presidente se evalúa con los mismos indicadores y el mismo criterio.</b>
          {res?.incompletas && usaVars ? " Algunas variables no tienen datos para todos los presidentes." : ""}</p>
        {!res ? <p className="note">Elegí al menos {MIN_V} variables para armar el ranking.</p> : (
          <>
          {abiertos.length > 0 && <div className="rk-abiertos"><button type="button" className="btn" onClick={() => set({ rka: null })}>Cerrar todos</button></div>}
          <div className="tablewrap"><table>
            <thead><tr><th>#</th><th>Presidente</th><th>Puntaje</th><th>Indicadores</th><th style={{ textAlign: "left" }}>Mejor en</th><th style={{ textAlign: "left" }}>Peor en</th></tr></thead>
            <tbody>{res.filas.map((f, k) => {
              const ab = abiertos.includes(f.p.id);
              return (
                <Fragment key={f.p.id}>
                  <tr className={`clic${ab ? " abierto" : ""}`} tabIndex={0} aria-expanded={ab} onClick={() => alternarAb(f.p.id)}
                    onKeyDown={(ev) => { if (ev.key === "Enter") alternarAb(f.p.id); }}>
                    <td>{k + 1}</td><td>{f.p.n}</td><td style={tinteRelativo(f.score as number, minP, maxP)}>{nf0.format(f.score as number)}</td><td>{f.items.length}</td>
                    <td className="unidad">{f.items.slice(0, 3).map((i) => i.nombre).join(" · ")}</td>
                    <td className="unidad">{f.items.slice(-3).reverse().map((i) => i.nombre).join(" · ")}</td>
                  </tr>
                  {ab && (
                    <tr><td colSpan={6}>
                      <ContextoMandato m={m} pres={PRES.find((x) => x.id === f.p.id) ?? f.p} />
                      <div className="tablewrap"><table>
                        <thead><tr><th style={{ textAlign: "left" }}>Indicador</th><th>Inicio</th><th>Cierre</th><th>Cambio</th><th>Puesto</th></tr></thead>
                        <tbody>{f.items.map((i) => (
                          <tr key={i.grupo + i.nombre}>
                            <td className="nombre">{i.nombre}<small>{usaVars ? i.c.unidad : i.grupo}</small></td>
                            <td>{m.fmtC(i.c, i.d.st.ini)}<small>{i.d.st.iniI != null ? fmtMes(F[i.d.st.iniI]) : ""}</small></td>
                            <td>{m.fmtC(i.c, i.d.st.fin)}<small>{i.d.st.finI != null ? fmtMes(F[i.d.st.finI]) : ""}</small></td>
                            <td style={tinte(i.d.bueno ? 0.6 : i.d.malo ? -0.6 : 0)}>{m.variacionAbsTxt(i.c, i.d.st.ini ?? null, i.d.st.fin ?? null)}</td>
                            <td style={tinte((i.pct - 50) / 50)}>{i.puesto}º de {i.de}</td>
                          </tr>
                        ))}</tbody>
                      </table></div>
                      <MejorPeor m={m} tablas={tablasTodos} PRES={PRES} pres={PRES.find((x) => x.id === f.p.id) ?? f.p} crit={crit} />
                    </td></tr>
                  )}
                </Fragment>
              );
            })}</tbody>
          </table></div>
          </>
        )}
      </div>
    </section>
  );
}
