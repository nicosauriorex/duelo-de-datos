import type { Metadata } from "next";
import { Inicio } from "@/components/secciones/Inicio";

export const metadata: Metadata = {
  title: { absolute: "Primero los Datos — datos económicos de Argentina" },
  description: "Inflación, salarios, dólar, actividad, empleo, pobreza y cuentas públicas de Argentina con datos oficiales, actualizados todos los días. Elegí un tema o preguntale a los datos.",
};
export default function Pagina() {
  return <Inicio />;
}
