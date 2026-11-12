// Semáforo de actividad (/semaforo/). El título, la descripción y la imagen para las redes salen de `npm run previas` (con el mes y la difusión);
// si no se corrió, se usan textos generales y la imagen del sitio.
import type { Metadata } from "next";
import { Semaforo } from "@/components/secciones/Semaforo";
import { DESCRIPCION_SEMAFORO, IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";
import { previaSemaforo } from "@/lib/previas-servidor";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/semaforo/`, d = previaSemaforo();
  if (!d) return { title: "Semáforo de actividad", description: DESCRIPCION_SEMAFORO, alternates: { canonical: url }, ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo: "Semáforo de actividad", descripcion: DESCRIPCION_SEMAFORO }) };
  return {
    title: d.titulo, description: d.descripcion, alternates: { canonical: url },
    ...metaCompartir({ titulo: d.titulo, descripcion: d.descripcion, url, imagen: `${SITIO_URL}${d.imagen}`, alt: `${d.titulo}. Datos de ${NOMBRE_SITIO}.` }),
  };
}

export default function Pagina() {
  return <Semaforo />;
}
