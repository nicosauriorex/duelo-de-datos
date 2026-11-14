"use client";
// Navegación del celular (menos de 768 px): Inicio · Buscar · Histórico · Presidentes · Más.
import Link from "next/link";
import type { ReactNode } from "react";
import { IconoBuscar, IconoHistorico, IconoInicio, IconoMas, IconoPresidentes } from "./iconos";

export function BarraInferior({ actual, onBuscar, onMas, fijo = true }: { actual: string; onBuscar: () => void; onMas: () => void; fijo?: boolean }) {
  const en = (c: string) => actual === c;
  const enlace = (href: string, texto: string, icono: ReactNode, activo: boolean) => (
    <li>
      <Link prefetch={false} href={href} className="navinf-item" aria-current={activo ? "page" : undefined}>{icono}<span>{texto}</span></Link>
    </li>
  );
  return (
    <nav className={`navinf${fijo ? " navinf-fijo" : ""}`} aria-label="Secciones principales">
      <ul>
        {enlace("/", "Inicio", <IconoInicio className="navinf-ico" />, actual === "" || actual === "inicio" || actual === "/")}
        <li><button type="button" className="navinf-item" aria-haspopup="dialog" onClick={onBuscar}><IconoBuscar className="navinf-ico" /><span>Buscar</span></button></li>
        {enlace("/historico/", "Histórico", <IconoHistorico className="navinf-ico" />, en("historico"))}
        {enlace("/presidentes/", "Presidentes", <IconoPresidentes className="navinf-ico" />, en("presidentes"))}
        <li><button type="button" className="navinf-item" aria-haspopup="dialog" onClick={onMas}><IconoMas className="navinf-ico" /><span>Más</span></button></li>
      </ul>
    </nav>
  );
}
