"use client";
// Página "Gobierno y Congreso" (/congreso/, bloque 6d): bancas propias y aliadas, leyes del Ejecutivo, DNU y vetos.
// Sin cuentas acá: todo sale de lib/capacidad.ts.
import { useEffect, useMemo, useState } from "react";
import { useCapacidad } from "../useCapacidad";
import { useSeccion } from "../useSeccion";
import { Cargando, Seg } from "../ui";
import { fmtMes, nf0, nf1, ok } from "@/lib/formato";
import {
  CAMARAS, INDICADORES, bancasDe, indicadorTieneDatos, mandatos, primerIndicadorConDatos, queHayCargado, pctAliados, pctPropios, quorumPct, resumenBancas, resumenDnu, resumenLeyes, resumenVetos, valorIndicador,
  type Camara, type DatosCap, type Indicador, type Mandato,
} from "@/lib/capacidad";
import { PRES_DEF, nombreCorto } from "@/lib/estadisticas";
import { unoDe, useParams } from "@/lib/url";

type Setter = (c: Record<string, string | null | undefined>) => void;
const SIN = <span title="sin dato cargado">—</span>;
const pc = (v: number | null | undefined) => (ok(v) ? `${nf0.format(v)} %` : null);
type ColClave = "dip" | "sen" | "leyes" | "dnu" | "vetos";
const IDS = PRES_DEF.map((p) => p.id);

