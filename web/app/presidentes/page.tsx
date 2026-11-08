import type { Metadata } from "next";
import { Presidentes } from "@/components/secciones/Presidentes";

export const metadata: Metadata = { title: "Por presidente", description: "Comparación de indicadores económicos de Argentina por presidente: inicio, cierre, variación, mínimo, máximo y promedio de cada mandato." };
export default function Pagina() {
  return <Presidentes />;
}
