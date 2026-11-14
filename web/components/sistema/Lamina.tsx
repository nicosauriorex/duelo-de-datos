import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkline } from "@/components/Sparkline";
import type { Vals } from "@/lib/motor";

export type LaminaProps = { titulo: string; cifra?: string; fecha?: string; v: Vals; desde: number; tono?: "bueno" | "malo" | "neutro" | null; href: string; grupo?: string };

/** Miniatura de un gráfico listo, tocable entera. */
export function Lamina({ titulo, cifra, fecha, v, desde, tono, href, grupo }: LaminaProps) {
  return (
    <Link href={href} prefetch={false} className="lamina" data-grupo={grupo}>
      <span className="lamina-titulo">{titulo}</span>
      <Sparkline v={v} desde={desde} cls={tono} />
      {(cifra || fecha) && (
        <span className="lamina-pie">
          {cifra && <span className="lamina-cifra">{cifra}</span>}
          {fecha && <span className="lamina-fecha">{fecha}</span>}
        </span>
      )}
    </Link>
  );
}

/** Contenedor: fila deslizable en el celular, grilla desde 640 px. */
export function Laminas({ children, etiqueta }: { children: ReactNode; etiqueta?: string }) {
  return <div className="laminas" role={etiqueta ? "group" : undefined} aria-label={etiqueta}>{children}</div>;
}
