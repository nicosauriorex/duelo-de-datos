"use client";
import { listables } from "@/lib/regiones";
import { esOculta } from "@/lib/nombres";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Desplegable, Selector, Seg, alternar } from "../ui";
import { BotonInfo, FilaVariable, RenglonVariable } from "../Variables";
import { Sparkline } from "../Sparkline";
import { Velas, type VelaDato } from "../Velas";
import { BotonCompartir } from "../PanelCompartir";
import { IconoCompartir } from "../Iconos";
import { ContextoMandato } from "./ContextoMandato";
import { INFO_CORTA } from "@/lib/info";
import { CeldaPresMandato, CeldaVar, CeldasStats, COLS, Cabecera, LineaInicio, comparativaDe, siguienteOrden, useBase, valorCol, type Orden } from "./comunes";
import { fmtMes } from "@/lib/formato";
import { baseIdx, claseVariacion, crearPres, nivelComparable, ordenar, statsMandato, varNum, type Pres } from "@/lib/estadisticas";
import { datosDesde, variacionMostrada } from "@/lib/tablas";
import { grupoDe, medidaPara, ordenarGrupos, textoBusqueda } from "@/lib/catalogo";
import { norm } from "@/lib/formato";
import type { Expr } from "@/lib/motor";
import { useConfig } from "../ConfigProvider";
import { medidaPreferida, paramSi } from "@/lib/config";
import { decExpr, encExpr, lista, unoDe, useParams } from "@/lib/url";

const menos = (t: string) => t.replace(/^-/, "−");

