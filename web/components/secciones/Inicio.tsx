"use client";
// Portada contada al bajar: apertura → los datos más buscados (carrusel) → temas → preguntale a los datos → plantillas destacadas → todo tiene fuente.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCargar, useDatos } from "../DatosProvider";
import { Sparkline } from "../Sparkline";
import { Contador, useDeslizable } from "../Movimiento";
import { IconoDerecha, IconoIzquierda, IconoPausa, IconoSeguir } from "../Iconos";
import { Redireccion } from "../Redireccion";
import { Oraciones } from "./Oraciones";
import { BloqueParte } from "./BloqueParte";
import { Buscador } from "../sistema/Buscador";
import { Capitulo } from "../sistema/Capitulo";
import { Delta } from "../sistema/Delta";
import { Lamina, Laminas } from "../sistema/Lamina";
import { nf1 } from "@/lib/formato";
import type { Comparacion, Comparaciones } from "@/lib/plantillas";
import { ORGANISMOS } from "@/lib/fuentes";
import type { Expr, Motor, SerieMeta } from "@/lib/motor";
import { comparaciones, crearPlantillas, distanciaRecord, evaluar, interanualTxt, hrefPlantilla, plantillaDeExpr, plantillaSuelta, type Evaluada, type Plantilla } from "@/lib/plantillas";
import { TEMAS, hrefHistorico, idsDe, principalesDe, type Tema } from "@/lib/temas";
import { MAS_BUSCADOS } from "@/lib/busqueda";
import { GRUPOS_SECCIONES, seccionesDe } from "@/lib/secciones";
import { useParams } from "@/lib/url";
import { PLACAS } from "@/lib/datos-fijos";

interface Extra { texto: string; cls: Evaluada["cls"] }
interface DefCifra {
  titulo: string; e: Expr;
  /** Ignora los datos curiosos (que traen su propio valor y texto) al buscar la plantilla. */
  sinCurio?: boolean;
  /** Si `e` no se puede calcular (por ejemplo, sin dato interanual), se muestra esta otra expresión. */
  alt?: Expr;
  /** Fuente que se muestra abajo (la misma forma en las cuatro placas). */
  fuente: string;
  /** Línea de contexto propia (si no, la de la plantilla). Recibe la plantilla que se terminó usando. */
  contexto?: (m: Motor, p: Plantilla, ev: Evaluada) => Extra | null;
}
/** Las cuatro placas de la portada (fijas): inflación del último mes, salario mediano en pesos de hoy, actividad económica y dólar blue de hoy. */
const CIFRAS: DefCifra[] = [
  { titulo: "Inflación del último mes", e: PLACAS.inflacion, sinCurio: true, fuente: "INDEC",
    contexto: (m) => { const t = interanualTxt(m); return t ? { texto: `Interanual: ${t}`, cls: null } : null; } },
  { titulo: "Salario mediano, en pesos de hoy", e: PLACAS.salario, sinCurio: true, fuente: "Secretaría de Trabajo (SIPA)",
    contexto: (m, p) => {
      const dif = p.e && !p.def ? distanciaRecord(m, p.e) : null;      // el dato curioso ya trae su propio texto
      return dif == null ? null : { texto: dif > -0.005 ? "En su récord histórico" : `${nf1.format(-dif * 100)} % por debajo de su récord`, cls: null };
    } },
  { titulo: "Actividad económica", e: PLACAS.actividad, sinCurio: true, alt: PLACAS.actividadNivel, fuente: "INDEC (EMAE)",
    contexto: (_m, p) => ({ texto: p.e?.med === "via" ? "Variación interanual del EMAE" : "Nivel del EMAE, índice 2004 = 100", cls: null }) },
  { titulo: "Dólar blue, en pesos de hoy", e: PLACAS.dolarBlue, fuente: "Ámbito y Bluelytics" },
];

/** Verdadero cuando el elemento entra (o está por entrar) en pantalla. */
function useVisible<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
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

interface ItemCifra { d: DefCifra; p: Plantilla; ev: Evaluada | null; extra: Extra | null; comp: Comparaciones | null }

