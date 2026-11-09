"use client";
// Portada: cifras en vivo → temas → preguntale a los datos → plantillas destacadas → por qué existe.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCargar, useDatos } from "../DatosProvider";
import { CardValor } from "../CardValor";
import { Modal } from "../ui";
import { Redireccion } from "../Redireccion";
import { Buscar, Oraciones } from "./Oraciones";
import { Tarjeta } from "./Plantillas";
import { nf1 } from "@/lib/formato";
import type { Expr, Motor, SerieMeta } from "@/lib/motor";
import { crearPlantillas, distanciaRecord, evaluar, interanualTxt, hrefPlantilla, plantillaDeExpr, plantillaSuelta, type Evaluada, type Plantilla } from "@/lib/plantillas";
import { TEMAS, hrefHistorico, idsDe, principalesDe, type Tema } from "@/lib/temas";
import { useParams } from "@/lib/url";

const ex = (id: string, extra: Partial<Expr> = {}): Expr => ({ id, rel: null, modo: "compra", esc: "", ...extra });

interface Extra { texto: string; cls: Evaluada["cls"] }
interface DefCifra {
  titulo: string; e: Expr;
  /** Ignora los datos curiosos (que traen su propio valor y texto) al buscar la plantilla. */
  sinCurio?: boolean;
  /** Línea de contexto propia (si no, la de la plantilla). */
  contexto?: (m: Motor, p: Plantilla, ev: Evaluada) => Extra | null;
}
const CIFRAS: DefCifra[] = [
  { titulo: "Inflación del último mes", e: ex("inflacion"), sinCurio: true,
    contexto: (m) => { const t = interanualTxt(m); return t ? { texto: `Interanual: ${t}`, cls: null } : null; } },
  { titulo: "Salario mediano real", e: ex("sipa_med", { med: "real" }),
    contexto: (m, p) => {
      const dif = p.e && !p.def ? distanciaRecord(m, p.e) : null;      // el dato curioso ya trae su propio texto
      return dif == null ? null : { texto: dif > -0.005 ? "En su récord histórico" : `${nf1.format(-dif * 100)} % por debajo de su récord`, cls: null };
    } },
  { titulo: "Kilos de asado por salario mediano", e: ex("pp_gba_asado", { rel: "sipa_med", med: "corr" }) },
  { titulo: "Dólar blue, en pesos de hoy", e: ex("fx_blue", { med: "real" }) },
];

/** Verdadero cuando el elemento entra (o está por entrar) en pantalla. */
function useVisible() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

function Cifras({ plantillas }: { plantillas: Plantilla[] }) {
  const { motor, archivosDe, version } = useDatos();
  const defs = useMemo(() => CIFRAS.map((d) => ({ d, p: plantillaDeExpr(d.sinCurio ? plantillas.filter((x) => !x.def) : plantillas, d.e) ?? plantillaSuelta("c-" + d.e.id, d.titulo, d.e) })), [plantillas]);
  const ids = useMemo(() => [...defs.flatMap(({ p }) => p.ids), "ipc_empalme"], [defs]);
  const listo = useCargar(archivosDe(ids));
  const items = useMemo(() => {
    if (!motor || !listo) return [];
    return defs.map(({ d, p }) => {
      const ev = evaluar(motor, p);
      if (!ev) return null;       // si no se puede calcular, no se muestra
      let extra: Extra | null = null;
      try { extra = d.contexto?.(motor, p, ev) ?? null; } catch { extra = null; }
      return { d, p, ev, extra };
    }).filter(Boolean) as { d: DefCifra; p: Plantilla; ev: Evaluada; extra: Extra | null }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, listo, defs, version]);
  return (
    <div className="cifras" aria-label="Cifras en vivo" aria-busy={!listo}>
      {!listo
        ? defs.map(({ d }) => <div key={d.titulo} className="plantilla cifra reservado" aria-hidden="true" />)
        : items.map(({ d, p, ev, extra }, k) => (
          <CardValor key={d.titulo} titulo={d.titulo} ev={ev} href={p.id.startsWith("c-") && p.e ? hrefHistorico(p.e) : hrefPlantilla(p, ev.vista)} k={k} motor={motor} grande texto={extra?.texto} cls={extra ? extra.cls : undefined} />
        ))}
    </div>
  );
}

