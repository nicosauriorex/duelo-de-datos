"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonConfig } from "./ConfigProvider";

export const SECCIONES: [string, string][] = [
  ["", "Inicio"], ["historico", "Histórico"], ["plantillas", "Plantillas"],["presidentes", "Por presidente"], ["ranking", "Ranking"], ["contexto", "Contexto"],["mandato", "Meses de mandato"],
  ["curiosidades", "Curiosidades"], ["elecciones", "Elecciones"], ["fuentes", "Fuentes"],
];

export function Nav() {
  const ruta = usePathname() || "";
  return (
    <div className="barra">
      <nav className="tabs" aria-label="Secciones">
        {SECCIONES.map(([id, t]) => {
          const actual = ruta.replace(/\/$/, "") === (id ? `/${id}` : "");
          return <Link key={id || "inicio"} prefetch={false} href={id ? `/${id}/` : "/"} onClick={(ev) => { if (actual) ev.preventDefault(); }}
            aria-current={actual || (!id && ruta.startsWith("/tema/")) ? "page" : undefined}>{t}</Link>;
        })}
      </nav>
      <BotonConfig />
    </div>
  );
}
