"use client";
import { useState, type ReactNode } from "react";
import { Modal, useCerrarModal } from "../ui";

function Listo() {
  const cerrar = useCerrarModal();
  return <button type="button" className="btn primario" onClick={() => cerrar()}>Listo</button>;
}

/** R15: la configuración de una sección se abre en una ventana (fondo oscurecido, cruz, Escape y Atrás ya resueltos por `Modal`).
 *  Los cambios se aplican al instante (cada control escribe en la URL); "Listo" solo cierra. */
export function VentanaConfig({ etiqueta, titulo, children }: { etiqueta: ReactNode; titulo: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" className="btn drop" aria-haspopup="dialog" aria-expanded={abierta} onClick={() => setAbierta(true)}><span className="et">{etiqueta}</span></button>
      {abierta && (
        <Modal titulo={titulo} onCerrar={() => setAbierta(false)}>
          <header className="vp-cab"><h2>{titulo}</h2></header>
          <div className="config-cuerpo vp-cuerpo">{children}</div>
          <footer><Listo /></footer>
        </Modal>
      )}
    </>
  );
}
