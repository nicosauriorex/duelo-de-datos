"use client";
// Cuánto reciben las universidades (/universidades/, docs/specs/gasto-nacion.md, fase 3): lo que la Nación transfiere a cada universidad nacional por el programa
// "Desarrollo de la Educación Superior", en pesos de hoy y % del PIB, la evolución 2018-2026, la lista con buscador, lo transferido por estudiante (2023 y 2024)
// y el control y la rendición de cuentas. Todas las cuentas están en lib/universidades.ts; acá solo se dibuja.
// Estado en la URL: anio, med (hoy | pib), orden (monto | var | est), u (universidad abierta) y q (lo escrito en el buscador).
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUniversidades } from "../useUniversidades";
import { useGastoIndice } from "../useGasto";
import { useSeccion } from "../useSeccion";
import { Cargando, Selector, Seg } from "../ui";
import { PanelGasto } from "../PanelGasto";
import { avisoCompartir, compartir } from "@/lib/compartir";
import { nf0 } from "@/lib/formato";
import { crearDeflactor, fechaLarga } from "@/lib/gasto";
import {
  MEDIDAS_U, MEDIDA_U_DEFECTO, ORDENES_U, ORDEN_U_DEFECTO, anioDefectoU, anioValidoU, armarEvolucion, armarImagenU, armarVistaU, buscarUniv, crearContexto, enCursoTxt,
  esMedidaU, esOrdenU, extremoTxt, filtrar, hrefU, opcionesAnioU, tituloU,
  type Contexto, type DatosUniv, type Evolucion, type FilaU, type MedidaU, type OrdenU, type VistaU,
} from "@/lib/universidades";
import { useParams } from "@/lib/url";

// direcciones finales (los dominios agn.gob.ar y agn.gov.ar redirigen a agn.ar; comprobado el 2026-11-13)
const AGN_2023_004 = "https://agn.ar/sites/default/files/informes/2023-004-Informe.pdf";
const AGN_2024_222 = "https://agn.ar/sites/default/files/informes/2024-222-Informe.pdf";
const AGN_2024_152 = "https://agn.ar/sites/default/files/informes/2024-152-Informe.pdf";
const CUENTA_2024 = "https://www.argentina.gob.ar/sites/default/files/comentario_universidades_2024.pdf";
const PIU = "https://piu.agn.gov.ar/";

export function Universidades() {
  const { datos, error } = useUniversidades();
  const ix = useGastoIndice();
  const sec = useSeccion([]);
  const m = sec.motor, listo = !!m && !sec.ocupado;
  const deflactor = useMemo(() => (m && listo ? crearDeflactor(m.F, m.base().IPC) : null), [m, listo]);
  const ixListo = !!ix.datos || !!ix.error;   // el índice del gasto solo aporta qué año está en curso y el PIB que falte: si no llega, se sigue sin él
  const contexto = useMemo(() => {
    if (!datos || !deflactor || !ixListo) return null;
    const enCurso: number[] = [], pib = new Map<number, number>(), act = new Map<number, string>();
    ix.datos?.anios.forEach((a) => { if (a.en_curso) enCurso.push(a.anio); if (a.pib) pib.set(a.anio, a.pib); if (a.actualizado) act.set(a.anio, a.actualizado); });
    if (!ix.datos && datos.anios.length && datos.anios[datos.anios.length - 1] === new Date().getFullYear()) enCurso.push(datos.anios[datos.anios.length - 1]);
    return crearContexto(datos, deflactor, { enCurso, pib, actualizado: act });
  }, [datos, deflactor, ixListo, ix.datos]);
  if (error) return (
    <div className="card">
      <p className="error" role="alert">{error}</p>
      <p className="note">Todavía no está el archivo con lo transferido a cada universidad, o no se pudo leer. El resto del sitio sigue funcionando; el total del programa por año está en <Link prefetch={false} href="/gasto/">En qué gasta la Nación</Link>.</p>
    </div>
  );
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!contexto) return <Cargando texto="Cargando las transferencias a las universidades…" />;
  return <Cuerpo c={contexto} />;
}

