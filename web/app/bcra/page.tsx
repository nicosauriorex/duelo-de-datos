// Parte diario del Banco Central (/bcra/). El título, la descripción y la imagen para las redes salen de `npm run previas` (con las cifras del día);
// si no se corrió, se usan textos generales y la imagen del sitio.
import type { Metadata } from "next";
import { ParteBcra } from "@/components/secciones/ParteBcra";
import { DESCRIPCION_PARTE, IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";
import { previaParte } from "@/lib/previas-servidor";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/bcra/`, d = previaParte();
  if (!d) return { title: "Parte del Banco Central", description: DESCRIPCION_PARTE, alternates: { canonical: url }, ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo: "Parte del Banco Central", descripcion: DESCRIPCION_PARTE }) };
  return {
    title: d.titulo, description: d.descripcion, alternates: { canonical: url },
    ...metaCompartir({ titulo: d.titulo, descripcion: d.descripcion, url, imagen: `${SITIO_URL}${d.imagen}`, alt: `${d.titulo}. Datos de ${NOMBRE_SITIO}.` }),
  };
}

export default function Pagina() {
  return <ParteBcra />;
}
