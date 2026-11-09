import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemaPagina } from "@/components/secciones/Tema";
import { TEMAS, temaPorSlug } from "@/lib/temas";

export const dynamicParams = false;
export function generateStaticParams() { return TEMAS.map((t) => ({ slug: t.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = temaPorSlug((await params).slug);
  return t ? { title: t.nombre, description: t.desc } : {};
}
export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const t = temaPorSlug((await params).slug);
  if (!t) notFound();
  return <TemaPagina t={t} />;
}
