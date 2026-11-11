"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "../ConfigProvider";
import { Modal } from "../ui";
import { fmtMes, ok } from "@/lib/formato";
import type { Calculo, Motor } from "@/lib/motor";
import { AYUDA_T, PRES_DEF, baseIdx, baseTxt, crearPres, oracionInicio, varNum, type Pres, type StatsM } from "@/lib/estadisticas";
import { colorPuesto, columnaPresidentes, datosDesde, lecturaTono, periodoMandato, tonoDeVariacion, variacionMostrada, type ColComp, type MarcaCol, type Tono } from "@/lib/tablas";
import { DEFECTO, txtT, baseDeConfig, baseDeUrl, encT0p, esBaseDeFabrica, limpiarBase, mismaBase, type BaseCfg } from "@/lib/config";

export const COLS: [string, string][] = [["ini", "Inicio"], ["fin", "Cierre"], ["var", "Variación"], ["min", "Mínimo"], ["max", "Máximo"], ["prom", "Promedio"], ["med", "Mediana"], ["n", "Meses"]];
const IDS_PRES = PRES_DEF.map((x) => x.id);
export interface InicioMandato { b: BaseCfg; delLink: boolean; usarMio: () => void }

/** Inicio del mandato de la vista: el del link (`t0`, `t0p` o los viejos `b` y `n`) si lo trae; si no, el de la configuración.
 *  Mantiene la URL en sintonía: con una configuración distinta de la de fábrica agrega `t0`/`t0p` (así el link se ve igual para cualquiera),
 *  y si se cambia algo en el panel saca lo que traía el link. */
export function useBase(p: URLSearchParams, set: (c: Record<string, string | null>) => void, montado: boolean): InicioMandato {
  const { config, rev } = useConfig();
  const cfgBase = useMemo(() => baseDeConfig(config, IDS_PRES), [config]);
  const urlBase = useMemo(() => baseDeUrl(p), [p]);
  const b = useMemo(() => limpiarBase(urlBase ?? cfgBase, IDS_PRES), [urlBase, cfgBase]);
  const delLink = !!urlBase && !mismaBase(urlBase, cfgBase, IDS_PRES);
  const revVista = useRef(rev);
  useEffect(() => {
    if (!montado) return;
    const paramsDe = (x: BaseCfg) => ({ t0: x.t0 === DEFECTO.t0 ? null : String(x.t0), t0p: encT0p(x.t0p) || null });
    if (rev !== revVista.current) { revVista.current = rev; set({ b: null, n: null, ...paramsDe(cfgBase) }); return; }
    if (!urlBase && !esBaseDeFabrica(cfgBase, IDS_PRES)) set(paramsDe(cfgBase));
  }, [montado, rev, cfgBase, urlBase, set]);
  const usarMio = useCallback(() => set({ b: null, n: null, t0: null, t0p: null }), [set]);
  return { b, delLink, usarMio };
}

/** Oración del inicio de mandato ("Mes inicial de cada presidente: T-1, excepto Milei (T+1).") con un ícono de información que abre la explicación y el botón Configurar.
 *  Si el link trae otro inicio, avisa y ofrece volver al propio. `F` (opcional) permite poner un ejemplo con Milei; `children` suma texto propio de cada sección. */
export function LineaInicio({ info, F, children, texto, sinAviso }: { info: InicioMandato; F?: string[]; children?: React.ReactNode; texto?: string; sinAviso?: boolean }) {
  const { abrirPanel } = useConfig();
  const [abierto, setAbierto] = useState(false);
  const b = info.b;
  const milei = F ? crearPres(F).find((x) => x.id === "milei") : null;
  return (
    <>
      <div className="linea-inicio"><span>{texto ?? oracionInicio(b)}</span>
        <button type="button" className="btn-info" aria-label="Qué significa T y cómo se elige el mes inicial" aria-haspopup="dialog" onClick={() => setAbierto(true)}><span className="info-btn" aria-hidden>i</span></button></div>
      {info.delLink && !sinAviso && (
        <p className="aviso-link" role="status">Estás viendo el inicio de mandato del link · <button type="button" className="enlace" onClick={info.usarMio}>Usar el mío</button></p>
      )}
      {abierto && (
        <Modal titulo="Mes inicial de cada presidente" onCerrar={() => setAbierto(false)}>
          <div className="info-cuerpo">
            <h2>Mes inicial de cada presidente</h2>
            <p>{AYUDA_T}</p>
            <p>Ahora: <b>{baseTxt(b)}</b>{F && milei ? <>; para Milei, {fmtMes(F[baseIdx(F, milei, b)])}</> : null}.</p>
            <ul>
              {b.t0 === -1 && <li>Con T-1 la variación incluye todo lo que pasó en el mandato (p.ej. la devaluación de dic-2023 cuenta para Milei).</li>}
              {b.t0 === 0 && <li>El mes de asunción es un promedio que incluye días del antecesor.</li>}
              {b.t0 > 0 && <li>Con T+{b.t0} el mes de partida ya tiene días del mandato y la variación deja afuera el primer salto.</li>}
              {Object.keys(b.t0p).length > 0 && <li>Excepciones: {PRES_DEF.filter((x) => b.t0p[x.id] != null).map((x) => `${x.n} (${txtT(b.t0p[x.id])})`).join(", ")}.</li>}
            </ul>
            {children}
            <footer>
              <button type="button" className="btn" onClick={() => { setAbierto(false); abrirPanel(); }}>Configurar</button>
            </footer>
          </div>
        </Modal>
      )}
    </>
  );
}

