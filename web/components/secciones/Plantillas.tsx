"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDatos } from "../DatosProvider";
import { Cargando } from "../ui";
import { Sparkline } from "../Sparkline";
import { IconoCompartir } from "../Iconos";
import { avisoCompartir, compartir } from "@/lib/compartir";
import { useMisPlantillas } from "@/lib/misPlantillas";
import { GRUPOS, crearPlantillas, evaluar, filtrar, hrefPlantilla, plantillaPropia, type Plantilla } from "@/lib/plantillas";
import { useParams } from "@/lib/url";

const POR_GRUPO = 12;

interface PropsTarjeta { pl: Plantilla; onAviso: (t: string | null) => void; onRenombrar?: (pl: Plantilla) => void; onBorrar?: (pl: Plantilla) => void }
/** Los datos se piden recién cuando la tarjeta entra en pantalla; mientras tanto ocupa el mismo alto. */
export const Tarjeta = memo(function Tarjeta({ pl, onAviso, onRenombrar, onBorrar }: PropsTarjeta) {
  const { motor, cargar, archivosDe, version } = useDatos();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [terminado, setTerminado] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const clave = pl.ids.join("|");
  useEffect(() => {
    if (!visible) return;
    let vivo = true;
    setTerminado(false);
    cargar(archivosDe(pl.ids)).then(() => { if (vivo) setTerminado(true); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, clave]);
  const ev = useMemo(() => (visible && motor ? evaluar(motor, pl) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, motor, pl, version]);
  const href = hrefPlantilla(pl, ev?.vista);
  const desde = motor ? motor.idxDe("2003-01") : 0;
  return (
    <div className="plantilla" ref={ref}>
      <Link prefetch={false} href={href} className="plantilla-link" aria-label={`${pl.href ? "Abrir en la sección" : "Abrir en Histórico"}: ${pl.titulo}`}>
        <div className="k" title={pl.titulo}>{pl.titulo}{pl.propia && pl.fecha ? <small> · guardada el {new Date(pl.fecha).toLocaleDateString("es-AR")} {new Date(pl.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</small> : null}</div>
        {ev ? (
          <>
            <div className="v">{ev.val}<small>{ev.fecha}</small></div>
            <div className={`d${ev.cls ? " var-" + ev.cls : ""}`}>{ev.texto}</div>
            <Sparkline v={ev.v} desde={desde} cls={ev.cls} />
          </>
        ) : (
          <div className="d">{pl.href ? pl.desc : visible && terminado ? "Sin vista previa" : " "}</div>
        )}
      </Link>
      <button type="button" className="btn comp" title="Compartir esta plantilla" aria-label={`Compartir: ${pl.titulo}`}
        onClick={async () => onAviso(avisoCompartir(await compartir(href, pl.titulo)))}><IconoCompartir /></button>
      {pl.propia && (
        <div className="acciones-plantilla">
          <button type="button" className="enlace" onClick={() => onRenombrar?.(pl)}>Renombrar</button>
          <button type="button" className="enlace" onClick={() => onBorrar?.(pl)}>Borrar</button>
        </div>
      )}
    </div>
  );
});

export function Plantillas() {
  const [p, set, montado] = useParams();
  const { listo, metas, errorGeneral } = useDatos();
  const mis = useMisPlantillas();
  const [texto, setTexto] = useState("");
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { if (montado) setTexto(p.get("q") ?? ""); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [montado]);

  const S = useMemo(() => Object.fromEntries(metas.map((s) => [s.id, s])), [metas, listo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const generales = useMemo(() => (listo ? crearPlantillas(metas) : []), [listo, metas]);
  const propias = useMemo(() => mis.lista.map((x) => plantillaPropia(x, S)).reverse(), [mis.lista, S]);
  const q = montado ? (p.get("q") ?? "") : "";

  if (errorGeneral) return <p className="error" role="alert">{errorGeneral}</p>;
  if (!listo || !montado) return <Cargando />;

  const buscando = q.trim().length >= 2;
  const mostrar = (a: string | null) => { setAviso(a); if (a) setTimeout(() => setAviso(null), 4000); };
  const renombrar = (pl: Plantilla) => {
    const n = window.prompt("Nuevo nombre de la plantilla (hasta 60 caracteres)", pl.titulo);
    if (n == null) return;
    mostrar(mis.renombrar(pl.id, n).aviso ?? null);
  };
  const borrar = (pl: Plantilla) => {
    if (!window.confirm(`¿Borrar la plantilla "${pl.titulo}"? No se puede deshacer.`)) return;
    mostrar(mis.borrar(pl.id).aviso ?? null);
  };
  const tarjeta = (pl: Plantilla) => (
    <Tarjeta key={pl.id} pl={pl} onAviso={mostrar} onRenombrar={renombrar} onBorrar={borrar} />
  );

  let cuerpo: React.ReactNode;
  if (buscando) {
    const res = [...filtrar(propias, q, S), ...filtrar(generales.filter((x) => x.curada), q, S), ...filtrar(generales.filter((x) => !x.curada), q, S)];
    cuerpo = res.length ? (
      <>
        <p className="note" role="status">{res.length} {res.length === 1 ? "plantilla" : "plantillas"}</p>
        <div className="curios">{res.map(tarjeta)}</div>
      </>
    ) : (
      <p className="note" role="status">No hay plantillas con &quot;{q.trim()}&quot;. Probá con otra palabra o armá el gráfico en <Link prefetch={false} href="/historico/">Histórico</Link>.</p>
    );
  } else {
    cuerpo = (
      <>
        {GRUPOS.map((g) => {
          const items = g === "Mis plantillas" ? propias : generales.filter((x) => x.grupo === g);
          if (!items.length) return null;
          const todo = abiertos.has(g), vis = todo ? items : items.slice(0, POR_GRUPO);
          return (
            <section key={g} aria-label={g}>
              <h3>{g}</h3>
              {g === "Mis plantillas" && <p className="note">Guardadas solo en este navegador.</p>}
              <div className="curios">{vis.map(tarjeta)}</div>
              {items.length > POR_GRUPO && (
                <p><button type="button" className="btn" aria-expanded={todo} onClick={() => setAbiertos((a) => { const n = new Set(a); if (n.has(g)) n.delete(g); else n.add(g); return n; })}>
                  {todo ? "Ver menos" : `Ver las ${items.length}`}</button></p>
              )}
            </section>
          );
        })}
      </>
    );
  }
  return (
    <section>
      <p className="sub">Gráficos ya armados: tocá uno para abrirlo en Histórico (o en Contexto, los de «En el mundo») y seguir desde ahí.</p>
      <div className="buscador-plantillas">
        <input type="search" value={texto} aria-label="Buscar plantillas" placeholder="Buscá: asado, dólar, salario, alquiler…"
          onChange={(ev) => { setTexto(ev.target.value); set({ q: ev.target.value || null }); }} />
      </div>
      {aviso && <p className="aviso-link" role="status">{aviso}</p>}
      {cuerpo}
    </section>
  );
}
