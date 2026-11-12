"use client";
// En qué gasta la Nación (/gasto/, docs/specs/gasto-nacion.md): una lista de barras de mayor a menor para cuatro formas de mirar el gasto
// (para qué, quién, en qué, dónde), por año, en pesos de hoy, % del total o % del PIB. Tocar una barra abre su nivel siguiente.
// Todas las cuentas están en lib/gasto.ts; acá solo se dibuja. Estado en la URL: anio, med, etapa, forma, ruta (nombres separados por "~") y todas.
import { useMemo, useState } from "react";
import { useGastoAnios, useGastoIndice } from "../useGasto";
import { useSeccion } from "../useSeccion";
import { Cargando, Desplegable, Selector, Seg } from "../ui";
import { Sparkline } from "../Sparkline";
import { PanelGasto } from "../PanelGasto";
import { avisoCompartir, compartir } from "@/lib/compartir";
import { fmtMillones, nfDec } from "@/lib/formato";
import {
  BAJADA_FORMA, ETAPAS, ETAPA_DEFECTO, FORMAS, FORMA_DEFECTO, MEDIDAS, MEDIDA_DEFECTO, NIVELES, NOTA_DONDE,
  anioDe, anioDefecto, aniosTxt, armarVista, buscar, crearDeflactor, decPctDe, escribirRuta, esEtapa, esForma, esMedida, fechaLarga, fuenteTxt, hrefVista, leerRuta,
  nombreForma, opcionesAnio, otraUbicacionTxt, serieNodo, tituloVista,
  type ArchivoAnio, type Barra, type Deflactor, type Forma, type IndiceGasto, type Vista,
} from "@/lib/gasto";
import { useParams } from "@/lib/url";

export function Gasto() {
  const { datos, error } = useGastoIndice();
  const sec = useSeccion([]);
  const m = sec.motor, listo = !!m && !sec.ocupado;
  const deflactor = useMemo(() => (m && listo ? crearDeflactor(m.F, m.base().IPC) : null), [m, listo]);
  if (error) return <div className="card"><p className="error" role="alert">{error}</p><p className="note">El resto del sitio sigue funcionando. Probá de nuevo en un rato.</p></div>;
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!datos || !deflactor) return <Cargando texto="Cargando el gasto de la Nación…" />;
  return <Cuerpo ix={datos} deflactor={deflactor} />;
}

