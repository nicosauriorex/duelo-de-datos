"use client";
// Herencia (/herencia/, docs/specs/herencia.md): qué recibió cada presidente al asumir y qué entregó (o qué hay hoy), con valores, meses y fuente.
// Los cálculos están en lib/herencia.ts; acá solo se dibuja. Estado en la URL: `p` (presidente), `vista` (uno / traspasos) y `v` (variable de "Todos los traspasos").
import Link from "next/link";
import { Fragment, useMemo } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Selector, Seg } from "../ui";
import { BotonInfo } from "../Variables";
import { BotonCompartir } from "../PanelCompartir";
import { BotonLink } from "../BotonLink";
import { IconoCompartir } from "../Iconos";
import { CeldaVar, Valor } from "./comunes";
import { crearPres, type Pres } from "@/lib/estadisticas";
import { fmtMes } from "@/lib/formato";
import {
  BASE_HERENCIA, FALTA_CARGAR, FILAS_HERENCIA, GRUPOS_HERENCIA, MAX_ATRASO, NO_MEDIBLE, defPorClave, idsHerencia, tablaHerencia, traspasos,
  type FilaHerencia, type Punto,
} from "@/lib/herencia";
import { unoDe, useParams } from "@/lib/url";
import type { Motor } from "@/lib/motor";

const IDS = idsHerencia();
const VISTAS: [string, string][] = [["uno", "Un presidente"], ["traspasos", "Todos los traspasos"]];

/** Celda de un dato: el valor y su mes; si no hay, "sin dato" y por qué. */
function CeldaDato({ p, motivo }: { p: Punto | null; motivo: string }) {
  if (p) return <td>{p.txt}<small>{p.mes}</small></td>;
  return <td className="her-sin">sin dato<small>{motivo}</small></td>;
}

function FilaTabla({ f }: { f: FilaHerencia }) {
  const nombre = f.href ? <Link prefetch={false} href={f.href} title="Ver la ficha de este dato">{f.nombre}</Link> : f.nombre;
  return (
    <tr>
      <CeldaVar nombre={nombre} unidad={f.unidad || undefined} info={f.c && !f.def.cociente ? <BotonInfo id={f.def.id} /> : null} />
      <CeldaDato p={f.recibio} motivo={f.sinRecibio} />
      <CeldaDato p={f.entrego} motivo={f.sinEntrego} />
      <Valor tono={f.cls === "neutro" ? null : f.cls} sub={f.cambioAbs ? <small>{f.cambioAbs}</small> : null}>{f.cambio}</Valor>
    </tr>
  );
}

