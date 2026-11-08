"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonConfig } from "./ConfigProvider";

export const SECCIONES: [string, string][] = [
  ["historico", "Histórico"], ["presidentes", "Por presidente"], ["mandato", "Meses de mandato"],
  ["curiosidades", "Curiosidades"], ["elecciones", "Elecciones"], ["fuentes", "Fuentes"],
];

export function Nav() {
  const ruta = usePathname() || "";
  return (
    <div className="barra">
      <nav className="tabs" aria-label="Secciones">
        {SECCIONES.map(([id, t]) => (
          <Link key={id} prefetch={false} href={`/${id}/`} onClick={(ev) => { if (ruta.replace(/\/$/, "") === `/${id}`) ev.preventDefault(); }} aria-current={ruta.replace(/\/$/, "") === `/${id}` ? "page" : undefined}>{t}</Link>
        ))}
      </nav>
      <BotonConfig />
    </div>
  );
}
