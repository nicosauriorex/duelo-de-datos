import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DatosProvider, Errores } from "@/components/DatosProvider";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: { default: "Duelo de Datos", template: "%s · Duelo de Datos" },
  description: "Datos de Argentina, en debate. Precios, salarios, dólar, actividad, empleo, pobreza, dinero, fiscal y sector externo con datos oficiales, mes a mes.",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a className="skip" href="#contenido">Saltar al contenido</a>
        <main>
          <h1>Duelo de Datos</h1>
          <p className="sub"><strong>Datos de Argentina, en debate.</strong></p>
          <p className="sub">Precios, salarios, dólar, actividad, empleo, pobreza, dinero, fiscal y sector externo con datos oficiales (INDEC, BCRA, Secretaría de Trabajo, Bolsa de Comercio de Rosario y otros), mes a mes.</p>
          <Nav />
          <noscript><p className="aviso-js">Esta página necesita JavaScript para mostrar los gráficos y las tablas.</p></noscript>
          <div id="contenido">
            <DatosProvider><Errores />{children}</DatosProvider>
          </div>
        </main>
      </body>
    </html>
  );
}
