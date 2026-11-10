"use client";
// "Preguntale a los datos": oraciones con huecos y buscador libre.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDatos } from "../DatosProvider";
import { useConfig } from "../ConfigProvider";
import { Picker } from "../Variables";
import { Selector } from "../ui";
import { IconoIr } from "../Iconos";
import { buscarSeries } from "@/lib/catalogo";
import { medidaInicial } from "@/lib/config";
import { medDefaultDe, type SerieMeta } from "@/lib/motor";
import { filtrar, hrefPlantilla, type Plantilla } from "@/lib/plantillas";
import {
  MEDIDAS_DOLAR, PRESIDENTES, SALARIOS, anios, hrefCompra, hrefDesde, hrefMedida, hrefPresidente, hrefSubio,
  idsCompra, idsMontos, idsPrecios, rotulo, todosLosPrincipales, type Opcion,
} from "@/lib/oraciones";
import { TEMAS, hrefHistorico } from "@/lib/temas";

/** Un hueco de la oración: botón con el valor subrayado. Listas cortas: desplegable propio; listas largas: selector de variables filtrado. */
function Hueco({ valor, opciones, onElegir, etiqueta, ids, S }: {
  valor: string; opciones?: Opcion[]; onElegir: (v: string) => void; etiqueta: string; ids?: string[]; S: Record<string, SerieMeta>;
}) {
  const [abierto, setAbierto] = useState(false);
  const conjunto = useMemo(() => new Set(ids ?? []), [ids]);
  const pedido = useMemo(() => ({ cb: (id: string) => onElegir(id), filtro: (s: SerieMeta) => conjunto.has(s.id), titulo: "Buscá: asado, yerba, alquiler…" }),
    [conjunto, onElegir]);
  if (ids) {
    return (
      <span className="hueco">
        <button type="button" className="btn sel-btn" aria-label={etiqueta} aria-haspopup="dialog" onClick={() => setAbierto(true)}><span className="et">{rotulo(valor, S)}</span></button>
        {abierto && <Picker pedido={pedido} onCerrar={() => setAbierto(false)} />}
      </span>
    );
  }
  return <Selector className="hueco" etiqueta={etiqueta} valor={valor} opciones={opciones ?? []} onElegir={onElegir} />;
}

function Oracion({ children, href }: { children: React.ReactNode; href: string }) {
  const router = useRouter();
  return (
    <li className="oracion">
      <span className="texto-oracion">{children}</span>
      <button type="button" className="btn" onClick={() => router.push(href)}>Ver<IconoIr /></button>
    </li>
  );
}

export function Oraciones({ S }: { S: Record<string, SerieMeta> }) {
  const principales = useMemo(() => todosLosPrincipales(S), [S]);
  const clave = (i: number) => String(i);
  const opcPrincipales: Opcion[] = principales.map((p, i) => [clave(i), p.corto]);
  const salarios: Opcion[] = SALARIOS.filter((i) => S[i]).map((i) => [i, rotulo(i, S)]);
  const compra = useMemo(() => idsCompra(S), [S]), montos = useMemo(() => idsMontos(S), [S]), precios = useMemo(() => idsPrecios(S), [S]);
  const anioHoy = new Date().getFullYear();
  const lista = useMemo(() => anios(anioHoy), [anioHoy]);

  const [producto, setProducto] = useState("pp_gba_asado"), [salario, setSalario] = useState("sipa_med");
  const [ind2, setInd2] = useState(clave(Math.max(0, principales.findIndex((p) => p.id === "inflacion")))), [pres, setPres] = useState("milei");
  const [ind3, setInd3] = useState(clave(Math.max(0, principales.findIndex((p) => p.id === "sipa_med")))), [anio, setAnio] = useState("2017");
  const [monto, setMonto] = useState("sipa_med"), [med, setMed] = useState("usdr_blue");
  const [a, setA] = useState("ipc_gba_01_1_2_coicop"), [b, setB] = useState("ipc_gba_04_1_1_coicop");
  if (!principales.length) return null;
  const p2 = principales[Number(ind2)] ?? principales[0], p3 = principales[Number(ind3)] ?? principales[0];

  return (
    <ul className="oraciones">
      {S.sipa_med && (
        <Oracion href={hrefCompra(producto, salario)}>
          ¿Cuánto <Hueco valor={producto} ids={compra} etiqueta="Producto" onElegir={setProducto} S={S} /> compra un{" "}
          <Hueco valor={salario} opciones={salarios} etiqueta="Salario" onElegir={setSalario} S={S} />?
        </Oracion>
      )}
      <Oracion href={hrefPresidente(p2, pres)}>
        ¿Cómo le fue a <Hueco valor={ind2} opciones={opcPrincipales} etiqueta="Indicador" onElegir={setInd2} S={S} /> con{" "}
        <Hueco valor={pres} opciones={PRESIDENTES} etiqueta="Presidente" onElegir={setPres} S={S} />?
      </Oracion>
      <Oracion href={hrefDesde(p3, anio)}>
        ¿Cómo cambió <Hueco valor={ind3} opciones={opcPrincipales} etiqueta="Indicador" onElegir={setInd3} S={S} /> desde{" "}
        <Hueco valor={anio} opciones={lista} etiqueta="Año" onElegir={setAnio} S={S} />?
      </Oracion>
      {S[monto] && (
        <Oracion href={hrefMedida(monto, med)}>
          ¿Cuánto vale <Hueco valor={monto} ids={montos} etiqueta="Monto" onElegir={setMonto} S={S} /> en{" "}
          <Hueco valor={med} opciones={MEDIDAS_DOLAR} etiqueta="Medida" onElegir={setMed} S={S} />?
        </Oracion>
      )}
      {S[a] && S[b] && (
        <Oracion href={hrefSubio(a, b)}>
          ¿Qué subió más: <Hueco valor={a} ids={precios} etiqueta="Primer precio" onElegir={setA} S={S} /> o{" "}
          <Hueco valor={b} ids={precios} etiqueta="Segundo precio" onElegir={setB} S={S} />?
        </Oracion>
      )}
    </ul>
  );
}

