// Herencia (/herencia/): qué recibió cada presidente al asumir y qué entregó. El título, la descripción y la imagen para las redes (la del presidente
// en funciones) salen de `npm run previas`; si no se corrió, se usan textos generales y la imagen del sitio.
import type { Metadata } from "next";
import { Herencia } from "@/components/secciones/Herencia";
import { DESCRIPCION_HERENCIA, IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";
import { previaHerencia } from "@/lib/previas-servidor";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/herencia/`, d = previaHerencia(), titulo = "Herencia: lo que recibió y lo que entregó cada presidente";
  if (!d) return { title: "Herencia", description: DESCRIPCION_HERENCIA, alternates: { canonical: url }, ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo, descripcion: DESCRIPCION_HERENCIA }) };
  return {
    title: d.titulo, description: d.descripcion, alternates: { canonical: url },
    ...metaCompartir({ titulo: d.titulo, descripcion: d.descripcion, url, imagen: `${SITIO_URL}${d.imagen}`, alt: `${d.titulo}. Datos de ${NOMBRE_SITIO}.` }),
  };
}

export default function Pagina() {
  return <Herencia />;
}
