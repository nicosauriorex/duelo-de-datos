// Cuánto gasta la Nación en cada provincia (/provincias/). El título, la descripción y la imagen para las redes salen de `npm run previas` (con el total ubicado del
// último año cerrado); si no se corrió, se usan textos generales y la imagen del sitio.
import type { Metadata } from "next";
import { Provincias } from "@/components/secciones/Provincias";
import { DESCRIPCION_PROVINCIAS, IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";
import { previaProvincias } from "@/lib/previas-servidor";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/provincias/`, d = previaProvincias(), titulo = "Cuánto gasta la Nación en cada provincia";
  if (!d) return { title: titulo, description: DESCRIPCION_PROVINCIAS, alternates: { canonical: url }, ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo, descripcion: DESCRIPCION_PROVINCIAS }) };
  return {
    title: d.titulo, description: d.descripcion, alternates: { canonical: url },
    ...metaCompartir({ titulo: d.titulo, descripcion: d.descripcion, url, imagen: `${SITIO_URL}${d.imagen}`, alt: `${d.titulo}. Datos de ${NOMBRE_SITIO}.` }),
  };
}

export default function Pagina() {
  return <Provincias />;
}
