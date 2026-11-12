import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { DatosProvider, Errores } from "@/components/DatosProvider";
import { Barra, CabeceraPagina, PieSitio } from "@/components/Nav";
import { ConfigProvider } from "@/components/ConfigProvider";
import { SCRIPT_TEMA } from "@/lib/config";
import { DESCRIPCION_SITIO, IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";

// Una sola familia para todo el sitio (se sirve desde el propio sitio): Archivo, con eje de ancho para los títulos y números condensados.
const fuente = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--fuente", display: "swap" });

// Vista previa de los links en redes: por defecto, la imagen general (la genera `npm run previas`). Cada ruta conserva su título y su
// descripción (Open Graph y Twitter los toman de ahí); las páginas fijas de cada dato (/dato/<slug>/) traen los suyos con su imagen.
export const metadata: Metadata = {
  metadataBase: new URL(SITIO_URL),
  title: { default: NOMBRE_SITIO, template: `%s · ${NOMBRE_SITIO}` },
  description: DESCRIPCION_SITIO,
  icons: { icon: "/favicon.svg" },
  ...metaCompartir({ imagen: IMAGEN_SITIO, alt: `${NOMBRE_SITIO}: datos de Argentina, en debate` }),
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fuente.variable} data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} /></head>
      <body>
        <ConfigProvider>
          <a className="skip" href="#contenido">Saltar al contenido</a>
          <Barra />
          <main id="contenido">
            <noscript><p className="aviso-js">Esta página necesita JavaScript para mostrar los gráficos y las tablas.</p></noscript>
            <DatosProvider><Errores /><CabeceraPagina />{children}</DatosProvider>
          </main>
          <PieSitio />
        </ConfigProvider>
      </body>
    </html>
  );
}
