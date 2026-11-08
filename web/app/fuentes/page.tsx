import type { Metadata } from "next";
import { Fuentes } from "@/components/secciones/Fuentes";

export const metadata: Metadata = { title: "Fuentes", description: "De dónde salen los datos de Duelo de Datos: INDEC, BCRA, Secretaría de Trabajo, datos.gob.ar y otras fuentes, y cómo se calculan." };
export default function Pagina() {
  return <Fuentes />;
}
