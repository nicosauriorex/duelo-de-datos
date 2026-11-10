"use client";
// Si una sección falla, se ve este aviso (en español y con salida) en lugar de la pantalla de error genérica.
import Link from "next/link";

export default function ErrorDePagina({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="ancho error-pagina" role="alert">
      <h1>Algo falló al mostrar esta página</h1>
      <p className="sub">Los datos no se perdieron. Podés reintentar o volver al inicio.</p>
      <p className="acciones-vista">
        <button type="button" className="btn primario" onClick={reset}>Reintentar</button>
        <Link prefetch={false} className="btn" href="/">Ir al inicio</Link>
      </p>
    </div>
  );
}
