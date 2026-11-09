import type { Metadata } from "next";
import { Contexto } from "@/components/secciones/Contexto";

export const metadata: Metadata = { title: "Contexto internacional", description: "Qué se esperaba y qué pasó, cómo le fue a la Argentina contra otros países y si el contexto soplaba a favor o en contra, por presidente." };
export default function Pagina() {
  return <Contexto />;
}
