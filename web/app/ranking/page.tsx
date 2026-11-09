import type { Metadata } from "next";
import { Ranking } from "@/components/secciones/Ranking";

export const metadata: Metadata = { title: "Ranking de presidentes", description: "Ranking de presidentes armable: elegí los indicadores y si se mide la mejora, el nivel o ambos." };
export default function Pagina() {
  return <Ranking />;
}