function Cuerpo({ c }: { c: Contexto }) {
  const [p, set, montado] = useParams();
  const [imagen, setImagen] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { if (montado) setQ(p.get("q") ?? ""); }, [montado]);   // eslint-disable-line react-hooks/exhaustive-deps
  const def = anioDefectoU(c);
  const anio = anioValidoU(c, p.get("anio")) ?? def;
  const medida: MedidaU = esMedidaU(p.get("med")) ? (p.get("med") as MedidaU) : MEDIDA_U_DEFECTO;
  const orden: OrdenU = esOrdenU(p.get("orden")) ? (p.get("orden") as OrdenU) : ORDEN_U_DEFECTO;
  const abierta = montado ? buscarUniv(c.d, p.get("u"))?.n ?? null : null;
  const vista = useMemo(() => armarVistaU(c, { anio, medida, orden }), [c, anio, medida, orden]);
  const href = vista ? hrefU(vista, def, abierta) : "/universidades/";
  const titulo = vista ? tituloU(vista) : "Cuánto reciben las universidades";
  const armarImg = useCallback((f: Parameters<typeof armarImagenU>[1]) => armarImagenU(vista!, f), [vista]);
  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };

  return (
    <section className="uni">
      <p className="sub">Cuánto transfiere la Nación a cada universidad nacional, año por año, y lo que se sabe de cómo se controla. Datos oficiales del presupuesto.</p>
      <div className="controls uni-controles">
        <Selector etiqueta="Año" valor={String(anio)} opciones={opcionesAnioU(c)} onElegir={(a) => set({ anio: Number(a) === def ? null : a })} />
        <Seg valor={medida} opciones={MEDIDAS_U} onElegir={(v) => set({ med: v === MEDIDA_U_DEFECTO ? null : v })} />
      </div>
      {!vista ? <div className="card"><p className="note">No hay datos de lo transferido en {anio}.</p></div> : (
        <>
          <Resumen c={c} v={vista} onAnio={(a) => set({ anio: a === def ? null : String(a) })} />
          <Lista c={c} v={vista} q={q} orden={orden} abierta={abierta} medida={medida}
            onQ={(t) => { setQ(t); set({ q: t.trim() ? t : null }); }}
            onOrden={(o) => set({ orden: o === ORDEN_U_DEFECTO ? null : o })}
            onAbrir={(n) => set({ u: n })} />
          <div className="uni-compartir" role="group" aria-label="Compartir esta vista">
            <button type="button" className="btn primario" onClick={() => setImagen(true)}>Compartir como imagen</button>
            <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(href, titulo)))}>Copiar link</button>
          </div>
          {aviso && <p className="aviso-link" role="status">{aviso}</p>}
          {vista.sistema && <PorEstudiante v={vista} />}
        </>
      )}
      <Control />
      <Pie d={c.d} v={vista} />
      {imagen && vista && <PanelGasto armar={armarImg} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </section>
  );
}

/** El total del año, su peso en el PIB y la evolución 2018-2026. */
function Resumen({ c, v, onAnio }: { c: Contexto; v: VistaU; onAnio: (anio: number) => void }) {
  const evo = useMemo(() => armarEvolucion(c, v.medida, c.d.programa.dev), [c, v.medida]);
  return (
    <div className="card uni-resumen">
      <h2>Gastado por el programa de universidades en {v.anio}{v.enCurso ? " (en curso)" : ""}</h2>
      <p className="uni-total"><b>{v.totalHoy ?? v.total}</b>{v.totalPib ? <span> · {v.totalPib} del PIB</span> : <span> · el PIB de {v.anio} todavía no está publicado</span>}</p>
      <p className="note">
        {v.enCurso ? `Lo gastado (devengado) hasta la fecha, en pesos de ${v.ref}. ` : `Lo gastado (devengado) en el año, en pesos de ${v.ref} (ajustados por inflación con el IPC). `}
        {v.varTotal ? `Contra ${v.anio - 1}: ${v.varTotal} en términos reales.` : v.enCurso ? "El año en curso no se compara con el anterior porque todavía no terminó." : ""}
      </p>
      {v.aviso && <p className="note" role="status">{v.aviso}</p>}
      <Evo evo={evo} elegido={v.anio} etiqueta="Evolución del total" onElegir={onAnio} nota={v.enCurso || evo.hayEnCurso ? enCursoTxt(c, c.d.anios.find((a) => c.enCurso.has(a)) ?? v.anio) : null} />
    </div>
  );
}

