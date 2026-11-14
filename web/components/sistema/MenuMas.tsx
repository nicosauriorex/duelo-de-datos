"use client";
// Contenido de la hoja "Más": las secciones en cuatro grupos, con para qué sirve cada una.
import Link from "next/link";
import { IconoDerecha } from "@/components/Iconos";
import { GRUPOS_SECCIONES, seccionesDe } from "@/lib/secciones";

/** Al tocar una sección no hace falta cerrar la hoja a mano: `ui.tsx` cierra las capas abiertas, consume sus entradas del historial y recién después navega. */
export function MenuMas({ actual }: { actual?: string }) {
  return (
    <div className="menumas">
      {GRUPOS_SECCIONES.map((g) => (
        <section key={g.id} className="menumas-grupo" aria-labelledby={`menumas-${g.id}`}>
          <h3 id={`menumas-${g.id}`}>{g.titulo}</h3>
          <ul>
            {seccionesDe(g.id).map((s) => (
              <li key={s.carpeta}>
                <Link prefetch={false} href={`/${s.carpeta}/`} className="menumas-fila" aria-current={actual === s.carpeta ? "page" : undefined}>
                  <span className="menumas-txt"><b>{s.nombre}</b><small>{s.para}</small></span>
                  <span className="menumas-flecha"><IconoDerecha /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
