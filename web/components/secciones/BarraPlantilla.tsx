"use client";
// Encabezado "Plantilla: …" de Histórico y botones Guardar como plantilla / Compartir / Ver plantillas.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useDatos } from "../DatosProvider";
import { avisoCompartir, compartir } from "@/lib/compartir";
import { MAX_NOMBRE, useMisPlantillas } from "@/lib/misPlantillas";
import { crearPlantillas, type Plantilla, type Vista } from "@/lib/plantillas";

type SetFn = (c: Record<string, string | null | undefined>) => void;
/** Todo lo que arma la vista, menos los datos de la plantilla (pl y pn). */
const vistaDe = (p: URLSearchParams): Vista => {
  const v: Vista = {};
  p.forEach((x, k) => { if (k !== "pl" && k !== "pn" && x) v[k] = x; });
  return v;
};
const claveVista = (v: Vista) => Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => `${k}=${x}`).join("&");

/** La plantilla de la que viene la vista (`pl` o `pn` del link), si hay una. */
export interface InfoVista { titulo: string | null; de: Plantilla | null | undefined; pn: string | null }
export function usePlantillaVista(p: URLSearchParams): InfoVista {
  const { metas } = useDatos();
  const curadas = useMemo(() => crearPlantillas(metas), [metas]);
  const pl = p.get("pl"), pn = p.get("pn");
  const de = pl ? curadas.find((x) => x.id === pl) : null;     // un id que ya no existe: se ve la vista sin encabezado
  return { titulo: de ? de.titulo : pn || null, de, pn };
}

/** Encabezado "Plantilla: …" y botones Guardar como plantilla / Compartir / Ver plantillas. En la vista simple (`simple`) solo van
 *  Guardar como plantilla y Ver plantillas, dentro de "Personalizar" (el título y Compartir los pone la vista). */
export function BarraPlantilla({ p, set, info, simple }: { p: URLSearchParams; set: SetFn; info: InfoVista; simple?: boolean }) {
  const mis = useMisPlantillas();
  const [nombre, setNombre] = useState<string | null>(null); // null = formulario cerrado
  const [aviso, setAviso] = useState<string | null>(null);
  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };

  const { titulo, de, pn } = info;
  const yaGuardada = !!pn && mis.lista.some((x) => x.nombre === pn && claveVista(x.vista) === claveVista(vistaDe(p)));

  const guardar = () => {
    if (nombre == null) return;
    const r = mis.agregar(nombre, vistaDe(p));
    if (!r.ok) { mostrar(r.aviso ?? null); return; }
    set({ pl: null, pn: nombre.trim().slice(0, MAX_NOMBRE) });
    setNombre(null);
    mostrar(r.aviso ?? "Guardada en Mis plantillas");
  };
  const abrirCompartir = async () => mostrar(avisoCompartir(await compartir(window.location.href, titulo ?? "Primero los Datos: Histórico")));
  const guardarEnMis = !de && pn && !yaGuardada && nombre == null
    ? <p style={{ margin: "4px 0 0" }}><button type="button" className="btn" onClick={() => setNombre(pn)}>Guardar en mis plantillas</button></p> : null;

  return (
    <>
      {titulo && !simple && (
        <div className="encabezado-plantilla" role="region" aria-label="Plantilla">
          <p className="titulo-pl">Plantilla: {titulo}</p>
          {de && <p className="note" style={{ margin: 0 }}>{de.desc}</p>}
          {guardarEnMis}
        </div>
      )}
      {simple && guardarEnMis}
      <div className="acciones-vista">
        <button type="button" className="btn" onClick={() => setNombre(nombre == null ? "" : null)} aria-expanded={nombre != null}>Guardar como plantilla</button>
        {!simple && <button type="button" className="btn primario" onClick={abrirCompartir} title="El link muestra exactamente esta vista">Compartir</button>}
        <Link prefetch={false} href="/plantillas/" className="btn">Ver plantillas</Link>
      </div>
      {nombre != null && (
        <form className="form-guardar" onSubmit={(ev) => { ev.preventDefault(); guardar(); }}>
          <input type="text" value={nombre} maxLength={MAX_NOMBRE} autoFocus aria-label="Nombre de la plantilla" placeholder="Nombre (hasta 60 caracteres)"
            onChange={(ev) => setNombre(ev.target.value)} />
          <button type="submit" className="btn on">Guardar</button>
          <button type="button" className="btn" onClick={() => setNombre(null)}>Cancelar</button>
        </form>
      )}
      {aviso && <p className="aviso-link" role="status">{aviso}</p>}
    </>
  );
}
