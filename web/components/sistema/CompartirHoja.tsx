"use client";
// Botón "Compartir" que abre una hoja con tres acciones grandes: imagen, link y texto.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconoCompartir } from "@/components/Iconos";
import { Hoja } from "./Hoja";
import { IconoCopiar, IconoImagen, IconoTexto } from "./iconos";

/** Copia al portapapeles; devuelve false si el navegador no deja. */
async function copiar(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}

function Accion({ icono, titulo, desc, onClick }: { icono: ReactNode; titulo: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" className="comphoja-accion" onClick={onClick}>
      <span className="comphoja-ico" aria-hidden="true">{icono}</span>
      <span className="comphoja-txt"><b>{titulo}</b><small>{desc}</small></span>
    </button>
  );
}

export function CompartirHoja({ href, titulo, onImagen, texto }: { href: string; titulo: string; onImagen?: () => void; texto?: string }) {
  const [abierta, setAbierta] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [manual, setManual] = useState<string | null>(null);   // si no se pudo copiar: el texto queda en un campo seleccionado
  const campo = useRef<HTMLInputElement>(null);
  const absoluto = () => new URL(href, window.location.origin).href;

  useEffect(() => { if (!abierta) { setMensaje(""); setManual(null); } }, [abierta]);
  useEffect(() => { if (manual !== null) { campo.current?.focus(); campo.current?.select(); } }, [manual]);

  const copiarY = async (t: string, ok: string) => {
    if (await copiar(t)) { setManual(null); setMensaje(ok); }
    else { setManual(t); setMensaje("No se pudo copiar solo: copialo desde el campo."); }
  };

  return (
    <>
      <button type="button" className="comphoja-boton" aria-haspopup="dialog" onClick={() => setAbierta(true)}>
        <IconoCompartir /><span>Compartir</span>
      </button>
      <Hoja titulo={`Compartir: ${titulo}`} abierta={abierta} onCerrar={() => setAbierta(false)}>
        {(cerrar) => (
          <div className="comphoja">
            {onImagen && <Accion icono={<IconoImagen />} titulo="Imagen" desc="Una imagen del gráfico, lista para mandar o subir." onClick={() => cerrar(onImagen)} />}
            <Accion icono={<IconoCopiar />} titulo="Link" desc="Copia el link a esta vista, tal como la ves." onClick={() => copiarY(absoluto(), "Link copiado")} />
            {texto && <Accion icono={<IconoTexto />} titulo="Texto" desc="Copia el dato en una frase, para pegar en un mensaje." onClick={() => copiarY(texto, "Texto copiado")} />}
            {manual !== null && <input ref={campo} className="comphoja-campo" readOnly value={manual} aria-label="Texto para copiar" onFocus={(e) => e.currentTarget.select()} />}
            <p className="comphoja-aviso" role="status">{mensaje}</p>
          </div>
        )}
      </Hoja>
    </>
  );
}
