"use client";
import Link from "next/link";
import { Sparkline } from "./Sparkline";
import type { Evaluada } from "@/lib/plantillas";
import type { Motor } from "@/lib/motor";

/** Tarjeta con un valor ya calculado: la de los principales de cada tema.
 *  Con `onElegir` la tarjeta no navega: es un botón que pone la variable en la ficha del dato; `elegido` la marca. */
export function CardValor({ titulo, ev, href, motor, onElegir, elegido }: {
  titulo: string; ev: Evaluada; href: string; motor: Motor | null; onElegir?: () => void; elegido?: boolean;
}) {
  const desde = motor ? motor.idxDe("2003-01") : 0;
  const c = ev.cls;
  const T = onElegir ? "span" : "div";   // dentro de un botón solo van elementos de texto (el CSS los muestra en bloque)
  const cuerpo = (
    <>
      <T className="k" title={titulo}>{titulo}</T>
      <T className="v">{ev.val}<small>{ev.fecha}</small></T>
      <T className={`d${c ? " var-" + c : ""}`}>{ev.texto}</T>
      <Sparkline v={ev.v} desde={desde} cls={c} />
    </>
  );
  if (onElegir) {
    return (
      <div className={`plantilla${elegido ? " ficha-elegida" : ""}`}>
        <button type="button" className="plantilla-link ficha-elegir" aria-pressed={!!elegido} aria-label={`Ver ${titulo} en la ficha del dato: ${ev.val}`} onClick={onElegir}>{cuerpo}</button>
      </div>
    );
  }
  return (
    <div className="plantilla">
      <Link prefetch={false} href={href} className="plantilla-link" aria-label={`Abrir en Histórico: ${titulo}`}>{cuerpo}</Link>
    </div>
  );
}