export type Orden = { k: string | null; d: number };
export function Cabecera({ cols, ord, onOrden }: { cols: [string, string][]; ord: Orden; onOrden: (k: string) => void }) {
  return <>{cols.map(([k, t]) => (
    <th key={k} className={ord.k === k ? (ord.d > 0 ? "ord-asc" : "ord-desc") : ""} title="Ordenar" tabIndex={0} role="button"
      onClick={() => onOrden(k)} onKeyDown={(ev) => { if (ev.key === "Enter") onOrden(k); }} data-orden={k}>{t}</th>
  ))}</>;
}
export const siguienteOrden = (ord: Orden, k: string): Orden => ord.k !== k ? { k, d: -1 } : ord.d === -1 ? { k, d: 1 } : { k: null, d: -1 };

const mesCorto = (m: Motor, i: number | undefined) => (i != null && i >= 0 ? <small>{fmtMes(m.F[i])}</small> : null);

// ---- Celdas comunes a todas las tablas del sitio

/** Primera columna de las tablas por presidente: el nombre (o su versión corta si no entra) y debajo el período; opcionalmente "datos desde …". */
export function CeldaPres({ n, corto, periodo, aparte, sel, pos }: { n: string; corto?: string; periodo: string; aparte?: string | null; sel?: boolean; pos?: number }) {
  const c = corto && corto !== n ? corto : null;
  return (
    <td className={`c-pres${sel ? " c-sel" : ""}`} title={n}>
      <span className="c-pres-n">{pos != null && <span className="c-pos">{pos}</span>}{c ? <><span className="n-largo">{n}</span><span className="n-corto" aria-hidden>{c}</span></> : n}</span>
      <small className="c-per">{periodo}</small>
      {aparte && <small className="c-per">{aparte}</small>}
    </td>
  );
}
/** Igual que `CeldaPres` para un presidente de `crearPres`, con su período de mandato. */
export function CeldaPresMandato({ x, F, arr, pos }: { x: Pres; F: string[]; arr?: ArrayLike<number | null | undefined>; pos?: number }) {
  return <CeldaPres n={x.n} corto={x.corto} periodo={periodoMandato(F, x)} aparte={arr ? datosDesde(F, arr, x) : null} pos={pos} />;
}
/** Primera columna de las tablas con una variable por fila: el nombre en hasta dos renglones y la unidad debajo. */
export function CeldaVar({ nombre, unidad, extra, info }: { nombre: React.ReactNode; unidad?: string; extra?: React.ReactNode; info?: React.ReactNode }) {
  const t = typeof nombre === "string" ? nombre : undefined;
  return (
    <td className="c-var">
      <span className="c-var-arriba"><span className="c-var-n" title={t}>{nombre}</span>{info}</span>
      {unidad ? <small className="c-var-u" title={unidad}>{unidad}</small> : null}
      {extra}
    </td>
  );
}

/** Celda numérica: el valor en un solo tono (verde = mejor, rojo = peor), debajo un dato menor, una barra de magnitud y la marca escrita de mejor / peor.
 *  `pos` (0 = el peor, 1 = el mejor): la barra se pinta en degradado rojo → amarillo → verde; sin `pos` lleva el tono de la celda (gris si no hay). */
