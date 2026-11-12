"use client";
// Ficha del dato: una variable vista de las tres formas fuertes del sitio, una debajo de la otra (también en celular):
// Histórico (dato, contexto y gráfico), Por presidente (tabla resumida o velas) y Meses de mandato (presidentes desde el mes 0).
// Cada bloque tiene su Compartir (las mismas imágenes de cada sección) y "Abrir completo", que lleva a la sección con la variable ya cargada.
// Solo lo simple: las opciones de cada sección están en "Abrir completo". La usan la página de cada tema y la ruta /dato/.
import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useSeccion } from "./useSeccion";
import { useConfig } from "./ConfigProvider";
import { Cargando, Seg } from "./ui";
import { Grafico, type Fila, type OpcionesG, type SerieG } from "./Grafico";
import { Velas } from "./Velas";
import { BotonCompartir } from "./PanelCompartir";
import { IconoCompartir, IconoIr } from "./Iconos";
import { PALETA, vcolor } from "./util";
import { COLS, CeldaPres, CeldasStats, LineaInicio, type InicioMandato } from "./secciones/comunes";
import { unoDe } from "@/lib/url";
import { baseDeConfig } from "@/lib/config";
import { contextoDato } from "@/lib/contexto-dato";
import { PRES_DEF, TITULOS_MANDATO, crearPres, etiqueta, franjasPres, nivelComparable, nombreCorto, statsMandato } from "@/lib/estadisticas";
import { fmtMes } from "@/lib/formato";
import { frecuenciaOrigen, textoTemporalidad } from "@/lib/historico";
import { datoFijoDe, hrefFijo } from "@/lib/datos-fijos";
import { fmtEjeDe, notaInflacion } from "@/lib/imagen-datos";
import type { Expr, Motor } from "@/lib/motor";
import { datosDesde, periodoMandato } from "@/lib/tablas";
import { hrefHistorico, idsDe } from "@/lib/temas";
import { historicoFicha, hrefMandatoDe, hrefPresidentesDe, mandatoFicha, paramsInicio, sinMandatoTxt, velasDe } from "@/lib/ficha";

type SetFn = (cambios: Record<string, string | null | undefined>) => void;
type Titulo = "h2" | "h3";
const COLS_PRES = COLS.slice(0, 3);   // Inicio, Cierre y Variación
const absoluto = (href: string) => () => window.location.origin + href;
/** Link que dan Compartir y "Copiar link": si la variable es un dato fijo, su página propia (/dato/<slug>/, con vista previa en redes)
 *  con lo que se está viendo (vista, presidente resaltado, inicio de mandato); si no, la sección con la variable. */
const linkCompartir = (e: Expr, seccion: string, extra: Record<string, string> = {}) => {
  const fijo = datoFijoDe(e);
  return absoluto(fijo ? hrefFijo(fijo.slug, extra) : seccion);
};

/** La ficha de una variable. `p`/`set` son los de la página (la vista Tabla o Velas se guarda en `pvista`, como en Por presidente).
 *  `info`: inicio de mandato de la página (`useBase`). `pd`: presidente que se resalta en la tabla y se suma a Meses de mandato. `nivel`: de qué nivel son los títulos de los bloques. */
export function FichaDato({ e, info, p, set, pd = null, nivel = 3 }: {
  e: Expr; info: InicioMandato; p: URLSearchParams; set: SetFn; pd?: string | null; nivel?: 2 | 3;
}) {
  const ids = useMemo(() => idsDe(e), [e]);
  const sec = useSeccion(ids);
  const { motor: m, version } = sec;
  const H: Titulo = nivel === 2 ? "h2" : "h3";
  const error = sec.archivos.some((a) => sec.errores[a]);
  if (!m || sec.ocupado || !m.SER[e.id] || (e.rel && !m.SER[e.rel])) {
    return error && !sec.ocupado
      ? <p className="error" role="alert">Los datos de esta variable no se pudieron cargar. Probá de nuevo más tarde o recargá la página.</p>
      : <Cargando />;
  }
  const inicio = paramsInicio(p);
  return (
    <div className="ficha-dato">
      <BloqueHistorico m={m} e={e} version={version} H={H} />
      <BloquePresidentes m={m} e={e} info={info} H={H} pd={pd} inicio={inicio}
        velas={unoDe(p.get("pvista"), ["tabla", "velas"] as const, "tabla") === "velas"} onVista={(v) => set({ pvista: v ? "velas" : null })} />
      <BloqueMandato m={m} e={e} info={info} H={H} pd={pd} inicio={inicio} version={version} />
    </div>
  );
}