export function Herencia() {
  const [p, set, montado] = useParams();
  const sec = useSeccion(IDS);
  const { motor: m } = sec;
  const PRES: Pres[] = useMemo(() => (m ? crearPres(m.F) : []), [m]);

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado || sec.ocupado) return <Cargando />;

  const ultimo = PRES[PRES.length - 1];
  const pres = PRES.find((x) => x.id === p.get("p")) ?? ultimo;
  const vista = unoDe(p.get("vista"), ["uno", "traspasos"] as const, "uno");
  const clave = defPorClave(p.get("v"))?.clave ?? FILAS_HERENCIA[0].clave;
  const tabla = tablaHerencia(m, pres.id);
  if (!tabla) return <Cargando />;
  const enCurso = tabla.enCurso, finTxt = fmtMes(m.F[Math.min(pres.i1, m.F.length - 1)]);
  const colFin = enCurso ? "Hoy" : "Entregó";

  const notaT = (
    <details className="her-plegado">
      <summary>Cómo se calcula</summary>
      <ul className="method">
        <li>Acá el inicio es siempre el mes anterior a asumir (T-1), sin importar la configuración de inicio de mandato: la herencia es el dato al traspaso.</li>
        <li>En series trimestrales o semestrales (pobreza, cuenta corriente, subsidios) se usa el último dato publicado hasta ese mes, que puede ser de varios meses antes; por eso cada valor lleva su mes. Un dato con más de {MAX_ATRASO} meses de antigüedad no cuenta: la celda dice “sin dato” y por qué.</li>
        {vista === "uno" && <li>Cambio: en puntos (p.p.) si el dato es un porcentaje; si no, en %, con la diferencia debajo. Se calcula con los valores tal como se ven.</li>}
        {vista === "uno" && <li>Verde y rojo siguen la dirección de cada dato en el resto del sitio (más reservas o salario, en verde; más inflación, pobreza o riesgo país, en rojo); el signo siempre está escrito. Sin color: datos en los que subir o bajar no se califica (pasivos remunerados, tipo de cambio real, precios regulados, subsidios).</li>}
      </ul>
    </details>
  );

  return (
    <section>
      <div className="card">
        <div className="controls">
          <Seg valor={vista} opciones={VISTAS} onElegir={(v) => set({ vista: v === "uno" ? null : v })} />
        </div>
        {vista === "uno" ? (
          <>
            <div className="controls">
              <Selector etiqueta="Presidente" valor={pres.id} opciones={PRES.slice().reverse().map((x) => [x.id, x.n] as [string, string])}
                onElegir={(v) => set({ p: v === ultimo.id ? null : v })} />
              <BotonCompartir className="btn" titulo={`Primero los Datos: herencia de ${pres.n}`} href={() => window.location.href}
                title="Armar una imagen de esta tabla para compartir" aria-label={`Compartir como imagen: herencia de ${pres.n}`}
                crearVista={() => ({ tipo: "herencia", presId: pres.id, ids: IDS.filter((id) => !!m.SER[id]), base: BASE_HERENCIA })}><IconoCompartir />Compartir</BotonCompartir>
            </div>
            <p className="note">
              {pres.n} asumió en {fmtMes(pres.ini)}. <b>Recibió</b>: último dato en o antes de {tabla.mesT1 ?? "el mes anterior a asumir"}.{" "}
              <b>{colFin}</b>: {enCurso ? "último dato publicado de cada variable." : `último dato en o antes de ${finTxt}, el último mes del mandato.`}
            </p>
            <div className="tablewrap fija her-tabla"><table>
              <thead><tr><th>Variable</th><th>Recibió</th><th>{colFin}</th><th>Cambio</th></tr></thead>
              <tbody>
                {GRUPOS_HERENCIA.map((g) => {
                  const filas = tabla.filas.filter((f) => f.grupo === g);
                  if (!filas.length) return null;
                  return (
                    <Fragment key={g}>
                      <tr className="her-grupo"><td colSpan={4}>{g}</td></tr>
                      {filas.map((f) => <FilaTabla key={f.def.clave} f={f} />)}
                    </Fragment>
                  );
                })}
              </tbody>
            </table></div>
            <p className="note">Tocá el nombre de una variable para ver su ficha.</p>
            <details className="her-plegado">
              <summary>Notas de cada dato</summary>
              <ul className="method">
                {tabla.filas.filter((f) => f.def.nota).map((f) => <li key={f.def.clave}><b>{f.nombre}</b>: {f.def.nota}</li>)}
              </ul>
            </details>
            {notaT}
          </>
        ) : (
          <Traspasos m={m} clave={clave} onVariable={(v) => set({ v: v === FILAS_HERENCIA[0].clave ? null : v })} opciones={tabla.filas.map((f) => [f.def.clave, `${f.grupo}: ${f.nombre}`] as [string, string])} nota={notaT} />
        )}
      </div>
      <div className="card">
        <details className="her-plegado">
          <summary>Lo que no se puede medir con datos oficiales</summary>
          <ul className="method">
            {NO_MEDIBLE.map(([t, por]) => <li key={t}><b>{t}</b>: {por}</li>)}
          </ul>
        </details>
        <details className="her-plegado">
          <summary>Lo que falta cargar</summary>
          <p className="note">Son datos oficiales que no están en series abiertas sino en informes: se van a cargar a mano, cada uno con su documento y página.</p>
          <ul className="method">
            {FALTA_CARGAR.map(([t, de]) => <li key={t}><b>{t}</b>: {de}</li>)}
          </ul>
        </details>
      </div>
    </section>
  );
}

/** "Todos los traspasos": una variable, una fila por traspaso. */
function Traspasos({ m, clave, onVariable, opciones, nota }: { m: Motor; clave: string; onVariable: (v: string) => void; opciones: [string, string][]; nota: React.ReactNode }) {
  const t = traspasos(m, clave);
  if (!t) return null;
  return (
    <div id="traspasos">
      <div className="controls">
        <Selector etiqueta="Variable" valor={clave} opciones={opciones} onElegir={onVariable} />
        <BotonLink id="traspasos" titulo={`Primero los Datos: ${t.nombre} en cada traspaso presidencial`} />
      </div>
      <p className="note">
        {t.href ? <Link prefetch={false} href={t.href}>{t.nombre}</Link> : t.nombre}{t.unidad ? ` (${t.unidad})` : ""}: el último dato en o antes del mes anterior a cada asunción.
        {t.def.nota ? ` ${t.def.nota}` : ""}
      </p>
      <div className="tablewrap fija her-tabla"><table>
        <thead><tr><th>Traspaso</th><th>Entregó → recibió</th><th>Valor</th></tr></thead>
        <tbody>
          {t.filas.map((f) => (
            <tr key={f.a.id}>
              <td>{f.mes}</td>
              <td className="her-quien">{f.de.n} →<small>{f.a.n}</small></td>
              <CeldaDato p={f.dato} motivo={f.motivo} />
            </tr>
          ))}
          <tr className="her-hoy">
            <td>Hoy</td>
            <td className="her-quien">{t.hoy.p.n}<small>en funciones</small></td>
            <CeldaDato p={t.hoy.dato} motivo={t.hoy.motivo} />
          </tr>
        </tbody>
      </table></div>
      {nota}
    </div>
  );
}
