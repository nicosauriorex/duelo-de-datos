// Íconos del sitio: trazo de 2 px, sin relleno, 20 × 20. Heredan el color del texto.
import type { ReactNode } from "react";

function Icono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg className={`icono ${className}`} viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">{children}</svg>
  );
}
export const IconoIzquierda = () => <Icono><path d="M12 4 6 10l6 6" /></Icono>;
export const IconoDerecha = () => <Icono><path d="m8 4 6 6-6 6" /></Icono>;
export const IconoAbajo = () => <Icono><path d="m4 8 6 6 6-6" /></Icono>;
export const IconoVolver = () => <Icono><path d="M9 4 3 10l6 6M3 10h14" /></Icono>;
export const IconoIr = () => <Icono><path d="m11 4 6 6-6 6M17 10H3" /></Icono>;
export const IconoAjustes = () => <Icono><path d="M3 6h14M3 14h14" /><path d="M7 3.5v5M13 11.5v5" /></Icono>;
export const IconoCompartir = () => <Icono><path d="M10 12V3M6 6l4-3 4 3M4 11v6h12v-6" /></Icono>;
export const IconoEditar = () => <Icono><path d="m4 16 1-4 8-8 3 3-8 8z" /></Icono>;
export const IconoPausa = () => <Icono><path d="M7 4v12M13 4v12" /></Icono>;
export const IconoSeguir = () => <Icono><path d="M6 4v12l10-6z" /></Icono>;