export function Valor({ tono, f, modo, pos, neg, marca, lectura, sub, children, ...resto }: {
  tono?: Tono; f?: number; modo?: ColComp["modo"]; pos?: number | null; neg?: boolean; marca?: MarcaCol; lectura?: string; sub?: React.ReactNode; children: React.ReactNode } & React.TdHTMLAttributes<HTMLTableCellElement>) {
  const conBarra = f != null && modo != null;
  return (
    <td {...resto} className={`cc${tono ? ` t-${tono}` : ""}${resto.className ? " " + resto.className : ""}`}>
      <span className="cc-v"><span className="cc-n">{children}</span>
        {marca && <em className={`marca-ext ${marca === "mejor" ? "m-bueno" : marca === "peor" ? "m-malo" : "m-neutro"}`}>{marca}</em>}</span>
      {sub}
      {conBarra && <span className={`cc-barra b-${modo}${neg ? " neg" : ""}`} aria-hidden><i style={{ ["--f" as string]: f, ...(pos != null ? { background: colorPuesto(pos) } : {}) }} /></span>}
      {lectura ? <span className="sr-solo"> ({lectura})</span> : null}
    </td>
  );
}
const menos = (t: string) => t.replace(/^-/, "−");

/** Comparación entre presidentes de una misma variable: una `ColComp` por columna comparable y la fila (`k`) a dibujar. */
export interface Comparativa { cols: Partial<Record<string, ColComp>>; k: number }
/** Arma las columnas comparables (barras y marcas) de la tabla "una variable, todos los presidentes". `niv` = los niveles se pueden comparar entre épocas. */
export function comparativaDe(c: Calculo, sts: StatsM[], niv: boolean): Partial<Record<string, ColComp>> {
  const dir = c.dir || 0;
  const cols: Partial<Record<string, ColComp>> = { var: columnaPresidentes(sts.map((s) => varNum(c, s)), dir, true) };
  if (niv) (["ini", "fin", "min", "max", "prom", "med"] as const).forEach((k) => { cols[k] = columnaPresidentes(sts.map((s) => s[k]), dir, false); });
  return cols;
}
export function CeldasStats({ m, c, st, cols, comp }: { m: Motor; c: Calculo; st: StatsM; cols: [string, string][]; comp?: Comparativa }) {
  if (!st.n) return <td colSpan={cols.length} style={{ textAlign: "center", color: "var(--text-muted)" }}>sin datos en este período</td>;
  const d = varNum(c, st);
  const nivel = (k: "ini" | "fin" | "min" | "max" | "prom" | "med", conMes: number | undefined) => {
    const cc = comp?.cols[k], v = st[k];
    if (!cc) return <td key={k}>{m.fmtC(c, v)}{mesCorto(m, conMes)}</td>;
    const tono = cc.tono[comp.k];
    return <Valor key={k} tono={tono} f={cc.frac[comp.k]} modo={cc.modo} pos={cc.pos[comp.k]} neg={(v ?? 0) < 0} marca={cc.marca[comp.k]} lectura={lecturaTono(tono)} sub={mesCorto(m, conMes)}>{m.fmtC(c, v)}</Valor>;
  };
  const cv = comp?.cols.var;
  const dif = m.difAbsTxt(c, st.ini ?? null, st.fin ?? null);
  const cel: Record<string, React.ReactNode> = {
    ini: nivel("ini", st.iniI),
    fin: nivel("fin", st.finI),
    var: <Valor key="var" tono={cv && comp ? cv.tono[comp.k] : tonoDeVariacion(c, st.ini, st.fin)} f={comp ? cv?.frac[comp.k] : undefined} modo={cv?.modo} pos={comp ? cv?.pos[comp.k] : null} neg={(d ?? 0) < 0} marca={comp ? cv?.marca[comp.k] : null}
      sub={dif ? <small>{dif}</small> : null}>{menos(variacionMostrada(m, c, st.ini, st.fin))}</Valor>,
    min: nivel("min", st.minI),
    max: nivel("max", st.maxI),
    prom: nivel("prom", undefined),
    med: nivel("med", undefined),
    n: <td key="n">{st.n}{st.total != null && st.n < st.total ? <small>de {st.total}</small> : null}</td>,
  };
  return <>{cols.map(([k]) => cel[k])}</>;
}
export const valorCol = (c: Calculo, st: StatsM, k: string | null): number | null | undefined =>
  !st.n || !k ? null : k === "var" ? varNum(c, st) : (st as unknown as Record<string, number | undefined>)[k];
