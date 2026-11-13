// Cuánto reciben las universidades (/universidades/). El título, la descripción y la imagen para las redes salen de `npm run previas` (con el total del
// último año cerrado); si no se corrió, se usan textos generales y la imagen del sitio.
import type { Metadata } from "next";
import { Universidades } from "@/components/secciones/Universidades";
import { DESCRIPCION_UNIVERSIDADES, IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";
import { previaUniversidades } from "@/lib/previas-servidor";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/universidades/`, d = previaUniversidades(), titulo = "Cuánto reciben las universidades";
  if (!d) return { title: titulo, description: DESCRIPCION_UNIVERSIDADES, alternates: { canonical: url }, ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo, descripcion: DESCRIPCION_UNIVERSIDADES }) };
  return {
    title: d.titulo, description: d.descripcion, alternates: { canonical: url },
    ...metaCompartir({ titulo: d.titulo, descripcion: d.descripcion, url, imagen: `${SITIO_URL}${d.imagen}`, alt: `${d.titulo}. Datos de ${NOMBRE_SITIO}.` }),
  };
}

export default function Pagina() {
  return <Universidades />;
}
