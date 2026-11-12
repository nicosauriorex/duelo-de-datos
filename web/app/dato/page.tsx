import type { Metadata } from "next";
import { Dato } from "@/components/secciones/Dato";

export const metadata: Metadata = { title: "Dato", description: "Un dato de la economía argentina de tres formas: su historia, cómo le fue con cada presidente y mes a mes desde el inicio de cada mandato." };
export default function Pagina() {
  return <Dato />;
}
