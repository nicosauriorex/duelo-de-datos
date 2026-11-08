import type { Metadata } from "next";
import { Elecciones } from "@/components/secciones/Elecciones";

export const metadata: Metadata = { title: "Elecciones", description: "Qué indicadores económicos de Argentina se mueven junto con el voto al oficialismo en cada elección desde 1995." };
export default function Pagina() {
  return <Elecciones />;
}