/** Gráfico chico de columnas, una por año. `onElegir`: tocar una columna elige ese año. El año en curso va rayado y con asterisco. */
function Evo({ evo, elegido, etiqueta, onElegir, nota }: { evo: Evolucion; elegido: number | null; etiqueta: string; onElegir?: (anio: number) => void; nota: string | null }) {
  return (
    <figure className="uni-evo-fig">
      <figcaption className="uni-evo-tit">{etiqueta}, {evo.medida === "hoy" ? "en pesos de hoy" : "en % del PIB"}</figcaption>
      <ol className="uni-evo">
        {evo.puntos.map((pt) => {
          const txt = pt.txt ? `${pt.anio}${pt.enCurso ? " (en curso)" : ""}: ${pt.txt}` : `${pt.anio}: sin dato`;
          const cuerpo = (
            <>
              <span className="uni-evo-col"><span className={`uni-evo-barra${pt.enCurso ? " uni-evo-encurso" : ""}${pt.anio === elegido ? " uni-evo-elegida" : ""}`} style={{ height: `${(pt.alto * 100).toFixed(1)}%` }} /></span>
              <span className="uni-evo-anio">{pt.anio}{pt.enCurso ? "*" : ""}</span>
            </>
          );
          return (
            <li key={pt.anio}>
              {onElegir && pt.valor != null
                ? <button type="button" className="uni-evo-btn" aria-pressed={pt.anio === elegido} aria-label={txt} title={txt} onClick={() => onElegir(pt.anio)}>{cuerpo}</button>
                : <div className="uni-evo-btn uni-evo-quieta" role="img" aria-label={txt} title={txt}>{cuerpo}</div>}
            </li>
          );
        })}
      </ol>
      {evo.primero && evo.ultimo && evo.primero !== evo.ultimo && <p className="uni-evo-ext"><span>{extremoTxt(evo.primero)}</span><span>{extremoTxt(evo.ultimo)}</span></p>}
      {nota && <p className="note">* {nota}</p>}
    </figure>
  );
}

/** Buscador, orden y la lista de universidades con barras. Tocar una abre su serie. */
function Lista({ c, v, q, orden, abierta, medida, onQ, onOrden, onAbrir }: {
  c: Contexto; v: VistaU; q: string; orden: OrdenU; abierta: string | null; medida: MedidaU;
  onQ: (t: string) => void; onOrden: (o: OrdenU) => void; onAbrir: (n: string | null) => void;
}) {
  const filas = useMemo(() => filtrar(v.filas, q), [v.filas, q]);
  const filtrando = filas.length !== v.filas.length;
  const sinOrden = orden === "est" && !v.hayEstudiantes;
  const anioAnt = v.anio - 1;
  return (
    <div className="card uni-lista-card">
      <h2>Qué recibió cada universidad en {v.anio}</h2>
      <div className="uni-buscar">
        <label className="lbl" htmlFor="uni-q">Buscar una universidad</label>
        <input id="uni-q" type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder="Por ejemplo: Córdoba, UBA, Cuyo" autoComplete="off" />
      </div>
      <div className="controls uni-orden"><label>Ordenar por</label><Seg valor={orden} opciones={ORDENES_U} onElegir={(o) => onOrden(o as OrdenU)} /></div>
      {sinOrden && <p className="note" role="status">No hay estudiantes de {v.anio} (solo de 2023 y 2024): se ordena por monto.</p>}
      <p className="note uni-unidad">{v.unidad}. Cada barra, sobre el total del programa.{v.enCurso ? "" : ` La variación es real (descontada la inflación) contra ${anioAnt}.`}</p>
      {filtrando && <p className="note" role="status">{filas.length ? `Se muestran ${nf0.format(filas.length)} de ${nf0.format(v.filas.length)} filas. El total de arriba es el del programa entero.` : "No hay ninguna con ese nombre."}</p>}
      {filas.length > 0 && (
        <>
          <p className="gas-enc" aria-hidden="true"><span>Universidad</span><span>% del total · variación real</span></p>
          <ol className="gas-lista">
            {filas.map((f) => <FilaUniv key={f.clave} f={f} v={v} c={c} medida={medida} abierta={abierta === f.n} onToggle={() => onAbrir(abierta === f.n ? null : f.n)} />)}
          </ol>
          {!filtrando && <p className="uni-suma note">Las filas de la lista suman el total del programa: {v.total}.</p>}
        </>
      )}
    </div>
  );
}

