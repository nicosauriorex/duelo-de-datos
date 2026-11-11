"use client";
// Panel de compartir: vista previa de la imagen, formato, "Comparar presidentes", comentario y acciones. Ver docs/specs/responder-con-imagen.md.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Modal, Seg } from "./ui";
import { useConfig } from "./ConfigProvider";
import { useCargar, useDatos } from "./DatosProvider";
import { exprsUsadas } from "@/lib/historico";
import { PRES_DEF } from "@/lib/estadisticas";
import { baseDeConfig, FORMATOS_IMG, type FormatoImg } from "@/lib/config";
import {
  archivoPng, avisoCompartir, avisoImagen, compartir, compartirImagen, copiarImagen, descargarImagen, puedeCompartirArchivo, puedeCopiarImagen, type ResultadoImagen,
} from "@/lib/compartir";
import { dibujarImagen, esperarFuentes } from "@/lib/imagen";
import { armarImagen, MAX_COMENTARIO, type VistaImg } from "@/lib/imagen-datos";
import { armarImagenPres, esVistaPres, idsDeVistaPres, type VistaPres } from "@/lib/imagen-presidentes";
import { leerPaleta } from "@/lib/imagen-paleta";

export type VistaCompartir = VistaImg | VistaPres;
interface Props { vista: VistaCompartir; href: string; titulo: string; onCerrar: () => void }

export function PanelCompartir({ vista, href, titulo, onCerrar }: Props) {
  const { motor, archivosDe, version } = useDatos();
  const { config, cambiar } = useConfig();
  const pres = esVistaPres(vista);
  const ids = pres ? idsDeVistaPres(vista) : vista.exprs.flatMap((e) => (e.rel ? [e.id, e.rel] : [e.id]));
  const cargado = useCargar(archivosDe(ids));
  const [comparar, setComparar] = useState(false);
  const [comentario, setComentario] = useState("");
  const [comentarioAplicado, setComentarioAplicado] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-datos">("cargando");
  const [archivo, setArchivo] = useState<File | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const formato: FormatoImg = config.formatoImagen;
  const puedeComparar = !pres && vista.exprs.length === 1 && vista.modo !== "b100";
  const conComparar = comparar && puedeComparar;
  const kBase = `${config.t0}|${JSON.stringify(config.t0p)}`;

  // el comentario se aplica al dejar de escribir
  useEffect(() => { const t = setTimeout(() => setComentarioAplicado(comentario), 200); return () => clearTimeout(t); }, [comentario]);

  // dibujar (y volver a dibujar con cada cambio)
  useEffect(() => {
    if (!cargado || !motor || !canvas.current) return;
    let vivo = true;
    (async () => {
      let datos = null;
      setArchivo(null);   // hasta terminar de dibujar no hay imagen nueva: no se ofrece la vieja
      try {
        datos = esVistaPres(vista)
          ? armarImagenPres(motor, vista, { formato, comentario: comentarioAplicado })
          : armarImagen(motor, { ...vista, exprs: exprsUsadas(motor, vista) }, {
            formato, comparar: conComparar, comentario: comentarioAplicado,
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
  }, [cargado, motor, version, vista, formato, conComparar, comentarioAplicado, kBase, config.colPres]);

  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };
  const alResultado = (r: ResultadoImagen) => mostrar(avisoImagen(r));
  const puedeCompartir = !!archivo && puedeCompartirArchivo(archivo);

  return (
    <Modal titulo="Compartir como imagen" onCerrar={onCerrar} ancho>
      <div className="comp-cuerpo">
        <h2>Compartir como imagen</h2>
        <div className="comp-previa">
          <canvas ref={canvas} role="img" aria-label={`Vista previa de la imagen: ${titulo}`} />
          {estado !== "listo" && <p className="note comp-estado" role="status">{estado === "sin-datos" ? "No hay datos para armar la imagen." : "Armando la imagen…"}</p>}
        </div>
        <div className="comp-opciones">
          <div className="controls"><label>Formato</label>
            <Seg valor={formato} opciones={FORMATOS_IMG} onElegir={(f) => cambiar({ formatoImagen: f as FormatoImg })} /></div>
          {puedeComparar && (
            <div className="controls"><label>Comparar presidentes</label>
              <Seg valor={comparar ? "si" : "no"} opciones={[["no", "No"], ["si", "Sí"]]} onElegir={(v) => setComparar(v === "si")} />
              <span className="note" style={{ margin: 0 }}>Franja de cada mandato y cómo cambió el dato en cada uno.</span></div>
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
