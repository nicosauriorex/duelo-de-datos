"use client";
// Panel de compartir: vista previa de la imagen, formato, "Personalizar imagen" (período, líneas, presidentes, tarjetas), comentario y acciones.
// Ver docs/specs/responder-con-imagen.md y docs/specs/personalizar-imagen.md.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Modal, Selector, Seg, useCapa } from "./ui";
import { useConfig } from "./ConfigProvider";
import { useCargar, useDatos } from "./DatosProvider";
import { exprsUsadas } from "@/lib/historico";
import { PRES_DEF } from "@/lib/estadisticas";
import { baseDeConfig, DATOS_GEN, DATOS_PRES, FORMATOS_IMG, MAX_DATOS_GEN, MAX_DATOS_PRES, MAX_FRASES_IMG, TARJETAS_IMG, type ClaveFrase, type FormatoImg, type OpcionesImagen, type TarjetasImg } from "@/lib/config";
import { contextoDato, admiteContexto } from "@/lib/contexto-dato";
import {
  archivoPng, avisoCompartir, avisoImagen, avisoTabla, compartir, compartirImagen, copiarImagen, copiarTexto, descargarImagen, puedeCompartirArchivo, puedeCopiarImagen, type ResultadoImagen,
} from "@/lib/compartir";
import { dibujarImagen, esperarFuentes } from "@/lib/imagen";
import { admitePersonalizar, armarImagen, MAX_COMENTARIO, mesesDisponibles, tablaTextoDeVista, type VistaImg } from "@/lib/imagen-datos";
import { armarImagenPres, esVistaPres, idsDeVistaPres, type VistaPres } from "@/lib/imagen-presidentes";
import { leerPaleta } from "@/lib/imagen-paleta";

export type VistaCompartir = VistaImg | VistaPres;
interface Props { vista: VistaCompartir; href: string; titulo: string; onCerrar: () => void }

/** Con la vista en Tabla se ofrece copiar la tabla o, si se prefiere, compartir el gráfico; con cualquier otra vista va directo a la imagen. */
export function PanelCompartir(p: Props) {
  const [comoGrafico, setComoGrafico] = useState(false);
  if (!esVistaPres(p.vista) && p.vista.tabla && !comoGrafico) return <ElegirTabla {...p} onGrafico={() => setComoGrafico(true)} />;
  return <PanelImagen {...p} />;
}

function ElegirTabla({ vista, href, titulo, onCerrar, onGrafico }: Props & { onGrafico: () => void }) {
  const { motor, archivosDe } = useDatos();
  const ids = esVistaPres(vista) ? [] : vista.exprs.flatMap((e) => (e.rel ? [e.id, e.rel] : [e.id]));
  const cargado = useCargar(archivosDe(ids));
  const [aviso, setAviso] = useState<string | null>(null);
  const copiar = async () => {
    if (esVistaPres(vista) || !motor) return;
    const texto = tablaTextoDeVista(motor, { ...vista, exprs: exprsUsadas(motor, vista) }, new URL(href, window.location.origin).toString());
    if (!texto) { setAviso("No hay datos para copiar"); return; }
    setAviso(avisoTabla(await copiarTexto(texto)));
  };
  return (
    <Modal titulo="Compartir la tabla" onCerrar={onCerrar}>
      <div className="comp-cuerpo comp-elegir">
        <h2>Compartir {titulo}</h2>
        <p className="note" style={{ margin: 0 }}>Estás viendo la tabla. Elegí qué querés compartir.</p>
        <div className="comp-elegir-botones">
          <button type="button" className="btn primario" disabled={!cargado || !motor} onClick={copiar}>Copiar la tabla</button>
          <button type="button" className="btn" onClick={onGrafico}>Compartir como gráfico</button>
        </div>
        <p className="note" style={{ margin: 0 }}>La tabla se copia como texto para pegar en una planilla, con la dirección de la vista en la última fila.</p>
        {aviso && <p className="aviso-link" role="status">{aviso}</p>}
      </div>
      <footer><button type="button" className="btn" onClick={onCerrar}>Cerrar</button></footer>
    </Modal>
  );
}

