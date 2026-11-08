import type { Metadata } from "next";
import { Historico } from "@/components/secciones/Historico";

export const metadata: Metadata = { title: "Histórico", description: "Series históricas de precios, salarios, dólar, actividad y más de Argentina: armá gráficos comparando variables en pesos reales, dólares o base 100." };
export default function Pagina() {
  return <Historico />;
}
