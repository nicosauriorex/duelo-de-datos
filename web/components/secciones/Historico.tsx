"use client";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSeccion } from "../useSeccion";
import { BarraPlantilla, usePlantillaVista } from "./BarraPlantilla";
import { BotonCompartir } from "../PanelCompartir";
import { Cargando, Desplegable, Modal, Selector, Seg, alternar } from "../ui";
import { FilaVariable, RenglonVariable } from "../Variables";
import { Grafico, hayDatos, type Fila, type Marca, type OpcionesG, type Ref, type SerieG, type TipoRef } from "../Grafico";
import { PALETA, vcolor } from "../util";
import { fmtMes, MESES, nf0, nf1, ok } from "@/lib/formato";
import type { Calculo, Expr, Motor } from "@/lib/motor";
import { PRES_DEF, aBase100, claseVariacion, estadisticasRows, etiqueta, filasGrafico, franjasPres, type EstRows } from "@/lib/estadisticas";
import { admiteContexto, contextoDato } from "@/lib/contexto-dato";
import { MAX_GRAFICOS, MAX_MISMA_UNIDAD, PG, TODOS_MESES, exprsUsadas, fraseUltimoVs, frecuenciaOrigen, leerComun, leerGrafico, sfx, textoTemporalidad, type Comun, type GEst } from "@/lib/historico";
import { fmtEjeDe, notaInflacion, tituloGrafico, type VistaImg } from "@/lib/imagen-datos";
import { useConfig } from "../ConfigProvider";
import { baseDeConfig, medidaPreferida } from "@/lib/config";
import { encExpr, useParams } from "@/lib/url";
import { avisoTabla, copiarTexto } from "@/lib/compartir";
import { filasDeTabla, tablaATexto, type ColTabla } from "@/lib/tabla-texto";
import { IconoCompartir } from "../Iconos";

/** Los parámetros de la vista que "Volver a lo de fábrica" borra (todos menos `v`, `pl` y `pn`). */
const PARAMS_FABRICA = ["d", "h", "ms", "f", "ag", ...PG.filter((k) => k !== "v")];

const REFS_H = [
  { k: "ult", letra: "Último", corto: "Últ.", nom: "Último", btn: "Último", dash: "1 3", val: (s: EstRows): [number, string?] => s.ult },
  { k: "prom", letra: "Promedio", corto: "Prom.", nom: "Promedio", btn: "Promedio", dash: "6 4", val: (s: EstRows): [number, string?] => [s.prom] },
  { k: "med", letra: "Mediana", corto: "Med.", nom: "Mediana", btn: "Mediana", dash: "2 3 8 3", val: (s: EstRows): [number, string?] => [s.med] },
  { k: "max", letra: "↑", nom: "Máximo", btn: "↑ Máximo", dash: "4 2", val: (s: EstRows): [number, string?] => s.max },
  { k: "min", letra: "↓", nom: "Mínimo", btn: "↓ Mínimo", dash: "4 2", val: (s: EstRows): [number, string?] => s.min },
];

type Estado = Comun & GEst;
type SetFn = (c: Record<string, string | null | undefined>) => void;

/** Lo que cambia entre la vista completa y la vista simple (un solo gráfico): los controles se juntan en "Personalizar". */
interface Simple {
  titulo: string | null;          // el de la plantilla, si la vista viene de una
  abierto: boolean; onAlternar: () => void;
  fecha: ReactNode; frecuencia: ReactNode; acciones: ReactNode; agregar: ReactNode;   // lo que va dentro de las ventanas de Personalizar
  alFabrica?: () => void;         // "Volver a lo de fábrica": solo si la vista cambió respecto de la de fábrica
}