function PanelImagen({ vista, href, titulo, onCerrar }: Props) {
  const { motor, archivosDe, version } = useDatos();
  const { config, cambiar } = useConfig();
  const pres = esVistaPres(vista);
  const ids = pres ? idsDeVistaPres(vista) : vista.exprs.flatMap((e) => (e.rel ? [e.id, e.rel] : [e.id]));
  const cargado = useCargar(archivosDe(ids));
  const [periodo, setPeriodo] = useState<{ desde: string; hasta: string } | null>(null);   // null = el período visible del gráfico
  const [comentario, setComentario] = useState("");
  const [comentarioAplicado, setComentarioAplicado] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-datos" | "sin-periodo">("cargando");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ampliada, setAmpliada] = useState(false);   // vista previa a pantalla completa (tocarla en el celular)
  const previa = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const formato: FormatoImg = config.formatoImagen;
  const img = config.imagen;
  const exprsV = useMemo(() => (pres || !motor || !cargado ? [] : exprsUsadas(motor, vista)), [pres, motor, cargado, vista, version]);   // eslint-disable-line react-hooks/exhaustive-deps
  const vg = esVistaPres(vista) ? null : vista;
  const vistaG = vg ? { ...vg, exprs: exprsV } : null;
  const completa = !!vistaG && exprsV.length > 0 && admitePersonalizar(vistaG);   // una variable en valores: todo se puede personalizar
  const disp = useMemo(() => (vistaG && motor && cargado && exprsV.length ? mesesDisponibles(motor, vistaG) : []), [motor, cargado, exprsV, version]);   // eslint-disable-line react-hooks/exhaustive-deps
  // el período arranca en el visible del gráfico, recortado a los meses con datos
  const porDefecto = useMemo(() => {
    if (!vistaG || !disp.length) return null;
    const d = disp.find((x) => x.fecha >= vistaG.desde) ?? disp[disp.length - 1], h = [...disp].reverse().find((x) => x.fecha <= vistaG.hasta) ?? disp[0];
    return { desde: d.fecha, hasta: h.fecha };
  }, [disp, vista]);   // eslint-disable-line react-hooks/exhaustive-deps
  const per = periodo ?? porDefecto;
  const periodoValido = !!per && disp.filter((x) => x.fecha >= per.desde && x.fecha <= per.hasta).length >= 2;
  // el título lleva el período solo si quien comparte lo cambió respecto del que ya muestra el gráfico
  const periodoEnTitulo = !!periodo && !!porDefecto && (periodo.desde !== porDefecto.desde || periodo.hasta !== porDefecto.hasta);
  // las frases que el sitio puede calcular para este dato y este período (el de la imagen)
  const ctxFrases = useMemo(() => (vistaG && motor && cargado && per && completa && admiteContexto({ variables: 1, modo: vistaG.modo, freq: vistaG.freq })
    ? contextoDato(motor, exprsV[0], true, { periodo: per }) : null),
    [vistaG && vistaG.modo, vistaG && vistaG.freq, motor, cargado, exprsV, per?.desde, per?.hasta, version]);   // eslint-disable-line react-hooks/exhaustive-deps
  const frasesElegidas: ClaveFrase[] = img.frases ?? ctxFrases?.defecto ?? [];
  const alternarFrase = (k: ClaveFrase, on: boolean) => {
    const sin = frasesElegidas.filter((x) => x !== k);
    cambiarImg({ frases: on ? [...sin, k].slice(0, MAX_FRASES_IMG) : sin });
  };
  const cambiarImg = (c: Partial<OpcionesImagen>) => cambiar({ imagen: { ...img, ...c } });
  const kBase = `${config.t0}|${JSON.stringify(config.t0p)}`;

  // el comentario se aplica al dejar de escribir
  useEffect(() => { const t = setTimeout(() => setComentarioAplicado(comentario), 200); return () => clearTimeout(t); }, [comentario]);

  // dibujar (y volver a dibujar con cada cambio)
  useEffect(() => {
    if (!cargado || !motor || !canvas.current) return;
    let vivo = true;
    (async () => {
      let datos = null;
      setArchivo(null);
      if (!pres && per && !periodoValido) { setEstado("sin-periodo"); return; }   // hasta terminar de dibujar no hay imagen nueva: no se ofrece la vieja
      try {
        datos = esVistaPres(vista)
          ? armarImagenPres(motor, vista, { formato, comentario: comentarioAplicado })
          : armarImagen(motor, { ...vista, exprs: exprsUsadas(motor, vista), desde: per?.desde ?? vista.desde, hasta: per?.hasta ?? vista.hasta }, {
            formato, comentario: comentarioAplicado, personal: img, periodoEnTitulo,
            base: baseDeConfig(config, PRES_DEF.map((p) => p.id)), colPres: config.colPres,
          });
      } catch { datos = null; }
      if (!vivo) return;
      if (!datos) { setEstado("sin-datos"); setArchivo(null); return; }
      const pal = leerPaleta(config.colPres);
      await esperarFuentes(pal.familia);
      if (!vivo || !canvas.current) return;
      dibujarImagen(canvas.current, datos, pal);
      setEstado("listo");
      canvas.current.toBlob((b) => { if (vivo) setArchivo(b ? archivoPng(b, datos!.archivo) : null); }, "image/png");
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargado, motor, version, vista, formato, per?.desde, per?.hasta, periodoValido, periodoEnTitulo, JSON.stringify(img), comentarioAplicado, kBase, config.colPres]);

  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };
  const alResultado = (r: ResultadoImagen) => mostrar(avisoImagen(r));
  const puedeCompartir = !!archivo && puedeCompartirArchivo(archivo);

  return (
    <Modal titulo="Compartir como imagen" onCerrar={onCerrar} ancho>
      <div className="comp-cuerpo">
        <h2>Compartir como imagen</h2>
        <div className={`comp-previa${estado === "listo" && archivo ? " ampliable" : ""}`} ref={previa}
          {...(estado === "listo" && archivo ? {
            role: "button", tabIndex: 0, "aria-label": "Ver la vista previa a pantalla completa", title: "Tocá para ver la imagen entera",
            onClick: () => setAmpliada(true),
            onKeyDown: (ev: React.KeyboardEvent) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setAmpliada(true); } },
          } : {})}>
          <canvas ref={canvas} role="img" aria-label={`Vista previa de la imagen: ${titulo}`} />
          {estado !== "listo" && <p className="note comp-estado" role="status">{estado === "sin-datos" ? "No hay datos para armar la imagen." : estado === "sin-periodo" ? "Elegí un período con datos." : "Armando la imagen…"}</p>}
        </div>
        {ampliada && archivo && <VistaCompleta archivo={archivo} titulo={titulo} onCerrar={() => { setAmpliada(false); previa.current?.focus(); }} />}
        <div className="comp-opciones">
          <div className="controls"><label>Formato</label>
            <Seg valor={formato} opciones={FORMATOS_IMG} onElegir={(f) => cambiar({ formatoImagen: f as FormatoImg })} /></div>
          {!pres && disp.length > 0 && per && (
            <details className="comp-personalizar">
              <summary>Personalizar imagen</summary>
              <Grupo titulo="Período" abierto>
                <div className="comp-periodo">
                  <Selector etiqueta="Desde" valor={per.desde} opciones={disp.map((x) => [x.fecha, x.etq])} onElegir={(v) => setPeriodo({ desde: v, hasta: per.hasta })} />
                  <span aria-hidden="true">a</span>
                  <Selector etiqueta="Hasta" valor={per.hasta} opciones={disp.map((x) => [x.fecha, x.etq])} onElegir={(v) => setPeriodo({ desde: per.desde, hasta: v })} />
                </div>
                {!periodoValido && <p className="note" role="status" style={{ margin: 0 }}>Elegí un período con datos: hacen falta al menos dos meses.</p>}
              </Grupo>
              <Grupo titulo="Líneas y marcadores" razon={completa ? null : RAZON}>
                <Marca t="Marcador del último dato" v={img.marcaUltimo} f={(x) => cambiarImg({ marcaUltimo: x })} />
                <Marca t="Línea de promedio" v={img.promedio} f={(x) => cambiarImg({ promedio: x })} off={!completa} />
                <Marca t="Línea de mediana" v={img.mediana} f={(x) => cambiarImg({ mediana: x })} off={!completa} />
                <Marca t="Línea del último dato" v={img.lineaUltimo} f={(x) => cambiarImg({ lineaUltimo: x })} off={!completa} />
                <Marca t="Marcadores de máximo y mínimo" v={img.marcaExtremos} f={(x) => cambiarImg({ marcaExtremos: x })} off={!completa} />
              </Grupo>
              {ctxFrases && ctxFrases.todas.length > 0 && (
                <Grupo titulo="Frases">
                  <p className="note" style={{ margin: 0 }}>Elegí hasta {MAX_FRASES_IMG}. Las calcula el sitio: no se pueden editar.</p>
                  {ctxFrases.todas.map((f) => (
                    <Marca key={f.clave} t={f.texto} v={frasesElegidas.includes(f.clave!)} f={(x) => alternarFrase(f.clave!, x)}
                      off={!frasesElegidas.includes(f.clave!) && frasesElegidas.length >= MAX_FRASES_IMG} />
                  ))}
                </Grupo>
              )}
              <Grupo titulo="Presidentes" razon={completa ? null : RAZON}>
                <Marca t="Resaltar presidentes en el gráfico" v={img.resaltar} f={(x) => cambiarImg({ resaltar: x })} off={!completa} />
              </Grupo>
              <Grupo titulo="Tarjetas" razon={completa ? null : RAZON}>
                <Seg valor={completa ? img.tarjetas : "ninguna"} opciones={TARJETAS_IMG} onElegir={(v) => { if (completa) cambiarImg({ tarjetas: v as TarjetasImg }); }} />
                {completa && img.tarjetas === "pres" && (
                  <Datos t={`Datos de cada presidente (hasta ${MAX_DATOS_PRES})`} todos={DATOS_PRES} elegidos={img.datosPres} tope={MAX_DATOS_PRES} f={(l) => cambiarImg({ datosPres: l })} />
                )}
                {completa && img.tarjetas === "gen" && (
                  <Datos t={`Datos del período (hasta ${MAX_DATOS_GEN})`} todos={DATOS_GEN} elegidos={img.datosGen} tope={MAX_DATOS_GEN} f={(l) => cambiarImg({ datosGen: l })} />
                )}
              </Grupo>
            </details>
          )}
          <div className="controls"><label htmlFor="comp-comentario">Comentario propio</label>
            <input id="comp-comentario" type="text" value={comentario} maxLength={MAX_COMENTARIO} placeholder="Opcional, una línea"
              onChange={(ev) => setComentario(ev.target.value)} />
            <span className="note" style={{ margin: 0 }}>{comentario.length} de {MAX_COMENTARIO}. Se muestra aparte y marcado como tuyo; el dato no se edita.</span></div>
        </div>
        {aviso && <p className="aviso-link" role="status">{aviso}</p>}
      </div>
      <footer>
        {puedeCompartir && (
          <button type="button" className="btn primario" disabled={!archivo}
            onClick={async () => { const r = await compartirImagen(archivo!, titulo, href); mostrar(r === "error" ? "No se pudo compartir la imagen" : avisoImagen(r)); }}>Compartir imagen</button>
        )}
        <button type="button" className={`btn${puedeCompartir ? "" : " primario"}`} disabled={!archivo} onClick={() => alResultado(descargarImagen(archivo!))}>Descargar</button>
        {puedeCopiarImagen() && <button type="button" className="btn" disabled={!archivo} onClick={async () => alResultado(await copiarImagen(archivo!))}>Copiar imagen</button>}
        <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(href, titulo)))}>Copiar link</button>
        <button type="button" className="btn" onClick={onCerrar}>Cerrar</button>
      </footer>
    </Modal>
  );
}

