import type { Metadata } from "next";
import { Plantillas } from "@/components/secciones/Plantillas";

export const metadata: Metadata = { title: "Gráficos listos", description: "Cientos de gráficos ya armados de la economía argentina: buscá asado, dólar, salario o alquiler y abrilos en Histórico." };
export default function Pagina() {
  return <Plantillas />;
}
