"use client";
// Página de un tema: explicación, principales, todos los datos, por presidente y plantillas.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSeccion } from "../useSeccion";
import { Cargando } from "../ui";
import { BotonInfo } from "../Variables";
import { CardValor } from "../CardValor";
import { useConfig } from "../ConfigProvider";
import { CeldasStats, LineaInicio, useBase } from "./comunes";
import { Tarjeta } from "./Plantillas";
import { crearPres, statsMandato } from "@/lib/estadisticas";
import { medidaInicial } from "@/lib/config";
import { fmtMes } from "@/lib/formato";
import { medDefaultDe, type SerieMeta } from "@/lib/motor";
import { crearPlantillas, evaluar, plantillaSuelta, plantillasDeTema, type Evaluada } from "@/lib/plantillas";
import { hrefHistorico, idsDe, principalesDe, seriesDe, subgrupoDe, type Principal, type Tema } from "@/lib/temas";
import { encExpr, useParams } from "@/lib/url";

const POR_NIVEL = 30;   // más series que esto en un bloque: se despliegan por niveles (región, rubro…)
const MAX_PLANTILLAS = 8;
const COLS_PRES: [string, string][] = [["ini", "Inicio"], ["fin", "Cierre"], ["var", "Variación"]];

function Texto({ t }: { t: Tema }) {
  const [largo, setLargo] = useState(false);
  return (
    <div className="texto-tema">
      <p>{t.corto}</p>
      <button type="button" className="ver-mas" aria-expanded={largo} onClick={() => setLargo(!largo)}>{largo ? "ver menos" : "ver más"}</button>
      {largo && <div className="info-larga" dangerouslySetInnerHTML={{ __html: t.largo }} />}
    </div>
  );
}

/** Lista de series; si son muchas, se abre por niveles según `cat[nivel]`. Los hijos se dibujan recién al abrir. */
function Series({ series, nivel, href }: { series: SerieMeta[]; nivel: number; href: (s: SerieMeta) => string }) {
  const grupos = useMemo(() => {
    const m = new Map<string, SerieMeta[]>(), sueltas: SerieMeta[] = [];
    if (series.length > POR_NIVEL) series.forEach((s) => { const k = s.cat[nivel]; if (k) { if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); } else sueltas.push(s); });
    return { m, sueltas: m.size ? sueltas : series };
  }, [series, nivel]);
  return (
    <ul className="lista-series">
      {[...grupos.m].map(([k, ss]) => <Desplegado key={k} titulo={k} cuenta={ss.length}><Series series={ss} nivel={nivel + 1} href={href} /></Desplegado>)}
      {grupos.sueltas.map((s) => (
        <li key={s.id}><Link prefetch={false} href={href(s)}>{s.n}</Link> <span className="unidad">{s.u}</span> <BotonInfo id={s.id} /></li>
      ))}
    </ul>
  );
}
function Desplegado({ titulo, cuenta, children }: { titulo: string; cuenta: number; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className="subgrupo">
      <button type="button" className={`cab-subgrupo${abierto ? " abierto" : ""}`} aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span>{titulo}</span><span className="cuenta">{cuenta} {cuenta === 1 ? "serie" : "series"}</span>
      </button>
      {abierto && children}
    </li>
  );
}