/** La imagen entera (contenida) sobre fondo oscuro. Un toque, el botón o Escape la cierran; Escape cierra solo esta capa, no la ventana de abajo. */
function VistaCompleta({ archivo, titulo, onCerrar }: { archivo: File; titulo: string; onCerrar: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const esLaDeArriba = useCapa(true);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  useEffect(() => { const u = URL.createObjectURL(archivo); setUrl(u); return () => URL.revokeObjectURL(u); }, [archivo]);
  useEffect(() => {
    boton.current?.focus();
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape" && esLaDeArriba()) { ev.stopPropagation(); cerrar.current(); } };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  }, [esLaDeArriba]);
  return createPortal(
    <div className="comp-completa" role="dialog" aria-modal="true" aria-label={`Vista previa a pantalla completa: ${titulo}`} onClick={onCerrar}>
      {url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt={`Imagen para compartir: ${titulo}`} />}
      <button ref={boton} type="button" className="comp-completa-cerrar" aria-label="Cerrar la vista a pantalla completa" onClick={(ev) => { ev.stopPropagation(); onCerrar(); }}>×</button>
    </div>, document.body);
}

/** Botón que abre el panel de compartir. `crearVista` y `href` se evalúan al abrir (así sirven también donde los datos se cargan recién ahí). */
export function BotonCompartir({ crearVista, href, titulo, className, children, deshabilitado, ...resto }: {
  crearVista: () => VistaCompartir | null; href: string | (() => string); titulo: string; className?: string; children: ReactNode; deshabilitado?: boolean; title?: string; "aria-label"?: string;
}) {
  const [abierto, setAbierto] = useState<{ vista: VistaCompartir; href: string } | null>(null);
  const abrir = () => {
    const vista = crearVista();
    if (vista) setAbierto({ vista, href: typeof href === "function" ? href() : href });
  };
  return (
    <>
      <button type="button" className={className} disabled={deshabilitado} {...resto} onClick={abrir}>{children}</button>
      {abierto && createPortal(<PanelCompartir vista={abierto.vista} href={abierto.href} titulo={titulo} onCerrar={() => setAbierto(null)} />, document.body)}
    </>
  );
}

const RAZON = "Disponible con una sola variable en valores (no en base 100).";

/** Un grupo de opciones del panel, plegable. Con `razon`, sus opciones están deshabilitadas y se dice por qué. */
function Grupo({ titulo, abierto, razon, children }: { titulo: string; abierto?: boolean; razon?: string | null; children: ReactNode }) {
  return (
    <details className="comp-grupo" open={abierto}>
      <summary>{titulo}</summary>
      <div className="comp-grupo-cuerpo">
        {razon && <p className="note" style={{ margin: 0 }}>{razon}</p>}
        {children}
      </div>
    </details>
  );
}
/** Interruptor con nombre. */
function Marca({ t, v, f, off }: { t: string; v: boolean; f: (x: boolean) => void; off?: boolean }) {
  return (
    <label className="comp-marca"><input type="checkbox" checked={v && !off} disabled={off} onChange={(ev) => f(ev.target.checked)} /> {t}</label>
  );
}
/** Datos elegibles de las tarjetas: hasta `tope`, y siempre al menos uno. */
function Datos<T extends string>({ t, todos, elegidos, tope, f }: { t: string; todos: [T, string][]; elegidos: T[]; tope: number; f: (l: T[]) => void }) {
  const alternar = (d: string) => {
    const x = d as T;
    if (elegidos.includes(x)) { if (elegidos.length > 1) f(elegidos.filter((e) => e !== x)); }
    else if (elegidos.length < tope) f([...elegidos, x]);
  };
  return (
    <div className="comp-datos">
      <span className="note" style={{ margin: 0 }}>{t}</span>
      <Seg valor={new Set<string>(elegidos)} opciones={todos} onElegir={alternar} />
    </div>
  );
}
