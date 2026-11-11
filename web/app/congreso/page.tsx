import type { Metadata } from "next";
import { Congreso } from "@/components/secciones/GobiernoCongreso";

export const metadata: Metadata = { title: "Gobierno y Congreso", description: "Bancas propias y aliadas, leyes del Ejecutivo, DNU y vetos de cada presidente argentino, con datos cargados a partir de informes oficiales." };
export default function Pagina() {
  return <Congreso />;
}
