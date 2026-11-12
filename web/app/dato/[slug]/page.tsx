// Página fija de un dato (/dato/<slug>/): la misma ficha que /dato/?v=… para esa variable, con título, descripción e imagen propios
// en el HTML, para que los links muestren el dato al pegarlos en las redes. Ver lib/datos-fijos.ts y docs/specs/vista-previa-links.md.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dato } from "@/components/secciones/Dato";
import { datoFijoPorSlug } from "@/lib/datos-fijos";
import { DESCRIPCION_DATO, IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";
import { fijosPublicables, previaDe } from "@/lib/previas-servidor";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() { return fijosPublicables().map((d) => ({ slug: d.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const url = `${SITIO_URL}/dato/${slug}/`;
  const d = previaDe(slug);
  // Sin el resumen de `npm run previas`: título y descripción genéricos, con la imagen general.
  if (!d) return { title: "Dato", description: DESCRIPCION_DATO, alternates: { canonical: url }, ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo: "Dato", descripcion: DESCRIPCION_DATO }) };
  return {
    title: d.titulo, description: d.descripcion, alternates: { canonical: url },
    ...metaCompartir({ titulo: d.titulo, descripcion: d.descripcion, url, imagen: `${SITIO_URL}${d.imagen}`, alt: `${d.titulo}. Gráfico de ${NOMBRE_SITIO}.` }),
  };
}

export default async function Pagina({ params }: Props) {
  const d = datoFijoPorSlug((await params).slug);
  if (!d) notFound();
  return <Dato fija={d.e} />;
}
