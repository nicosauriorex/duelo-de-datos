"use client";
// Parte diario del Banco Central (/bcra/, docs/specs/parte-diario-bcra.md): una tarjeta por variable con su último dato, su fecha, sus
// comparaciones y un gráfico chico; al tocarla se abre el gráfico grande. Compartir: imagen, texto para pegar en redes y link.
import { useMemo, useState } from "react";
import { useDiario } from "../useDiario";
import { Cargando, Modal, Seg } from "../ui";
import { Sparkline } from "../Sparkline";
import { GraficoDiario } from "../GraficoDiario";
import { PanelParte } from "../PanelParte";
import { avisoCompartir, compartir, copiarTexto } from "@/lib/compartir";
import {
  esClaveDiario, esPeriodoDiario, extremosTramo, PERIODO_DEFECTO, PERIODOS_DIARIO, recorte, textoParte,
  type Diario, type Parte, type PeriodoDiario, type ResumenVariable,
} from "@/lib/diario";
import { MESES } from "@/lib/formato";
import { useParams } from "@/lib/url";

const RUTA = "/bcra/";

/** "2026-11-12T12:50:08-03:00" → "12-nov, 12:50" (la hora ya viene en hora argentina). */
function actualizadoTxt(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? `${m[3]}-${MESES[+m[2] - 1]}, ${m[4]}` : null;
}

export function ParteBcra() {
  const { datos, parte, error } = useDiario();
  if (error) return <div className="card"><p className="error" role="alert">{error}</p><p className="note">El resto del sitio sigue funcionando. Probá de nuevo en un rato.</p></div>;
  if (!datos || !parte) return <Cargando texto="Cargando el parte…" />;
  return <Cuerpo datos={datos} parte={parte} />;
}

function Cuerpo({ datos, parte }: { datos: Diario; parte: Parte }) {
  const [p, set, montado] = useParams();
  const [imagen, setImagen] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const abierta = montado && esClaveDiario(p.get("v")) ? parte.variables.find((v) => v.clave === p.get("v")) ?? null : null;
  const periodo = esPeriodoDiario(p.get("per")) ? (p.get("per") as PeriodoDiario) : PERIODO_DEFECTO;
  const texto = useMemo(() => textoParte(parte), [parte]);
  const mostrar = (t: string | null) => { setAviso(t); if (t) setTimeout(() => setAviso(null), 4000); };
  const titulo = `Parte del Banco Central del ${parte.fechaTxt}`;
  const act = actualizadoTxt(parte.actualizado);

  return (
    <section className="parte">
      <div className="parte-cab">
        <p className="parte-del">Datos del <b>{parte.fechaTxt}</b></p>
        <p className="sub">Las cifras que publica el Banco Central cada día. Cada dato lleva su fecha: algunos se publican con unos días de atraso.</p>
        <div className="parte-compartir" role="group" aria-label="Compartir el parte">
          <button type="button" className="btn primario" onClick={() => setImagen(true)}>Compartir como imagen</button>
          <button type="button" className="btn" onClick={async () => mostrar((await copiarTexto(texto)) === "copiado" ? "Texto copiado" : "No se pudo copiar el texto")}>Copiar texto</button>
          <button type="button" className="btn" onClick={async () => mostrar(avisoCompartir(await compartir(RUTA, titulo)))}>Copiar link</button>
        </div>
        {aviso && <p className="aviso-link" role="status">{aviso}</p>}
      </div>

      <div className="parte-grilla">
        {parte.variables.map((v) => <Tarjeta key={v.clave} v={v} onAbrir={() => set({ v: v.clave })} />)}
      </div>

      <p className="note">Fuente: BCRA (Banco Central de la República Argentina), estadísticas monetarias.{act ? ` Última actualización del sitio: ${act}.` : ""} Las diferencias se calculan con los valores como se muestran.</p>

      {abierta && datos.series[abierta.clave] && (
        <Modal titulo={abierta.nombre} onCerrar={() => set({ v: null, per: null })} ancho>
          <div className="parte-modal">
            <h2>{abierta.nombre}</h2>
            <p className="note">{abierta.que}. En {abierta.unidad}, datos diarios.</p>
            <Seg valor={periodo} opciones={PERIODOS_DIARIO} onElegir={(x) => set({ per: x === PERIODO_DEFECTO ? null : x })} />
            <GraficoDiario clave={abierta.clave} serie={datos.series[abierta.clave]!} periodo={periodo} etiqueta={abierta.nombre} />
            <Extremos v={abierta} datos={datos} periodo={periodo} />
          </div>
        </Modal>
      )}
      {imagen && <PanelParte parte={parte} href={RUTA} onCerrar={() => setImagen(false)} />}
    </section>
  );
}

/** El valor más alto y el más bajo del período elegido. */
function Extremos({ v, datos, periodo }: { v: ResumenVariable; datos: Diario; periodo: PeriodoDiario }) {
  const e = useMemo(() => extremosTramo(v.clave, recorte(v.clave, datos.series[v.clave]!, periodo)), [v.clave, datos, periodo]);
  return (
    <dl className="parte-extremos">
      <div><dt>Más alto del período</dt><dd>{e.alto.valor}<small>{e.alto.fecha}</small></dd></div>
      <div><dt>Más bajo del período</dt><dd>{e.bajo.valor}<small>{e.bajo.fecha}</small></dd></div>
    </dl>
  );
}

function Tarjeta({ v, onAbrir }: { v: ResumenVariable; onAbrir: () => void }) {
  const colorValor = v.tipo === "flujo" && v.cls !== "neutro" ? ` var-${v.cls}` : "";
  return (
    <article className="parte-card">
      <h2 className="parte-nombre">{v.nombre}</h2>
      <p className="parte-unidad">{v.unidad}</p>
      <p className="parte-valor-fila">
        {v.etiqueta && <span className={`parte-etq var-${v.cls}`}>{v.etiqueta}</span>}
        <span className={`parte-valor${colorValor}`}>{v.valor}</span>
      </p>
      <p className="parte-dato">{v.atrasada ? `Último dato: ${v.fechaTxt}` : v.fechaTxt}</p>
      {v.filas.length > 0 && (
        <ul className="parte-filas">
          {v.filas.map((f) => (
            <li key={f.rotulo} className="parte-fila" aria-label={`${f.rotulo}, ${f.nota}: ${f.valor}${f.sub ? ", " + f.sub : ""}`}>
              <span className="parte-fila-rot">{f.rotulo}<small>{f.nota}</small></span>
              <span className={`parte-fila-val var-${f.cls}`}>{f.valor}{f.sub && <small>{f.sub}</small>}</span>
            </li>
          ))}
        </ul>
      )}
      {v.frases.length > 0 && <ul className="parte-frases">{v.frases.map((t) => <li key={t}>{t}</li>)}</ul>}
      <Sparkline v={v.spark} desde={0} />
      <button type="button" className="parte-abrir" aria-haspopup="dialog" aria-label={`Ver el gráfico de ${v.nombre}`} onClick={onAbrir}>Ver gráfico</button>
    </article>
  );
}