function TarjetaTema({ t, S }: { t: Tema; S: Record<string, SerieMeta> }) {
  const { motor, cargar, archivosDe, version } = useDatos();
  const { ref, visible } = useVisible();
  const [abierto, setAbierto] = useState(false);
  const [largo, setLargo] = useState(false);
  const primero = useMemo(() => principalesDe(t, S)[0], [t, S]);
  useEffect(() => { if (visible && primero) cargar(archivosDe(idsDe(primero))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [visible, primero]);
  const ev = useMemo(() => (visible && motor && primero ? evaluar(motor, plantillaSuelta("t-" + t.slug, primero.nombre, primero)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, motor, primero, version]);
  const cerrar = () => { setAbierto(false); setLargo(false); };
  return (
    <div className="plantilla tema" ref={ref}>
      <Link prefetch={false} href={`/tema/${t.slug}/`} className="plantilla-link" aria-label={`Ir al tema: ${t.nombre}`}>
        <div className="k nombre-tema">{t.nombre}</div>
        <div className="d">{t.corto}</div>
        {ev && primero ? <div className="v">{ev.val}<small>{primero.nombre} · {ev.fecha}</small></div> : null}
      </Link>
      <button type="button" className="btn comp" aria-label={`Qué es: ${t.nombre}`} title="Qué es" onClick={() => setAbierto(true)}>?</button>
      {abierto && (
        <Modal titulo={t.nombre} onCerrar={cerrar}>
          <div className="info-cuerpo">
            <h2>{t.nombre}</h2>
            <p>{t.corto}</p>
            <button type="button" className="ver-mas" aria-expanded={largo} onClick={() => setLargo(!largo)}>{largo ? "ver menos" : "ver más"}</button>
            {largo && <div className="info-larga" dangerouslySetInnerHTML={{ __html: t.largo }} />}
          </div>
          <footer>
            <Link prefetch={false} className="btn" href={`/tema/${t.slug}/`}>Ir a la página del tema</Link>
            <button type="button" className="btn" onClick={cerrar}>Cerrar</button>
          </footer>
        </Modal>
      )}
    </div>
  );
}

export function Inicio() {
  const [p, , montado] = useParams();
  const { listo, metas, errorGeneral } = useDatos();
  const [aviso, setAviso] = useState<string | null>(null);
  const S = useMemo(() => Object.fromEntries(metas.map((s) => [s.id, s])), [metas, listo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const plantillas = useMemo(() => (listo ? crearPlantillas(metas) : []), [listo, metas]);
  const destacadas = useMemo(() => plantillas.filter((x) => x.grupo === "Destacadas").slice(0, 6), [plantillas]);

  // Los links viejos a "/" traían parámetros de Histórico: se mandan allá con los mismos parámetros.
  if (montado && [...p.keys()].some((k) => !/^(utm_|fbclid$|gclid$)/.test(k))) return <Redireccion a="/historico/" />;
  const mostrar = (a: string | null) => { setAviso(a); if (a) setTimeout(() => setAviso(null), 4000); };

  return (
    <section className="inicio">
      <p className="lead">Datos oficiales de la economía argentina, sin opinión, para que cualquiera pueda chequear lo que se dice. Se actualizan solos todos los días.</p>
      {errorGeneral ? <p className="error" role="alert">{errorGeneral}</p> : listo ? <Cifras plantillas={plantillas} /> : <div className="cifras" aria-busy="true">{CIFRAS.map((d) => <div key={d.titulo} className="plantilla cifra reservado" aria-hidden="true" />)}</div>}

      <h2 id="temas">¿Qué querés ver?</h2>
      <div className="curios temas">{TEMAS.map((t) => <TarjetaTema key={t.slug} t={t} S={S} />)}</div>

      <h2>Preguntale a los datos</h2>
      {listo ? <><Oraciones S={S} /><Buscar plantillas={plantillas} S={S} /></> : <p className="note">Cargando…</p>}

      {destacadas.length > 0 && (
        <>
          <h2>Plantillas destacadas</h2>
          {aviso && <p className="aviso-link" role="status">{aviso}</p>}
          <div className="curios">{destacadas.map((pl, k) => <Tarjeta key={pl.id} pl={pl} k={k} onAviso={mostrar} />)}</div>
          <p><Link prefetch={false} href="/plantillas/">Ver todas las plantillas</Link></p>
        </>
      )}

      <h2>Por qué existe esta página</h2>
      <p className="por-que">Para discutir la economía con datos y no con sensaciones. Todo sale de fuentes oficiales (INDEC, BCRA, Secretaría de Trabajo y otras), sin interpretaciones ni opinión. Cada número se puede abrir, comparar y compartir, y todo se actualiza solo cada día. <Link prefetch={false} href="/fuentes/">Ver las fuentes</Link>.</p>
    </section>
  );
}
