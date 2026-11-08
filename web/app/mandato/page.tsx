import type { Metadata } from "next";
import { Mandato } from "@/components/secciones/Mandato";

export const metadata: Metadata = { title: "Meses de mandato", description: "Cómo evolucionó un indicador económico de Argentina mes a mes desde el inicio de cada mandato presidencial." };
export default function Pagina() {
  return <Mandato />;
}
