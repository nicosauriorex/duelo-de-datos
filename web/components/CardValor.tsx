"use client";
import Link from "next/link";
import { Sparkline } from "./Sparkline";
import { Contador } from "./Movimiento";
import type { Evaluada } from "@/lib/plantillas";
import type { Motor } from "@/lib/motor";

/** Tarjeta con un valor ya calculado. `grande` = placa del carrusel de la portada; si no, la tarjeta de los principales de cada tema. */
export function CardValor({ titulo, ev, href, motor, grande, texto, cls, fuente }: {
  titulo: string; ev: Evaluada; href: string; motor: Motor | null; grande?: boolean; texto?: string; cls?: Evaluada["cls"]; fuente?: string;
}) {
  const desde = motor ? motor.idxDe("2003-01") : 0;
  const c = cls === undefined ? ev.cls : cls;
  if (grande) {
    return (
      <Link prefetch={false} href={href} className="placa-link" aria-label={`Abrir en Histórico: ${titulo}, ${ev.val}`}>
        <h3 className="placa-titulo">{titulo}</h3>
        <div className="placa-num" style={{ ["--n" as string]: Math.max(4, ev.val.length) }}><Contador texto={ev.val} /></div>
        <p className="placa-ctx"><span className={c ? "var-" + c : undefined}>{texto ?? ev.texto}</span></p>
        <p className="placa-pie"><span>{ev.fecha}</span>{fuente ? <span className="placa-fuente">{fuente}</span> : null}</p>
        <Sparkline v={ev.v} desde={desde} />
      </Link>
    );
  }
  return (
    <div className="plantilla">
      <Link prefetch={false} href={href} className="plantilla-link" aria-label={`Abrir en Histórico: ${titulo}`}>
        <div className="k" title={titulo}>{titulo}</div>
        <div className="v">{ev.val}<small>{ev.fecha}</small></div>
        <div className={`d${c ? " var-" + c : ""}`}>{texto ?? ev.texto}</div>
        <Sparkline v={ev.v} desde={desde} cls={c} />
      </Link>
    </div>
  );
}
