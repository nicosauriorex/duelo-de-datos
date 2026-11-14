// Una sola forma de decir "cambió": triángulo (o raya) + texto con signo, sin fondo ni borde.
// El triángulo sigue a `dir`, no al tono: si sube la inflación, triángulo hacia arriba y en rojo.
import { IconoBaja, IconoIgual, IconoSube } from "./iconos";

export interface DeltaProps {
  /** Ya formateado y con signo, por ejemplo "+0,3 p.p." o "−1,2 %". Un guion inicial se reemplaza por "−". */
  texto: string;
  tono: "bueno" | "malo" | "neutro" | null;
  /** 1 sube, -1 baja, 0 igual */
  dir: 1 | -1 | 0;
  /** Contra qué se compara, por ejemplo "vs sep-26" */
  contra?: string;
  tam?: "normal" | "grande";
  /** Dónde se usa: "placa" es para las placas azules de la portada (texto azul noche; el triángulo va en un cuadradito azul noche, verde o rojo). */
  en?: "placa";
  /** Para lectores de pantalla. Si falta, se arma con la dirección, el texto y la referencia. */
  etiqueta?: string;
}

export function Delta({ texto, tono, dir, contra, tam = "normal", en, etiqueta }: DeltaProps) {
  const t = texto.startsWith("-") ? "−" + texto.slice(1) : texto;
  const sinSigno = t.replace(/^[+−]/, "");
  const verbo = dir > 0 ? "Sube" : dir < 0 ? "Baja" : "Sin cambios";
  const refTxt = contra ? contra.replace(/^vs\s+/i, "contra ") : "";
  const aria = etiqueta ?? (dir === 0 ? `${verbo}${refTxt ? " " + refTxt : ""}` : `${verbo} ${sinSigno}${refTxt ? " " + refTxt : ""}`);
  const Marca = dir > 0 ? IconoSube : dir < 0 ? IconoBaja : IconoIgual;
  return (
    <span className={`delta${tam === "grande" ? " delta-grande" : ""}${en === "placa" ? " delta-placa" : ""}`} data-tono={tono ?? "neutro"} role="img" aria-label={aria}>
      <Marca className="delta-marca" />
      <span className="delta-texto" aria-hidden="true">{t}</span>
      {contra ? <span className="delta-ref" aria-hidden="true">{contra}</span> : null}
    </span>
  );
}
