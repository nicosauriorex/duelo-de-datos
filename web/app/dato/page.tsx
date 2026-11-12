import type { Metadata } from "next";
import { Dato } from "@/components/secciones/Dato";
import { DESCRIPCION_DATO } from "@/lib/previas";

export const metadata: Metadata = { title: "Dato", description: DESCRIPCION_DATO };
export default function Pagina() {
  return <Dato />;
}
