import type { Metadata } from "next";
import { Sistema } from "@/components/secciones/Sistema";

// Página de muestra de la remodelación (D-023): fuera del menú y del sitemap, y sin indexar.
export const metadata: Metadata = { title: "Sistema de diseño", robots: { index: false, follow: false } };
export default function Pagina() {
  return <Sistema />;
}
