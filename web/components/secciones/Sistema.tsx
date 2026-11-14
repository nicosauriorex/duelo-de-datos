"use client";
// Página de muestra del sistema D-023 (docs/specs/remodelacion-sistema.md): cada componente nuevo con datos reales del sitio,
// para aprobarlos antes de aplicarlos en las páginas. No está en el menú ni en el sitemap.
import { useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { useConfig } from "../ConfigProvider";
import { Cargando } from "../ui";
import { Grafico, type OpcionesG, type SerieG } from "../Grafico";
import { PALETA } from "../util";
import { CabeceraDato } from "../sistema/CabeceraDato";
import { Capitulo } from "../sistema/Capitulo";
import { Delta, type DeltaProps } from "../sistema/Delta";
import { InfoPunto } from "../sistema/InfoPunto";
import { FilaChips } from "../sistema/FilaChips";
import { Hoja } from "../sistema/Hoja";
import { BarraVista } from "../sistema/BarraVista";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { BarraInferior } from "../sistema/BarraInferior";
import { MenuMas } from "../sistema/MenuMas";
import { ListaBarras, type FilaBarra } from "../sistema/ListaBarras";
import { TablaMandatos, type FilaMandato } from "../sistema/TablaMandatos";
import { Lamina, Laminas } from "../sistema/Lamina";
import { baseDeConfig } from "@/lib/config";
import { contextoDato } from "@/lib/contexto-dato";
import { PRES_DEF, crearPres, etiqueta, statsMandato } from "@/lib/estadisticas";
import { nf1, ok, r1 } from "@/lib/formato";
import { historicoFicha } from "@/lib/ficha";
import { datosDesde, periodoMandato } from "@/lib/tablas";
import { fmtEjeDe } from "@/lib/imagen-datos";
import { PLACAS } from "@/lib/datos-fijos";
import { comparaciones, crearPlantillas, evaluar, hrefPlantilla, interanualTxt, plantillaSuelta } from "@/lib/plantillas";
import { idsDe } from "@/lib/temas";
import type { Comparacion } from "@/lib/plantillas";
import type { Expr } from "@/lib/motor";

const IDS_PRES = PRES_DEF.map((x) => x.id);
/** Dirección de un texto de variación ya formateado: "+0,3 p.p." sube, "−1,2 %" baja, "0,0" igual. */
const dirDe = (t: string): 1 | -1 | 0 => (/^\+/.test(t) ? 1 : /^[−-]/.test(t) ? -1 : 0);
const deltaDe = (c: Comparacion | null, rotulo: string): DeltaProps | null =>
  c ? { texto: c.variacion, tono: c.cls, dir: dirDe(c.variacion), contra: `vs ${c.fecha}`, etiqueta: `${rotulo} (${c.fecha}): ${c.valor}. Cambio: ${c.variacion}` } : null;
const signo = (v: number) => (r1(v) > 0 ? "+" : r1(v) < 0 ? "−" : "") + nf1.format(Math.abs(r1(v)));

const MEDIDAS: [string, string][] = [["vm", "Mensual"], ["via", "Interanual"]];
const PERIODOS: [string, string][] = [["12", "1 año"], ["60", "5 años"], ["todo", "Todo"]];

export function Sistema() {
  const { config } = useConfig();
  const base = useSec();
  const { m, version, destacadas } = base;
  const [med, setMed] = useState("vm");
  const [periodo, setPeriodo] = useState("todo");
  const [ajustes, setAjustes] = useState(false);
  const [mas, setMas] = useState(false);
  const [aviso, setAviso] = useState("");
  const [voces, setVoces] = useState("bueno");

  const e: Expr = useMemo(() => ({ ...PLACAS.inflacion, med }), [med]);
  const D = useMemo(() => {
    if (!m || !m.SER[e.id]) return null;
    const c = m.calc(e);
    const { rows } = historicoFicha(m, c, config.desde);
    const corte = periodo === "todo" ? rows : rows.slice(-Number(periodo));
    const fmt = (v: number) => m.fmtC(c, v);
    const series: SerieG[] = [{ key: "s0", name: c.corto, color: PALETA[0], fmt }];
    const opts: OpcionesG = { fmtAxis: fmtEjeDe(c), fmtTip: fmt, tipTitle: etiqueta, label: c.corto,
      marcas: [{ key: "s0", color: PALETA[0], fmt, tipos: new Set(["ult", "max", "min"]) }] };
    const ctx = contextoDato(m, e);
    const comp = comparaciones(m, plantillaSuelta("sis-" + med, c.corto, e));
    const deltas = [deltaDe(comp?.anterior ?? null, "Mes anterior"), deltaDe(comp?.anio ?? null, "Un año atrás")].filter((x): x is DeltaProps => !!x);
    // Un hecho que los deltas no dicen: "el más bajo desde…" primero; nunca la comparación con un año atrás (ya es un delta)
    const frase = (["desde", "record", "minimo"] as const).map((k) => ctx?.todas.find((f) => f.clave === k) ?? ctx?.frases.find((f) => f.clave === k)).find(Boolean)?.texto;
    return { c, rows: corte, series, opts, ctx, deltas, frase, interanual: med === "vm" ? interanualTxt(m) : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, e, periodo, config.desde]);

  // Por presidente: Inicio, Cierre y Promedio de la inflación mensual (D-023: sin la "variación" entre dos meses sueltos)
  const pres = useMemo(() => {
    if (!m || !m.SER.ipc_empalme || !m.SER.sipa_med) return null;
    const b = baseDeConfig(config, IDS_PRES);
    const PRES = crearPres(m.F);
    const cI = m.calc(PLACAS.inflacion), cS = m.calc(PLACAS.salario);
    const filas: FilaMandato[] = [], promedios: FilaBarra[] = [], salario: FilaBarra[] = [];
    for (const x of PRES) {
      const st = statsMandato(m.F, cI.v, x, b);
      const desde = datosDesde(m.F, cI.v, x);
      const periodoTxt = periodoMandato(m.F, x) + (desde ? ` (${desde})` : "");
      if (st.n > 0) {
        filas.push({ id: x.id, nombre: x.corto, periodo: periodoTxt, color: x.color, celdas: {
          ini: { texto: m.fmtC(cI, st.ini) }, fin: { texto: m.fmtC(cI, st.fin) }, prom: { texto: m.fmtC(cI, st.prom), valor: st.prom ?? null },
          med: { texto: m.fmtC(cI, st.med) }, min: { texto: m.fmtC(cI, st.min) }, max: { texto: m.fmtC(cI, st.max) },
        } });
        promedios.push({ id: x.id, nombre: x.corto, valor: st.prom ?? null, texto: m.fmtC(cI, st.prom), sub: periodoTxt, color: x.color });
      }
      const ss = statsMandato(m.F, cS.v, x, b);
      const desdeS = datosDesde(m.F, cS.v, x);
      if (ss.n > 0 && ok(ss.ini) && ok(ss.fin) && ss.ini !== 0) {
        const v = r1((ss.fin / ss.ini - 1) * 100);
        salario.push({ id: x.id, nombre: x.corto, valor: v, texto: `${signo(v)} %`, sub: periodoMandato(m.F, x) + (desdeS ? ` (${desdeS})` : ""), tono: v * cS.dir > 0 ? "bueno" : v * cS.dir < 0 ? "malo" : null });
      }
    }
    return { filas, promedios, salario, unidad: cI.unidad };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, config.t0, JSON.stringify(config.t0p)]);

  const laminas = useMemo(() => (m ? destacadas.map((p) => ({ p, ev: evaluar(m, p) })).filter((x) => x.ev) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m, version, destacadas]);

  if (base.errorGeneral) return <p className="error" role="alert">{base.errorGeneral}</p>;
  if (!m || base.ocupado || !D || !pres) return <Cargando />;

  const resumen = [
    { clave: "med", texto: MEDIDAS.find((x) => x[0] === med)![1] },
    { clave: "periodo", texto: PERIODOS.find((x) => x[0] === periodo)![1] },
  ];
  const href = typeof window === "undefined" ? "/sistema/" : window.location.pathname;

  return (
    <div className="sistema">
      <p className="sub">Muestra de los componentes de la remodelación (Fase 2) con datos reales. Nada de esto está aplicado todavía en las páginas.</p>

      <CabeceraDato
        titulo={med === "vm" ? "Inflación mensual" : "Inflación interanual"}
        cifra={D.ctx?.valor ?? "–"} fecha={D.ctx?.mes ?? ""}
        deltas={D.deltas} secundarias={D.interanual ? [{ rotulo: "Interanual", valor: D.interanual }] : []}
        frase={D.frase}
        info={<p>Cuánto subieron los precios al consumidor {med === "vm" ? "contra el mes anterior" : "contra el mismo mes del año anterior"}. Fuente: {D.c.serie.fuente}.</p>}>
        <BarraVista items={resumen} onAbrir={() => setAjustes(true)} />
        <Grafico rows={D.rows} series={D.series} opts={D.opts} />
      </CabeceraDato>

      <Hoja titulo="Ajustes del gráfico" abierta={ajustes} onCerrar={() => setAjustes(false)}>
        <h3 className="sistema-rot">Medida</h3>
        <FilaChips etiqueta="Medida" opciones={MEDIDAS} valor={med} onElegir={setMed} />
        <h3 className="sistema-rot">Período</h3>
        <FilaChips etiqueta="Período" opciones={PERIODOS} valor={periodo} onElegir={setPeriodo} />
      </Hoja>

      <Capitulo titulo="¿Cómo le fue a cada presidente?" bajada={`Inflación mensual, en ${pres.unidad.toLowerCase()}. Inicio y cierre de cada mandato y el promedio de todos sus meses.`}
        acciones={<CompartirHoja href={href} titulo="Inflación por presidente" texto="Inflación mensual por presidente: inicio, cierre y promedio." />}>
        <TablaMandatos etiqueta="Inflación mensual por presidente" filas={pres.filas}
          columnas={[{ clave: "ini", titulo: "Inicio" }, { clave: "fin", titulo: "Cierre" }, { clave: "prom", titulo: "Promedio", principal: true },
            { clave: "med", titulo: "Mediana" }, { clave: "min", titulo: "Mínimo" }, { clave: "max", titulo: "Máximo" }]}
          visibles={["ini", "fin", "prom"]} extras={["med", "min", "max"]} resaltar="milei" />
      </Capitulo>

      <Capitulo titulo="Barras que se comparan solas" bajada="Promedio de la inflación mensual en cada mandato, y cuánto cambió el salario mediano real del inicio al cierre.">
        <div className="sistema-dos">
          <div>
            <h3 className="sistema-rot">Inflación mensual promedio</h3>
            <ListaBarras etiqueta="Inflación mensual promedio por presidente" filas={pres.promedios} />
          </div>
          <div>
            <h3 className="sistema-rot">Salario mediano real, del inicio al cierre <InfoPunto etiqueta="Qué es el salario mediano real">Salario mediano de los trabajadores registrados, en pesos de hoy. La mitad cobra más y la mitad menos.</InfoPunto></h3>
            <ListaBarras etiqueta="Cambio del salario mediano real por presidente" filas={pres.salario} divergente />
          </div>
        </div>
      </Capitulo>

      <Capitulo titulo="Gráficos listos" bajada="Cada uno abre su vista completa.">
        <Laminas etiqueta="Gráficos listos destacados">
          {laminas.map(({ p, ev }) => <Lamina key={p.id} titulo={p.titulo} cifra={ev!.val} fecha={ev!.fecha} v={ev!.v} desde={m.idxDe("2003-01")} tono={ev!.cls} href={hrefPlantilla(p, ev!.vista)} />)}
        </Laminas>
      </Capitulo>

      <Capitulo titulo="Cómo se dice que algo cambió" bajada="Una sola forma en todo el sitio: dirección, cifra y contra qué. El color dice si es mejor o peor; el triángulo, si subió o bajó.">
        <FilaChips etiqueta="Tamaño" opciones={[["bueno", "Normal"], ["grande", "Grande"]]} valor={voces} onElegir={setVoces} />
        <ul className="sistema-deltas">
          <li><Delta texto="+0,3 p.p." tono="malo" dir={1} contra="vs sep-26" tam={voces === "grande" ? "grande" : "normal"} /><span>La inflación sube: peor.</span></li>
          <li><Delta texto="−1,2 %" tono="malo" dir={-1} contra="vs oct-25" tam={voces === "grande" ? "grande" : "normal"} /><span>El salario real baja: peor.</span></li>
          <li><Delta texto="+4,1 %" tono="bueno" dir={1} contra="vs oct-25" tam={voces === "grande" ? "grande" : "normal"} /><span>El salario real sube: mejor.</span></li>
          <li><Delta texto="0,0 %" tono="neutro" dir={0} contra="vs sep-26" tam={voces === "grande" ? "grande" : "normal"} /><span>Sin cambios.</span></li>
        </ul>
        <p className="note">Cifras de ejemplo, solo para mostrar los cuatro casos.</p>
      </Capitulo>

      <Capitulo titulo="Navegación en el celular" bajada="Barra para el pulgar. Buscar y Más abren capas; arriba queda solo la marca.">
        <div className="sistema-telefono">
          <div className="sistema-pantalla"><p>{aviso || "Contenido de la página."}</p></div>
          <BarraInferior actual="presidentes" fijo={false} onBuscar={() => setAviso("Acá se abre el buscador a pantalla completa (etapa 3.1).")} onMas={() => setMas(true)} />
        </div>
        <Hoja titulo="Más secciones" abierta={mas} onCerrar={() => setMas(false)}>
          <MenuMas />
        </Hoja>
      </Capitulo>
    </div>
  );
}

/** Carga lo que usa la muestra: inflación, salario y los gráficos listos destacados. */
function useSec() {
  const pre = useSeccion(["ipc_empalme", "sipa_med"]);
  const destacadas = useMemo(() => (pre.listo ? crearPlantillas(pre.metas).filter((x) => x.grupo === "Destacados").slice(0, 6) : []), [pre.listo, pre.metas]);
  const ids = useMemo(() => ["ipc_empalme", "sipa_med", ...destacadas.flatMap((p) => (p.e ? idsDe(p.e) : p.ids))], [destacadas]);
  const sec = useSeccion(ids);
  return { ...sec, m: sec.motor, destacadas };
}
