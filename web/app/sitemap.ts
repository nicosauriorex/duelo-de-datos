// Mapa del sitio (/sitemap.xml): las rutas fijas, los temas y las páginas de cada dato fijo. Se genera al compilar.
import type { MetadataRoute } from "next";
import { SITIO_URL } from "@/lib/previas";
import { fijosPublicables } from "@/lib/previas-servidor";
import { TEMAS } from "@/lib/temas";

export const dynamic = "force-static";

const SECCIONES = ["historico", "presidentes", "mandato", "herencia", "ranking", "elecciones", "congreso", "contexto", "bcra", "semaforo", "gasto", "universidades", "plantillas", "curiosidades", "fuentes"];

export default function sitemap(): MetadataRoute.Sitemap {
  const rutas = ["/", ...SECCIONES.map((s) => `/${s}/`), ...TEMAS.map((t) => `/tema/${t.slug}/`), ...fijosPublicables().map((d) => `/dato/${d.slug}/`)];
  return rutas.map((r) => ({ url: SITIO_URL + r }));
}