export function Presidentes() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const { config } = useConfig();
  const info = useBase(p, set, montado), b = info.b;
  const [ordB, setOrdB] = useState<Orden>({ k: null, d: -1 });
  const [ordA, setOrdA] = useState<Orden>({ k: null, d: -1 });
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set());   // al entrar, todos los grupos están contraídos
  const [tipo, setTipo] = useState("");
  const [editando, setEditando] = useState(false);
  const [buscar, setBuscar] = useState("");
  const { motor: m, metas } = sec;
  const PRES: Pres[] = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  // Congreso tiene su propia página: los links viejos `/presidentes/?...#congreso` pasan a `/congreso/?...` con los mismos parámetros.
  useEffect(() => { if (window.location.hash === "#congreso") window.location.replace(`/congreso/${window.location.search}`); }, []);

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
  const comp = comparativaDe(c, sts, niv);
  const filasB = ordenar(PRES.map((x, k) => ({ x, k })).filter((o) => presSel.has(o.x.id)), ordB, (o) => valorCol(c, sts[o.k], ordB.k));
  const nota = (!dir ? "Sin verde ni rojo: para esta variable subir o bajar no es ni bueno ni malo en sí mismo; las marcas dicen “más alto” y “más bajo”."
    : `Verde = mejor y rojo = peor entre todos los presidentes; la marca “mejor” o “peor” señala el extremo de cada columna${niv ? "" : "; en montos corrientes solo se compara la variación (los niveles no se pueden comparar con inflación de por medio)"}.`)
    + " Barra: crece desde la izquierda según el valor entre el menor y el mayor de la columna (en Variación, con subas y bajas, sale del cero hacia cada lado)" + (dir ? "; su color va del rojo (el peor) al verde (el mejor), pasando por el amarillo." : "; en gris.");
  const vista = unoDe(p.get("pvista"), ["tabla", "velas"] as const, "tabla");
  // velas: solo presidentes con datos; el resto se lista al pie
  const velas: VelaDato[] = [], velasSin: string[] = [];
  filasB.forEach(({ x, k }) => {
    const st = sts[k];
    if (!st.n || st.ini == null || st.fin == null || st.min == null || st.max == null) { velasSin.push(x.n); return; }
    velas.push({
      id: x.id, nombre: x.n, periodo: `${fmtMes(F[st.iniI as number])} a ${fmtMes(F[st.finI as number])}`, ini: st.ini, fin: st.fin, min: st.min, max: st.max,
      iniTxt: m.fmtC(c, st.ini), finTxt: m.fmtC(c, st.fin), minTxt: m.fmtC(c, st.min), maxTxt: m.fmtC(c, st.max),
      variacion: varNum(c, st) == null ? "–" : menos(variacionMostrada(m, c, st.ini, st.fin)), cls: claseVariacion(c.dir, c.pct, st.ini, st.fin), nota: datosDesde(F, c.v, x),
    });
  });
  // Compartir comparte lo que se ve: la tabla, o las velas. Si las velas no se pueden dibujar (pesos corrientes o sin datos), no hay nada para compartir.
  const sinVelas = vista === "velas" && (!niv || velas.length === 0);
  const compartirB = (
    <BotonCompartir className="btn" titulo={`Primero los Datos: ${c.corto} por presidente${vista === "velas" ? " (velas)" : ""}`} href={() => window.location.href} deshabilitado={filasB.length === 0 || sinVelas}
      title={sinVelas ? "Las velas no se pueden armar con estos datos: no hay nada para compartir" : vista === "velas" ? "Armar una imagen de estas velas para compartir" : "Armar una imagen de esta tabla para compartir"}
      aria-label={`Compartir como imagen: una variable, todos los presidentes, en ${vista === "velas" ? "velas" : "tabla"}`}
      crearVista={() => ({ tipo: vista === "velas" ? "velas" : "barras", expr: eB, presIds: filasB.map((o) => o.x.id), base: b })}><IconoCompartir />Compartir</BotonCompartir>
  );

  // ---- tabla A: un presidente, todas las variables
  const paPres = PRES.find((x) => x.id === p.get("pap")) || PRES[PRES.length - 1];
  const medsArs = m.medArs();
  const medPref = medidaPreferida(config);
  const paBi = baseIdx(F, paPres, b), paFin = Math.min(paPres.i1, F.length - 1), paCierra = paPres.i1 < F.length - 1;
  const textoPaPres = `${paPres.n}: de ${fmtMes(F[paBi])} (mes inicial) ${paCierra ? `a ${fmtMes(F[paFin])} (fin del mandato)` : "a hoy (último dato de cada variable)"}`;
  /** Cuando los datos de la variable no cubren todo el período, la fila lo dice. */
  const rango = (st: ReturnType<typeof statsMandato>) => {
    if (!st.n) return null;
    const desde = st.iniI != null && st.iniI > paBi, hasta = st.finI != null && st.finI < paFin;
    return desde || hasta ? <small className="c-per">{desde && hasta ? `datos de ${fmtMes(F[st.iniI as number])} a ${fmtMes(F[st.finI as number])}` : desde ? `datos desde ${fmtMes(F[st.iniI as number])}` : `datos hasta ${fmtMes(F[st.finI as number])}`}</small> : null;
  };
  const paMed = medsArs.some((o) => o[0] === p.get("pam")) ? (p.get("pam") as string) : medPref;
  const modoA = unoDe(p.get("pam2"), ["todas", "mis"] as const, "todas");
  const RECO_IDS = ["Salarios", "Precios", "Empleo, pobreza e ingresos", "Dólar y tipo de cambio", "Actividad"];
  const recomendadas: Expr[] = RECO_IDS.map((k) => INFO_CORTA[k]?.reco).filter((r) => r && m.SER[r.id]).map((r) => ({ id: r.id, med: r.med, rel: null, modo: "compra", esc: r.esc ?? "" }));
  const misPedidas = lista(p.get("pav")).map((x) => decExpr(x, existe)).filter(Boolean).slice(0, 10) as Expr[];
  const mis: Expr[] = misPedidas.length ? misPedidas : recomendadas;
  const setMis = (nv: Expr[]) => set({ pav: nv.map((e) => encExpr(e)).join(",") || null, pam2: "mis" });
  const mover = (k: number, d: number) => { const nv = mis.slice(); const j = k + d; if (j < 0 || j >= nv.length) return; [nv[k], nv[j]] = [nv[j], nv[k]]; setMis(nv); };
  const toks = norm(buscar.trim()) ? norm(buscar.trim()).split(/\s+/) : [];
  // Una fila por rubro o producto (sin repetir regiones). La inflación va como mensual e interanual; el índice de precios no se lista.
  const todasSer = Object.values(m.SER);
  const series = [...(listables(todasSer) as typeof todasSer).filter((s) => s.id !== "ipc_empalme"), ...todasSer.filter((s) => esOculta(s.id))];
  const GRUPOS = ordenarGrupos([...new Set(series.map(grupoDe))]);
  const nc = cols.length + 1;
  const filasA: React.ReactNode[] = [];
  let total = 0;
  GRUPOS.forEach((g) => {
    if (tipo && g !== tipo) return;
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
      <tr key={s.id}><CeldaVar nombre={s.n} unidad={cc.unidad} info={<BotonInfo id={s.id} />} extra={rango(st)} /><CeldasStats m={m} c={cc} st={st} cols={cols} /></tr>,
    ));
  });

  const columnas = <div className="controls"><label>Columnas</label><Seg valor={new Set(cols.map((x) => x[0]))} opciones={COLS} onElegir={(v) => set({ cl: [...alternar(new Set(cols.map((x) => x[0])), v)].join(",") })} /></div>;
  const enEdicion = editando || mis.length === 0;   // sin variables propias, se abre directo en modo edición

  return (
    <section>
      <div className="controls">
        <Desplegable etiqueta="Presidentes y columnas">
          <div className="controls"><label>Presidentes</label><Seg valor={presSel} opciones={PRES.map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ pr: [...alternar(presSel, v)].join(",") })} /></div>
          {columnas}
        </Desplegable>
      </div>
      <div className="card">
        <h2>Una variable, todos los presidentes</h2>
        <LineaInicio info={info} F={F}>
          <p className="note">Mínimo, máximo, promedio y mediana usan solo los meses del mandato. Verde y rojo indican si el cambio fue bueno o malo (un salario que sube es verde; precios, dólar o riesgo país que suben son rojos).</p>
        </LineaInicio>
        <FilaVariable e={eB} onChange={(e) => e && set({ pv: encExpr(e) })} />
        <div className="controls">
          <Seg valor={vista} opciones={[["tabla", "Tabla"], ["velas", "Velas"]]} onElegir={(v) => set({ pvista: v === "tabla" ? null : v })} />
          {compartirB}
        </div>
        {vista === "tabla" ? (
          <>
            <p className="note">Tocá un encabezado para ordenar.</p>
            <div className="tablewrap fija"><table>
              <thead><tr><th>Presidente</th><Cabecera cols={cols} ord={ordB} onOrden={(k) => setOrdB(siguienteOrden(ordB, k))} /></tr></thead>
              <tbody>{filasB.map(({ x, k }) => (
                <tr key={x.id}><CeldaPresMandato x={x} F={F} arr={c.v} />
                  <CeldasStats m={m} c={c} st={sts[k]} cols={cols} comp={{ cols: comp, k }} /></tr>
              ))}</tbody>
            </table></div>
          </>
        ) : !niv ? (
          <p className="note">En montos corrientes los valores de épocas distintas no se pueden poner en una misma escala (hay inflación de por medio). Elegí una medida real o un índice, o mirá la vista Tabla, que compara las variaciones.</p>
        ) : velas.length ? (
          <Velas velas={velas} sinDatos={velasSin} unidad={c.unidad} minEscala={m.fmtC(c, Math.min(...velas.map((v) => v.min)))} maxEscala={m.fmtC(c, Math.max(...velas.map((v) => v.max)))} />
        ) : <p className="note">Ningún presidente elegido tiene datos de esta variable.</p>}
        <p className="note" style={{ marginTop: "var(--e-2)" }}>Unidad: {c.unidad}. {vista === "tabla" ? nota : "Verde = mejoró y rojo = empeoró entre el inicio y el cierre del mandato; el signo del cambio también está escrito."}</p>
      </div>
      <div className="card">
        <h2>Un presidente, todas las variables</h2>
        <div className="controls">
          <Seg valor={modoA} opciones={[["todas", "Todas"], ["mis", "Mis variables"]]} onElegir={(v) => set({ pam2: v === "todas" ? null : v, pav: v === "mis" && !misPedidas.length ? recomendadas.map((e) => encExpr(e)).join(",") : undefined })} />
        </div>
        <div className="controls">
          <Selector etiqueta="Presidente" valor={paPres.id} opciones={PRES.slice().reverse().map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ pap: v === "milei" ? null : v })} />
          <Desplegable etiqueta="Personalizar">
            {modoA === "todas" && <div className="controls"><label>Moneda</label><Selector etiqueta="Medida" valor={paMed} opciones={medsArs.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => set({ pam: paramSi(v, "real", medPref) })} /></div>}
            {modoA === "todas" && <p className="note">La medida se aplica a los montos en pesos; los dólares no se pasan a dólares y los índices y porcentajes quedan como son.</p>}
            {columnas}
          </Desplegable>
        </div>
        {modoA === "todas" && (
          <>
            <div className="controls pp-filtros">
              <input type="search" aria-label="Buscar variable" placeholder="Buscar variable: asado, reservas, alquiler…" value={buscar} onChange={(ev) => setBuscar(ev.target.value)} />
              <Selector etiqueta="Tipo de variable" valor={tipo} opciones={[["", "Todos los tipos"], ...GRUPOS.map((g) => [g, g] as [string, string])]} onElegir={setTipo} />
              <button type="button" className="btn" onClick={() => setAbiertos(new Set(GRUPOS))}>Expandir todas</button>
              <button type="button" className="btn" onClick={() => setAbiertos(new Set())}>Contraer todas</button>
            </div>
            <p className="note">Tocá un grupo para abrirlo y un encabezado para ordenar.</p>
          </>
        )}
        <LineaInicio info={info} F={F} texto={textoPaPres} sinAviso />
        <ContextoMandato m={m} pres={paPres} />
        {modoA === "mis" ? (
          <>
            <p className="note">Hasta 10 variables de cualquier categoría. El minigráfico va desde el inicio del mandato de {paPres.n} ({fmtMes(F[paBi])}) hasta el cierre.{misPedidas.length ? "" : " Arrancás con las recomendadas de cada tema; cambialas, quitalas o agregá otras."}</p>
            <div className="tablewrap fija"><table>
              <thead><tr><th>Variable</th>{!enEdicion && <Cabecera cols={cols} ord={{ k: null, d: -1 }} onOrden={() => {}} />}{!enEdicion && <th>Mandato</th>}</tr></thead>
              <tbody>{mis.map((e, k) => {
                const cc = m.calc(e), st = statsMandato(F, cc.v, paPres, b);
                if (enEdicion) return (
                  <tr key={k + e.id}>
                    <td className="nombre c-mis">
                      <RenglonVariable e={e} sinRel quitable onChange={(ne) => setMis(ne ? mis.map((x, j) => (j === k ? ne : x)) : mis.filter((_, j) => j !== k))}
                        onMover={(d) => mover(k, d)} puedeSubir={k > 0} puedeBajar={k < mis.length - 1} />
                    </td>
                  </tr>
                );
                return (
                  <tr key={k + e.id}>
                    <CeldaVar nombre={cc.corto} unidad={cc.unidad} info={<BotonInfo id={e.id} />} extra={rango(st)} />
                    <CeldasStats m={m} c={cc} st={st} cols={cols} />
                    <td><div className="spark"><Sparkline v={cc.v.slice(0, paPres.i1 + 1)} color={paPres.color} desde={paBi} /></div></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
            {enEdicion && mis.length < 10 && <FilaVariable e={null} agregable textoAgregar="+ Agregar variable" onChange={(e) => e && setMis([...mis, e])} />}
            <div className="controls">
              {enEdicion
                ? <button type="button" className="btn primario" onClick={() => setEditando(false)}>Guardar</button>
                : <button type="button" className="btn" onClick={() => setEditando(true)}>Editar mis variables</button>}
              {!enEdicion && <BotonCompartir className="btn" titulo={`Primero los Datos: ${paPres.n}`} href={() => window.location.href} deshabilitado={mis.length === 0}
                title="Armar una imagen de estas variables para compartir" aria-label={`Compartir como imagen: ${paPres.n}, variables elegidas`}
                crearVista={() => ({ tipo: "variables", presId: paPres.id, exprs: mis, base: b })}><IconoCompartir />Compartir</BotonCompartir>}
            </div>
          </>
        ) : (
        <div className="tablewrap fija"><table>
          <thead><tr><th>Variable</th><Cabecera cols={cols} ord={ordA} onOrden={(k) => setOrdA(siguienteOrden(ordA, k))} /></tr></thead>
          <tbody>
            {filasA}
            {!total && <tr><td colSpan={nc} style={{ textAlign: "center", color: "var(--text-muted)" }}>Ninguna variable coincide con &quot;{buscar}&quot;.</td></tr>}
          </tbody>
        </table></div>
        )}
      </div>
      {metas.length === 0 && <Fragment />}
    </section>
  );
}
function alternar2(s: Set<string>, g: string): Set<string> { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; }
void unoDe;