/** Mes anterior a "AAAA-MM" (el mandato termina el mes antes de que asuma el siguiente). */
const mesAnterior = (f: string) => { const a = +f.slice(0, 4), m = +f.slice(5, 7); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`; };
const periodoDe = (m: Mandato) => `${fmtMes(m.ini)} a ${m.fin ? fmtMes(mesAnterior(m.fin)) : "hoy"}`;

/** Contenido de la ruta /congreso/: toma el último mes de los datos y los filtros de la URL. */
export function Congreso() {
  const [p, set, montado] = useParams();
  const sec = useSeccion([]);
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!sec.motor || !montado) return <Cargando />;
  return <GobiernoCongreso ultimo={sec.motor.F[sec.motor.F.length - 1]} p={p} set={set} />;
}

export function GobiernoCongreso({ ultimo, p, set }: { ultimo: string; p: URLSearchParams; set: Setter }) {
  const { datos, error } = useCapacidad();
  if (error) return <div className="card" id="congreso"><h2>Gobierno y Congreso</h2><p className="error" role="alert">{error}</p></div>;
  if (!datos) return <div className="card" id="congreso"><h2>Gobierno y Congreso</h2><Cargando /></div>;
  return <Cuerpo d={datos} ultimo={ultimo} p={p} set={set} />;
}

function Cuerpo({ d, ultimo, p, set }: { d: DatosCap; ultimo: string; p: URLSearchParams; set: Setter }) {
  const M = useMemo(() => mandatos(ultimo), [ultimo]);
  const primero = primerIndicadorConDatos(d, M);   // la página abre en el primer indicador que tenga datos, no en uno vacío
  const ind = unoDe<Indicador>(p.get("cgi"), ["bancas", "leyes", "dnu", "vetos"], primero);
  const sel = p.get("cgp") && IDS.includes(p.get("cgp") as string) ? (p.get("cgp") as string) : null;
  const hay: Record<Indicador, boolean> = { bancas: indicadorTieneDatos(d, "bancas", M), leyes: indicadorTieneDatos(d, "leyes", M), dnu: indicadorTieneDatos(d, "dnu", M), vetos: indicadorTieneDatos(d, "vetos", M) };
  const sinTotalVetos = M.some((x) => { const rv = resumenVetos(d, x.id, x); return !!rv && rv.total == null; });
  const [ord, setOrd] = useState<{ k: ColClave | null; d: number }>({ k: null, d: -1 });
  const valor = (m: Mandato, k: ColClave): number | null => {
    if (k === "dip" || k === "sen") return resumenBancas(d, m.id, k).alEmpezar;
    if (k === "leyes") return resumenLeyes(d, m.id)?.pct ?? null;
    if (k === "dnu") return resumenDnu(d, m.id, m)?.porAnio ?? null;
    const rv = resumenVetos(d, m.id, m);
    return rv ? rv.porAnio ?? rv.insistidosPorAnio : null;
  };
  const filas = ord.k ? [...M].sort((a, b) => {
    const x = valor(a, ord.k!), y = valor(b, ord.k!);
    if (!ok(x)) return 1;
    if (!ok(y)) return -1;
    return (x - y) * ord.d;
  }) : M;
  const orden = (k: ColClave) => setOrd(ord.k === k ? (ord.d === -1 ? { k, d: 1 } : { k: null, d: -1 }) : { k, d: -1 });
  const th = (k: ColClave, titulo: string, sub: string) => (
    <th aria-sort={ord.k === k ? (ord.d === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="th-orden" onClick={() => orden(k)}>{titulo}{ord.k === k ? (ord.d === 1 ? " ▲" : " ▼") : ""}<small>{sub}</small></button>
    </th>
  );
  const maxInd = Math.max(1, ...M.map((m) => valorIndicador(d, m.id, m, ind)?.v ?? 0));
  const cmax = ind === "bancas" || ind === "leyes" ? 100 : maxInd;

  return (
    <div className="card" id="congreso">
      <p className="note">Cuánto respaldo tuvo cada presidente en el Congreso y cómo gobernó con él: números crudos, sin puntaje. Tocá un presidente para ver su detalle.</p>
      <p className="note cg-cargado"><b>Qué hay cargado.</b> {queHayCargado(d, M).replace(/^Hay cargado: /, "")}</p>

      <div className="cg-tabla tablewrap fija"><table>
        <thead><tr>
          <th>Presidente</th>
          {hay.bancas && th("dip", "Diputados", "propios + aliados, al empezar · promedio")}
          {hay.bancas && th("sen", "Senado", "al empezar · promedio")}
          {hay.leyes && th("leyes", "Leyes del Ejecutivo", "aprobadas de enviadas")}
          {hay.dnu && th("dnu", "DNU", "total · por año")}
          {hay.vetos && th("vetos", "Vetos", sinTotalVetos ? "insistidos · por año" : "total · por año · insistidos")}
        </tr></thead>
        <tbody>{filas.map((m) => {
          const dip = resumenBancas(d, m.id, "dip"), sen = resumenBancas(d, m.id, "sen"), l = resumenLeyes(d, m.id), n = resumenDnu(d, m.id, m), v = resumenVetos(d, m.id, m);
          return (
            <tr key={m.id} className={sel === m.id ? "cg-sel" : undefined}>
              <td className="c-pres" title={m.n}>
                <button type="button" className="cg-pres" aria-pressed={sel === m.id} onClick={() => set({ cgp: sel === m.id ? null : m.id })}>
                  {nombreCorto(m.n) !== m.n ? <><span className="n-largo">{m.n}</span><span className="n-corto" aria-hidden>{nombreCorto(m.n)}</span></> : m.n}</button>
                <small className="c-per">{m.enCurso ? `${fmtMes(m.ini)} a hoy` : periodoDe(m)}</small>
              </td>
              {hay.bancas && <td>{ok(dip.alEmpezar) ? <>{pc(dip.alEmpezar)} · {pc(dip.promedio)}</> : SIN}</td>}
              {hay.bancas && <td>{ok(sen.alEmpezar) ? <>{pc(sen.alEmpezar)} · {pc(sen.promedio)}</> : SIN}</td>}
              {hay.leyes && <td>{l ? <>{nf0.format(l.aprobadas)} de {nf0.format(l.enviadas)} ({pc(l.pct)})</> : SIN}</td>}
              {hay.dnu && <td>{n ? <>{nf0.format(n.total)} · {nf1.format(n.porAnio as number)}</> : SIN}</td>}
              {hay.vetos && <td>{v ? (v.total != null ? <>{nf0.format(v.total)} ({nf0.format(v.totales as number)} tot. + {nf0.format(v.parciales as number)} parc.) · {nf1.format(v.porAnio as number)} · {nf0.format(v.insistidos)} insistidos</> : <>{nf0.format(v.insistidos)} insistidos<small>{nf1.format(v.insistidosPorAnio)} por año</small></>) : SIN}</td>}
            </tr>
          );
        })}</tbody>
      </table></div>
      {sinTotalVetos && hay.vetos && <p className="note">Falta cargar el total de vetos; solo se conocen los que el Congreso insistió.</p>}

      <div className="cg-movil">
        <div className="seg cg-ind" role="group" aria-label="Indicador">
          {INDICADORES.map(([v, t]) => (
            <button key={v} type="button" aria-pressed={ind === v} className={hay[v] ? undefined : "tenue"} onClick={() => set({ cgi: v === primero ? null : v })}>
              {t}{!hay[v] && <small>Todavía sin datos cargados</small>}</button>
          ))}
        </div>
        {!hay[ind] ? <p className="note">Todavía sin datos cargados de este indicador.</p> : <>
        <p className="note">{ind === "bancas" ? "Diputados: % de bancas propias y aliadas al asumir." : ind === "leyes" ? "Leyes del Ejecutivo aprobadas, en % de las enviadas." : ind === "dnu" ? "DNU por año de mandato." : sinTotalVetos ? "Vetos que el Congreso insistió, por año de mandato. Falta cargar el total de vetos; solo se conocen los insistidos." : "Vetos por año de mandato."}</p>
        <div className="pm-lista" role="list">{M.map((m) => {
          const x = valorIndicador(d, m.id, m, ind);
          return (
            <button key={m.id} type="button" role="listitem" className="pm-fila cg-fila" aria-pressed={sel === m.id} onClick={() => set({ cgp: sel === m.id ? null : m.id })}>
              <span className="pm-n">{m.n}<small>{m.enCurso ? `${fmtMes(m.ini)} a hoy` : periodoDe(m)}</small></span>
              <span className="pm-barra" aria-hidden>{x && <span className="pm-rel" style={{ left: 0, width: `${Math.min(100, (x.v / cmax) * 100)}%`, background: "var(--series-1)" }} />}</span>
              <span className="pm-v">{x ? x.txt : SIN}</span>
            </button>
          );
        })}</div></>}
      </div>

      <div id="cg-detalle">{sel ? <Detalle d={d} m={M.find((x) => x.id === sel)!} /> : <p className="note">Elegí un presidente para ver sus bancas año por año y sus DNU y vetos.</p>}</div>

      <details className="cg-como">
        <summary>¿Cómo se cuenta?</summary>
        <ol>
          <li><b>Propios:</b> bancas de los bloques que responden al frente o partido con el que el presidente llegó al cargo. Para Duhalde, que asumió por la Asamblea Legislativa, se toman los bloques del PJ.</li>
          <li><b>Aliados:</b> bancas de los bloques que integraban el interbloque o la coalición formal del oficialismo en cada corte. Se fija a mano por corte, con la fuente de cada asignación. No cuentan los acuerdos puntuales para una votación.</li>
          <li><b>Cortes:</b> la composición se toma al 1 de marzo de cada año (inicio de sesiones ordinarias) y el día que asume cada presidente. El «al empezar» es el corte de la asunción; el promedio usa todos los cortes del mandato.</li>
          <li><b>Porcentaje del total de la cámara</b> en ese corte, porque el tamaño cambió (Diputados pasó de 254 a 257 bancas; el Senado, de 48 a 72). Las bancas vacantes no se cuentan.</li>
          <li><b>Leyes del Ejecutivo:</b> enviadas = proyectos de ley con origen en el Poder Ejecutivo ingresados durante el mandato; aprobadas = las enviadas que se sancionaron antes de que terminara. El Presupuesto cuenta como cualquier otra ley.</li>
          <li><b>DNU:</b> decretos de necesidad y urgencia firmados en el mandato. Antes de la reforma de 1994 la figura no existía en la Constitución: para Menem 1 se usa el conteo de la fuente.</li>
          <li><b>Vetos:</b> leyes vetadas en el mandato, totales y parciales. Insistidos = leyes vetadas que el Congreso aprobó de nuevo con dos tercios en ambas cámaras (también las insistidas solo en parte), contadas para el presidente que vetó y por fecha del veto. Donde no hay fuente oficial de totales y parciales (desde 2003 no la encontramos) se muestran solo los insistidos.</li>
          <li><b>Por año de mandato:</b> DNU y vetos divididos por los años que duró el mandato (Duhalde duró 1,4 años); el mandato en curso se cuenta hasta el último dato.</li>
          <li>La configuración de inicio de mandato (T±N) no se aplica acá: un DNU es de quien lo firmó. Los interinatos de pocos días de diciembre de 2001 no son presidentes de la lista y lo que firmaron queda afuera.</li>
        </ol>
        <p className="note">
          Datos cargados a mano a partir de informes oficiales{d.ultima_carga ? `; última carga: ${d.ultima_carga}` : ""}. Fuentes:{" "}
          {(["bancas", "leyes", "dnu", "vetos"] as const).flatMap((k) => d.fuentes[k].map((u) => ({ k, u }))).map(({ k, u }, i) => (
            <span key={k + u}>{i ? " · " : ""}<a href={u} target="_blank" rel="noreferrer">{k} ({host(u)})</a></span>
          ))}
        </p>
      </details>
    </div>
  );
}

function host(u: string): string {
  try { return new URL(u).hostname; } catch { return u; }
}

function Detalle({ d, m }: { d: DatosCap; m: Mandato }) {
  const anios = useMemo(() => {
    const s = new Set<string>([...Object.keys(d.dnu[m.id] ?? {}), ...Object.keys(d.vetos[m.id] ?? {})]);
    return [...s].sort();
  }, [d, m]);
  const maxDnu = Math.max(1, ...anios.map((a) => d.dnu[m.id]?.[a] ?? 0));
  const maxVeto = Math.max(1, ...anios.map((a) => { const v = d.vetos[m.id]?.[a]; return v ? v.t != null ? (v.t as number) + (v.p as number) : v.i : 0; }));
  const nota = d.notas[m.id];
  return (
    <>
      <h3>{m.n}</h3>
      {nota && <p className="note">{nota}</p>}
      {CAMARAS.map(([cam, nom]) => <Apiladas key={cam} d={d} m={m} cam={cam} nom={nom} />)}
      <h4>DNU y vetos por año</h4>
      {anios.length === 0 ? <p className="note">Sin DNU ni vetos cargados.</p> : (
        <div className="cg-anual">
          {anios.map((a) => {
            const n = d.dnu[m.id]?.[a], v = d.vetos[m.id]?.[a];
            return (
              <div key={a} className="cg-anio">
                <b>{a}</b>
                <span className="pm-barra" aria-hidden>{n != null && <span className="pm-rel" style={{ left: 0, width: `${(n / maxDnu) * 100}%`, background: "var(--series-2)" }} />}</span>
                <span>{n != null ? `${nf0.format(n)} DNU` : "— DNU"}</span>
                <span className="pm-barra" aria-hidden>{v && <span className="pm-rel" style={{ left: 0, width: `${((v.t != null ? (v.t as number) + (v.p as number) : v.i) / maxVeto) * 100}%`, background: "var(--series-1)" }} />}</span>
                <span>{v ? (v.t != null ? `${nf0.format((v.t as number) + (v.p as number))} vetos${v.i ? `, ${nf0.format(v.i)} insistidos` : ""}` : `${nf0.format(v.i)} insistidos`) : "— vetos"}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Apiladas({ d, m, cam, nom }: { d: DatosCap; m: Mandato; cam: Camara; nom: string }) {
  const bs = bancasDe(d, m.id, cam);
  if (!bs.length) return <p className="note">{nom}: {SIN} sin bancas cargadas.</p>;
  const asuncion = d.bloques[`${bs[0].fecha}|${cam}`];
  return (
    <>
      <h4>{nom}: bancas propias y aliadas, en % de la cámara</h4>
      <div className="cg-apilado" role="img" aria-label={`Bancas de ${nom} durante ${m.n}`}>
        <span className="cg-lm" style={{ bottom: "calc(18px + (100% - 18px) / 2)" }} title="Mayoría (50 %)"><i>50 %</i></span>
        {bs.map((b) => (
          <div key={b.fecha} className="cg-col" title={`${b.fecha}: propios ${b.propios}, aliados ${b.aliados}, total ${b.total}`}>
            <span className="cg-lq" style={{ bottom: `${quorumPct(b.total)}%` }} />
            <div className="cg-pila">
              <span style={{ height: `${pctAliados(b)}%`, background: "var(--series-2)" }} />
              <span style={{ height: `${pctPropios(b)}%`, background: "var(--series-1)" }} />
            </div>
            <small>{b.fecha.slice(0, 7)}</small>
          </div>
        ))}
      </div>
      <p className="note"><span className="cg-ley" style={{ background: "var(--series-1)" }} /> propios <span className="cg-ley" style={{ background: "var(--series-2)" }} /> aliados · línea continua: mayoría (50 %); línea punteada: quórum (mitad más uno).</p>
      {asuncion && (
        <div className="tablewrap fija"><table>
          <caption style={{ captionSide: "top", textAlign: "left" }}>Bloques de {nom} al asumir ({bs[0].fecha})</caption>
          <thead><tr><th>Bloque</th><th>Bancas</th><th>Rol</th></tr></thead>
          <tbody>{asuncion.map((b) => <tr key={b.b}><td>{b.b}</td><td>{b.n}</td><td>{b.rol}</td></tr>)}</tbody>
        </table></div>
      )}
    </>
  );
}