/** Una comparación de la placa: de cuándo es, el valor de entonces y cuánto cambió hasta hoy (con signo, texto y color). */
function FilaComp({ c }: { c: Comparacion }) {
  const dir = c.variacion.startsWith("+") ? 1 : /^[-−]/.test(c.variacion) ? -1 : 0;
  return (
    <li className="placa-comp" aria-label={`${c.rotulo}, ${c.fecha}: ${c.valor}. Cambio hasta hoy: ${c.variacion}`}>
      <span className="placa-comp-rot">{c.rotulo} ({c.fecha})</span>
      <b>{c.valor}</b>
      <Delta en="placa" texto={c.variacion} tono={c.cls} dir={dir} />
    </li>
  );
}

/** Los datos más buscados: placas grandes en un carrusel que avanza solo de a una.
 *  El avance lo marca la animación del segmento activo: al terminar pasa a la siguiente, y pausarla (mouse, foco, toque, fuera de pantalla) pausa el carrusel.
 *  Con "reducir movimiento" esa animación no existe, así que el carrusel queda quieto. */
function Carrusel({ plantillas }: { plantillas: Plantilla[] }) {
  const { motor, archivosDe, version, listo: catalogo } = useDatos();
  const defs = useMemo(() => CIFRAS.map((d) => ({ d, p: plantillaDeExpr(d.sinCurio ? plantillas.filter((x) => !x.def) : plantillas, d.e) ?? plantillaSuelta("c-" + d.e.id, d.titulo, d.e) })), [plantillas]);
  const ids = useMemo(() => (catalogo ? [...defs.flatMap(({ p }) => p.ids), "ipc_empalme"] : []), [defs, catalogo]);
  const listo = useCargar(archivosDe(ids)) && catalogo;
  const items = useMemo<ItemCifra[]>(() => defs.map(({ d, p }) => {
    if (!motor || !listo) return { d, p, ev: null, extra: null, comp: null };
    let ef = p, ev = evaluar(motor, p);
    if (!ev && d.alt) { ef = plantillaSuelta("c-" + d.alt.id, d.titulo, d.alt); ev = evaluar(motor, ef); }   // sin dato interanual: el nivel y el mes
    let extra: Extra | null = null;
    try { extra = ev ? d.contexto?.(motor, ef, ev) ?? null : null; } catch { extra = null; }
    const comp = ev ? comparaciones(motor, ef) : null;
    return { d, p: ef, ev, extra, comp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [motor, listo, defs, version]);

  const raiz = useRef<HTMLDivElement>(null), pista = useRef<HTMLOListElement>(null);
  const [activa, setActiva] = useState(0);
  const [pausa, setPausa] = useState(false);          // la eligió el usuario (botón o toque)
  const [encima, setEncima] = useState(false);        // mouse arriba
  const [conFoco, setConFoco] = useState(false);      // foco del teclado adentro
  const [enPantalla, setEnPantalla] = useState(false);
  const [quieta, setQuieta] = useState(true);         // la página no se está deslizando
  const [tactil, setTactil] = useState(false);        // celular o pantalla táctil: no avanza solo (R5), se desliza con el dedo
  const [reinicio, setReinicio] = useState(0);        // cambia cada vez que hay que volver a contar el intervalo desde cero
  const destino = useRef<{ k: number; hasta: number } | null>(null);   // placa a la que se está yendo por código
  const n = items.length;

  // R6: el contador solo corre con la placa en pantalla (mitad o más) y la página quieta; al aparecer o al terminar de deslizar la página vuelve a cero.
  useEffect(() => {
    const el = pista.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => { const v = es.some((x) => x.isIntersecting); setEnPantalla(v); if (v) setReinicio((r) => r + 1); }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    let t = 0, moviendo = false;
    const alDeslizarPagina = () => {
      if (!moviendo) { moviendo = true; setQuieta(false); }
      window.clearTimeout(t);
      t = window.setTimeout(() => { moviendo = false; setQuieta(true); setReinicio((r) => r + 1); }, 300);
    };
    window.addEventListener("scroll", alDeslizarPagina, { passive: true });
    return () => { window.removeEventListener("scroll", alDeslizarPagina); window.clearTimeout(t); };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px), (pointer: coarse)");
    const f = () => setTactil(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const izquierdaDe = (k: number) => {
    const p = pista.current, el = p?.children[k] as HTMLElement | undefined;
    return p && el ? el.offsetLeft - (p.children[0] as HTMLElement).offsetLeft : 0;
  };
  const ir = (k: number) => {
    const p = pista.current;
    if (!p) return;
    const d = ((k % n) + n) % n;
    destino.current = { k: d, hasta: Date.now() + 2500 };
    setActiva(d);
    p.scrollTo({ left: izquierdaDe(d), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const alDeslizar = () => {
    const p = pista.current;
    if (!p) return;
    const d = destino.current;
    if (d) {   // el movimiento lo hizo `ir`: la activa ya se sabe; se vuelve a mirar el scroll recién al llegar (o si tarda demasiado)
      const max = p.scrollWidth - p.clientWidth;
      if (Date.now() < d.hasta && Math.abs(p.scrollLeft - Math.min(izquierdaDe(d.k), max)) > 2) return;
      destino.current = null;
      return;
    }
    let mejor = 0, dist = Infinity;
    for (let k = 0; k < n; k++) { const d = Math.abs(izquierdaDe(k) - p.scrollLeft); if (d < dist) { dist = d; mejor = k; } }
    if (p.scrollLeft >= p.scrollWidth - p.clientWidth - 2) mejor = Math.max(mejor, activa);   // al final de la pista las últimas no llegan al borde izquierdo
    if (mejor !== activa) setActiva(mejor);
  };
  const corre = listo && !pausa && !encima && !conFoco && enPantalla && quieta && !tactil;

  return (
    <div className="carrusel" ref={raiz} aria-roledescription="carrusel" aria-label="Los datos más buscados"
      onMouseEnter={() => setEncima(true)} onMouseLeave={() => setEncima(false)}
      onFocus={() => setConFoco(true)} onBlur={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setConFoco(false); }}>
      <div className="ancho carrusel-cab">
        <Capitulo id="mas-buscados" titulo="Los datos más buscados" acciones={
          <div className="carrusel-ctrl">
            {!tactil && <button type="button" className="btn-icono pausa" aria-pressed={pausa} aria-label={pausa ? "Seguir pasando los datos" : "Pausar el carrusel"} onClick={() => setPausa(!pausa)}>
              {pausa ? <IconoSeguir /> : <IconoPausa />}
            </button>}
            <button type="button" className="btn-icono" aria-label="Dato anterior" onClick={() => ir(activa - 1)}><IconoIzquierda /></button>
            <button type="button" className="btn-icono" aria-label="Dato siguiente" onClick={() => ir(activa + 1)}><IconoDerecha /></button>
          </div>
        } />
      </div>
      <div className="ancho segmentos" data-corre={corre}>
        {items.map((it, k) => (
          <button key={it.d.titulo} type="button" aria-label={`Ir al dato ${k + 1} de ${n}: ${it.d.titulo}`} aria-current={k === activa ? "true" : undefined} onClick={() => ir(k)}>
            <span className="seg-fondo">{k === activa && <span key={`${activa}-${reinicio}`} className="seg-lleno" onAnimationEnd={() => ir(activa + 1)} />}</span>
          </button>
        ))}
      </div>
      <ol className="pista" ref={pista} aria-busy={!listo} onScroll={alDeslizar} onPointerDown={(ev) => { destino.current = null; if (ev.pointerType !== "mouse") setPausa(true); }}>
        {items.map(({ d, p, ev, extra, comp }, k) => (
          <li key={d.titulo} className="placa" aria-current={k === activa ? "true" : undefined} aria-roledescription="diapositiva" aria-label={`${k + 1} de ${n}`}>
            {ev ? (
              <Link prefetch={false} href={p.id.startsWith("c-") && p.e ? hrefHistorico(p.e) : hrefPlantilla(p, ev.vista)} className="placa-link" aria-label={`Abrir en Histórico: ${d.titulo}, ${ev.val}`}>
                <h3 className="placa-titulo">{d.titulo}</h3>
                <div className="placa-num" style={{ ["--n" as string]: Math.max(4, ev.val.length) }}><Contador texto={ev.val} /></div>
                {extra && <p className="placa-ctx">{extra.texto}</p>}
                {comp && (
                  <ul className="placa-comps">
                    {comp.anterior && <FilaComp c={comp.anterior} />}
                    {comp.anio && <FilaComp c={comp.anio} />}
                  </ul>
                )}
                <p className="placa-pie"><span>{ev.fecha}</span><span className="placa-fuente">{d.fuente}</span></p>
                <Sparkline v={ev.v} desde={motor ? motor.idxDe("2003-01") : 0} />
              </Link>
            ) : (
              <div className="placa-link">
                <h3 className="placa-titulo">{d.titulo}</h3>
                <p className="placa-ctx">{listo ? "No se pudo calcular este dato." : "Cargando…"}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Cada fila se toca entera. Si el dato principal del tema es el de una placa, se usa la expresión de la placa: la misma serie no sale con dos medidas distintas (C3). */
function FilaTema({ t, S }: { t: Tema; S: Record<string, SerieMeta> }) {
  const { motor, cargar, archivosDe, version } = useDatos();
  const { ref, visible } = useVisible<HTMLAnchorElement>();
  const primero = useMemo(() => principalesDe(t, S)[0], [t, S]);
  const expr = useMemo<Expr | undefined>(() => (primero ? Object.values(PLACAS).find((x) => x.id === primero.id) ?? primero : undefined), [primero]);
  useEffect(() => { if (visible && expr) cargar(archivosDe(idsDe(expr))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [visible, expr]);
  const ev = useMemo(() => {
    if (!visible || !motor || !primero || !expr) return null;
    return evaluar(motor, plantillaSuelta("t-" + t.slug, primero.nombre, expr)) ?? (expr !== primero ? evaluar(motor, plantillaSuelta("t-" + t.slug, primero.nombre, primero)) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, motor, primero, expr, version]);
  const desde = motor ? motor.idxDe("2003-01") : 0;
  return (
    <Link prefetch={false} href={`/tema/${t.slug}/`} className="fila-tema" ref={ref} aria-label={`Ir al tema: ${t.nombre}`}>
      <span className="fila-tema-textos">
        <span className="nombre-tema">{t.nombre}</span>
        <span className="corto-tema">{t.corto}</span>
      </span>
      <span className="dato-tema">{ev && primero ? <><b><Contador texto={ev.val} /></b><small>{primero.corto}{expr && expr !== primero && expr.med !== primero.med && expr.med === "via" ? ", interanual" : ""} · {ev.fecha}</small></> : null}</span>
      <span className="mini-tema" aria-hidden="true">{ev ? <Sparkline v={ev.v} desde={desde} /> : null}</span>
      <IconoDerecha />
    </Link>
  );
}

/** Los gráficos listos destacados: los datos se piden recién cuando el bloque está por entrar en pantalla. */
function Destacadas({ lista }: { lista: Plantilla[] }) {
  const { motor, cargar, archivosDe, version } = useDatos();
  const { ref, visible } = useVisible<HTMLDivElement>();
  const clave = lista.map((p) => p.id).join("|");
  useEffect(() => { if (visible) cargar(archivosDe(lista.flatMap((p) => p.ids))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [visible, clave]);
  const evs = useMemo(() => lista.map((pl) => (visible && motor ? evaluar(motor, pl) : null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, motor, clave, version]);
  const desde = motor ? motor.idxDe("2003-01") : 0;
  return (
    <div ref={ref}>
      <Laminas etiqueta="Gráficos listos destacados">
        {lista.map((pl, k) => {
          const ev = evs[k];
          return <Lamina key={pl.id} titulo={pl.titulo} cifra={ev?.val} fecha={ev?.fecha} v={ev?.v ?? []} desde={desde} tono={ev?.cls} href={hrefPlantilla(pl, ev?.vista)} />;
        })}
      </Laminas>
    </div>
  );
}

/** "Lo más buscado" de la apertura: links a las fichas, en una fila que se desliza. */
function MasBuscado() {
  const lista = useRef<HTMLUListElement>(null);
  useDeslizable(lista);
  return (
    <div className="mas-buscados">
      <span className="mas-buscados-rotulo" id="mas-buscado-r">Ir directo a</span>
      <ul className="mas-buscados-lista" ref={lista} aria-labelledby="mas-buscado-r">
        {MAS_BUSCADOS.map((m) => <li key={m.slug}><Link prefetch={false} href={`/dato/${m.slug}/`} className="chip-buscado">{m.titulo}</Link></li>)}
      </ul>
    </div>
  );
}

export function Inicio() {
  const [p, , montado] = useParams();
  const { listo, metas, errorGeneral } = useDatos();
  const S = useMemo(() => Object.fromEntries(metas.map((s) => [s.id, s])), [metas, listo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const plantillas = useMemo(() => (listo ? crearPlantillas(metas) : []), [listo, metas]);
  const destacadas = useMemo(() => plantillas.filter((x) => x.grupo === "Destacados").slice(0, 6), [plantillas]);

  // Los links viejos a "/" traían parámetros de Histórico: se mandan allá con los mismos parámetros.
  if (montado && [...p.keys()].some((k) => !/^(utm_|fbclid$|gclid$)/.test(k))) return <Redireccion a="/historico/" />;

  return (
    <div className="inicio">
      <header className="apertura">
        <div className="ancho">
          <h1 className="titular">¿Cansado de que en redes hablen <em>sin datos?</em></h1>
          <p className="bajada">Buscá el dato, comparalo en el tiempo, entre presidentes y con el mundo.</p>
          <div className="apertura-buscar">
            <Buscador sinAtajos />
            <MasBuscado />
          </div>
          <p className="lema"><strong>Datos de Argentina, en debate.</strong> Oficiales, sin opinión y actualizados todos los días.</p>
        </div>
      </header>

      {errorGeneral ? <div className="ancho"><p className="error" role="alert">{errorGeneral}</p></div> : <Carrusel plantillas={plantillas} />}

      <div className="bloque ancho">
        <Capitulo id="temas" titulo="¿Qué datos te interesan?">
          <div className="temas">{TEMAS.map((t) => <FilaTema key={t.slug} t={t} S={S} />)}</div>
        </Capitulo>
      </div>

      <BloqueParte />

      <div className="bloque ancho">
        <Capitulo id="preguntale" titulo="Preguntale a los datos">
          {listo ? <Oraciones S={S} /> : <p className="note oraciones-espera">Cargando…</p>}
        </Capitulo>
      </div>

      <div className="bloque ancho">
        <Capitulo id="secciones" titulo="Todas las secciones" bajada="Para quien quiere buscar sus propias variables o combinarlas: cada sección sirve para algo distinto.">
          <div className="indice-secciones">
            {GRUPOS_SECCIONES.map((g) => {
              const filas = seccionesDe(g.id).filter((s) => s.carpeta !== "plantillas");
              return (
                <section key={g.id} className="indice-grupo" aria-labelledby={`ind-${g.id}`}>
                  <h3 id={`ind-${g.id}`}>{g.titulo}</h3>
                  <ul>
                    {filas.map((s) => (
                      <li key={s.carpeta}>
                        <Link prefetch={false} href={`/${s.carpeta}/`} className="indice-fila">
                          <span className="indice-textos"><b>{s.nombre}</b><small>{s.para}</small></span>
                          <IconoDerecha />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Capitulo>
      </div>

      {destacadas.length > 0 && (
        <div className="bloque ancho">
          <Capitulo id="destacados" titulo="Gráficos listos destacados" bajada="Gráficos ya armados para abrir y compartir.">
            <Destacadas lista={destacadas} />
            <p className="ver-todos"><Link prefetch={false} href="/plantillas/" className="btn">Ver todos los gráficos listos</Link></p>
          </Capitulo>
        </div>
      )}

      <section className="todo-fuente">
        <div className="ancho">
          <h2>Todo tiene fuente</h2>
          <ul className="organismos">{ORGANISMOS.map((o) => <li key={o}>{o}</li>)}</ul>
          <p className="por-que">Para discutir la economía con datos y no con sensaciones, y para que cualquiera pueda chequear lo que se dice. Todo sale de fuentes oficiales, sin interpretaciones ni opinión. Cada número se puede abrir, comparar y compartir, y todo se actualiza solo cada día.</p>
          <p className="acciones-vista"><Link prefetch={false} className="btn tinta" href="/fuentes/">Ver las fuentes</Link></p>
        </div>
      </section>
    </div>
  );
}
