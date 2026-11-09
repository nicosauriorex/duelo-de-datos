"use client";
import Link from "next/link";
import { Sparkline } from "./Sparkline";
import { PALETA } from "./util";
import type { Evaluada } from "@/lib/plantillas";
import type { Motor } from "@/lib/motor";

/** Tarjeta con un valor ya calculado (cifras de la portada y principales de cada tema). Misma forma que las tarjetas de Plantillas. */
export function CardValor({ titulo, ev, href, k, motor, grande, texto, cls }: {
  titulo: string; ev: Evaluada; href: string; k: number; motor: Motor | null; grande?: boolean; texto?: string; cls?: Evaluada["cls"];
}) {
  const desde = motor ? motor.idxDe("2003-01") : 0;
  const c = cls === undefined ? ev.cls : cls;
  return (
    <div className={`plantilla${grande ? " cifra" : ""}`}>
      <Link prefetch={false} href={href} className="plantilla-link" aria-label={`Abrir en Histórico: ${titulo}`}>
        <div className="k">{titulo}</div>
        <div className="v">{ev.val}<small>{ev.fecha}</small></div>
        <div className={`d${c ? " var-" + c : ""}`}>{texto ?? ev.texto}</div>
        <Sparkline v={ev.v} color={PALETA[k % 8]} desde={desde} />
      </Link>
    </div>
  );
}