function Cuerpo({ ix, deflactor }: { ix: IndiceGasto; deflactor: Deflactor }) {
  const [p, set, montado] = useParams();
  const [imagen, setImagen] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const def = anioDefecto(ix);
  const anio = anioDe(ix, p.get("anio")) ?? def;
  const forma: Forma = esForma(p.get("forma")) ? (p.get("forma") as Forma) : FORMA_DEFECTO;
  const medida = esMedida(p.get("med")) ? p.get("med")! as typeof MEDIDA_DEFECTO : MEDIDA_DEFECTO;
  const etapa = esEtapa(p.get("etapa")) ? p.get("etapa")! as typeof ETAPA_DEFECTO : ETAPA_DEFECTO;
  const ruta = leerRuta(p.get("ruta"));
  const todas = p.get("todas") === "1";
  const { listos, cargando, error } = useGastoAnios(ix, montado ? [anio.archivo] : []);
  const archivo = listos.get(anio.archivo) ?? null;
  const vista = useMemo(() => (archivo ? armarVista({ archivo, anio, forma, ruta, medida, etapa, deflactor, max: todas ? Infinity : undefined }) : null),
    [archivo, anio, forma, p.get("ruta"), medida, etapa, deflactor, todas]);   // eslint-disable-line react-hooks/exhaustive-deps

  // la imagen sale siempre con la vista por defecto (diez barras y "Otros"), que es lo que abre el link (el link no lleva `todas`)
  const vistaImg = useMemo(() => (!vista || !todas || !archivo ? vista : armarVista({ archivo, anio, forma, ruta, medida, etapa, deflactor })),
    [vista, todas, archivo, anio, forma, p.get("ruta"), medida, etapa, deflactor]);   // eslint-disable-line react-hooks/exhaustive-deps

  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };
  const ir = (r: string[]) => set({ ruta: escribirRuta(r), todas: null });
  const href = vista ? hrefVista(vista, def.anio) : "/gasto/";
  const titulo = vista ? tituloVista(vista) : "En qué gasta la Nación";

  return (
    <section className="gas">
      <p className="sub">Cuánto gastó el Estado nacional cada año, en qué y quién, con datos oficiales del presupuesto.</p>
      <div className="controls gas-controles">
        <Selector etiqueta="Año" valor={String(anio.anio)} opciones={opcionesAnio(ix)} onElegir={(a) => set({ anio: Number(a) === def.anio ? null : a })} />
        <Desplegable etiqueta={`${MEDIDAS.find((x) => x[0] === medida)![1]} · ${ETAPAS.find((x) => x[0] === etapa)![1]}`}>
          <div className="controls"><label>Medida</label>
            <Seg valor={medida} opciones={MEDIDAS} onElegir={(v) => set({ med: v === MEDIDA_DEFECTO ? null : v })} /></div>
          <div className="controls"><label>Etapa</label>
            <Seg valor={etapa} opciones={ETAPAS} onElegir={(v) => set({ etapa: v === ETAPA_DEFECTO ? null : v })} /></div>
        </Desplegable>
        <Desplegable etiqueta="Buscar">
          {(cerrar) => (
            <Buscador ix={ix} onIr={(r) => cerrar(() => set({ forma: r.forma === FORMA_DEFECTO ? null : r.forma, ruta: escribirRuta(r.ruta), anio: r.anio === def.anio ? null : String(r.anio), todas: null }))} />
          )}
        </Desplegable>
      </div>
      <div className="gas-formas" role="group" aria-label="Forma de mirar el gasto">
        <Seg valor={forma} opciones={FORMAS} onElegir={(f) => set({ forma: f === FORMA_DEFECTO ? null : f, ruta: null, todas: null })} />
      </div>
      <p className="note gas-bajada">{BAJADA_FORMA[forma]}</p>


      {error && <p className="error" role="alert">{error}</p>}
      {!vista ? (cargando || !montado ? <Cargando texto={`Cargando ${anio.anio}…`} /> : <div className="card"><p className="note">No hay datos de esta forma para {anio.anio}.</p></div>) : (
        <>
          <Lista vista={vista} onIr={ir} onTodas={() => set({ todas: "1" })} />
          <div className="gas-compartir" role="group" aria-label="Compartir esta vista">
            <button type="button" className="btn primario" onClick={() => setImagen(true)}>Compartir como imagen</button>
            <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(href, titulo)))}>Copiar link</button>
          </div>
          {aviso && <p className="aviso-link" role="status">{aviso}</p>}
          <Comparar ix={ix} forma={forma} ruta={vista.ruta} deflactor={deflactor} />
        </>
      )}

      <Pie ix={ix} anio={anio.anio} />
      {imagen && vistaImg && <PanelGasto vista={vistaImg}titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </section>
  );
}