const MAX = 5;
/** Caja Buscar: plantillas (título, descripción, etiquetas) y variables del catálogo. Enter (o el botón) abre la primera.
 *  Los resultados se abren encima del contenido: no lo mueven. Con `listo` en false se ve la caja, deshabilitada, mientras llegan los datos. */
export function Buscar({ plantillas, S, listo = true }: { plantillas: Plantilla[]; S: Record<string, SerieMeta>; listo?: boolean }) {
  const router = useRouter();
  const { metas } = useDatos();
  const { config } = useConfig();
  const [q, setQ] = useState("");
  const largo = q.trim().length > 2;   // hasta 2 caracteres no busca
  const pls = useMemo(() => (largo ? filtrar(plantillas.filter((p) => !p.propia), q, S).slice(0, MAX) : []), [largo, plantillas, q, S]);
  const vars = useMemo(() => (largo ? buscarSeries(metas, q, MAX) : []), [largo, metas, q]);
  const hrefVar = (s: SerieMeta) => hrefHistorico({ id: s.id, med: medidaInicial(s.tipo, medDefaultDe(s), config), rel: null, modo: "compra", esc: "" });
  const primero = pls[0] ? hrefPlantilla(pls[0]) : vars[0] ? hrefVar(vars[0]) : null;
  return (
    <div className="buscar-guiado">
      <form role="search" onSubmit={(ev) => { ev.preventDefault(); if (primero) router.push(primero); }}>
        <input type="search" value={q} disabled={!listo} aria-label="Buscar un dato" placeholder="Buscá: alquiler, dólar blue, carne…" onChange={(ev) => setQ(ev.target.value)} />
        <button type="submit" className="btn primario" disabled={!listo} aria-label="Abrir el primer resultado"><IconoIr /></button>
      </form>
      {largo && (pls.length || vars.length ? (
        <div className="resultados-busqueda" role="status">
          {pls.length > 0 && <><h3>Plantillas</h3><ul>{pls.map((p) => <li key={p.id}><Link prefetch={false} href={hrefPlantilla(p)}>{p.titulo}</Link><small>{p.grupo}</small></li>)}</ul></>}
          {vars.length > 0 && <><h3>Variables</h3><ul>{vars.map((s) => <li key={s.id}><Link prefetch={false} href={hrefVar(s)}>{s.n}</Link><small>{s.cat.join(" › ")}</small></li>)}</ul></>}
        </div>
      ) : (
        <div className="resultados-busqueda" role="status">
          <p className="sin-resultados">No encontramos &quot;{q.trim()}&quot;. Probá con otra palabra o elegí un tema:</p>
          <ul>{TEMAS.map((t) => <li key={t.slug}><Link prefetch={false} href={`/tema/${t.slug}/`}>{t.nombre}</Link></li>)}</ul>
        </div>
      ))}
    </div>
  );
}
