import type { Metadata } from "next";
import { Curiosidades } from "@/components/secciones/Curiosidades";

export const metadata: Metadata = { title: "Curiosidades", description: "Lo mejor y lo peor de cada gobierno, ranking de presidentes y datos curiosos de la economía argentina." };
export default function Pagina() {
  return <Curiosidades />;
}
