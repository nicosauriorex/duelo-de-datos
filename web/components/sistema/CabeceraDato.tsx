// Apertura de toda página de un dato: título, cifra con su fecha, deltas, frase y (opcional) el gráfico. Sin caja.
import type { ReactNode, Ref } from "react";
import { Contador } from "../Movimiento";
import { Delta, type DeltaProps } from "./Delta";
import { InfoPunto } from "./InfoPunto";

/** `secundarias`: otras medidas del mismo dato (por ejemplo, el interanual de la inflación mensual), como cifras chicas con su rótulo.
 *  `nivel`: el del título (h1 en la página de un dato, h2 dentro de un tema). `tituloRef`/`tituloId`: para llevar el foco al título. */
export function CabeceraDato({ titulo, cifra, unidad, fecha, deltas, secundarias = [], frase, info, nivel = 1, tituloRef, tituloId, children }: {
  titulo: string; cifra: string; unidad?: string; fecha: string; deltas: DeltaProps[]; secundarias?: { rotulo: string; valor: string }[]; frase?: string; info?: ReactNode;
  nivel?: 1 | 2; tituloRef?: Ref<HTMLHeadingElement>; tituloId?: string; children?: ReactNode;
}) {
  const H = nivel === 2 ? "h2" : "h1";
  return (
    <header className="cabdato" data-nivel={nivel}>
      <div className="cabdato-izq">
        <div className="cabdato-titulo">
          <H ref={tituloRef} id={tituloId} tabIndex={tituloRef ? -1 : undefined}>{titulo}</H>
          {info ? <InfoPunto etiqueta={`Qué es ${titulo}`}>{info}</InfoPunto> : null}
        </div>
        <p className="cabdato-cifra">
          <span className="cabdato-num"><Contador texto={cifra} /></span>
          {unidad ? <span className="cabdato-unidad">{unidad}</span> : null}
          <span className="cabdato-fecha">{fecha}</span>
        </p>
        {secundarias.length > 0 && (
          <dl className="cabdato-sec">{secundarias.map((x) => <div key={x.rotulo}><dt>{x.rotulo}</dt><dd>{x.valor}</dd></div>)}</dl>
        )}
        {frase ? <p className="cabdato-frase">{frase}</p> : null}
      </div>
      {deltas.length > 0 && (
        <ul className="cabdato-deltas" aria-label="Cambios">
          {deltas.slice(0, 3).map((d, i) => <li key={i}><Delta {...d} /></li>)}
        </ul>
      )}
      {children ? <div className="cabdato-grafico">{children}</div> : null}
    </header>
  );
}