/** Un bloque de la ficha: título, contenido y, debajo, Compartir y "Abrir completo" (siempre en el mismo lugar). */
function Bloque({ H, titulo, extra, acciones, children }: { H: Titulo; titulo: string; extra?: ReactNode; acciones?: ReactNode; children: ReactNode }) {
  return (
    <section className="ficha-bloque" aria-label={titulo}>
      <div className="ficha-cab"><H className="ficha-titulo">{titulo}</H>{extra}</div>
      {children}
      {acciones && <div className="ficha-acciones">{acciones}</div>}
    </section>
  );
}
function Acciones({ compartir, href, donde }: { compartir: ReactNode; href: string; donde: string }) {
  return (
    <>
      {compartir}
      <Link prefetch={false} className="btn" href={href} aria-label={`Abrir completo en ${donde}`}>Abrir completo<IconoIr /></Link>
    </>
  );
}

// ------------------------------------------------------------ 1. Histórico: el dato, su contexto y el gráfico de la serie
function BloqueHistorico({ m, e, version, H }: { m: Motor; e: Expr; version: number; H: Titulo }) {
  const { config } = useConfig();
  const kE = `${e.id}~${e.med}~${e.rel}~${e.modo}~${e.esc}`;
  const D = useMemo(() => {
    const c = m.calc(e);
    const { E, rows } = historicoFicha(m, c, config.desde);
    const fmt = (v: number) => m.fmtC(c, v);
    const series: SerieG[] = [{ key: "s0", name: c.corto, color: PALETA[0], fmt }];
    const opts: OpcionesG = { fmtAxis: fmtEjeDe(c), fmtTip: fmt, tipTitle: etiqueta, label: c.corto,
      marcas: [{ key: "s0", color: PALETA[0], fmt, tipos: new Set(["ult", "max", "min"]) }] };
    const temporal = textoTemporalidad({ freq: "M", ag: "promedio", meses: E.meses, suma: !!c.flujo, origen: frecuenciaOrigen(c.v) });
    const inf = notaInflacion([c], false);
    const nota = `${c.unidad}.${inf ? " " + inf : ""} Fuente: ${c.serie.fuente}.`;
    return { c, E, rows, series, opts, temporal, nota, ctx: contextoDato(m, e) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, kE, config.desde]);
  const franjas = useMemo(() => (config.franjas ? franjasPres(m.F, baseDeConfig(config, PRES_DEF.map((x) => x.id))) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.franjas, m, config.t0, JSON.stringify(config.t0p)]);
  const opts = useMemo(() => (franjas ? { ...D.opts, franjas } : D.opts), [D.opts, franjas]);
  const { c, E, ctx } = D;
  const href = hrefHistorico(e);
  return (
    <Bloque H={H} titulo="Histórico" acciones={
      <Acciones donde="Histórico" href={href} compartir={
        <BotonCompartir className="btn" titulo={c.nombre} href={linkCompartir(e, href)} title="Armar una imagen de este gráfico para compartir" aria-label="Compartir como imagen: histórico"
          crearVista={() => ({ exprs: [e], modo: "valor", eje: "propia", desde: E.desde, hasta: E.hasta, meses: E.meses, freq: "M", ag: "promedio" })}><IconoCompartir />Compartir</BotonCompartir>} />}>
      {ctx && (
        <div className="vs-cab ficha-cifra">
          <p className="vs-cifra"><span className="v">{ctx.valor}</span><span className="mes">{ctx.mes}{ctx.ultimoDisponible ? " · Último dato disponible" : ""}</span></p>
          {ctx.frases.map((f) => <p key={f.texto} className={`vs-frase${f.cls ? " var-" + f.cls : ""}`}>{f.texto}</p>)}
        </div>
      )}
      <p className="temporal">{D.temporal}</p>
      <div className="card card-simple">
        <Grafico rows={D.rows} series={D.series} opts={opts} />
        <p className="note">{D.nota}</p>
      </div>
    </Bloque>
  );
}

// ------------------------------------------------------------ 2. Por presidente: Inicio, Cierre y Variación de cada mandato, en tabla o en velas
function BloquePresidentes({ m, e, info, H, pd, inicio, velas: enVelas, onVista }: {
  m: Motor; e: Expr; info: InicioMandato; H: Titulo; pd: string | null; inicio: Record<string, string>; velas: boolean; onVista: (velas: boolean) => void;
}) {
  const F = m.F, c = m.calc(e);
  const todas = crearPres(F).map((x) => ({ x, st: statsMandato(F, c.v, x, info.b) }));
  const filas = todas.filter((f) => f.st.n > 0);
  if (!filas.length) {
    return <Bloque H={H} titulo="Por presidente"><p className="note">Este dato no tiene valores en ningún mandato desde 1989.</p></Bloque>;
  }
  const niv = nivelComparable(m, e);
  const { velas, sin } = velasDe(m, c, todas);   // como Por presidente: los que no tienen datos se listan al pie de las velas
  const sinVelas = enVelas && (!niv || velas.length === 0);
  const href = hrefPresidentesDe(e, enVelas, inicio);
  const destacado = filas.find((f) => f.x.id === pd)?.x;
  return (
    <Bloque H={H} titulo="Por presidente"
      extra={<Seg valor={enVelas ? "velas" : "tabla"} opciones={[["tabla", "Tabla"], ["velas", "Velas"]]} onElegir={(v) => onVista(v === "velas")} />}
      acciones={<Acciones donde="Por presidente" href={href} compartir={
        <BotonCompartir className="btn" titulo={`Primero los Datos: ${c.corto} por presidente${enVelas ? " (velas)" : ""}`} href={linkCompartir(e, href, { ...inicio, ...(enVelas ? { pvista: "velas" } : {}), ...(pd ? { pd } : {}) })} deshabilitado={sinVelas}
          title={sinVelas ? "Las velas no se pueden armar con estos datos: no hay nada para compartir" : enVelas ? "Armar una imagen de estas velas para compartir" : "Armar una imagen de esta tabla para compartir"}
          aria-label={`Compartir como imagen: por presidente, en ${enVelas ? "velas" : "tabla"}`}
          crearVista={() => ({ tipo: enVelas ? "velas" : "barras", expr: e, presIds: filas.map((f) => f.x.id), base: info.b })}><IconoCompartir />Compartir</BotonCompartir>} />}>
      <LineaInicio info={info} F={F} />
      {destacado && <p className="note">Resaltado: {destacado.n}.</p>}
      {!enVelas ? (
        <div className="tablewrap fija"><table>
          <thead><tr><th>Presidente</th>{COLS_PRES.map(([k, n]) => <th key={k}>{n}</th>)}</tr></thead>
          <tbody>{filas.map(({ x, st }) => (
            <tr key={x.id}>
              <CeldaPres n={x.n} corto={x.corto} periodo={periodoMandato(F, x)} aparte={datosDesde(F, c.v, x)} sel={x.id === pd} />
              <CeldasStats m={m} c={c} st={st} cols={COLS_PRES} />
            </tr>
          ))}</tbody>
        </table></div>
      ) : !niv ? (
        <p className="note">En montos corrientes los valores de épocas distintas no se pueden poner en una misma escala (hay inflación de por medio). Elegí una medida real o un índice en &quot;Abrir completo&quot;, o mirá la vista Tabla, que compara las variaciones.</p>
      ) : velas.length ? (
        <Velas velas={velas} sinDatos={sin} unidad={c.unidad} minEscala={m.fmtC(c, Math.min(...velas.map((v) => v.min)))} maxEscala={m.fmtC(c, Math.max(...velas.map((v) => v.max)))} />
      ) : <p className="note">Ningún presidente tiene datos completos de esta variable.</p>}
      <p className="note">Unidad: {c.unidad}.{!enVelas ? " Variación: del inicio al cierre de cada mandato; verde = mejoró y rojo = empeoró, con el signo escrito." : ""}</p>
    </Bloque>
  );
}

// ------------------------------------------------------------ 3. Meses de mandato: cada presidente desde su mes 0, con los valores por defecto de esa sección
function BloqueMandato({ m, e, info, H, pd, inicio, version }: { m: Motor; e: Expr; info: InicioMandato; H: Titulo; pd: string | null; inicio: Record<string, string>; version: number }) {
  const b = info.b;
  const PRES = useMemo(() => crearPres(m.F), [m]);
  const kE = `${e.id}~${e.med}~${e.rel}~${e.modo}~${e.esc}`;
  const D = useMemo(() => {
    const PRES_T0 = PRES.filter((x) => m.idxDe(x.ini) > 0);
    const r = mandatoFicha(m, PRES, PRES_T0, e, b, pd);
    if (!r) return null;
    const series: SerieG[] = r.pres.map((x) => ({ key: x.id, name: x.n, short: nombreCorto(x.n), color: x.color, dash: x.dash }));
    const opts: OpcionesG = {
      xVals: r.rows.map((f) => f.t as number), endLabels: true, log: r.usarLog, refLine: r.ref, fmtAxis: r.fmtAxis, fmtTip: r.fmtTip, fmtAxis2: null, label: r.c.corto,
      xLabel: (f: Fila) => (f.t % r.paso === 0 ? (f.t === 0 ? "Mes 0" : String(f.t)) : ""),
      tipTitle: (f: Fila) => `Mes ${f.t}`,
      tipSub: (f: Fila, se: SerieG) => (f["_f_" + se.key] ? ` <small style="color:var(--text-muted)">${fmtMes(f["_f_" + se.key])}</small>` : ""),
    };
    return { ...r, series, opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, kE, b, pd, PRES]);
  if (!D) {
    const c = m.calc(e);
    return <Bloque H={H} titulo="Meses de mandato"><p className="note">{sinMandatoTxt(m, c, frecuenciaOrigen(c.v))}</p></Bloque>;
  }
  const href = hrefMandatoDe(e, { mp: D.mp, anc: D.ancParam }, inicio);
  return (
    <Bloque H={H} titulo="Meses de mandato" acciones={
      <Acciones donde="Meses de mandato" href={href} compartir={
        <BotonCompartir className="btn" titulo={`Primero los Datos: ${D.c.corto} por mes de mandato`} href={linkCompartir(e, href, { ...inicio, ...(pd ? { pd } : {}) })}
          title="Armar una imagen de este gráfico para compartir" aria-label="Compartir como imagen: meses de mandato"
          crearVista={() => ({ tipo: "mandato", expr: e, modo: D.modo, presIds: D.pres.map((x) => x.id), anc: D.ancParam, md: null, mh: null, base: b })}><IconoCompartir />Compartir</BotonCompartir>} />}>
      <p className="note">Cada línea arranca en el mes 0 de un presidente ({TITULOS_MANDATO[D.modo]}).</p>
      <div className="card card-simple">
        <div className="legend">{D.pres.map((x) => <span key={x.id} style={vcolor(x.color)}>{x.n}</span>)}</div>
        <Grafico rows={D.rows} series={D.series} opts={D.opts} />
        <details className="contexto-plegado">
          <summary>Cómo se calcula</summary>
          <p className="note">{D.nota}</p>
        </details>
      </div>
    </Bloque>
  );
}
