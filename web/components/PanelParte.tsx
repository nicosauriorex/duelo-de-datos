"use client";
// Ventana "Compartir como imagen" del parte diario del Banco Central: vista previa de la imagen, formato y las acciones de siempre
// (compartir, descargar, copiar). La imagen la arma lib/imagen-parte.ts y la dibuja lib/imagen.ts, igual que en el resto del sitio (D-012).
import { useEffect, useRef, useState } from "react";
import { Modal, Seg } from "./ui";
import { VistaCompleta } from "./PanelCompartir";
import { useConfig } from "./ConfigProvider";
import { FORMATOS_IMG, type FormatoImg } from "@/lib/config";
import { archivoPng, avisoImagen, compartirImagen, copiarImagen, descargarImagen, puedeCompartirArchivo, puedeCopiarImagen, type ResultadoImagen } from "@/lib/compartir";
import { dibujarImagen, esperarFuentes } from "@/lib/imagen";
import { armarImagenParte } from "@/lib/imagen-parte";
import { leerPaleta } from "@/lib/imagen-paleta";
import type { Parte } from "@/lib/diario";

export function PanelParte({ parte, href, onCerrar }: { parte: Parte; href: string; onCerrar: () => void }) {
  const { config, cambiar } = useConfig();
  const formato: FormatoImg = config.formatoImagen;
  const canvas = useRef<HTMLCanvasElement>(null), previa = useRef<HTMLDivElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo">("cargando");
  const [ampliada, setAmpliada] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const titulo = `Parte del Banco Central del ${parte.fechaTxt}`;

  useEffect(() => {
    let vivo = true;
    (async () => {
      setArchivo(null); setEstado("cargando");
      const datos = armarImagenParte(parte, formato);
      const pal = leerPaleta(config.colPres);
      await esperarFuentes(pal.familia);
      if (!vivo || !canvas.current) return;
      dibujarImagen(canvas.current, datos, pal);
      setEstado("listo");
      canvas.current.toBlob((b) => { if (vivo) setArchivo(b ? archivoPng(b, datos.archivo) : null); }, "image/png");
    })();
    return () => { vivo = false; };
  }, [parte, formato, config.colPres]);

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
          {estado !== "listo" && <p className="note comp-estado" role="status">Armando la imagen…</p>}
        </div>
        {ampliada && archivo && <VistaCompleta archivo={archivo} titulo={titulo} onCerrar={() => { setAmpliada(false); previa.current?.focus(); }} />}
        <div className="comp-opciones">
          <div className="controls"><label>Formato</label>
            <Seg valor={formato} opciones={FORMATOS_IMG} onElegir={(f) => cambiar({ formatoImagen: f as FormatoImg })} /></div>
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
      </footer>
    </Modal>
  );
}
