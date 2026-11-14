// Apertura de toda página de un dato: título, cifra con su fecha, deltas, frase y (opcional) el gráfico. Sin caja.
import type { ReactNode } from "react";
import { Contador } from "../Movimiento";
import { Delta, type DeltaProps } from "./Delta";
import { InfoPunto } from "./InfoPunto";

/** `secundarias`: otras medidas del mismo dato (por ejemplo, el interanual de la inflación mensual), como cifras chicas con su rótulo. */
export function CabeceraDato({ titulo, cifra, unidad, fecha, deltas, secundarias = [], frase, info, children }: {
  titulo: string; cifra: string; unidad?: string; fecha: string; deltas: DeltaProps[]; secundarias?: { rotulo: string; valor: string }[]; frase?: string; info?: ReactNode; children?: ReactNode;
}) {
  return (
    <header className="cabdato">
      <div className="cabdato-izq">
        <div className="cabdato-titulo">
          <h1>{titulo}</h1>
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
