// Íconos del sistema (D-023): mismo estilo que `components/Iconos.tsx` (20 × 20, trazo de 2 px, sin relleno, heredan el color).
// Excepción: Sube y Baja son triángulos de punta con relleno `currentColor` y sin trazo, porque son marcas de dato de 10–12 px
// donde un trazo de 2 px no se lee.
import type { ReactNode } from "react";

function Icono({ children, className = "", relleno = false }: { children: ReactNode; className?: string; relleno?: boolean }) {
  return (
    <svg className={`icono ${className}`.trim()} viewBox="0 0 20 20" width="20" height="20"
      fill={relleno ? "currentColor" : "none"} stroke={relleno ? "none" : "currentColor"} strokeWidth="2"
      strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">{children}</svg>
  );
}
type P = { className?: string };

export const IconoInicio = ({ className }: P) => <Icono className={className}><path d="M3 9.5 10 3l7 6.5M5 8.5V17h10V8.5M8.5 17v-5h3v5" /></Icono>;
export const IconoBuscar = ({ className }: P) => <Icono className={className}><circle cx="8.5" cy="8.5" r="5.5" /><path d="m12.5 12.5 4.5 4.5" /></Icono>;
export const IconoHistorico = ({ className }: P) => <Icono className={className}><path d="M3 15l4-5 3 3 7-8" /></Icono>;
export const IconoPresidentes = ({ className }: P) => <Icono className={className}><path d="M2 17h16M5 17v-6h3v6M8.5 17V4h3v13M12 17V9h3v8" /></Icono>;
export const IconoMas = ({ className }: P) => <Icono className={className}><path d="M3 5h14M3 10h14M3 15h14" /></Icono>;
export const IconoInfo = ({ className }: P) => <Icono className={className}><circle cx="10" cy="10" r="8" /><path d="M10 9v5.5M10 5.8v.2" /></Icono>;
export const IconoSube = ({ className }: P) => <Icono className={className} relleno><path d="M10 3 18 16H2z" /></Icono>;
export const IconoBaja = ({ className }: P) => <Icono className={className} relleno><path d="M10 17 2 4h16z" /></Icono>;
export const IconoIgual = ({ className }: P) => <Icono className={className}><path d="M3 10h14" /></Icono>;
export const IconoCopiar = ({ className }: P) => <Icono className={className}><path d="M7 7h10v10H7zM13 7V3H3v10h4" /></Icono>;
export const IconoImagen = ({ className }: P) => <Icono className={className}><path d="M3 4h14v12H3zM3 14l4-4 3 3 3-3 4 4" /><path d="M13.5 7.5v.01" /></Icono>;
export const IconoTexto = ({ className }: P) => <Icono className={className}><path d="M3 5h14M3 10h14M3 15h9" /></Icono>;
export const IconoCerrar = ({ className }: P) => <Icono className={className}><path d="M5 5l10 10M15 5 5 15" /></Icono>;
