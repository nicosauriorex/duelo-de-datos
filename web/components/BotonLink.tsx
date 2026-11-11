"use client";
// Botón "Compartir" de un bloque: comparte el link de esa vista (con sus opciones, que viven en la URL) y lleva al bloque (ancla `#id`).
import { useEffect, useRef, useState } from "react";
import { IconoCompartir } from "./Iconos";
import { avisoCompartir, compartir } from "@/lib/compartir";

export function BotonLink({ id, titulo }: { id: string; titulo: string }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const accion = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`;
    const msg = avisoCompartir(await compartir(url, titulo));
    setAviso(msg);
    window.clearTimeout(t.current);
    if (msg) t.current = window.setTimeout(() => setAviso(null), 3000);
  };
  return (
    <span className="boton-link">
      <button type="button" className="btn" onClick={accion} title="Compartir el link de esta vista" aria-label={`Compartir el link: ${titulo}`}><IconoCompartir />Compartir</button>
      <span className="note" role="status" style={{ margin: 0 }}>{aviso}</span>
    </span>
  );
}