export function TemaPagina({ t }: { t: Tema }) {
  const [p, set, montado] = useParams();
  const { config } = useConfig();
  const base = useSeccion([]);
  const { listo, metas, motor: m, errorGeneral, version } = base;
  const S = useMemo(() => Object.fromEntries(metas.map((s) => [s.id, s])), [metas, listo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const principales = useMemo(() => (listo ? principalesDe(t, S) : []), [listo, t, S]);
  // Solo se bajan los datos de los principales (la tabla por presidente usa el primero).
  const sec = useSeccion(principales.flatMap(idsDe));
  const info = useBase(p, set, montado);
  const plantillas = useMemo(() => (listo ? crearPlantillas(metas) : []), [listo, metas]);
  const series = useMemo(() => seriesDe(t, metas), [t, metas]);
  const subgrupos = useMemo(() => {
    const mapa = new Map<string, SerieMeta[]>();
    series.forEach((s) => { const k = subgrupoDe(t, s); if (!mapa.has(k)) mapa.set(k, []); mapa.get(k)!.push(s); });
    return [...mapa].sort((a, b) => Number(a[0] === "Generales") - Number(b[0] === "Generales"));
  }, [series, t]);
  const delTema = useMemo(() => plantillasDeTema(plantillas, S, t), [plantillas, S, t]);
  const [aviso, setAviso] = useState<string | null>(null);

  const tarjetas = useMemo(() => {
    if (!m || sec.ocupado) return [];
    return principales.map((pr) => {
      const ev = evaluar(m, plantillaSuelta("t-" + pr.id, pr.nombre, pr));
      return ev ? { pr, ev } : null;
    }).filter(Boolean) as { pr: Principal; ev: Evaluada }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, sec.ocupado, principales, version]);

  if (errorGeneral) return <p className="error" role="alert">{errorGeneral}</p>;
  if (!listo || !m || !montado) return <Cargando />;

  const hrefSerie = (s: SerieMeta) => hrefHistorico({ id: s.id, med: medidaInicial(s.tipo, medDefaultDe(s), config), rel: null, modo: "compra", esc: "" });
  const primero = principales[0];
  let presidentes: React.ReactNode = null;
  if (primero && !sec.ocupado) {
    const PRES = crearPres(m.F);
    const c = m.calc(primero);
    const filas = PRES.map((x) => ({ x, st: statsMandato(m.F, c.v, x, info.b) })).filter((f) => f.st.n > 0);
    presidentes = (
      <section aria-label="Por presidente">
        <h2>Por presidente</h2>
        <p className="note">{primero.nombre}. Unidad: {c.unidad}.</p>
        <LineaInicio info={info} />
        {filas.length ? (
          <div className="tablewrap"><table>
            <thead><tr><th>Presidente</th><th style={{ textAlign: "left" }}>Mandato</th>{COLS_PRES.map(([k, n]) => <th key={k}>{n}</th>)}</tr></thead>
            <tbody>{filas.map(({ x, st }) => (
              <tr key={x.id}><td>{x.n}</td><td className="unidad">{fmtMes(x.ini)} a {fmtMes(m.F[x.i1])}</td><CeldasStats m={m} c={c} st={st} cols={COLS_PRES} /></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="note">Sin datos de este indicador en los mandatos.</p>}
        <p><Link prefetch={false} href={`/presidentes/?${new URLSearchParams({ pv: encExpr(primero) }).toString()}`}>Ver todos los indicadores por presidente</Link></p>
      </section>
    );
  }

  return (
    <section className="tema-pagina">
      <p className="migas-tema"><Link prefetch={false} href="/">Inicio</Link> › Temas</p>
      <h2 className="titulo-tema">{t.nombre}</h2>
      <Texto t={t} />

      {tarjetas.length > 0 && (
        <section aria-label="Principales">
          <h2>Principales</h2>
          <div className="curios">{tarjetas.map(({ pr, ev }, k) => <CardValor key={pr.nombre} titulo={pr.nombre} ev={ev} href={hrefHistorico(pr)} k={k} motor={m} />)}</div>
        </section>
      )}

      <section aria-label="Todos los datos">
        <h2>Todos los datos</h2>
        <p className="note">{series.length} series. Tocá un bloque para ver sus series y una serie para abrirla en Histórico.</p>
        <ul className="lista-series raiz">
          {subgrupos.map(([nombre, ss]) => <Desplegado key={nombre} titulo={nombre} cuenta={ss.length}><Series series={ss} nivel={2} href={hrefSerie} /></Desplegado>)}
        </ul>
      </section>

      {presidentes}

      {delTema.length > 0 && (
        <section aria-label="Plantillas del tema">
          <h2>Plantillas del tema</h2>
          {aviso && <p className="aviso-link" role="status">{aviso}</p>}
          <div className="curios">{delTema.slice(0, MAX_PLANTILLAS).map((pl, k) => (
            <Tarjeta key={pl.id} pl={pl} k={k} onAviso={(a) => { setAviso(a); if (a) setTimeout(() => setAviso(null), 4000); }} />
          ))}</div>
          <p><Link prefetch={false} href={`/plantillas/?${new URLSearchParams({ q: t.q }).toString()}`}>Ver todas las plantillas</Link></p>
        </section>
      )}
    </section>
  );
}