export function Historico() {
  const [p, set, montado] = useParams();
  const base = useSeccion([]);
  const { config, cambiar: cambiarConfig } = useConfig();
  const { listo, motor, metas, version } = base;
  const existe = (id: string) => metas.some((m) => m.id === id);
  const [ancha, setAncha] = useState(false); // ≥ 1024 px: los gráficos van en 2 columnas
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const f = () => setAncha(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  const info = usePlantillaVista(p);
  const [vacios, setVacios] = useState(0); // gráficos agregados que todavía no tienen variable (no están en la URL)

  // Cualquier cambio del usuario hace que la vista deje de ser "la plantilla": se saca el encabezado.
  const cambiar: SetFn = (c) => set({ ...c, pl: null, pn: null });

  // ------------------------------------------------------------ estado (todo viene de la URL)
  const defExpr = useMemo((): Expr | null => {
    if (!listo) return null;
    const ex = (id: string) => metas.some((m) => m.id === id);
    return ex("pp_gba_asado") && ex("sipa_prom") ? { id: "pp_gba_asado", med: "real", rel: "sipa_prom", modo: "compra", esc: "" } : { id: "sipa_prom", med: medidaPreferida(config), rel: null, modo: "compra", esc: "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, metas, config.medida, config.dolar]);

  const E = useMemo((): Comun | null => {
    if (!listo || !motor || !montado) return null;
    return leerComun(p, motor.F, config.desde);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, motor, montado, p, config.desde]);

  // Los gráficos del link, sin huecos: si falta el 2.º y está el 3.º, el 3.º pasa a ser el 2.º.
  const G = useMemo(() => {
    if (!listo || !montado || !defExpr) return null;
    const out: { g: GEst; slot: number }[] = [];
    for (let k = 0; k < MAX_GRAFICOS; k++) { const g = leerGrafico(p, k, existe, defExpr); if (g) out.push({ g, slot: k }); }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, montado, p, metas, defExpr]);

  /** Mueve los parámetros de un gráfico de un lugar de la URL a otro. */
  const moverGrafico = (cambios: Record<string, string | null>, desde: number, hacia: number) => {
    for (const k of PG) cambios[k + sfx(hacia)] = p.get(k + sfx(desde)) || null;
  };
  // Si el link tiene huecos (v3 sin v2) se reescribe compacto, para que cada gráfico escriba en su lugar.
  useEffect(() => {
    if (!G || G.every((x, i) => x.slot === i)) return;
    const c: Record<string, string | null> = {};
    G.forEach((x, i) => { if (x.slot !== i) moverGrafico(c, x.slot, i); });
    for (let k = G.length; k < MAX_GRAFICOS; k++) for (const key of PG) c[key + sfx(k)] = null;
    set(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G]);

  if (base.errorGeneral) return <p className="error" role="alert">{base.errorGeneral}</p>;
  if (!E || !motor || !G) return <Cargando />;
  const m: Motor = motor;
  const nVacios = Math.min(vacios, MAX_GRAFICOS - G.length);
  const total = G.length + nVacios;
  const compacto = total > 1 && ancha; // 2 columnas: gráficos más bajos
  const quitar = (i: number) => {
    if (i >= G.length) { setVacios(Math.max(0, vacios - 1)); return; }
    const c: Record<string, string | null> = {};
    for (let j = i; j < G.length - 1; j++) moverGrafico(c, j + 1, j);
    for (const key of PG) c[key + sfx(G.length - 1)] = null;
    cambiar(c);
  };
  const elegirEnVacio = (x: Expr) => { setVacios(Math.max(0, vacios - 1)); cambiar({ ["v" + sfx(G.length)]: encExpr(x) }); };

  const agregarBtn = total < MAX_GRAFICOS && (
    <p><button type="button" className="btn" onClick={() => setVacios(vacios + 1)}>+ Agregar gráfico ({total} de {MAX_GRAFICOS})</button></p>
  );
  if (total === 1) {
    // ¿Algo cambió respecto de lo de fábrica? Se compara lo que se ve (período, frecuencia, meses, opciones del gráfico), no los parámetros escritos.
    const pBase = new URLSearchParams(); if (p.get("v")) pBase.set("v", p.get("v") as string);
    const E0 = leerComun(pBase, m.F, config.desde), g = G[0].g, g0 = leerGrafico(pBase, 0, existe, defExpr);
    const mismos = (a: Set<unknown>, b: Set<unknown>) => a.size === b.size && [...a].every((x) => b.has(x));
    const franjasDe = (pf: string) => (pf === "1" ? true : pf === "0" ? false : config.franjas);
    const hayCambios = !!g0 && (E.desde !== E0.desde || E.hasta !== E0.hasta || E.freq !== E0.freq || E.ag !== E0.ag || !mismos(E.meses, E0.meses)
      || g.modo !== g0.modo || g.escala !== g0.escala || g.banda !== g0.banda || g.eje !== g0.eje || g.tabla !== g0.tabla || !mismos(g.refs, g0.refs) || franjasDe(g.pf) !== franjasDe(g0.pf));
    // Vista simple: el dato, su contexto y el gráfico; los controles de siempre quedan en "Personalizar".
    const simple: Simple = {
      titulo: info.titulo, abierto: config.personalizar, onAlternar: () => cambiarConfig({ personalizar: !config.personalizar }),
      fecha: <ControlesFecha E={E} set={cambiar} F={m.F} />, frecuencia: <ControlesFrecuencia E={E} set={cambiar} />,
      acciones: <BarraPlantilla p={p} set={set} info={info} simple />, agregar: agregarBtn,
      alFabrica: hayCambios ? () => set(Object.fromEntries(PARAMS_FABRICA.map((k) => [k, null]))) : undefined,   // deja la variable (v) y la plantilla (pl, pn) si están
    };
    return (
      <section className="vista-simple">
        <BloqueGrafico i={0} total={1} compacto={false} g={G[0].g} E={E} m={m} set={cambiar} version={version} onQuitar={() => quitar(0)} simple={simple} />
      </section>
    );
  }
  return (
    <section>
      <BarraPlantilla p={p} set={set} info={info} />
      <Barra E={E} set={cambiar} F={m.F} fija={total > 1} />
      <div className={`grilla-graf${total > 1 ? " multi" : ""}`}>
        {G.map(({ g }, i) => (
          <BloqueGrafico key={i} i={i} total={total} compacto={compacto} g={g} E={E} m={m} set={cambiar} version={version} onQuitar={() => quitar(i)} />
        ))}
        {Array.from({ length: nVacios }, (_, j) => (
          <BloqueGrafico key={"v" + j} i={G.length + j} total={total} compacto={compacto} g={null} E={E} m={m} set={cambiar} version={version}
            onQuitar={() => quitar(G.length + j)} onElegir={elegirEnVacio} />
        ))}
      </div>
      {agregarBtn}
    </section>
  );
}

/** Un gráfico de Histórico: sus variables, su resumen y su gráfico. Carga sus propios datos: si falla, los demás se ven. */
function BloqueGrafico({ i, total, compacto, g, E, m, set, version, onQuitar, onElegir, simple }: {
  i: number; total: number; compacto: boolean; g: GEst | null; E: Comun; m: Motor; set: SetFn; version: number; onQuitar: () => void; onElegir?: (x: Expr) => void; simple?: Simple;
}) {
  const ids = useMemo(() => (g ? g.exprs.flatMap((e) => (e.rel ? [e.id, e.rel] : [e.id])) : []), [g]);
  const sec = useSeccion(ids);
  // En modo valor entran 2 variables, o hasta 4 si todas tienen la misma unidad (con la medida aplicada).
  const usadas = useMemo(() => (g ? exprsUsadas(m, g) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g, m, version]);
  // Solo las variables ya cargadas: si una falla, las demás se siguen viendo.
  const disp = useMemo(() => usadas.filter((e) => m.SER[e.id] && (!e.rel || m.SER[e.rel])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usadas, m, version]);
  const cab = (
    <div className="cab-graf">
      {total > 1 ? <h3>Gráfico {i + 1}</h3> : <span />}
      {g && (
        <BotonCompartir className="btn" titulo={`Primero los Datos: ${total > 1 ? `gráfico ${i + 1}` : "Histórico"}`} href={() => window.location.href}
          deshabilitado={disp.length === 0} title="Armar una imagen de este gráfico para compartir" aria-label={`Compartir como imagen: gráfico ${i + 1}`}
          crearVista={() => vistaImg(E, g, disp)}><IconoCompartir />Compartir</BotonCompartir>
      )}
      {i > 0 && <button type="button" className="btn quitar" onClick={onQuitar}>Quitar gráfico</button>}
    </div>
  );
  const clase = `bloque-graf${compacto ? " compacto" : ""}`;
  if (!g) {
    return (
      <div className={clase}>{cab}
        <FilaVariable e={null} agregable onChange={(x) => x && onElegir?.(x)} />
      </div>
    );
  }
  // el cambio de este gráfico se escribe con el número que le toca en la URL
  const setG: SetFn = (c) => set(Object.fromEntries(Object.entries(c).map(([k, v]) => [(PG as readonly string[]).includes(k) ? k + sfx(i) : k, v])));
  const b100 = g.modo === "b100";
  const base = b100 ? g.todas : usadas; // en modo valor, lo que no entra se descarta al editar
  const guardarExprs = (xs: Expr[]) => setG({ v: xs.map(encExpr).join(",") });
  const setExpr = (k: number, e: Expr | null) => {
    const xs = base.slice();
    if (e) xs[k] = e; else xs.splice(k, 1);
    guardarExprs(xs.length ? xs : g.exprs);
  };
  const hayError = Object.keys(sec.errores).length > 0;
  const Ed: Estado = { ...E, ...g, exprs: disp };
  const mismaU = !b100 && usadas.length >= 2 && (usadas.length > 2 || (g.exprs.length === 2 && disp.length === 2 && m.calc(disp[0]).unidad === m.calc(disp[1]).unidad));
  const aviso = !b100 && g.exprs.length > usadas.length && g.exprs.every((e) => m.SER[e.id] && (!e.rel || m.SER[e.rel])); // sin aviso mientras cargan
  const vars = (
    <div className="vars-graf">
      {usadas.map((e, k) => (
        <RenglonVariable key={k} e={e} color={PALETA[k]} quitable={b100 ? g.exprs.length > 1 : k >= 1} onChange={(x) => setExpr(k, x)} />
      ))}
      {!b100 && usadas.length < 2 && <FilaVariable e={null} agregable onChange={(x) => x && guardarExprs([...base, x])} />}
      {!b100 && mismaU && usadas.length < MAX_MISMA_UNIDAD && (
        <FilaVariable e={null} agregable textoAgregar={`+ Agregar variable (misma unidad, ${usadas.length} de ${MAX_MISMA_UNIDAD})`} onChange={(x) => x && guardarExprs([...base, x])} />
      )}
      {b100 && g.exprs.length < 10 && (
        <FilaVariable e={null} agregable textoAgregar={`+ Agregar variable (${g.exprs.length} de 10)`} onChange={(x) => x && guardarExprs([...g.todas, x])} />
      )}
      {aviso && <p className="note" role="status">Con unidades distintas entran 2 variables.</p>}
    </div>
  );
  const falla = hayError && !sec.ocupado ? <p className="error">Las variables elegidas no se pudieron cargar. Probá otra o recargá la página.</p> : <Cargando />;
  if (simple) {
    return disp.length > 0
      ? <Principal m={m} E={Ed} set={setG} version={version} compacto={false} simple={{ ...simple, variables: vars }} />
      : <div className={clase}>{vars}{falla}</div>;
  }
  return (
    <div className={clase}>{cab}
      {vars}
      {disp.length > 0 ? <Principal m={m} E={Ed} set={setG} version={version} compacto={compacto} /> : falla}
    </div>
  );
}

/** La vista de un gráfico tal como se ve (variables ya cargadas, período y frecuencia), para armar la imagen de compartir. */
const vistaImg = (E: Comun, g: GEst, exprs: Expr[], titulo?: string): VistaImg =>
  ({ exprs, modo: g.modo, eje: g.eje, desde: E.desde, hasta: E.hasta, meses: E.meses, freq: E.freq, ag: E.ag, titulo, tabla: g.tabla === "tabla" });

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

/** Filtrar fecha: desde, hasta, atajos y meses del año. */
function ControlesFecha({ E, set, F }: { E: Comun; set: SetFn; F: string[] }) {
  const N = F.length, ult = F[N - 1], hace12 = F[Math.max(0, N - 12)];
  const PRESETS: [string, string][] = [[F[0], "Todo"], ["1995-01", "1995"], ["2003-01", "2003"], ["2011-01", "2011"], ["2017-01", "2017"], ["2023-01", "2023"], [hace12, "Último año"]];
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
    <>
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
    </>
  );
}

/** Cómo se agregan los meses al ver por trimestre o año (solo si no es Mes). */
function ControlesAgregar({ E, set }: { E: Comun; set: SetFn }) {
  if (E.freq === "M") return null;
  return (
    <div className="controls"><label>Al ver por {E.freq === "A" ? "año" : "trimestre"}</label>
      <Seg valor={E.ag} opciones={[["promedio", "Promedio"], ["cierre", "Cierre"]]} onElegir={(v) => set({ ag: v === "promedio" ? null : v })} />
      <span className="note" style={{ margin: 0 }}>{E.ag === "cierre" ? "Último mes con dato de cada período." : "Promedio de los meses del período."}</span></div>
  );
}

/** Mes / Trimestre / Año y, si no es Mes, cómo se agregan (Promedio o Cierre). */
function ControlesFrecuencia({ E, set }: { E: Comun; set: SetFn }) {
  return (
    <>
      <div className="controls"><label>Ver por</label>
        <Seg valor={E.freq} opciones={[["M", "Mes"], ["T", "Trimestre"], ["A", "Año"]]} onElegir={(v) => set({ f: v === "M" ? null : v })} /></div>
      <ControlesAgregar E={E} set={set} />
    </>
  );
}

function Barra({ E, set, F, fija }: { E: Comun; set: SetFn; F: string[]; fija: boolean }) {
  const ms = [...E.meses].sort((a, b) => a - b).map((k) => MESES[k - 1]).join(", ");
  return (
    <div className={`barra-hist${fija ? " fija" : ""}`} role="region" aria-label="Período y frecuencia">
      <Desplegable etiqueta={<><span className="solo-grande">Período: </span>{fmtMes(E.desde)} – {fmtMes(E.hasta)}{E.meses.size < 12 ? ` · ${ms}` : ""}</>}>
        <ControlesFecha E={E} set={set} F={F} />
        <ControlesAgregar E={E} set={set} />
        <p className="note" style={{ margin: 0 }}>Con meses sueltos (p.ej. solo enero) se ve un punto por año y se unen con una línea. Escape o un clic afuera cierran este panel.</p>
      </Desplegable>
      <Seg valor={E.freq} opciones={[["M", "Mes"], ["T", "Trimestre"], ["A", "Año"]]} onElegir={(v) => set({ f: v === "M" ? null : v })} />
    </div>
  );
}

/** Ventana de Personalizar: título, cuerpo con scroll y "Listo". Entra entera en la pantalla (ver .modal en globals.css). */
function VentanaPers({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      <header className="vp-cab"><h2>{titulo}</h2></header>
      <div className="config-cuerpo vp-cuerpo">{children}</div>
      <footer><button type="button" className="btn primario" onClick={onCerrar}>Listo</button></footer>
    </Modal>
  );
}

// ------------------------------------------------------------ tarjeta de gráfico: barra (Gráfico / Tabla, Configurar, expandir), gráfico o tabla
type Vista = "grafico" | "tabla";
function CardGrafico({ titulo, temporal, nota, leyenda, visibles, config, rows, series, opts, unidades, vista: vistaProp, onVista, simple }: {
  titulo: string; temporal?: string; nota?: ReactNode; leyenda?: ReactNode; visibles?: ReactNode; config?: { cuenta: number; children: ReactNode }; simple?: boolean;
  rows: Fila[]; series: SerieG[]; opts: OpcionesG; unidades?: Record<string, string>; vista?: Vista; onVista?: (v: Vista) => void;
}) {
  const [vistaL, setVistaL] = useState<Vista>("grafico");
  const [exp, setExp] = useState(false);
  const vista = vistaProp ?? vistaL;
  const elegirVista = (v: string) => (onVista ? onVista(v as Vista) : setVistaL(v as Vista));
  const hay = hayDatos(rows, series, opts);
  const cab = leyenda ?? null;
  const [avisoT, setAvisoT] = useState<string | null>(null);
  const copiarTabla = async () => {
    const cols: ColTabla[] = series.map((se) => ({ key: se.key, name: se.name, unidad: unidades?.[se.key], fmt: se.fmt || opts.fmtTip }));
    const r = await copiarTexto(tablaATexto(cols, filasDeTabla(rows, cols), window.location.href));
    setAvisoT(avisoTabla(r)); setTimeout(() => setAvisoT(null), 4000);
  };
  const tabla = vista === "tabla"
    ? (rows.length && hay ? (<>
      <div className="tabla-acciones">
        <button type="button" className="btn" onClick={copiarTabla}>Copiar tabla</button>
        {avisoT && <span className="note" role="status" style={{ margin: 0 }}>{avisoT}</span>}
      </div>
      <div className="tablewrap tabla-graf"><table>
        <thead><tr><th>Período</th>{series.map((se) => <th key={se.key}>{se.name}{unidades?.[se.key] && <small>{unidades[se.key]}</small>}</th>)}</tr></thead>
        <tbody>{rows.slice().reverse().map((r) => (
          <tr key={r.fecha + (r.per || "")}><td>{etiqueta(r)}</td>{series.map((se) => <td key={se.key}>{ok(r[se.key]) ? (se.fmt || opts.fmtTip)(r[se.key]) : "–"}</td>)}</tr>
        ))}</tbody>
      </table></div></>
    ) : <p className="note">Sin datos para esta selección.</p>)
    : null;
  if (simple) {
    // Vista simple: el gráfico y debajo la unidad, la fuente y Expandir (los controles están en "Personalizar").
    return (
      <div className="card card-simple">
        {cab}
        {tabla ?? <Grafico rows={rows} series={series} opts={opts} expandir={{ titulo, leyenda: cab, abierto: exp, onCerrar: () => setExp(false) }} />}
        <div className="pie-graf">
          {nota && <p className="note">{nota}</p>}
          {vista === "grafico" && hay && <button type="button" className="btn expandir" onClick={() => setExp(true)} aria-label="Expandir el gráfico a pantalla completa">Expandir</button>}
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <h2>{titulo}</h2>{temporal && <p className="temporal">{temporal}</p>}{nota && <p className="note">{nota}</p>}
      <div className="barra-graf">
        {visibles}
        <Seg valor={vista} opciones={[["grafico", "Gráfico"], ["tabla", "Tabla"]]} onElegir={elegirVista} />
        {config && (
          <Desplegable etiqueta={config.cuenta ? `Opciones del gráfico (${config.cuenta})` : "Opciones del gráfico"}>{config.children}</Desplegable>
        )}
        <span className="esp" />
        {vista === "grafico" && hay && <button type="button" className="btn expandir" onClick={() => setExp(true)} aria-label="Expandir el gráfico a pantalla completa">Expandir</button>}
      </div>
      {cab}
      {tabla ?? <Grafico rows={rows} series={series} opts={opts} expandir={{ titulo, leyenda: cab, abierto: exp, onCerrar: () => setExp(false) }} />}
    </div>
  );
}

// ------------------------------------------------------------ resumen del período: seis celdas fijas
/** Celdas de "Resumen del período": cada una con su valor (y su mes si corresponde) y, salvo el último dato, cuánto está el último por encima o por debajo. */
interface DefResumen { tit: string; val: (s: EstRows) => number; fecha?: (s: EstRows) => string | undefined; ultimo?: boolean }
const DEFS_RES: DefResumen[] = [
  { tit: "Último dato", val: (s) => s.ult[0], fecha: (s) => s.ult[1], ultimo: true },
  { tit: "Inicio del período", val: (s) => s.pri[0], fecha: (s) => s.pri[1] },
  { tit: "Promedio", val: (s) => s.prom },
  { tit: "Mediana", val: (s) => s.med },
  { tit: "Máximo", val: (s) => s.max[0], fecha: (s) => s.max[1] },
  { tit: "Mínimo", val: (s) => s.min[0], fecha: (s) => s.min[1] },
];

// ------------------------------------------------------------ gráfico principal
function Principal({ m, E, set, version, compacto, simple }: { m: Motor; E: Estado; set: SetFn; version: number; compacto: boolean; simple?: Simple & { variables: ReactNode } }) {
  const { F } = m;
  const { config: cfg } = useConfig();
  const [ventanaP, setVentanaP] = useState<null | "fecha" | "variable" | "opciones">(null); // ventana abierta de Personalizar
  const b100 = E.modo === "b100";
  const conFranjas = E.pf === "1" ? true : E.pf === "0" ? false : cfg.franjas;
  // Claves estables: el gráfico solo se rehace (y pierde el zoom) si cambia algo que lo afecta
  const kExprs = E.exprs.map(encExpr).join(","), kMeses = [...E.meses].join(","), kRefs = [...E.refs].sort().join(",");
  const D = useMemo(() => {
    const calcs = E.exprs.map((e) => m.calc(e));
    const unEje = calcs.length > 2; // 3 o 4 variables de la misma unidad: todas en el eje izquierdo
    const lista = calcs.map((c, k) => {
      return { c, key: "s" + k, color: PALETA[k], axis: !b100 && !unEje && k === 1 ? 1 : 0, flujo: !!c.flujo, ultimo: !!c.ultimo, base: "–" };
    });
    const dos = !b100 && lista.length === 2;
    const hayBanda = !b100 && lista.some((o) => o.c.lo);
    const bd = hayBanda && E.banda === "si";
    const rows: Fila[] = filasGrafico(F, lista, { desde: E.desde, hasta: E.hasta, meses: E.meses, freq: E.freq, cierre: E.ag === "cierre", banda: bd });
    if (b100) { const bases = aBase100(rows, lista.map((o) => o.key)); lista.forEach((o) => { o.base = bases[o.key]; }); }
    const puedeLog = rows.every((r) => lista.every((o) => !ok(r[o.key]) || r[o.key] > 0));
    const st = lista.map((o) => estadisticasRows(rows, o.key));
    const fmtDe = (o: { c: Calculo }) => b100 ? (v: number) => nf1.format(v) : (v: number) => m.fmtC(o.c, v);
    const misma = dos && E.eje === "misma";
    const refs: Ref[] = [];
    if (!b100) lista.forEach((o, k) => {
      const s = st[k]; if (!s) return;
      REFS_H.filter((r) => E.refs.has(r.k)).forEach((r) => {
        const [v] = r.val(s);
        refs.push({ v, axis: misma ? 0 : o.axis, color: o.color, letra: r.letra, corto: "corto" in r ? r.corto : undefined, dash: r.dash, key: o.key, tipo: r.k as TipoRef, nom: r.nom, quien: lista.length > 1 ? o.c.corto : undefined, fmt: fmtDe(o) });
      });
    });
    const tiposMk = new Set(["ult", "max", "min"].filter((k) => E.refs.has("mk_" + k)));
    const marcas: Marca[] = b100 || !tiposMk.size ? [] : lista.map((o) => ({ key: o.key, axis: misma ? 0 : o.axis, color: o.color, fmt: fmtDe(o), tipos: tiposMk }));
    const ejeFmt = fmtEjeDe;
    const series: SerieG[] = lista.map((o) => ({ key: o.key, name: o.c.corto, short: o.c.corto.length > 18 ? o.c.corto.slice(0, 17) + "…" : o.c.corto, color: o.color, axis: o.axis, band: bd && !!o.c.lo, fmt: fmtDe(o) }));
    const opts = {
      log: E.escala === "log" && puedeLog, log2: E.escala === "log" && puedeLog, refs, marcas, mismaEscala: misma, refLine: b100 ? 100 : null, endLabels: b100 && lista.length > 1,
      fmtAxis: b100 ? (v: number) => nf0.format(v) : ejeFmt(lista[0].c), fmtAxis2: dos ? ejeFmt(lista[1].c) : null, fmtTip: fmtDe(lista[0]), tipTitle: etiqueta,
      height: compacto ? 260 : undefined,
      label: lista.map((o) => o.c.corto).join(", "),
    };
    return { lista, dos, hayBanda, bd, rows, puedeLog, st, fmtDe, series, opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, kExprs, E.modo, E.desde, E.hasta, kMeses, E.freq, E.ag, E.escala, E.banda, E.eje, kRefs, compacto]);
  const { lista, dos, hayBanda, bd, rows, puedeLog, st, series } = D;
  const kBase = `${cfg.t0}|${JSON.stringify(cfg.t0p)}`;
  const franjas = useMemo(() => (conFranjas ? franjasPres(F, baseDeConfig(cfg, PRES_DEF.map((x) => x.id))) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conFranjas, F, kBase]);
  const opts = useMemo(() => (franjas ? { ...D.opts, franjas } : D.opts), [D.opts, franjas]);

  const porFreq = ({ M: "", T: " Valores trimestrales", A: " Valores anuales" })[E.freq];
  const agTxt = E.ag === "cierre" ? `último mes con dato de cada ${E.freq === "A" ? "año" : "trimestre"}` : "promedio de los meses";
  const sumaTxt = E.freq !== "M" && lista.some((o) => o.flujo || o.ultimo)
    ? ` (los flujos se suman y los % del PIB toman el último mes del período; períodos incompletos de flujos quedan vacíos; el resto es ${agTxt}).`
    : E.freq !== "M" ? ` (${agTxt}).` : "";
  const multi = lista.length > 1;
  const titulo = tituloGrafico(lista, b100);
  const temporal = textoTemporalidad({ freq: E.freq, ag: E.ag, meses: E.meses, suma: lista.some((o) => !!o.flujo), origen: frecuenciaOrigen(lista[0].c.v) });
  const nota = (b100 ? "Cada serie vale 100 en su primer dato del período: la línea muestra cuánto subió o bajó desde ahí."
    : (lista.length > 2 ? lista[0].c.unidad : lista.map((o, k) => `${dos ? (k ? "Derecha: " : "Izquierda: ") : ""}${o.c.unidad}`).join(" · ")) + ".") + porFreq + sumaTxt +
    (bd ? " La sombra va del mínimo al máximo." : "") +
    // Los valores reales dependen del IPC empalmado: se avisa con qué índice se descontó la inflación.
    (notaInflacion(lista.map((o) => o.c), b100) ? " " + notaInflacion(lista.map((o) => o.c), b100) : "") + ` Fuente: ${[...new Set(lista.map((o) => o.c.serie.fuente))].join("; ")}.`;
  const grupo = (lbl: string, el: React.ReactNode) => <Fragment key={lbl}><label>{lbl}</label>{el}</Fragment>;
  const refsToggle = (k: string) => set({ r: [...alternar(E.refs, k, true)].join(",") || "-" });

  // Opciones de "Opciones del gráfico" distintas de las de por defecto
  const igualA = (set0: Set<string>, ks: string[], def: string[]) => {
    const act = ks.filter((k) => set0.has(k)).sort().join(","), d = def.slice().sort().join(",");
    return act === d;
  };
  const cuenta = (conFranjas !== cfg.franjas ? 1 : 0) + (b100 ? 1 : 0) + (puedeLog && E.escala !== "lin" ? 1 : 0) + (dos && E.eje !== "propia" ? 1 : 0) + (hayBanda && E.banda !== "no" ? 1 : 0)
    + (!b100 && !igualA(E.refs, REFS_H.map((r) => r.k), ["ult", "prom", "med"]) ? 1 : 0) + (!b100 && !igualA(E.refs, ["mk_ult", "mk_max", "mk_min"], ["mk_ult", "mk_max", "mk_min"]) ? 1 : 0);
  const config = (
    <>
      <div className="controls" id="h_opciones">
        {grupo("Mostrar", <Seg valor={E.modo} opciones={[["valor", "Valor de la serie (hasta 2 variables; hasta 4 si tienen la misma unidad)"], ["b100", "Comparar en base 100 (hasta 10)"]]} onElegir={(v) => set({ m: v === "valor" ? null : v })} />)}
      </div>
      <div className="controls">
        {puedeLog && grupo("Escala", <Seg valor={E.escala} opciones={[["lin", "Lineal"], ["log", "Logarítmica"]]} onElegir={(v) => set({ e: v === "lin" ? null : v })} />)}
        {dos && grupo("Eje derecho", <Seg valor={E.eje} opciones={[["propia", "Escala propia (adaptada a la serie)"], ["misma", "Misma escala que el izquierdo"]]} onElegir={(v) => set({ ej: v === "propia" ? null : v })} />)}
      </div>
      <div className="controls">
        {grupo("Presidentes", <Seg valor={conFranjas ? "si" : "no"} opciones={[["no", "No"], ["si", "Franjas de colores por mandato"]]}
          onElegir={(v) => { const on = v === "si"; set({ pf: on === cfg.franjas ? null : on ? "1" : "0" }); }} />)}
      </div>
      {!b100 && (
        <div className="controls">
          {grupo("Líneas", <Seg valor={E.refs} opciones={REFS_H.map((r) => [r.k, r.btn] as [string, string])} onElegir={refsToggle} />)}
        </div>
      )}
      {!b100 && (
        <div className="controls">
          {grupo("Marcadores", <Seg valor={E.refs} opciones={[["mk_ult", "Último"], ["mk_max", "Máximo"], ["mk_min", "Mínimo"]]} onElegir={refsToggle} />)}
        </div>
      )}
      {!b100 && hayBanda && (
        <div className="controls">
          {hayBanda && grupo("Rango", <Seg valor={E.banda} opciones={[["no", "Solo promedio"], ["si", "Con mín/máx"]]} onElegir={(v) => set({ bd: v === "no" ? null : v })} />)}
        </div>
      )}
    </>
  );
  const leyenda = <div className="legend">{lista.length > 1 && lista.map((o) => <span key={o.key} style={vcolor(o.color)}>{o.c.corto}{o.axis ? " (eje der.)" : ""}</span>)}</div>;
  const unidades = Object.fromEntries(lista.map((o) => [o.key, b100 ? "base 100" : o.c.unidad]));

  // Resumen del período: seis celdas fijas; la frase de cada una compara el último dato con ella (siempre de la primera variable)
  const o0 = lista[0], s0 = st[0];
  const tarjeta = (def: DefResumen) => {
    if (!s0) return null;
    const desde = def.val(s0), hasta = s0.ult[0], f = def.fecha?.(s0);
    return (
      <div className="tile" key={def.tit}><div className="k">{def.tit}</div>
        <div className="v">{m.fmtC(o0.c, desde)}</div>
        <div className="d">{f ?? null}{def.ultimo ? null : <>{f ? <br /> : null}<b className={`var-${claseVariacion(o0.c.dir, o0.c.pct, desde, hasta)}`}>{fraseUltimoVs(o0.c.pct, desde, hasta) || "–"}</b></>}</div></div>
    );
  };
  const resumen = b100 ? (
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
  ) : s0 ? (
    <div className="resumen">
      <h2 className="res-titulo">Resumen del período</h2>
      {multi && <p className="note resumen-de">Resumen de: {o0.c.corto}</p>}
      <div className="res-grilla" role="group" aria-label="Resumen del período">{DEFS_RES.map(tarjeta)}</div>
    </div>
  ) : null;
  const onVista = (v: Vista) => set({ t: v === "tabla" ? "tabla" : null });

  if (simple) {
    // Contexto del dato: solo con una variable, en mensual y sin base 100 (admiteContexto); si no, la cifra de cada variable.
    const ctx = lista.length === 1 && !b100 ? contextoDato(m, E.exprs[0], admiteContexto({ variables: 1, modo: E.modo, freq: E.freq })) : null;
    const nombre = simple.titulo ?? titulo;
    const vista = { exprs: E.exprs, modo: E.modo, eje: E.eje, desde: E.desde, hasta: E.hasta, meses: E.meses, freq: E.freq, ag: E.ag, titulo: simple.titulo ?? undefined, tabla: E.tabla === "tabla" } satisfies VistaImg;
    return (
      <>
        <div className="vs-cab">
          <h2 className="vs-titulo">{nombre}</h2>
          <p className="temporal vs-temporal">{temporal}</p>
          {ctx ? (
            <>
              <p className="vs-cifra"><span className="v">{ctx.valor}</span><span className="mes">{ctx.mes}{ctx.ultimoDisponible ? " · Último dato disponible" : ""}</span></p>
              {ctx.frases.map((f) => <p key={f.texto} className={`vs-frase${f.cls ? " var-" + f.cls : ""}`}>{f.texto}</p>)}
            </>
          ) : (lista.length > 1 || b100) && (
            <ul className="vs-leyenda">{lista.map((o, k) => {
              const s0 = st[k];
              return <li key={o.key}><span className="punto" style={vcolor(o.color)} /> <span className="n">{o.c.corto}</span> <b>{s0 ? (b100 ? nf1.format(s0.ult[0]) : m.fmtC(o.c, s0.ult[0])) : "–"}</b></li>;
            })}</ul>
          )}
        </div>
        <CardGrafico simple titulo={titulo} nota={nota} leyenda={leyenda} rows={rows} series={series} opts={opts} unidades={unidades} vista={E.tabla} onVista={onVista} />
        <div className="vs-acciones">
          <BotonCompartir className="btn primario" titulo={nombre} href={() => window.location.href} crearVista={() => vista}>
            <IconoCompartir />Compartir</BotonCompartir>
          <button type="button" className="btn" aria-expanded={simple.abierto} aria-controls="vs-personalizar" onClick={simple.onAlternar}>Personalizar</button>
        </div>
        {simple.abierto && (
          <div className="vs-personalizar" id="vs-personalizar">
            <div className="vs-botones">
              <button type="button" className="btn" aria-haspopup="dialog" onClick={() => setVentanaP("fecha")}>Filtrar fecha</button>
              <button type="button" className="btn" aria-haspopup="dialog" onClick={() => setVentanaP("variable")}>Elegir variable</button>
              <button type="button" className="btn" aria-haspopup="dialog" onClick={() => setVentanaP("opciones")}>{cuenta ? `Opciones del gráfico (${cuenta})` : "Opciones del gráfico"}</button>
            </div>
            {simple.alFabrica && <div className="vs-fabrica"><button type="button" className="btn" onClick={simple.alFabrica}>Volver a lo de fábrica</button></div>}
            <div className="vs-secundarios">{simple.acciones}</div>
          </div>
        )}
        {ventanaP === "fecha" && <VentanaPers titulo="Filtrar fecha" onCerrar={() => setVentanaP(null)}>{simple.fecha}</VentanaPers>}
        {ventanaP === "variable" && (
          <VentanaPers titulo="Elegir variable" onCerrar={() => setVentanaP(null)}>{simple.variables}{simple.agregar}</VentanaPers>
        )}
        {ventanaP === "opciones" && (
          <VentanaPers titulo="Opciones del gráfico" onCerrar={() => setVentanaP(null)}>
            {simple.frecuencia}
            <div className="controls"><label>Mostrar como</label><Seg valor={E.tabla} opciones={[["grafico", "Gráfico"], ["tabla", "Tabla"]]} onElegir={(v) => onVista(v as Vista)} /></div>
            {config}
          </VentanaPers>
        )}
        {resumen}
      </>
    );
  }
  return (
    <>
      {resumen}
      <CardGrafico titulo={titulo} temporal={temporal} nota={nota} leyenda={leyenda} config={{ cuenta, children: config }}
        rows={rows} series={series} opts={opts} unidades={unidades} vista={E.tabla} onVista={onVista} />
    </>
  );
}