function FilaUniv({ f, v, c, medida, abierta, onToggle }: { f: FilaU; v: VistaU; c: Contexto; medida: MedidaU; abierta: boolean; onToggle: () => void }) {
  const sub = [
    f.parte && `${f.parte} del total`,
    f.variTxt && `${f.variTxt} real vs ${v.anio - 1}`,
    f.porEstTxt && `${f.porEstTxt} por estudiante`,
    f.sinEst && "sin dato de estudiantes",
  ].filter(Boolean).join(" · ");
  const contenido = (
    <>
      <span className="gas-fila-arriba"><span className="gas-nombre">{f.n}</span><span className="gas-monto">{f.txt}</span></span>
      <span className="gas-pista" aria-hidden="true"><span className={`gas-barra${f.tipo !== "univ" ? " gas-barra-otros" : ""}`} style={{ width: `${(f.ancho * 100).toFixed(2)}%` }} /></span>
      {sub && <span className="gas-sub">{sub}</span>}
    </>
  );
  const puede = f.tipo === "univ" && !!f.u;
  return (
    <li className={`gas-fila${f.tipo === "redondeo" ? " gas-redondeo" : ""}`}>
      {puede
        ? <button type="button" className="gas-abrir" aria-expanded={abierta} onClick={onToggle} aria-label={`${f.n}: ${f.txt}${sub ? `, ${sub}` : ""}. ${abierta ? "Cerrar" : "Ver desde 2018"}`}>{contenido}</button>
        : <div className="gas-abrir gas-quieta">{contenido}</div>}
      {abierta && f.u && <Detalle c={c} f={f} medida={medida} />}
    </li>
  );
}

