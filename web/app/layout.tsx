import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { DatosProvider, Errores } from "@/components/DatosProvider";
import { Barra, CabeceraPagina, PieSitio } from "@/components/Nav";
import { ConfigProvider } from "@/components/ConfigProvider";
import { SCRIPT_TEMA } from "@/lib/config";

// Una sola familia para todo el sitio (se sirve desde el propio sitio): Archivo, con eje de ancho para los títulos y números condensados.
const fuente = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--fuente", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Primero los Datos", template: "%s · Primero los Datos" },
  description: "Datos de Argentina, en debate. Precios, salarios, dólar, actividad, empleo, pobreza, dinero, fiscal y sector externo con datos oficiales, mes a mes.",
  icons: { icon: "/favicon.svg" },
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
