// Capítulo de una página: raya celeste + línea de 1 px arriba, título, bajada y contenido. Sin caja.
import type { ReactNode } from "react";

export function Capitulo({ titulo, bajada, acciones, nivel = 2, id, children }: {
  titulo: string; bajada?: string; acciones?: ReactNode; nivel?: 2 | 3; id?: string; children?: ReactNode;
}) {
  const H = nivel === 3 ? "h3" : "h2";
  return (
    <section className="capitulo" data-nivel={nivel} id={id} aria-labelledby={id ? `${id}-t` : undefined}>
      <div className="capitulo-cab">
        <div className="capitulo-textos">
          <H className="capitulo-titulo" id={id ? `${id}-t` : undefined}>{titulo}</H>
          {bajada ? <p className="capitulo-bajada">{bajada}</p> : null}
        </div>
        {acciones ? <div className="capitulo-acciones">{acciones}</div> : null}
      </div>
      {children ? <div className="capitulo-cuerpo">{children}</div> : null}
    </section>
  );
}