/** La serie 2018-2026 de una universidad, en pesos de hoy (o % del PIB), con la tabla año por año. */
function Detalle({ c, f, medida }: { c: Contexto; f: FilaU; medida: MedidaU }) {
  const u = f.u!;
  const evo = useMemo(() => armarEvolucion(c, medida, u.dev), [c, medida, u]);
  const anios = Object.keys(u.est ?? {}).map(Number).sort();
  const enCurso = c.d.anios.find((a) => c.enCurso.has(a));
  return (
    <div className="uni-detalle">
      <Evo evo={evo} elegido={null} etiqueta={u.n} nota={enCurso != null && evo.hayEnCurso ? enCursoTxt(c, enCurso) : null} />
      {anios.length > 0 && (
        <p className="note">Estudiantes de pregrado y grado: {anios.map((a) => `${nf0.format(u.est![a].total ?? 0)} en ${a}${u.est![a].nuevos != null ? ` (${nf0.format(u.est![a].nuevos!)} nuevos inscriptos)` : ""}`).join("; ")}. Los provee el Consejo Interuniversitario Nacional y la Auditoría General no los audita.</p>
      )}
      <details className="gas-tabla-anios">
        <summary>Ver año por año</summary>
        <div className="tablewrap">
          <table>
            <thead><tr><th scope="col">Año</th><th scope="col">{evo.medida === "hoy" ? `Pesos de ${c.def.ref}` : "% del PIB"}</th><th scope="col">% del total</th><th scope="col">Variación real</th></tr></thead>
            <tbody>
              {evo.filas.map((x) => (
                <tr key={x.anio}><th scope="row">{x.anio}{x.enCurso ? " (en curso)" : ""}</th><td>{x.txt ?? "–"}</td><td>{x.parte ?? "–"}</td><td>{x.vari ?? "–"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Lo transferido por estudiante: el sistema entero (con el total de las 61) y los avisos de siempre. Solo 2023 y 2024. */
function PorEstudiante({ v }: { v: VistaU }) {
  const s = v.sistema!;
  return (
    <div className="card uni-est">
      <h2>Transferido por estudiante en {s.anio}</h2>
      <p className="uni-total"><b>$ {new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(s.porEst / 1e6)} millones</b><span> por estudiante de pregrado y grado</span></p>
      <p className="note">Es lo transferido a las universidades en {s.anio} (en pesos de {v.ref}) dividido los {nf0.format(s.estudiantes61)} estudiantes de pregrado y grado de las 61 universidades nacionales. Cada universidad con dato de estudiantes lo muestra en su fila ({nf0.format(s.conArchivo)} con dato; {nf0.format(s.sinArchivo)} dicen “sin dato de estudiantes”).</p>
      <details className="gas-pie">
        <summary>Cómo leer esta cuenta</summary>
        <ul className="method">
          <li>Los datos de estudiantes los provee el Consejo Interuniversitario Nacional a partir de lo que informa cada universidad; la Auditoría General de la Nación los publica en el <a href={PIU} target="_blank" rel="noopener noreferrer">Portal de Información Universitaria</a> y aclara que no los audita. Hay datos de 2023 y 2024.</li>
          <li>Cuenta a todos los inscriptos, incluidos los que no cursan.</li>
          <li>Lo transferido paga también investigación, extensión, colegios preuniversitarios y hospitales universitarios: por eso <b>no es el costo de un estudiante</b>.</li>
          <li>Las universidades sin archivo en el portal no tienen su cuenta por estudiante y dicen “sin dato de estudiantes”. Las {nf0.format(s.conArchivo)} con dato suman {nf0.format(s.estudiantesConArchivo)} estudiantes.</li>
        </ul>
      </details>
    </div>
  );
}

/** Quién controla y qué se sabe de la rendición de cuentas, con las citas y sin veredicto. */
function Control() {
  return (
    <div className="card uni-control">
      <h2>Control y rendición de cuentas</h2>
      <p className="note">Lo que dicen los documentos oficiales, sin agregar nada más. Esta página no afirma que una universidad rindió bien o mal sus cuentas.</p>
      <ul className="uni-citas">
        <li><b>Quién controla.</b> El artículo 59 bis de la Ley de Educación Superior (24.521, incorporado por la Ley 27.204) dice que el control administrativo externo de las universidades estatales es competencia de la Auditoría General de la Nación.</li>
        <li><b>Qué dice la Cuenta de Inversión 2024.</b> En su página 1, el comentario sobre las universidades dice que “han dado cumplimiento la totalidad de las instituciones (61) en cuanto a la presentación de la información requerida por las pertinentes normas de cierre”. Eso es presentar la información de cierre: no es una auditoría. <a href={CUENTA_2024} target="_blank" rel="noopener noreferrer">Comentario a la ejecución presupuestaria de las universidades nacionales, 2024</a>.</li>
        <li><b>No hay una lista pública de quién rindió y quién no.</b> No existe un listado oficial que diga qué universidades rindieron o no sus gastos. La Resolución 77/2025 (Boletín Oficial, 30-04-2025) habla de 672 instituciones con rendiciones pendientes de subvenciones del ex Ministerio de Ciencia, por unos $33.000 millones: no son solo universidades y no trae nombres.</li>
        <li>
          <b>Informes de la Auditoría General de la Nación.</b> Ninguno trae una lista de universidades que no rindieron.
          <ul>
            <li><a href={AGN_2023_004} target="_blank" rel="noopener noreferrer">Informe 2023-004</a> (Cuenta de Inversión 2018, firmado el 19-12-2019, páginas 57 y 58): transferencias a universidades por $109.339 millones, el 4,9 % de las transferencias de la Administración Nacional, con una variación real de −16,85 % contra 2017.</li>
            <li><a href={AGN_2024_222} target="_blank" rel="noopener noreferrer">Informe 2024-222</a> (Cuenta de Inversión 2019, firmado el 08-03-2021): transferencias por $149.331 millones, con una variación real de −11,22 %.</li>
            <li><a href={AGN_2024_152} target="_blank" rel="noopener noreferrer">Informe 2024-152</a> (Universidad Nacional de Jujuy, ejercicio 2021, firmado el 10-10-2024): faltan actos administrativos por $287.246.960,04 en fondos del Tesoro.</li>
          </ul>
        </li>
        <li><b>Por qué no se muestran los gastos que declaran las universidades.</b> La Cuenta de Inversión 2024 trae los recursos y gastos que declara cada universidad, pero no cierran con lo que la Nación transfirió: el total de gastos declarados es de $1.437.082 millones y las transferencias corrientes recibidas, $1.359.127 millones, contra $3.285.292 millones transferidos. La Universidad de Buenos Aires declara $240.745 millones de transferencias recibidas contra $602.898 millones transferidos. No se sabe por qué, y por eso esos números no se usan acá.</li>
      </ul>
    </div>
  );
}

function Pie({ d, v }: { d: DatosUniv; v: VistaU | null }) {
  const gen = fechaLarga(d.generado || null);
  return (
    <details className="gas-pie">
      <summary>Qué incluye, cómo se calcula y fuentes</summary>
      <ul className="method">
        <li><b>Qué es</b>: lo gastado (devengado) por el programa “Desarrollo de la Educación Superior” del presupuesto nacional en transferencias a cada universidad. Es casi todo lo que reciben las universidades de la Nación (en 2024, el 99,9 %, según la Cuenta de Inversión). “Sin asignar a una universidad” junta lo que el presupuesto no reparte por universidad y “Otros gastos del programa” no es de ninguna universidad en particular.</li>
        <li><b>Pesos de hoy</b>: el monto de cada año ajustado por inflación con el IPC (el IPC del último mes publicado sobre el IPC promedio de ese año). <b>% del PIB</b>: sobre el producto bruto de ese año a precios corrientes. <b>Variación real</b>: la de los pesos de hoy contra el año anterior; el año en curso no se compara porque todavía no terminó.</li>
        <li><b>Estudiantes</b>: pregrado y grado, del <a href={PIU} target="_blank" rel="noopener noreferrer">Portal de Información Universitaria</a> de la Auditoría General de la Nación, solo 2023 y 2024.</li>
        <li><b>Fuente</b>: {v ? `Presupuesto Abierto (Ministerio de Economía)${v.actualizado ? `, actualizado al ${fechaLarga(v.actualizado)}` : ""}` : "Presupuesto Abierto (Ministerio de Economía)"}.{gen ? ` Archivo armado el ${gen}.` : ""} Montos redondeados: por eso se muestra la diferencia por redondeo cuando la suma no da justo.</li>
        <li>El mismo programa, dentro del presupuesto: <Link prefetch={false} href={`/gasto/?forma=quien&ruta=${encodeURIComponent("Ministerio de Capital Humano~Secretaría de Educación~Desarrollo de la Educación Superior")}`}>En qué gasta la Nación</Link>.</li>
      </ul>
    </details>
  );
}