/** Migas, total del nivel abierto y la lista de barras. */
function Lista({ vista: v, onIr, onTodas }: { vista: Vista; onIr: (r: string[]) => void; onTodas: () => void }) {
  const nivel = NIVELES[v.forma][v.ruta.length];
  const nodoT = v.nodo.t;
  return (
    <div className="card gas-card">
      {v.ruta.length > 0 && (
        <nav className="migas gas-migas" aria-label="Niveles abiertos">
          <button type="button" onClick={() => onIr([])}>{nombreForma(v.forma)}</button>
          {v.ruta.map((n, i) => (
            <span key={i} className="gas-miga">
              <span aria-hidden="true">›</span>
              {i < v.ruta.length - 1 ? <button type="button" onClick={() => onIr(v.ruta.slice(0, i + 1))}>{n}</button> : <span aria-current="page">{n}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="gas-total">
        <h2>{v.ruta.length ? v.ruta[v.ruta.length - 1] : `Gasto total de ${v.anio.anio}`}</h2>
        {nodoT && <p className="note gas-tecnico">Nombre en el presupuesto: {nodoT}</p>}
        <p className="gas-total-num"><b>{v.total}</b> <span>{v.etapaTxt}{v.totalEjec ? ` · ${v.totalEjec} ejecutado` : ""}</span></p>
        <p className="note">{v.unidad}.{v.medidaUsada === "pct" && v.ruta.length ? " Cada barra, sobre el gasto total del año." : ""}</p>
        {v.aviso && <p className="note gas-aviso" role="status">{v.aviso}</p>}
      </div>
      {v.forma === "donde" && <p className="note gas-nota-donde">{NOTA_DONDE}</p>}
      {v.barras.length ? (
        <>
          <p className="gas-enc" aria-hidden="true"><span>{nivel ?? "Partida"}</span><span>{v.encParte}</span></p>
          <ol className="gas-lista">
            {v.barras.map((b, i) => <FilaBarra key={i} b={b} onAbrir={b.nodo ? () => onIr([...v.ruta, b.n]) : b.tipo === "otros" ? onTodas : null} />)}
          </ol>
        </>
      ) : <p className="note">No se divide en un nivel más abajo.</p>}
      <p className="note gas-pie-lista">El % ejecutado es lo gastado (devengado) sobre el crédito vigente: el presupuesto con sus modificaciones del año.</p>
    </div>
  );
}

function FilaBarra({ b, onAbrir }: { b: Barra; onAbrir: (() => void) | null }) {
  const sub = [b.parte, b.ejec && `${b.ejec} ejecutado`].filter(Boolean).join(" · ");
  const contenido = (
    <>
      <span className="gas-fila-arriba">
        <span className="gas-nombre">{b.n}{b.tipo === "otros" && <small> · ver todas</small>}</span>
        <span className="gas-monto">{b.txt}</span>
      </span>
      <span className="gas-pista" aria-hidden="true"><span className={`gas-barra${b.tipo !== "nodo" ? " gas-barra-otros" : ""}`} style={{ width: `${(b.ancho * 100).toFixed(2)}%` }} /></span>
      {sub && <span className="gas-sub">{sub}</span>}
    </>
  );
  return (
    <li className={`gas-fila gas-${b.tipo}`}>
      {onAbrir
        ? <button type="button" className="gas-abrir" onClick={onAbrir} title={b.t ? `Nombre en el presupuesto: ${b.t}` : undefined}
          aria-label={b.tipo === "otros" ? `${b.n}: ${b.txt}. Ver todas` : `${b.n}: ${b.txt}${sub ? `, ${sub}` : ""}. Abrir`}>{contenido}</button>
        : <div className="gas-abrir gas-quieta">{contenido}</div>}
    </li>
  );
}

/** Buscador por nombre en todos los niveles y años. Baja los archivos de todos los años recién cuando se escribe. */
function Buscador({ ix, onIr }: { ix: IndiceGasto; onIr: (r: { forma: Forma; ruta: string[]; anio: number }) => void }) {
  const [q, setQ] = useState("");
  const activo = q.trim().length >= 3;
  const { listos, cargando } = useGastoAnios(ix, activo ? ix.anios.map((a) => a.archivo) : []);
  const archivos = useMemo(() => [...listos.values()] as ArchivoAnio[], [listos]);
  const res = useMemo(() => (activo ? buscar(archivos, q, 30, new Set(ix.anios.filter((a) => a.en_curso).map((a) => a.anio))) : []), [activo, archivos, q, ix]);
  return (
    <div className="gas-buscar">
      <label className="lbl" htmlFor="gas-q">Buscar un organismo, programa o partida</label>
      <input id="gas-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Por ejemplo: universidad, ANSES, Conicet" autoComplete="off" />
      {activo && (
        <div className="gas-resultados" role="status" aria-live="polite">
          {cargando && !archivos.length ? <p className="note">Buscando en todos los años…</p>
            : !res.length ? <p className="note">No hay nada con ese nombre.</p> : (
              <ul>
                {res.map((r, i) => {
                  return (
                    <li key={i}>
                      <button type="button" onClick={() => { setQ(""); onIr({ forma: r.forma, ruta: r.ruta, anio: r.anio }); }}>
                        <span className="gas-res-n">{r.n}</span>
                        <small>{nombreForma(r.forma)} · {r.nivel}{r.ruta.length > 1 ? `, en ${r.donde}` : ""} · {aniosTxt(r.anios)}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          {cargando && archivos.length > 0 && <p className="note">Buscando en el resto de los años…</p>}
        </div>
      )}
    </div>
  );
}

/** Comparar años: el nodo abierto en cada año cerrado, en pesos de hoy y en % del PIB. Baja los años recién al abrirlo. */
function Comparar({ ix, forma, ruta, deflactor }: { ix: IndiceGasto; forma: Forma; ruta: string[]; deflactor: Deflactor }) {
  const [abierto, setAbierto] = useState(false);
  const { listos, cargando } = useGastoAnios(ix, abierto ? ix.anios.filter((a) => !a.en_curso).map((a) => a.archivo) : []);
  const porAnio = useMemo(() => new Map([...listos.values()].map((a) => [a.anio, a])), [listos]);
  const serie = useMemo(() => (abierto ? serieNodo(ix, porAnio, forma, ruta, deflactor) : null), [abierto, ix, porAnio, forma, ruta.join("~"), deflactor]);   // eslint-disable-line react-hooks/exhaustive-deps
  const nombre = ruta.length ? ruta[ruta.length - 1] : "Gasto total";
  const decPib = decPctDe((serie?.puntos ?? []).map((x) => x.pib));   // los mismos decimales que la lista: un organismo chico no queda en "0,00 %"
  const fmtPib = (v: number) => `${nfDec(decPib).format(v)} %`;
  return (
    <details className="gas-comparar" onToggle={(e) => setAbierto((e.target as HTMLDetailsElement).open)}>
      <summary>Comparar años: {nombre}</summary>
      {!serie || (cargando && serie.puntos.length < 2) ? <Cargando texto="Cargando los años…" />
        : serie.puntos.length < 2 ? <p className="note">Hay un solo año con este nombre: no hay con qué comparar.</p> : (
          <>
            <p className="note">Lo gastado (devengado) en cada año cerrado{serie.larga ? ", desde 2004 con la serie por finalidad y función del Ministerio de Economía" : ""}. El año en curso no entra porque todavía no terminó.</p>
            {otraUbicacionTxt(serie) && <p className="note">{otraUbicacionTxt(serie)}</p>}
            <div className="gas-graficos">
              <MiniSerie titulo={`En pesos de ${serie.ref}`} puntos={serie.puntos.map((x) => [x.anio, x.hoy])} fmt={(v) => fmtMillones(v)} />
              <MiniSerie titulo="En % del PIB" puntos={serie.puntos.map((x) => [x.anio, x.pib])} fmt={fmtPib} />
            </div>
            <details className="gas-tabla-anios">
              <summary>Ver año por año</summary>
              <div className="tablewrap">
                <table>
                  <thead><tr><th scope="col">Año</th><th scope="col">Pesos de {serie.ref}</th><th scope="col">% del PIB</th></tr></thead>
                  <tbody>
                    {[...serie.puntos].reverse().map((x) => (
                      <tr key={x.anio}><th scope="row">{x.anio}</th><td>{x.hoy != null ? fmtMillones(x.hoy) : "–"}</td><td>{x.pib != null ? fmtPib(x.pib) : "–"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
    </details>
  );
}

function MiniSerie({ titulo, puntos, fmt }: { titulo: string; puntos: [number, number | null][]; fmt: (v: number) => string }) {
  const con = puntos.filter((x): x is [number, number] => x[1] != null);
  if (con.length < 2) return <div className="gas-mini"><h3>{titulo}</h3><p className="note">Sin datos suficientes.</p></div>;
  const a = con[0], z = con[con.length - 1];
  return (
    <div className="gas-mini">
      <h3>{titulo}</h3>
      <Sparkline v={puntos.map((x) => x[1])} desde={0} />
      <p className="gas-mini-ext"><span>{a[0]}: <b>{fmt(a[1])}</b></span><span>{z[0]}: <b>{fmt(z[1])}</b></span></p>
    </div>
  );
}

function Pie({ ix, anio }: { ix: IndiceGasto; anio: number }) {
  const a = ix.anios.find((x) => x.anio === anio);
  const enCurso = ix.anios.filter((x) => x.en_curso);
  return (
    <details className="gas-pie">
      <summary>Qué incluye, qué es cada etapa y fuente</summary>
      <ul className="method">
        <li><b>Qué incluye</b>: la Administración Nacional (la administración central, los organismos descentralizados y la seguridad social, como la ANSES). <b>No incluye</b> las empresas públicas ni los fondos fiduciarios, y tampoco el gasto de las provincias ni de los municipios con sus propios recursos (sí lo que la Nación les transfiere).</li>
        <li><b>Presupuestado</b>: lo que aprobó la ley de presupuesto al empezar el año. <b>Vigente</b>: el presupuesto con las modificaciones que se le hicieron durante el año. <b>Gastado (devengado)</b>: el gasto ya hecho, cuando el bien o el servicio se recibió y nace la obligación de pagarlo, aunque todavía no se haya pagado. El % ejecutado es lo gastado sobre lo vigente; si una fila no lo muestra, es porque la fuente no trae el crédito vigente completo en ese nivel (pasa, por ejemplo, con cada universidad).</li>
        <li><b>Pesos de hoy</b>: el monto de cada año ajustado por inflación con el IPC (el IPC del último mes publicado sobre el IPC promedio de ese año). <b>% del PIB</b>: sobre el producto bruto de ese año a precios corrientes.</li>
        <li><b>Universidades</b>: no figuran como organismos del presupuesto: reciben transferencias del programa “Desarrollo de la Educación Superior”, que se abre por universidad en Quién.</li>
        <li><b>Nombres</b>: en palabras de todos los días; el nombre del presupuesto aparece al abrir cada nivel. Un organismo que cambió de ministerio se sigue por su nombre.</li>
        <li><b>Fuente</b>: {a ? fuenteTxt(a) : "Presupuesto Abierto (Ministerio de Economía)"}.{enCurso.map((x) => ` ${x.anio} está en curso: los datos llegan hasta el ${fechaLarga(x.actualizado) ?? "último dato publicado"} y cambian a medida que avanza el año.`).join("")} Montos redondeados: por eso se muestra la diferencia por redondeo cuando la suma no da justo.</li>
      </ul>
    </details>
  );
}
